# Phase 16: GSD Command Registry - Research

**Researched:** 2026-02-10
**Domain:** Plugin-based command registry, context-dependent UI buttons, command palette, multi-project session pause/resume
**Confidence:** HIGH

## Summary

Phase 16 transforms the existing hardcoded agent panel into a dynamic, plugin-driven command system where GSD action buttons are auto-discovered from a command registry, filtered by project state, and executable via both inline buttons and a keyboard-driven command palette. The phase also adds pause/resume for multi-project agent workflows.

The core architectural insight is that the Agent SDK already supports **plugins** with a well-defined directory structure (`.claude-plugin/plugin.json` manifest, `commands/*.md`, `agents/*.md`). Rather than inventing a custom command format, GSD commands should be defined as Agent SDK plugin commands that the server reads at startup, serves via a registry API, and the client renders as context-aware buttons. This leverages the SDK's plugin loading for actual execution while keeping the UI layer independent.

The command palette (GSD-04) uses **cmdk** (v1.x), a ~8KB headless React component that provides fuzzy search, keyboard navigation, and accessibility out of the box. It is unstyled, which aligns with Eluma's inline CSS approach. It requires React 18+ (Eluma uses React 19).

For pause/resume (GSD-05, GSD-06), the Agent SDK natively supports **session resume** via session IDs. The server needs to persist session IDs to the event store when a user pauses, and resume them later by passing `resume: sessionId` to `query()`. The existing `AgentSessionManager` already tracks per-project sessions -- extending it with a "paused" state and persisted session IDs is straightforward.

**Primary recommendation:** Define GSD commands as markdown files in a plugin directory, serve a `/api/gsd/commands` registry endpoint that reads them at startup (and on file change), use project state + workflow state to filter visible commands per project, and render them as labeled buttons (Simple mode) or in a cmdk palette (Expert mode).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/claude-agent-sdk` | ^0.2.x (installed) | Agent sessions, plugin loading, session resume | Already installed. Provides `query()` with `plugins` and `resume` options. |
| `cmdk` | ^1.0.0 | Headless command palette (Expert mode Cmd+K) | ~8KB, unstyled, React 18+, composable API. Used by Linear, Raycast, Vercel. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `chokidar` | ^4.0.x | Watch plugin directory for command file changes | GSD-07: auto-update registry when plugin files change. Already a transitive dep of Vite. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| cmdk | kbar | kbar is more opinionated (~20KB), has built-in styles that conflict with Eluma's inline CSS. cmdk is headless. |
| cmdk | Custom implementation | Building fuzzy search + keyboard nav + a11y from scratch is 500+ lines. cmdk does it in 8KB. |
| Plugin-dir commands | Hardcoded command array | Works short-term but violates GSD-07 (no hardcoded command list). Plugin files are the source of truth. |
| chokidar | fs.watch | fs.watch is unreliable on macOS (known inode reuse bugs). chokidar abstracts platform differences. |

**Installation:**
```bash
npm install cmdk -w client
```

(chokidar is likely already available as a transitive dependency via Vite; verify before adding explicitly.)

## Architecture Patterns

### Recommended Project Structure

```
server/src/
  gsd/                          # NEW: GSD command registry
    registry.ts                 # Read plugin dir, build command list, watch for changes
    types.ts                    # GsdCommand, GsdCommandRegistry types
    state-filter.ts             # Filter commands by project state + workflow state
  routes/
    gsd.ts                      # NEW: /api/gsd/* endpoints (commands, execute)
  agent/
    session-manager.ts          # MODIFIED: Add pause/resume state, persist session IDs

client/src/
  components/
    GsdButtonBar.tsx            # NEW: Context-dependent GSD action buttons
    GsdCommandPalette.tsx       # NEW: Cmd+K command palette (Expert mode)
  hooks/
    useGsdCommands.ts           # NEW: Fetch and cache command registry
    useGsdSession.ts            # NEW: Pause/resume agent sessions per project

gsd-plugin/                     # NEW: Plugin directory (project root or configurable path)
  .claude-plugin/
    plugin.json                 # Plugin manifest
  commands/
    plan-phase.md               # "Plan this phase" command
    research-phase.md           # "Research this phase" command
    run-workflow.md             # "Run next workflow step" command
    analyze-code.md             # "Analyze project code" command
    generate-docs.md            # "Generate documentation" command
    review-progress.md          # "Review project progress" command
