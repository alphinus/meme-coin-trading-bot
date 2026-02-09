# Phase 12: Infrastructure & Safety - Research

**Researched:** 2026-02-09
**Domain:** Claude Agent SDK integration, PM2 tuning, SSE streaming, tool permissions, graceful shutdown
**Confidence:** HIGH

## Summary

Phase 12 establishes the backend infrastructure for running Claude Agent SDK sessions safely. The phase covers five requirements: installing the Agent SDK and proving `query()` works (INFRA-01), raising PM2 memory limits to prevent crash-restart loops (INFRA-02), fixing SSE compression buffering (INFRA-03), implementing `canUseTool` permission handling with an explicit tool allowlist (INFRA-04), and adding graceful shutdown with session cleanup (INFRA-05).

The critical finding from this research is that `allowedTools` in the Agent SDK does NOT restrict tool availability when using `permissionMode: 'bypassPermissions'` -- all permission checks including `allowedTools` and `disallowedTools` are silently ignored in bypass mode. This means the user's decision to use `canUseTool` (not `bypassPermissions`) is not just a "nice to have" but is the ONLY way to enforce tool restrictions. The `canUseTool` callback receives every tool invocation and must return `{behavior: 'allow', updatedInput}` or `{behavior: 'deny', message}`. Additionally, `allowedTools` controls permissioning only, not tool availability -- the agent still "sees" all tools in its context. To truly remove tools from the agent's context, use `disallowedTools`. The recommended approach is to combine `disallowedTools` (to hide tools from context) with `canUseTool` (to enforce runtime permission checks on allowed tools).