```

### Pattern 1: Server-Side Command Registry (Singleton)

**What:** Read GSD command files from the plugin directory at startup, build an in-memory registry, serve via API, and watch for file changes to auto-update.

**When to use:** GSD-01, GSD-07 -- server reads commands from plugin directory, auto-updates when files change.

```typescript
// server/src/gsd/types.ts
export interface GsdCommand {
  id: string;                    // Derived from filename (e.g., "plan-phase")
  label: string;                 // Display label from frontmatter
  description: string;           // Brief description from frontmatter
  labelKey?: string;             // i18n key for label (optional, for built-in commands)
  descriptionKey?: string;       // i18n key for description
  /** Conditions under which this command is available */
  when: {
    phases?: string[];           // Only show in these project phases (empty = all)
    notPhases?: string[];        // Hide in these phases
    requiresWorkflowComplete?: boolean; // Only if current phase workflow is done
    requiresActiveSession?: boolean;    // Only if an agent session is running
    requiresNoActiveSession?: boolean;  // Only if no agent session is running
    mode?: "simple" | "expert" | "both"; // Mode restriction
  };
  /** The prompt template to send to the agent */
  promptTemplate: string;
  /** Default agent options for this command */
  agentOptions?: {
    maxTurns?: number;
    maxBudgetUsd?: number;
    allowedTools?: string[];
  };
}

export interface GsdCommandRegistry {
  commands: GsdCommand[];
  loadedAt: string;              // ISO timestamp
  pluginPath: string;            // Source directory
}
```

```typescript
// server/src/gsd/registry.ts
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import type { GsdCommand, GsdCommandRegistry } from "./types.js";

let registry: GsdCommandRegistry | null = null;

/**
 * Parse a GSD command markdown file.
 * Frontmatter (YAML between ---) contains metadata.
 * Body is the prompt template.
 */
function parseCommandFile(filename: string, content: string): GsdCommand {
  // Parse frontmatter and body
  const [, frontmatter, body] = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) || [];
  // ... parse YAML frontmatter for label, description, when conditions
  // ... body becomes promptTemplate
}

/**
 * Load all command files from the plugin commands directory.
 */
export async function loadRegistry(pluginPath: string): Promise<GsdCommandRegistry> {
  const commandsDir = join(pluginPath, "commands");
  const files = await readdir(commandsDir);
  const mdFiles = files.filter(f => f.endsWith(".md"));

  const commands: GsdCommand[] = [];
  for (const file of mdFiles) {
    const content = await readFile(join(commandsDir, file), "utf-8");
    commands.push(parseCommandFile(file, content));
  }

  registry = { commands, loadedAt: new Date().toISOString(), pluginPath };
  return registry;
}

export function getRegistry(): GsdCommandRegistry | null {
  return registry;
}
```

### Pattern 2: State-Based Command Filtering

**What:** Filter the command registry to show only commands relevant to the current project's state.

**When to use:** GSD-02 -- UI shows only relevant commands.

```typescript
// server/src/gsd/state-filter.ts
import type { GsdCommand } from "./types.js";
import type { ProjectState } from "shared/types/models.js";
import type { WorkflowState } from "shared/types/workflow.js";

export interface CommandFilterContext {
  project: ProjectState;
  workflow: WorkflowState | null;
  hasActiveSession: boolean;
  mode: "simple" | "expert";
}

export function filterCommands(
  commands: GsdCommand[],
  ctx: CommandFilterContext
): GsdCommand[] {
  return commands.filter(cmd => {
    const w = cmd.when;

    // Phase filter
    if (w.phases?.length && !w.phases.includes(ctx.project.currentPhase)) return false;
    if (w.notPhases?.length && w.notPhases.includes(ctx.project.currentPhase)) return false;

    // Workflow completion filter
    if (w.requiresWorkflowComplete && ctx.workflow) {
      // Check if all required steps in current phase are completed
      // ... derive from workflow state
    }

    // Session state filter
    if (w.requiresActiveSession && !ctx.hasActiveSession) return false;
    if (w.requiresNoActiveSession && ctx.hasActiveSession) return false;

    // Mode filter
    if (w.mode && w.mode !== "both" && w.mode !== ctx.mode) return false;

    return true;
  });
}
```

### Pattern 3: GSD Command File Format

**What:** Markdown files with YAML frontmatter defining command metadata and prompt template.

**When to use:** Every GSD command definition.

```markdown
---
label: Plan Phase
description: Create a detailed implementation plan for the current project phase
labelKey: gsd.plan_phase
descriptionKey: gsd.plan_phase_desc
when:
  notPhases: [review_extraction]
  requiresNoActiveSession: true
  mode: both
agentOptions:
  maxTurns: 30
  maxBudgetUsd: 3.0
  allowedTools: [Read, Glob, Grep, WebSearch, WebFetch, Edit, Write]
---
Analyze the current state of project "{project_name}" which is in the {current_phase} phase.
Create a detailed implementation plan for this phase.

Project description: {project_description}
Current workflow progress: {workflow_summary}
```

### Pattern 4: Client-Side GSD Button Bar

**What:** A React component that fetches available commands for the current project and renders them as labeled buttons with descriptions.

**When to use:** GSD-02, GSD-03 -- context-dependent buttons with labels and descriptions.

```typescript
// client/src/hooks/useGsdCommands.ts
import { useState, useEffect } from "react";
import { apiCall } from "../api/client.js";
import type { GsdCommand } from "../../server/src/gsd/types.js"; // via shared types

export function useGsdCommands(projectId: string) {
  const [commands, setCommands] = useState<GsdCommand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const res = await apiCall<{ commands: GsdCommand[] }>(
        "GET",
        `/api/gsd/commands/${projectId}`
      );
      if (res.success) setCommands(res.data.commands);
      setLoading(false);
    }
    fetch();
  }, [projectId]);

  return { commands, loading };
}
```

```tsx
// client/src/components/GsdButtonBar.tsx
function GsdButtonBar({ projectId }: { projectId: string }) {
  const { commands, loading } = useGsdCommands(projectId);
  const { t } = useTranslation();

  if (loading || commands.length === 0) return null;

  return (
    <div style={styles.container}>
      {commands.map((cmd) => (
        <button key={cmd.id} onClick={() => executeCommand(cmd)} style={styles.button}>
          <span style={styles.label}>
            {cmd.labelKey ? t(cmd.labelKey) : cmd.label}
          </span>
          <span style={styles.description}>
            {cmd.descriptionKey ? t(cmd.descriptionKey) : cmd.description}
          </span>
        </button>
      ))}
    </div>
  );
}
```

### Pattern 5: Command Palette with cmdk

**What:** Cmd+K opens a headless command palette in Expert mode, showing all available GSD commands with fuzzy search.

**When to use:** GSD-04 -- Expert mode command palette.

```tsx
// client/src/components/GsdCommandPalette.tsx
import { Command } from "cmdk";
import { useState, useEffect } from "react";
import { useMode } from "../hooks/useMode.js";

export function GsdCommandPalette({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const { isExpert } = useMode();
  const { commands } = useGsdCommands(projectId);

  // Only enable in Expert mode
  useEffect(() => {
    if (!isExpert) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isExpert]);

  if (!isExpert) return null;

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="GSD Commands">
      <Command.Input placeholder="Search commands..." />
      <Command.List>
        <Command.Empty>No commands found.</Command.Empty>
        {commands.map((cmd) => (
          <Command.Item
            key={cmd.id}
            value={`${cmd.label} ${cmd.description}`}
            onSelect={() => { executeCommand(cmd); setOpen(false); }}
          >
            <span>{cmd.label}</span>
            <span>{cmd.description}</span>
          </Command.Item>
        ))}
      </Command.List>
    </Command.Dialog>
  );
}
```

### Pattern 6: Session Pause/Resume

**What:** Extend AgentSessionManager with pause/resume state. Persist session IDs to the event store. Resume via Agent SDK's `resume` option.

**When to use:** GSD-05, GSD-06 -- pause/resume per project.

```typescript
// Extension to AgentSessionManager
// Add "paused" state to AgentSessionState
type AgentSessionState = "starting" | "running" | "completed" | "errored" | "aborted" | "paused";