The Agent SDK spawns a new Node.js child process for each `query()` call with approximately 12 seconds of cold-start overhead. Each session can consume 200MB-1GB+ of memory in the child process tree. The existing PM2 `max_memory_restart` of 500MB is dangerously low -- a single agent session could trigger a restart. Memory must be raised to at least 1.5GB, with `--max-old-space-size` configured accordingly. Known memory leak issues exist in Claude Code (issue #22188, heap growing to 93GB in extreme cases), making the `maxTurns` and `maxBudgetUsd` safety limits essential.

**Primary recommendation:** Use `canUseTool` with `permissionMode: 'default'` (NOT `bypassPermissions`). Use `disallowedTools` to remove dangerous tools from agent context. Use `res.flush()` after every SSE write (not a filter approach). Set PM2 memory to 1.5GB with `--max-old-space-size=2048`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Tool permissions
- Single global allowlist for all agent sessions (not per-command)
- Full Bash access allowed -- agents need it for npm, git, builds
- WebSearch and WebFetch allowed -- agents need web access for research commands
- Only rejected tool calls are logged (not all calls) -- keeps logs clean, surfaces issues
- Global allowlist only for now -- no per-user or per-project restrictions
- Allowlist config approach and dangerous command blocking: Claude's Discretion

#### Memory & resource limits
- PM2 memory limit to be raised from 500MB -- Claude picks the right number based on Agent SDK usage
- No per-session timeout -- sessions run to completion (GSD workflows can be long-running)
- PM2 handles memory overflows -- if limit exceeded, PM2 restarts the process and session is lost
- One concurrent agent session per project -- multiple projects can run in parallel

#### SSE streaming behavior
- Regular heartbeat/keepalive pings to detect dead connections
- Event IDs included from the start -- sequential IDs per stream, prepares for Phase 13 reconnection
- Structured JSON payloads for all SSE events (e.g., `{type: 'token', data: '...'}`) -- client parses and renders
- Compression fix approach: Claude's Discretion (disable for SSE routes vs flush-on-write)

#### Shutdown & cleanup
- Grace period on SIGTERM: Claude's Discretion (pick reasonable duration)
- Send a final SSE event notifying clients their session was interrupted before closing connection
- Interrupted sessions marked as 'interrupted' -- user sees status and can choose to retry on next visit
- Orphaned resource cleanup strategy: Claude's Discretion

### Claude's Discretion
- PM2 memory limit value (based on Agent SDK profiling)
- Tool rejection behavior (silent vs error response to agent)
- Allowlist config mechanism (static vs hot-reload)
- Dangerous Bash command blocking patterns
- Compression fix approach (disable vs flush-on-write)
- SIGTERM grace period duration
- Orphaned artifact cleanup strategy
- Heartbeat interval

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/claude-agent-sdk` | ^0.2.37 | Programmatic Claude Code agent sessions | Official Anthropic SDK. Provides `query()` async generator with streaming, typed `SDKMessage` objects, `canUseTool` permission handler, `AbortController` support. Eliminates spawn/TTY bugs. |
| `compression` | ^1.7.5 | Express response compression | Already installed. Needs `res.flush()` calls for SSE compatibility. |
| `express` | ^4.21.0 | HTTP server | Already installed. Native SSE via `res.write()` + `res.flush()`. |
| PM2 | (system) | Process manager | Already in use. `ecosystem.config.cjs` needs memory limit increase + `node_args`. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `strip-ansi` | ^7.1.0 | Remove ANSI escape codes from Bash tool output | When forwarding Bash tool output over SSE to browser. Prevents garbled terminal colors in UI. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `res.flush()` per write | `compression({ filter })` to skip SSE | Filter approach requires matching on request headers which can be fragile; `res.flush()` is the official recommended approach from `expressjs/compression` maintainer |
| `canUseTool` callback | `bypassPermissions` + `allowedTools` | `allowedTools` does NOT work with `bypassPermissions` (all checks silently skipped). Must use `canUseTool` for real enforcement. |
| `disallowedTools` array | `allowedTools` array | `allowedTools` only controls permissions, not tool visibility. `disallowedTools` actually removes tools from the agent's context window. |

**Installation:**
```bash
npm install @anthropic-ai/claude-agent-sdk -w server
npm install strip-ansi -w server
```

## Architecture Patterns

### Recommended Project Structure
```
server/src/
  agent/                          # NEW: Claude Agent SDK integration
    session-manager.ts            # Session lifecycle (start, track, abort, cleanup)
    tool-permissions.ts           # canUseTool handler + allowlist config
    sse-writer.ts                 # SSE response writer with flush, heartbeat, event IDs
    types.ts                      # Agent-specific TypeScript types
  routes/
    agent.ts                      # NEW: /api/agent/* endpoints (start, stream, abort)
```

### Pattern 1: canUseTool Permission Handler
**What:** A `canUseTool` callback that checks every tool invocation against a global allowlist. Returns `{behavior: 'allow', updatedInput}` for allowed tools and `{behavior: 'deny', message}` for rejected ones. Logs only rejections.
**When to use:** Every `query()` call must pass this handler.

```typescript
// Source: https://platform.claude.com/docs/en/agent-sdk/typescript
import type { CanUseTool, PermissionResult, ToolInput } from "@anthropic-ai/claude-agent-sdk";

// Global allowlist -- single source of truth
const ALLOWED_TOOLS: ReadonlySet<string> = new Set([
  "Read", "Glob", "Grep",            // File reading
  "Edit", "Write",                    // File writing (within cwd)
  "Bash",                             // Shell access (with command filtering)
  "WebSearch", "WebFetch",            // Web access
  "Task",                             // Subagent delegation
  "TodoWrite",                        // Task tracking
]);

// Dangerous Bash command patterns to block
const DANGEROUS_BASH_PATTERNS: RegExp[] = [
  /\brm\s+-rf\s+[\/~]/i,            // rm -rf / or ~/
  /\bsudo\b/i,                       // Any sudo usage
  /\bcurl\b.*\|\s*(?:ba)?sh/i,      // curl | sh (pipe to shell)
  /\bchmod\s+[0-7]*777\b/i,         // chmod 777
  />\s*\/etc\//i,                    // Write to /etc/
  /\bkill\s+-9\b/i,                 // kill -9
  /\bmkfs\b/i,                      // Filesystem format
  /\bdd\s+if=/i,                    // dd disk operations
];

export const canUseTool: CanUseTool = async (
  toolName: string,
  input: ToolInput,
  _options
): Promise<PermissionResult> => {
  // Check global allowlist
  if (!ALLOWED_TOOLS.has(toolName)) {
    console.warn(`[agent] Tool rejected: ${toolName}`);
    return {
      behavior: "deny",
      message: `Tool "${toolName}" is not in the allowed tools list.`,
    };
  }

  // Additional Bash command filtering
  if (toolName === "Bash" && "command" in input) {
    const cmd = (input as { command: string }).command;
    for (const pattern of DANGEROUS_BASH_PATTERNS) {
      if (pattern.test(cmd)) {
        console.warn(`[agent] Dangerous Bash command blocked: ${cmd}`);
        return {
          behavior: "deny",
          message: `Command blocked by security policy: ${cmd.slice(0, 80)}`,
        };
      }
    }
  }

  return { behavior: "allow", updatedInput: input };
};
```

**Confidence: HIGH** -- `canUseTool` API verified from official SDK docs at platform.claude.com/docs/en/agent-sdk/typescript. The `PermissionResult` type signature confirmed as `{behavior: 'allow', updatedInput} | {behavior: 'deny', message}`.

### Pattern 2: SSE Writer with Event IDs and Heartbeat
**What:** A utility that writes SSE events to an Express response with sequential event IDs, structured JSON payloads, and periodic heartbeat pings. Calls `res.flush()` after every write.
**When to use:** All SSE streaming endpoints.

```typescript
// Source: MDN SSE spec + expressjs/compression#17
interface SSEWriter {
  send(type: string, data: unknown): void;
  close(): void;
}

function createSSEWriter(res: express.Response): SSEWriter {
  let eventId = 0;
  let closed = false;

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering if present
  res.flushHeaders();

  // Heartbeat every 15 seconds
  const heartbeat = setInterval(() => {
    if (closed) return;
    res.write(": heartbeat\n\n");
    (res as any).flush?.();
  }, 15_000);

  return {
    send(type: string, data: unknown) {
      if (closed) return;
      eventId++;
      res.write(`id: ${eventId}\nevent: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
      (res as any).flush?.(); // Critical: force compression middleware to flush
    },
    close() {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
    },
  };
}
```

**Confidence: HIGH** -- SSE protocol format verified from MDN. `res.flush()` approach confirmed by `expressjs/compression` maintainer in issue #17.

### Pattern 3: Query Configuration for Safe Sessions
**What:** The correct `query()` options configuration that combines `canUseTool` with proper permission mode.
**When to use:** Every agent session start.

```typescript
// Source: https://platform.claude.com/docs/en/agent-sdk/typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

const abortController = new AbortController();

const agentQuery = query({
  prompt: userPrompt,
  options: {
    cwd: projectDirectory,
    abortController,
    includePartialMessages: true,    // Required for streaming text deltas
    permissionMode: "default",       // NOT bypassPermissions -- allows canUseTool to work
    canUseTool,                      // Permission handler from Pattern 1
    disallowedTools: [               // Remove dangerous tools from agent context entirely
      "KillBash",                    // No killing other processes
      "NotebookEdit",               // Not needed
      "ExitPlanMode",               // Not relevant
      "AskUserQuestion",            // Agent runs headlessly, cannot ask user
    ],
    maxTurns: 50,                   // Safety limit -- prevents infinite loops
    maxBudgetUsd: 5.0,             // Cost cap per session
    settingSources: [],             // No filesystem settings -- fully programmatic
    systemPrompt: {
      type: "preset",
      preset: "claude_code",
      append: "You are running as an automated agent. Do not ask questions. Complete the task autonomously.",
    },
  },
});
```

**CRITICAL FINDING:** The `permissionMode` must be `"default"`, NOT `"bypassPermissions"`. When `bypassPermissions` is used, ALL permission checks are skipped including `allowedTools`, `disallowedTools`, AND `canUseTool`. This was confirmed in GitHub issue #115: "The issue here is that you're using permissionMode: 'bypassPermissions' which means all permission checks are skipped." The `canUseTool` handler only fires when `permissionMode` is `"default"` or `"acceptEdits"`.

**Confidence: HIGH** -- Verified via official SDK docs + GitHub issue #115 resolution.

### Pattern 4: Graceful Shutdown with Session Cleanup
**What:** Extend existing `gracefulShutdown` in `app.ts` to abort all active agent sessions, send interrupt events to SSE clients, and wait for cleanup before exit.
**When to use:** SIGTERM/SIGINT handlers.

```typescript
// Extend existing gracefulShutdown in app.ts
const gracefulShutdown = async () => {
  console.log("Shutting down gracefully...");

  // 1. Abort all active agent sessions
  const activeSessionIds = agentSessions.getActiveSessions();
  for (const sessionId of activeSessionIds) {
    const session = agentSessions.get(sessionId);
    if (session) {
      // Send final SSE event to connected clients
      session.sseWriter?.send("interrupted", {
        type: "interrupted",
        message: "Server shutting down",
      });
      // Abort the SDK query (kills child process)
      session.abortController.abort();
    }
  }

  // 2. Wait for sessions to clean up (grace period)
  await Promise.race([
    agentSessions.waitForAllCleanup(),
    new Promise(resolve => setTimeout(resolve, 10_000)), // 10s hard timeout
  ]);

  // 3. Existing cleanup
  await stopMemoryWatcher();

  process.exit(0);
};
```

**Confidence: HIGH** -- AbortController cleanup pattern verified from Node.js docs and Agent SDK docs. Grace period pattern from Express official guidance.

### Anti-Patterns to Avoid
- **Using `bypassPermissions` with `canUseTool`:** The `canUseTool` handler is never called when `bypassPermissions` is active. This is the most dangerous misconfiguration.
- **Relying on `allowedTools` alone for security:** `allowedTools` controls permissioning only, not tool availability. The agent still "sees" all tools. Use `disallowedTools` to remove tools from context.
- **Writing SSE without `res.flush()`:** Express `compression` middleware buffers all output. Without `flush()`, SSE events arrive in bursts (sometimes minutes delayed) instead of streaming.
- **Calling `process.exit(0)` without aborting agent sessions:** The Agent SDK spawns child processes. Without explicit abort, child processes become orphans consuming memory and API tokens.
- **Setting PM2 memory limit without `node_args`:** V8 heap defaults may cause OOM before PM2's RSS check triggers. Both must be configured together.

## Discretion Recommendations

Based on research, here are my recommendations for all Claude's Discretion items:

### PM2 Memory Limit: 1536MB (1.5GB)
**Rationale:** The Agent SDK spawns a child process per `query()` call. The child process itself can consume 200MB-1GB depending on session complexity. The parent Express server uses ~150-300MB baseline. With one concurrent session per project, total RSS can reach 800MB-1.2GB. Setting 1.5GB provides headroom. Also add `"node_args": "--max-old-space-size=2048"` to prevent V8 OOM before PM2 catches it.

### Tool Rejection: Error Response to Agent
**Rationale:** When `canUseTool` returns `{behavior: 'deny', message}`, the Agent SDK feeds this message back to the agent as a tool error result. The agent sees the rejection reason and adapts -- e.g., it tries a different approach instead of re-attempting the same tool. This is better than silent rejection because the agent can self-correct. This is the SDK's built-in behavior; no extra work needed.

### Allowlist Config: Static (hardcoded in source)
**Rationale:** The allowlist is a security boundary. Hot-reload introduces a window where a misconfigured allowlist could run in production. For 2 users on a self-hosted system, a code change + deploy is the right ceremony for changing the security boundary. Extract to a constant (not a config file), co-located with the `canUseTool` handler for auditability.

### Dangerous Bash Command Blocking: Regex Pattern Matching
**Rationale:** Block commands matching patterns for destructive operations (`rm -rf /`, `sudo`, `curl | sh`, `chmod 777`, writes to `/etc/`). This is defense-in-depth -- `canUseTool` is the primary gate, regex patterns are the secondary filter. The patterns should be intentionally narrow (block obvious destructive commands) rather than trying to build a comprehensive shell parser, which is impossible.

### Compression Fix: `res.flush()` After Every Write
**Rationale:** The `expressjs/compression` maintainer explicitly recommends `res.flush()` over filter-based approaches (issue #17). The `filter` approach requires matching on request headers which can be fragile with proxies. `res.flush()` is one line per write, works universally, and is the documented API. The compression module itself adds the `flush()` method to the response.

### SIGTERM Grace Period: 10 Seconds
**Rationale:** PM2 sends SIGTERM first, then waits `kill_timeout` (default 1600ms) before SIGKILL. We must configure `kill_timeout: 15000` in ecosystem.config.cjs to give our 10-second grace period room. During the 10 seconds: abort all agent sessions (triggers child process cleanup), send interrupt SSE events, wait for in-flight writes to complete. If cleanup exceeds 10 seconds, `process.exit(0)` forces exit before PM2's SIGKILL.

### Orphaned Artifact Cleanup: On-Startup Scan
**Rationale:** When PM2 restarts the server (after SIGKILL or crash), any in-memory session state is lost. On startup, scan for any sessions marked as "running" in the event store and mark them as "interrupted". There are no persistent child processes to clean up because PM2 SIGKILL terminates the entire process tree. The only artifacts are stale state in the event store.

### Heartbeat Interval: 15 Seconds
**Rationale:** SSE connections through proxies (including Cloudflare Tunnel mentioned in prior research) typically have 60-120 second idle timeouts. A 15-second heartbeat is well within this window. The SSE spec uses `: comment\n\n` format for keepalive which does not fire EventSource event handlers. This is the standard interval used by most SSE implementations.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tool permission enforcement | Custom middleware checking tool names | Agent SDK `canUseTool` callback | SDK provides typed `PermissionResult`, feeds denial reasons back to agent, handles all edge cases including subagent tool calls |
| SSE protocol formatting | Custom string concatenation | Structured `createSSEWriter()` utility | SSE format is finicky (exact newline counts, field order). One utility prevents format bugs across all SSE endpoints. |
| Process lifecycle management | Manual `child_process.spawn` + signal handling | Agent SDK `query()` + `AbortController` | SDK handles process spawning, stdio piping, signal forwarding, and cleanup internally. Known spawn bugs (#771, #6775) are solved. |
| ANSI escape code stripping | Custom regex | `strip-ansi` npm package | Edge cases with cursor movement codes, 256-color codes, and hyperlink sequences. The package handles all of these. |
| SSE event ID generation | UUID per event | Sequential integer counter per stream | SSE spec expects `Last-Event-ID` to be comparable for resumption. Sequential integers are simpler and enable "replay from ID N" logic in Phase 13. |

**Key insight:** The Agent SDK already handles the hardest infrastructure problems (process spawning, signal forwarding, typed message parsing, abort control). Phase 12's job is to configure it correctly and wrap it in SSE, not to build process management from scratch.

## Common Pitfalls

### Pitfall 1: bypassPermissions Silently Disables canUseTool
**What goes wrong:** Developer sets `permissionMode: 'bypassPermissions'` along with `canUseTool` handler, thinking both are active. The handler is never called. All tools run unrestricted.
**Why it happens:** The SDK docs show `bypassPermissions` as the primary CI/CD pattern. It seems like the "easy mode" for headless operation.
**How to avoid:** Use `permissionMode: 'default'`. The `canUseTool` handler replaces the interactive permission prompt -- when it returns `allow`, no user interaction is needed.
**Warning signs:** No rejection logs appearing even for obviously blocked tools. Agent executing Bash commands that should be filtered.

### Pitfall 2: Compression Middleware Buffering SSE
**What goes wrong:** SSE events accumulate in the compression buffer and arrive at the client in large batches (sometimes 30+ seconds delayed) instead of streaming in real time.
**Why it happens:** Express `compression()` middleware is registered before all routes in `app.ts` (line 63). It buffers output to achieve better compression ratios. SSE requires immediate delivery.
**How to avoid:** Call `(res as any).flush?.()` after every `res.write()` in SSE endpoints. The compression module adds this method.
**Warning signs:** Client receives bursts of events after long silences. Events arrive only when the connection closes.

### Pitfall 3: PM2 Restarting Server During Agent Session
**What goes wrong:** Agent SDK child process pushes parent Express server past PM2's `max_memory_restart` limit. PM2 restarts the server. The agent session is killed. The user sees an interrupted session with no explanation.
**Why it happens:** Current PM2 limit is 500MB. Agent SDK child processes can add 200MB-1GB to the process tree RSS. PM2 checks memory every 30 seconds.
**How to avoid:** Set `max_memory_restart: "1536M"` and `node_args: "--max-old-space-size=2048"` in `ecosystem.config.cjs`. Also set `kill_timeout: 15000` for graceful shutdown.
**Warning signs:** PM2 logs showing "Process exceeded memory limit" during agent sessions. Frequent restarts visible in `pm2 logs`.

### Pitfall 4: 12-Second Cold Start Per Query
**What goes wrong:** Each `query()` call has ~12 seconds of overhead for process initialization. Users experience a long delay before any streaming output appears.
**Why it happens:** The Agent SDK spawns a fresh Node.js child process for every `query()` call with no hot process reuse (confirmed in GitHub issue #34).
**How to avoid:** Accept the cold start for now -- there is no workaround for single-prompt sessions. In Phase 13+, use streaming input mode to keep the subprocess alive between messages for ~2-3s response times on subsequent turns. For Phase 12, show a "Starting agent session..." loading state to the user during the cold start.
**Warning signs:** Users thinking the system is broken during the 12-second silence.

### Pitfall 5: Orphaned Agent Processes After Crash
**What goes wrong:** If the Express server crashes or PM2 sends SIGKILL (after timeout), the Agent SDK child process becomes an orphan. It continues running, consuming API tokens and memory, with no parent to clean it up.
**Why it happens:** Node.js child processes survive parent crash. SIGKILL cannot be caught for cleanup.
**How to avoid:** Use AbortController timeout as a secondary safety net. On startup, the server should check for orphaned `claude` processes. The on-startup scan marks stale sessions as "interrupted". For SIGKILL resilience, PM2's `kill_timeout: 15000` gives the graceful handler time to abort children before SIGKILL fires.
**Warning signs:** `ps aux | grep claude` shows processes with no parent Express server running.

### Pitfall 6: Event IDs Not Sequential Across Reconnections
**What goes wrong:** If event IDs reset to 0 on reconnection, the client receives duplicate events. If IDs are UUIDs, the client cannot request "replay from ID N".
**Why it happens:** Per the SSE spec, the client sends `Last-Event-ID` header on reconnection. The server must track where each client left off.
**How to avoid:** Use sequential integers per stream (starting from 1). Store the event buffer in the session manager. On reconnection, client sends `Last-Event-ID`, server replays events from that ID forward. Phase 12 establishes the ID format; Phase 13 implements the replay logic.
**Warning signs:** Client showing duplicate events after network blip.

## Code Examples

Verified patterns from official sources:

### Agent SDK Query with canUseTool
```typescript
// Source: https://platform.claude.com/docs/en/agent-sdk/typescript
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { CanUseTool, PermissionResult, ToolInput } from "@anthropic-ai/claude-agent-sdk";

const canUseTool: CanUseTool = async (
  toolName: string,
  input: ToolInput,
  options: { signal: AbortSignal }
): Promise<PermissionResult> => {
  if (!ALLOWED_TOOLS.has(toolName)) {
    return { behavior: "deny", message: `Tool "${toolName}" is not allowed.` };
  }
  return { behavior: "allow", updatedInput: input };
};

const agentQuery = query({
  prompt: "Analyze this codebase",
  options: {
    cwd: "/path/to/project",
    permissionMode: "default",   // Required for canUseTool to fire
    canUseTool,
    disallowedTools: ["KillBash", "NotebookEdit", "ExitPlanMode", "AskUserQuestion"],
    includePartialMessages: true,
    abortController: new AbortController(),
    maxTurns: 50,
    maxBudgetUsd: 5.0,
    settingSources: [],
  },
});

// Consume as async generator
for await (const message of agentQuery) {
  // message is SDKMessage union type
  if (message.type === "stream_event") {
    // Forward partial text to SSE client
  } else if (message.type === "result") {
    // Session complete or errored
  }
}
```

### SSE Endpoint with Compression Flush
```typescript
// Source: expressjs/compression#17 + MDN SSE spec
import express from "express";

app.get("/api/agent/stream/:sessionId", requireAuth, (req, res) => {
  const { sessionId } = req.params;
  const session = agentSessions.get(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let eventId = 0;
  const sendEvent = (type: string, data: unknown) => {
    eventId++;
    res.write(`id: ${eventId}\nevent: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    (res as any).flush?.(); // Force compression flush
  };

  // Heartbeat
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
    (res as any).flush?.();
  }, 15_000);

  // Forward session events
  const onData = (event: SSEEvent) => sendEvent(event.type, event);
  session.emitter.on("data", onData);

  // Replay buffered events
  for (const event of session.buffer) {
    sendEvent(event.type, event);
  }

  // Cleanup on disconnect
  req.on("close", () => {
    clearInterval(heartbeat);
    session.emitter.off("data", onData);
  });
});
```

### PM2 Ecosystem Config Update
```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "eluma",
      script: "./server/dist/server/src/index.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "1536M",          // Raised from 500M
      kill_timeout: 15000,                   // 15s for graceful shutdown
      node_args: "--max-old-space-size=2048", // V8 heap limit
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      error_file: "./logs/eluma-error.log",
      out_file: "./logs/eluma-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
```

### Graceful Shutdown Integration
```typescript
// In app.ts -- extend existing gracefulShutdown
import { agentSessions } from "./agent/session-manager.js";

const SHUTDOWN_TIMEOUT_MS = 10_000;

const gracefulShutdown = async () => {
  console.log("Shutting down gracefully...");

  // Abort all active agent sessions and notify SSE clients
  agentSessions.shutdownAll("Server shutting down");

  // Wait for cleanup with hard timeout
  await Promise.race([
    agentSessions.waitForAllCleanup(),
    new Promise(resolve => setTimeout(resolve, SHUTDOWN_TIMEOUT_MS)),
  ]);

  // Existing cleanup
  await stopMemoryWatcher();

  process.exit(0);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `child_process.spawn('claude', ...)` | `@anthropic-ai/claude-agent-sdk` `query()` | 2025-Q4 | Eliminates TTY hang bugs, provides typed messages, built-in abort |
| `bypassPermissions` for headless | `canUseTool` handler with `permissionMode: 'default'` | 2025 (SDK maturation) | Essential for security; bypass mode skips ALL checks |
| `allowedTools` for restriction | `disallowedTools` for removal + `canUseTool` for enforcement | 2026-01 (issue #115, #19 clarifications) | `allowedTools` only controls permissions, not visibility. `disallowedTools` removes from context. |
| Single `query()` per message | Streaming input mode for multi-turn | 2026 (V2 preview) | Cold start: 12s. Warm: 2-3s. Phase 13+ can use this. |

**Deprecated/outdated:**
- `permissionMode: 'bypassPermissions'` with `canUseTool`: The handler is silently ignored. Do not combine.
- `allowedTools` as security boundary: It is a permission hint, not an enforcement mechanism when used alone.

## Open Questions

1. **ANTHROPIC_API_KEY Compatibility**
   - What we know: The Agent SDK uses the Claude Code CLI internally, which reads `ANTHROPIC_API_KEY` from the environment. The existing AI SDK v6 in the project uses `@ai-sdk/anthropic` which also reads the same env var.
   - What's unclear: Whether both SDKs can share the same API key, or if the Agent SDK requires a separate key type (e.g., Max plan key vs API key).
   - Recommendation: Test during INFRA-01 implementation. If keys conflict, use the SDK's `env` option to pass a separate key to the child process.

2. **ViteExpress SSE Proxy in Development**
   - What we know: ViteExpress proxies API requests from the Vite dev server to Express. Standard HTTP works fine.
   - What's unclear: Whether SSE long-lived connections are properly proxied through ViteExpress, or if they hit timeout/buffering issues in dev mode.
   - Recommendation: Test SSE endpoint in dev mode during INFRA-03 implementation. If issues arise, add a direct Express endpoint bypass for SSE.

3. **PM2 Memory Measurement Accuracy**
   - What we know: PM2 checks RSS every 30 seconds. Agent SDK spawns child processes.
   - What's unclear: Whether PM2's RSS check includes child process memory in the measurement. If it only monitors the parent process, the 1.5GB limit may not be enough.
   - Recommendation: Profile actual memory during a test session. Adjust limit based on observed total RSS.

## Sources

### Primary (HIGH confidence)
- [Claude Agent SDK TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript) -- Complete API: `query()`, `Options`, `CanUseTool`, `PermissionResult`, `SDKMessage`, `disallowedTools`. Fetched 2026-02-09.
- [expressjs/compression#17](https://github.com/expressjs/compression/issues/17) -- `res.flush()` is the official solution for SSE + compression. Maintainer confirmed.
- [MDN Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) -- SSE protocol format: `id:`, `event:`, `data:`, `retry:`, comment keepalive.
- [Express Compression Middleware Docs](https://expressjs.com/en/resources/middleware/compression.html) -- `filter` option, `res.flush()` method, `threshold`, configuration.
- [@anthropic-ai/claude-agent-sdk npm](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) -- v0.2.37, verified 2026-02-09.
- Existing Eluma codebase: `ecosystem.config.cjs`, `server/src/app.ts`, `server/src/index.ts`, `server/src/middleware/auth.ts`, `server/src/events/store.ts`, `server/package.json`.

### Secondary (MEDIUM confidence)
- [GitHub issue #115: allowedTools does not restrict built-in tools](https://github.com/anthropics/claude-agent-sdk-typescript/issues/115) -- Confirmed: `bypassPermissions` skips ALL checks including `allowedTools`. Closed as completed with maintainer explanation.
- [GitHub issue #19: allowedTools does not work](https://github.com/anthropics/claude-agent-sdk-typescript/issues/19) -- Confirmed: `allowedTools` controls permissioning, not tool visibility. `disallowedTools` is the workaround.
- [GitHub issue #34: 12-second overhead per query()](https://github.com/anthropics/claude-agent-sdk-typescript/issues/34) -- Confirmed cold start overhead. Streaming input mode recommended for multi-turn.
- [PM2 Memory Limit Documentation](https://pm2.keymetrics.io/docs/usage/memory-limit/) -- 30-second polling interval, `max_memory_restart`, `kill_timeout`.
- [Express Graceful Shutdown Guide](https://expressjs.com/en/advanced/healthcheck-graceful-shutdown.html) -- `server.close()` pattern, cleanup handlers.

### Tertiary (LOW confidence)
- [GitHub issue #22188: Claude Code 93GB heap leak](https://github.com/anthropics/claude-code/issues/22188) -- Extreme case. Closed as duplicate. Shows worst-case memory behavior. Validates need for `maxTurns` and `maxBudgetUsd` safety limits. Affected v2.1.27 with 4 concurrent instances on large project.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Agent SDK v0.2.37 API fully documented, verified on npm. Compression middleware behavior confirmed.
- Architecture: HIGH -- `canUseTool`, SSE, PM2 config patterns all verified against official sources.
- Pitfalls: HIGH -- `bypassPermissions` + `canUseTool` conflict confirmed via 2 GitHub issues. Compression buffering confirmed via maintainer. Memory concerns validated against PM2 docs.

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (Agent SDK is pre-1.0, API could change. Monitor changelog.)