// Pause: abort the current session's stream but preserve the session ID for resume
pause(sessionId: string): { sdkSessionId: string } {
  const session = this.sessions.get(sessionId);
  if (!session || session.state !== "running") return null;

  // Capture the Agent SDK session_id (from the init system message)
  const sdkSessionId = session.sdkSessionId;

  // Abort the stream but mark as paused (not aborted)
  session.state = "paused";
  session.abortController.abort();
  session.query.close();
  this.clearTimeout(session);

  // Emit pause event
  const event: SSEEvent = { type: "status", data: { message: "Session paused" }, timestamp: new Date().toISOString() };
  this.pushEvent(session, event);
  session.emitter.emit("end");

  return { sdkSessionId };
}

// Resume: start a new query with resume option
resume(projectId: string, sdkSessionId: string, prompt?: string): string {
  const agentQuery = query({
    prompt: prompt || "Continue where you left off",
    options: {
      resume: sdkSessionId,  // Agent SDK session resume
      // ... other options
    }
  });
  // Create new AgentSession with new ID but same projectId
  // ...
}
```

### Anti-Patterns to Avoid

- **Hardcoding commands in TypeScript arrays:** Violates GSD-07. Commands must come from files that can be updated independently of the app code.
- **Fetching the full command registry on every button render:** Cache on the client. Invalidate only when the registry changes (use a version/hash).
- **Building a custom fuzzy search:** cmdk handles this. Do not hand-roll fuzzy matching for the command palette.
- **Mode-specific command components:** Do not create `SimpleGsdButtons` and `ExpertGsdButtons`. Use one `GsdButtonBar` that checks `isExpert` for additional features.
- **Storing full agent transcripts for pause/resume:** The Agent SDK handles session persistence internally. Only store the `sdkSessionId` string in the event store.
- **Global Cmd+K handler outside React:** Use `useEffect` inside the palette component for proper cleanup. A global event listener without cleanup causes memory leaks.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fuzzy search for command palette | Custom string matching | cmdk's built-in filter | cmdk handles ranking, keyboard nav, a11y in ~8KB |
| YAML frontmatter parsing | Custom regex parser | `yaml` npm package (or simple key: value parsing) | Edge cases in YAML are numerous; use a proper parser |
| File watching for command changes | `fs.watch()` | `chokidar` or server restart | fs.watch is unreliable on macOS; chokidar handles edge cases |
| Session persistence across restarts | Custom file format | Agent SDK's built-in session resume | SDK stores transcripts in `~/.claude/sessions/`; just store the session ID |
| Command palette dialog/overlay | Custom modal + focus trap | cmdk's `Command.Dialog` (uses Radix Dialog) | Focus trapping, escape handling, portal rendering handled by Radix |

**Key insight:** The Agent SDK already provides plugin infrastructure and session resume. Phase 16's job is to create the web UI layer on top of these existing capabilities, not to reimplement them.

## Common Pitfalls

### Pitfall 1: Command Registry Not Refreshing After Plugin Update

**What goes wrong:** Server reads command files at startup but never re-reads them. When a developer updates a GSD command markdown file, the change is invisible until server restart.

**Why it happens:** File watching is an afterthought. The simplest implementation reads once at startup.

**How to avoid:** Use chokidar (or similar) to watch the commands directory. On file change, re-read and rebuild the in-memory registry. Emit a version counter so clients can poll or be notified of changes.

**Warning signs:** Commands list is stale after editing markdown files. Developer must restart the server to see changes.

### Pitfall 2: State Filter Race Condition with Workflow Events

**What goes wrong:** User completes a workflow step (triggers an event), but the command filter still shows the old set of commands because the workflow state hasn't been reduced yet from the new event.

**Why it happens:** The event store is append-only and the reducer re-reads from disk. There's a window between event append and next state read where the state is stale.

**How to avoid:** After a workflow step completion, the client should re-fetch commands. Use the workflow step completion callback to trigger a command list refresh. Alternatively, return updated available commands in the workflow step completion API response.

**Warning signs:** "Plan Phase" button still visible after phase is already planned. Commands flicker after a short delay.

### Pitfall 3: Cmd+K Palette Intercepting Browser/OS Shortcuts

**What goes wrong:** Cmd+K is already used by some browsers (Chrome address bar, Safari search) and some OS features. Registering a global Cmd+K handler can conflict.

**Why it happens:** KeyboardEvent listeners on `document` capture events before the browser handles them.

**How to avoid:** Only register the Cmd+K handler when the app has focus and the user is in Expert mode. Use `e.preventDefault()` only when the handler will actually open the palette. Consider using Cmd+Shift+K as fallback if Cmd+K conflicts.

**Warning signs:** Browser address bar stops opening with Cmd+K. Users report unexpected behavior.

### Pitfall 4: Pause/Resume Session ID Lost on Server Restart

**What goes wrong:** User pauses a GSD session. Server restarts (PM2 cycle). The in-memory session tracking is lost. User cannot resume.

**Why it happens:** Session state is only in memory (the Map in AgentSessionManager). The Agent SDK stores its transcripts separately, but Eluma's mapping of project to SDK session ID is not persisted.

**How to avoid:** When a session is paused, emit a domain event (`gsd.session_paused { projectId, sdkSessionId }`) to the JSONL event store. On resume, read the event store to find the last paused session ID for the project.

**Warning signs:** "Resume" button appears but clicking it fails with "session not found". After server restart, all paused sessions are gone.

### Pitfall 5: cmdk Bundle Size Bloat from Radix Dialog Dependency

**What goes wrong:** cmdk's `Command.Dialog` uses `@radix-ui/react-dialog` internally. If Radix is not already in the project, it adds ~15KB to the bundle.

**Why it happens:** cmdk v1.x depends on `@radix-ui/react-dialog` for the dialog wrapper.

**How to avoid:** This is acceptable -- 15KB for a full dialog with focus trap, portal, and a11y is reasonable. However, if bundle size is critical, use `Command` (inline) instead of `Command.Dialog` and wrap with a custom modal. For Eluma's self-hosted context, 15KB is negligible.

**Warning signs:** Bundle analyzer shows unexpected Radix packages. Only a concern if there's a strict bundle budget.

## Code Examples

### GSD Command Markdown File Format

```markdown
---
label: Plan Phase
description: Create a detailed plan for the current lifecycle phase
labelKey: gsd.cmd.plan_phase
descriptionKey: gsd.cmd.plan_phase_desc
when:
  requiresNoActiveSession: true
  mode: both
agentOptions:
  maxTurns: 30
  maxBudgetUsd: 3.0
  allowedTools:
    - Read
    - Glob
    - Grep
    - WebSearch
    - Edit
    - Write
---

You are working on the project "{project_name}" which is currently in the "{current_phase}" phase.

Project description: {project_description}

Create a detailed implementation plan for this phase. Consider:
1. What needs to be accomplished
2. Dependencies and prerequisites
3. Estimated effort
4. Risks and mitigations

Output a structured plan with clear next steps.
```

### Registry API Endpoint

```typescript
// server/src/routes/gsd.ts
import { Router } from "express";
import { getRegistry } from "../gsd/registry.js";
import { filterCommands } from "../gsd/state-filter.js";
import { getProjectById } from "../events/reducers/project.js";
import { reduceWorkflowState } from "../events/reducers/workflow.js";
import { agentSessions } from "../agent/session-manager.js";

const router = Router();

// GET /api/gsd/commands/:projectId -- Get available commands for a project
router.get("/commands/:projectId", async (req, res) => {
  const registry = getRegistry();
  if (!registry) {
    return res.status(503).json({ success: false, error: "Command registry not loaded" });
  }

  const project = await getProjectById(req.params.projectId);
  if (!project) {
    return res.status(404).json({ success: false, error: "Project not found" });
  }

  // Derive workflow state for the project
  const workflowEvents = await getWorkflowEventsForProject(req.params.projectId);
  const workflow = reduceWorkflowState(workflowEvents, project.currentPhase);

  // Check if project has an active agent session
  const hasActiveSession = /* check agentSessions for running session on this projectId */;

  const mode = req.query.mode === "expert" ? "expert" : "simple";

  const available = filterCommands(registry.commands, {
    project,
    workflow,
    hasActiveSession,
    mode,
  });

  res.json({
    success: true,
    data: {
      commands: available,
      registryVersion: registry.loadedAt,
    },
  });
});

export default router;
```

### Agent SDK Session Resume for Pause/Resume

```typescript
// Capturing the SDK session ID during stream consumption
private async consumeStream(session: AgentSession): Promise<void> {
  try {
    for await (const message of session.query) {
      // Capture SDK session ID from init message
      if (message.type === "system" && message.subtype === "init") {
        session.sdkSessionId = message.session_id;
      }

      if (session.state !== "running") break;
      // ... rest of stream consumption
    }
  } catch (err) {
    // ... error handling
  }
}

// Resuming a paused session
resumeSession(projectId: string, sdkSessionId: string): string {
  const id = randomUUID();
  const abortController = new AbortController();

  const agentQuery = query({
    prompt: "Continue the previous work",
    options: {
      resume: sdkSessionId,        // Agent SDK native session resume
      cwd: /* project working directory */,
      abortController,
      canUseTool,
      permissionMode: "default",
      includePartialMessages: true,
      persistSession: true,         // Enable session persistence for future resumes
    },
  });

  // ... create session, consume stream, return id
}
```

### cmdk Palette with Inline Styles (Eluma Convention)

```tsx
import { Command } from "cmdk";

export function GsdCommandPalette({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const { isExpert } = useMode();
  const { commands } = useGsdCommands(projectId);
  const { t } = useTranslation();
  const { startSession } = useAgentStream();

  useEffect(() => {
    if (!isExpert) return;
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isExpert]);

  if (!isExpert) return null;

  async function handleSelect(cmd: GsdCommand) {
    setOpen(false);
    await startSession({
      prompt: cmd.promptTemplate, // Will be interpolated server-side
      projectId,
      commandId: cmd.id,         // Tell server which command to execute
    });
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label={t("gsd.command_palette")}
    >
      <Command.Input
        placeholder={t("gsd.search_commands")}
        style={paletteStyles.input}
      />
      <Command.List style={paletteStyles.list}>
        <Command.Empty style={paletteStyles.empty}>
          {t("gsd.no_commands")}
        </Command.Empty>
        {commands.map(cmd => (
          <Command.Item
            key={cmd.id}
            value={`${cmd.label} ${cmd.description}`}
            onSelect={() => handleSelect(cmd)}
            style={paletteStyles.item}
          >
            <div style={paletteStyles.itemLabel}>
              {cmd.labelKey ? t(cmd.labelKey) : cmd.label}
            </div>
            <div style={paletteStyles.itemDesc}>
              {cmd.descriptionKey ? t(cmd.descriptionKey) : cmd.description}
            </div>
          </Command.Item>
        ))}
      </Command.List>
    </Command.Dialog>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@anthropic-ai/claude-code` package | `@anthropic-ai/claude-agent-sdk` | 2025-2026 | Renamed package. Same `query()` API. Migration guide available. Import path changed. |
| Agent SDK without session resume | `resume: sessionId` option | SDK v0.2.x | Enables pause/resume without custom persistence. SDK stores transcripts internally. |
| Agent SDK without plugins | `plugins: [{ type: "local", path }]` | SDK v0.2.x | Commands, agents, skills can be loaded from local directories. Plugin manifest at `.claude-plugin/plugin.json`. |
| Agent SDK v1 (no V2 preview) | V2 preview with `send()`/`receive()` | Late 2025 | New simplified interface for multi-turn. However, V1 `query()` is still the stable API. Use V1 for Phase 16. |
| cmdk v0.x | cmdk v1.0.0 | 2024 | Breaking: `value` prop is now case-sensitive (was lowercased). `Command.List` rendering is now mandatory. |

**Deprecated/outdated:**
- `@anthropic-ai/claude-code` npm package: Renamed to `@anthropic-ai/claude-agent-sdk`. Old import paths still work via redirect but should not be used for new code.
- Agent SDK `bypassPermissions` without `allowDangerouslySkipPermissions`: Now requires explicit opt-in flag.

**Note on user's Claude Code SDK preference:** The user mentioned wanting to replace Agent SDK with `@anthropic-ai/claude-code`. Research confirms these are the **same package** -- `@anthropic-ai/claude-code` was renamed to `@anthropic-ai/claude-agent-sdk`. The project already has `@anthropic-ai/claude-agent-sdk` installed (Phase 12). No migration needed. The existing code is already using the correct package.

## Open Questions

1. **Plugin directory location**
   - What we know: Agent SDK plugins must have `.claude-plugin/plugin.json`. Commands go in `commands/*.md`.
   - What's unclear: Should the GSD plugin directory be inside the Eluma repo (e.g., `gsd-plugin/`) or at a configurable external path?
   - Recommendation: Place inside the repo at `gsd-plugin/` for simplicity. Make the path configurable via environment variable (`GSD_PLUGIN_PATH`) for flexibility.

2. **Command prompt template interpolation**
   - What we know: Commands need project-specific context (name, phase, description) injected into the prompt template.
   - What's unclear: Should interpolation happen client-side or server-side?
   - Recommendation: Server-side. The client sends `commandId` + `projectId`, the server reads the command template, fetches project state, interpolates variables, and passes the final prompt to the Agent SDK. This prevents the client from needing to know the full prompt.

3. **How many initial GSD commands to ship**
   - What we know: The system needs at least enough commands to demonstrate context-dependent filtering.
   - What's unclear: Which specific commands should exist at launch?
   - Recommendation: Start with 5-7 commands covering the main lifecycle actions: Plan Phase, Research Phase, Analyze Code, Generate Docs, Review Progress, Advance Phase, Run Workflow Step. This is enough to exercise all filtering dimensions (phase, workflow state, mode).

4. **Command palette scope -- global or per-project?**
   - What we know: Cmd+K should search and execute GSD commands. Feature spec says "any GSD command."
   - What's unclear: Should the palette show project-specific commands only (when viewing a project) or also global actions (New Project, New Idea)?
   - Recommendation: Start project-scoped (filtered to current project). Add global actions in a follow-up. The palette is rendered inside ProjectDetail, so project context is natural.

5. **Pause/resume UX -- where does the button go?**
   - What we know: GSD-05 requires a Pause button during active work and a Resume button later.
   - What's unclear: Is Pause a button in the AgentPanel? In the GsdButtonBar? Floating?
   - Recommendation: Pause goes inside AgentPanel (next to the existing Cancel button, but instead of canceling, it pauses). Resume appears in the GsdButtonBar as a context-dependent command (shown when a paused session exists for the project).

## Sources

### Primary (HIGH confidence)
- [Agent SDK TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript) -- Full API: query(), Options, plugins, resume, SDKMessage types, tool permissions
- [Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview) -- Capabilities, plugin loading, session management, subagents
- [Agent SDK Plugins](https://platform.claude.com/docs/en/agent-sdk/plugins) -- Plugin directory structure, loading via SDK, command namespacing, verification
- [Agent SDK Sessions](https://platform.claude.com/docs/en/agent-sdk/sessions) -- Session ID capture from init message, resume via `resume` option, forkSession
- [cmdk GitHub (pacocoursey/cmdk)](https://github.com/pacocoursey/cmdk) -- API components, filtering, keyboard nav, v1.0.0 breaking changes
- Existing Eluma codebase -- Direct inspection of session-manager.ts, routes/agent.ts, useAgentStream.ts, useMode.ts, workflow definitions, project reducer

### Secondary (MEDIUM confidence)
- [Agent SDK Migration Guide](https://platform.claude.com/docs/en/agent-sdk/migration-guide) -- claude-code to claude-agent-sdk rename details
- [cmdk npm](https://www.npmjs.com/package/cmdk) -- Package info, version, size

### Tertiary (LOW confidence)
- User's stated preference for @anthropic-ai/claude-code -- Resolved: same package, already using it under new name

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Agent SDK already installed, cmdk is well-documented and widely used
- Architecture: HIGH -- Plugin system and session resume are official SDK features with documentation and examples
- Command filtering: MEDIUM -- Custom logic, but straightforward derivation from existing project/workflow state reducers
- Pause/resume: MEDIUM -- Agent SDK session resume is documented but the "pause" UX layer is custom
- Pitfalls: HIGH -- Based on known patterns from prior phases and official docs

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days -- Agent SDK is pre-1.0 but patterns are stable)
