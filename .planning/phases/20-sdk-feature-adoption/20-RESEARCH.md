# Phase 20: SDK Feature Adoption - Research

**Researched:** 2026-02-10
**Domain:** Claude Agent SDK session lifecycle, stop reason surfacing, session persistence/recovery, deterministic IDs, auth health check
**Confidence:** HIGH

## Summary

Phase 20 adopts four Agent SDK features that improve the agent session user experience: (1) surfacing stop reasons so users know WHY a session ended, (2) recovering resumable sessions after server restart by scanning the SDK's filesystem-persisted session JSONL files, (3) using deterministic session IDs based on project ID so pause/resume is stable across restarts, and (4) calling `accountInfo()` at server startup to validate the auth token before any user triggers a session.

The codebase is well-prepared for this phase. Phase 13 built the full session manager with SSE streaming, and Phase 19 migrated all AI calls to the Agent SDK. The session manager (`server/src/agent/session-manager.ts`) already captures the SDK session ID from init messages, supports pause/resume with the SDK `resume` option, and forwards structured SSE events through the adapter. The four Phase 20 features are additive enhancements to this existing architecture -- no rewrites needed.

The Agent SDK v0.2.38 provides all required primitives: `SDKResultMessage` carries `subtype` fields (`success`, `error_max_turns`, `error_max_budget_usd`, `error_during_execution`, `error_max_structured_output_retries`) that map directly to user-visible stop reasons; `Options.sessionId` accepts a custom UUID for deterministic session IDs; `Options.persistSession` (default `true`) causes sessions to be written as JSONL files to `~/.claude/projects/{project-slug}/`; and `Query.accountInfo()` returns `AccountInfo` with `email`, `organization`, `subscriptionType`, and `tokenSource` fields.

**Primary recommendation:** Implement the four requirements as two plans: Plan 20-01 (stop reasons + deterministic IDs -- both are session-manager + SSE adapter changes), Plan 20-02 (session recovery on restart + auth health check -- both are server startup changes).

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/claude-agent-sdk` | ^0.2.38 | All four features use SDK primitives | Already installed; provides sessionId, accountInfo(), SDKResultMessage subtypes, persistSession |
| `crypto` | built-in | `createHash('sha256')` for deterministic UUID v5-style IDs from project ID | Standard Node.js, zero dependencies |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `fs/promises` | built-in | Read JSONL session files from `~/.claude/projects/` at startup | Session recovery (SDKF-02) |
| `os` | built-in | `os.homedir()` to locate `~/.claude/projects/` | Session file discovery |
| `path` | built-in | Path manipulation for session file locations | Session file discovery |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Reading JSONL files directly | SDK's `unstable_v2_resumeSession()` | v2 API is marked `@alpha` and `UNSTABLE` -- filesystem scan is more reliable for discovery |
| SHA-256 deterministic ID | UUID v5 (`uuid` package) | SHA-256 is already available via `crypto`, avoids new dependency; truncate to UUID format |
| `accountInfo()` via Query | Manual token validation HTTP call | `accountInfo()` is the SDK's blessed approach, returns structured data |

**Installation:**
```bash
# No new packages needed -- all dependencies already available
```

## Architecture Patterns

### Current Session Architecture

```
server/src/
  agent/
    session-manager.ts    # AgentSessionManager singleton (Map<id, AgentSession>)
    sse-adapter.ts        # SDKMessage -> flat SSE events (text, tool_start, result, error)
    types.ts              # AgentSession, SSEEvent, PausedSessionInfo types
    auth-check.ts         # checkAgentAuth() -- env var check at boot
    warm-session.ts       # WarmAgentSession singleton for lightweight AI calls
    tool-permissions.ts   # canUseTool callback
  routes/
    agent.ts              # REST + SSE routes for session lifecycle
  app.ts                  # Server startup: checkAgentAuth(), warmSession.start()
client/src/
  hooks/useAgentStream.ts # SSE EventSource connection management
  components/
    AgentPanel.tsx         # Prompt input + session lifecycle UI
    AgentOutput.tsx        # Streaming output + result display
```

### Pattern 1: Stop Reason Extraction from SDKResultMessage

**What:** The SDK's `SDKResultMessage` union type (`SDKResultSuccess | SDKResultError`) carries a `subtype` field that encodes why the session ended. Currently, the SSE adapter maps this to either `result` or `error` events but does not include the specific stop reason.

**When to use:** Every time a session ends -- the SSE adapter should include the stop reason in the event data, and the UI should display it.

**SDK type reference (from `sdk.d.ts`):**
```typescript
// SDKResultSuccess
export declare type SDKResultSuccess = {
  type: 'result';
  subtype: 'success';
  stop_reason: string | null;  // e.g., "end_turn", "stop_sequence"
  // ...
};

// SDKResultError
export declare type SDKResultError = {
  type: 'result';
  subtype: 'error_during_execution'
    | 'error_max_turns'
    | 'error_max_budget_usd'
    | 'error_max_structured_output_retries';
  stop_reason: string | null;
  errors: string[];
  // ...
};
```

**Stop reason mapping for UI display:**

| SDK `subtype` | User-visible label (EN) | User-visible label (DE) |
|---------------|------------------------|------------------------|
| `success` | "Task complete" | "Aufgabe abgeschlossen" |
| `error_max_turns` | "Maximum turns reached" | "Maximale Durchlaufe erreicht" |
| `error_max_budget_usd` | "Budget limit reached" | "Budgetlimit erreicht" |
| `error_during_execution` | "Error during execution" | "Fehler bei der Ausfuhrung" |
| `error_max_structured_output_retries` | "Output format error" | "Ausgabeformatfehler" |

**Example implementation:**
```typescript
// sse-adapter.ts -- result case
case "result": {
  if (message.subtype === "success") {
    return [{
      type: "result",
      data: {
        output: stripAnsi(message.result),
        cost: message.total_cost_usd,
        duration: message.duration_ms,
        turns: message.num_turns,
        stopReason: "success",        // NEW
      },
      timestamp: now,
    }];
  }
  // Error result
  return [{
    type: "error",
    data: {
      message: message.errors?.join("; ") || "Agent session failed",
      subtype: message.subtype,
      cost: message.total_cost_usd,
      duration: message.duration_ms,
      stopReason: message.subtype,    // NEW: "error_max_turns" | "error_max_budget_usd" etc.
    },
    timestamp: now,
  }];
}
```

### Pattern 2: Deterministic Session IDs from Project ID

**What:** Currently, `session-manager.ts` generates a random UUID for each session via `randomUUID()`. The SDK's `Options.sessionId` field accepts a custom UUID. By deriving the session ID deterministically from the project ID, pause/resume can target the correct session without fragile in-memory lookups.

**When to use:** Every `agentSessions.start()` call. The session ID becomes `sha256(projectId).slice(0, 32)` formatted as a UUID.

**SDK option (from `sdk.d.ts` line 736):**
```typescript
/**
 * Use a specific session ID for the conversation instead of an auto-generated one.
 * Must be a valid UUID. Cannot be used with `continue` or `resume` unless
 * `forkSession` is also set (to specify a custom ID for the forked session).
 */
sessionId?: string;
```

**Key insight:** The `sessionId` must be a valid UUID. A deterministic UUID can be created by hashing the project ID with SHA-256 and formatting the first 16 bytes as UUID v4 format (with version/variant bits set correctly).

**Example implementation:**
```typescript
import { createHash } from "crypto";

/**
 * Generate a deterministic UUID from a project ID.
 * Same project ID always produces the same session ID.
 */
function deterministicSessionId(projectId: string): string {
  const hash = createHash("sha256").update(projectId).digest("hex");
  // Format as UUID v4: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // Set version (4) and variant (8, 9, a, b) bits
  const uuid = [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "4" + hash.slice(13, 16),
    ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join("-");
  return uuid;
}
```

**Critical consideration:** When a session is resumed, the `resume` option uses the SDK session ID (not our custom session ID). The deterministic ID is the *internal session manager key*, while the SDK session ID (captured from init message's `session_id`) is what the SDK uses for persistence. These are separate concepts:
- `session-manager.ts` uses our deterministic ID as the `AgentSession.id` (key in the sessions Map)
- The SDK's `Options.sessionId` makes the *SDK's* session ID deterministic
- For resume, we pass `Options.resume` with the SDK session ID

**Recommendation:** Pass `sessionId` to the SDK via `Options.sessionId` so that BOTH our internal tracking AND the SDK's filesystem persistence use the same deterministic ID. This eliminates the disconnect between the two ID spaces.

### Pattern 3: Session Recovery via Filesystem Scan

**What:** The SDK persists session JSONL files to `~/.claude/projects/{project-slug}/` when `persistSession` is not `false`. Currently, the session manager sets `persistSession: false`, which means sessions are not written to disk. To enable recovery, change to `persistSession: true` (or omit -- it defaults to true), then at server startup, scan the known project directories for session files.

**When to use:** At server startup, before the first user request.

**Session file structure (from filesystem analysis):**
```
~/.claude/projects/
  -Users-developer-eluma/        # Slug = path with slashes replaced by hyphens
    {session-uuid}.jsonl          # Session transcript
    {session-uuid}/               # Session directory (file checkpoints)
```

**Key insight:** The JSONL files contain `sessionId` fields in their messages. By reading the first few lines of recent JSONL files, we can identify sessions that belong to specific projects and determine if they are resumable.

**However:** There is no `listSessions()` method in the SDK v0.2.38 API. The requirement mentions `listSessions()` but this function does not exist in the current SDK. The approach must be:
1. Enable `persistSession: true` so the SDK writes session files
2. At server startup, scan `~/.claude/projects/` for JSONL files matching our deterministic session IDs
3. For each found file, extract the session ID and offer it as resumable
4. Use the `resume` option with the found session ID to resume

**Alternative approach (simpler):** Instead of scanning SDK session files, persist our own lightweight session metadata in the event store or a simple JSON file. At shutdown, write `{ projectId, sdkSessionId, userId, pausedAt }` for any running/paused sessions. At startup, read this file and offer those sessions as resumable.

**Recommendation:** Use the simpler custom metadata file approach. The SDK's JSONL files are an implementation detail and their format is undocumented. Writing a `data/agent-sessions.json` file at shutdown and reading it at startup is more robust and doesn't couple us to SDK internals.

### Pattern 4: Auth Health Check via accountInfo()

**What:** The current `auth-check.ts` only checks if `CLAUDE_CODE_OAUTH_TOKEN` is set in the environment. It does not verify the token is actually valid. The SDK's `Query.accountInfo()` method returns `AccountInfo` with `email`, `organization`, `subscriptionType`, and `tokenSource` -- proving the token works.

**When to use:** At server startup, immediately after calling `checkAgentAuth()`.

**SDK API (from `sdk.d.ts`):**
```typescript
// On the Query interface:
accountInfo(): Promise<AccountInfo>;

// AccountInfo type:
export declare type AccountInfo = {
  email?: string;
  organization?: string;
  subscriptionType?: string;
  tokenSource?: string;
  apiKeySource?: string;
};

// Also available via initializationResult():
initializationResult(): Promise<SDKControlInitializeResponse>;
// which includes:
declare type SDKControlInitializeResponse = {
  commands: SlashCommand[];
  output_style: string;
  available_output_styles: string[];
  models: ModelInfo[];
  account: AccountInfo;
};
```

**Key insight:** `accountInfo()` requires an active Query instance. The warm session already creates a `query()` at boot. We can call `accountInfo()` on the warm session's query instance right after it starts, before any user requests. If it fails or returns empty fields, log a warning.

**Example implementation:**
```typescript
// In app.ts or auth-check.ts
async function verifyAuthToken(): Promise<void> {
  try {
    // Use the warm session's query instance
    const info = await warmSession.getAccountInfo();
    if (info.email) {
      console.log(`[agent-auth] Token valid: ${info.email} (${info.subscriptionType || "unknown plan"})`);
    } else {
      console.warn("[agent-auth] Token accepted but no email returned -- check subscription status");
    }
  } catch (err) {
    console.error(
      "[agent-auth] Token validation FAILED:",
      err instanceof Error ? err.message : String(err),
      "-- Agent sessions will fail until auth is fixed"
    );
  }
}
```

**Caveat:** `accountInfo()` is a method on the `Query` interface, meaning it requires the query subprocess to be running. This means the auth check happens AFTER the warm session's cold start (~12s). If the token is invalid, the cold start itself may fail. We should catch that failure in `warmSession.start()` and report it as an auth error.

### Anti-Patterns to Avoid

- **DO NOT parse SDK JSONL files for session recovery without a stable schema guarantee.** The JSONL format is an internal implementation detail. Use our own metadata persistence.
- **DO NOT use `unstable_v2_createSession()` or `unstable_v2_resumeSession()`.** They are marked `@alpha` and `UNSTABLE`. Stick with stable `query()` + `Options.resume`.
- **DO NOT use `persistSession: true` for the warm session.** The warm session is for lightweight AI calls, not interactive user sessions. Only enable persistence for interactive agent sessions in `session-manager.ts`.
- **DO NOT make accountInfo() a blocking prerequisite for server startup.** It should be fire-and-forget with a warning log on failure. The server should still start even with an invalid token -- the error will surface when a user tries to start a session.
- **DO NOT forget to update BOTH `de.json` and `en.json` when adding stop reason translations.**

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stop reason classification | Custom result parsing logic | SDK's `SDKResultMessage.subtype` field | SDK already categorizes into success/error_max_turns/error_max_budget_usd/etc. |
| Auth token validation | Custom HTTP request to Anthropic API | `Query.accountInfo()` | SDK handles token exchange and validation internally |
| Deterministic UUID generation | Full UUID v5 implementation | `crypto.createHash('sha256')` + format | SHA-256 is available natively, just need 16 bytes formatted as UUID |
| Session file persistence format | Custom binary or JSON format | SDK's built-in JSONL persistence (`persistSession: true`) | SDK handles all serialization, compatibility, and lifecycle |

**Key insight:** All four features are adopting EXISTING SDK capabilities, not building new ones. The work is integration (connecting SDK outputs to our SSE events and UI), not invention.

## Common Pitfalls

### Pitfall 1: persistSession Conflicting with Session Manager

**What goes wrong:** Enabling `persistSession: true` in the session manager causes the SDK to write session files to `~/.claude/projects/`, potentially conflicting with the warm session or creating file permission issues.
**Why it happens:** The SDK uses the working directory to determine the project slug for the session file path. If multiple sessions use the same cwd, their files may collide.
**How to avoid:** Use deterministic session IDs (SDKF-03) so each project gets a predictable, unique session file. Also ensure the warm session keeps `persistSession: false` while interactive sessions use `persistSession: true`.
**Warning signs:** Session resume fails with "session not found" or "invalid session file" errors.

### Pitfall 2: Stop Reason Not Available in Error Events

**What goes wrong:** The current SSE adapter sends the `subtype` field in error events but the client doesn't use it. Adding `stopReason` requires changes on both server (adapter) and client (hook + components).
**Why it happens:** The SSE event schema was designed before stop reasons were a requirement.
**How to avoid:** Update the SSEEvent type, the adapter, the useAgentStream hook (add `stopReason` to AgentResult), the AgentOutput component, and both i18n files -- all in one plan.
**Warning signs:** Stop reason shows as "undefined" in the UI because only some layers were updated.

### Pitfall 3: accountInfo() Timing Race

**What goes wrong:** Calling `accountInfo()` before the warm session's query subprocess has fully initialized causes a timeout or error.
**Why it happens:** `accountInfo()` is a control request that requires the subprocess to be ready.
**How to avoid:** Call `accountInfo()` AFTER `consumeCurrentTurn()` in the warm session's `start()` method (i.e., after the initial READY response is received). This guarantees the subprocess is alive and accepting control requests.
**Warning signs:** `accountInfo()` throws a timeout error during startup.

### Pitfall 4: Deterministic ID UUID Format Validation

**What goes wrong:** The SDK rejects the deterministic session ID because it's not a valid UUID format.
**Why it happens:** The `Options.sessionId` documentation says "Must be a valid UUID." A SHA-256 hash truncated to 32 hex chars is not automatically a valid UUID.
**How to avoid:** After hashing, explicitly set the UUID version bits (version 4: set the first nibble of the 7th byte to 4) and variant bits (set the first 2 bits of the 9th byte to 10). Format with standard UUID dashes: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.
**Warning signs:** SDK throws "Invalid session ID" error on session start.

### Pitfall 5: Session Recovery After Cold Restart

**What goes wrong:** After server restart, the session manager's in-memory Maps are empty. Even with SDK session files on disk, there's no code to discover and offer them to users.
**Why it happens:** Session metadata is only stored in memory (the `sessions` and `pausedSessions` Maps).
**How to avoid:** Persist session metadata to a file (e.g., `data/agent-sessions.json`) on pause and at graceful shutdown. At startup, load this file and populate the `pausedSessions` Map.
**Warning signs:** Users see "no paused session" after server restart, even though their session was active before.

### Pitfall 6: i18n Missing for New Stop Reason Strings

**What goes wrong:** Stop reason labels appear in English even when the user's language is German.
**Why it happens:** Stop reason strings are added to `en.json` but forgotten in `de.json`, or vice versa.
**How to avoid:** Update both `en.json` and `de.json` in the same commit (this is a project convention enforced in CLAUDE.md).
**Warning signs:** Mixed-language UI elements in the agent output panel.

## Code Examples

### Stop Reason in SSE Adapter

```typescript
// server/src/agent/sse-adapter.ts -- updated result handling
// Source: SDK type analysis of SDKResultSuccess and SDKResultError

case "result": {
  if (message.subtype === "success") {
    return [{
      type: "result",
      data: {
        output: stripAnsi(message.result),
        cost: message.total_cost_usd,
        duration: message.duration_ms,
        turns: message.num_turns,
        stopReason: "success",
      },
      timestamp: now,
    }];
  }
  return [{
    type: "error",
    data: {
      message: message.errors?.join("; ") || "Agent session failed",
      subtype: message.subtype,
      cost: message.total_cost_usd,
      duration: message.duration_ms,
      stopReason: message.subtype,  // "error_max_turns" | "error_max_budget_usd" | etc.
    },
    timestamp: now,
  }];
}
```

### Deterministic Session ID

```typescript
// server/src/agent/session-id.ts
// Source: Node.js crypto module + SDK Options.sessionId requirement

import { createHash } from "crypto";

/**
 * Derive a deterministic, valid UUID from a project ID.
 * Ensures the same project always gets the same session ID.
 */
export function deterministicSessionId(projectId: string): string {
  const hash = createHash("sha256")
    .update(`eluma-agent-session:${projectId}`)
    .digest("hex");

  // Format as UUID v4 with correct version/variant bits
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "4" + hash.slice(13, 16),  // version 4
    ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20),  // variant
    hash.slice(20, 32),
  ].join("-");
}
```

### Session Recovery at Startup

```typescript
// server/src/agent/session-recovery.ts
// Source: Application-level pattern (not SDK API)

import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const SESSION_FILE = join(process.cwd(), "data", "agent-sessions.json");

interface PersistedSessionInfo {
  projectId: string;
  sdkSessionId: string;
  userId: string;
  savedAt: string;
}

/**
 * Load persisted sessions from disk at server startup.
 * Returns array of sessions that can be offered as resumable.
 */
export async function loadPersistedSessions(): Promise<PersistedSessionInfo[]> {
  try {
    const raw = await readFile(SESSION_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return []; // File doesn't exist or is invalid -- no sessions to recover
  }
}

/**
 * Save current sessions to disk for recovery after restart.
 * Called during graceful shutdown.
 */
export async function persistSessions(sessions: PersistedSessionInfo[]): Promise<void> {
  try {
    await writeFile(SESSION_FILE, JSON.stringify(sessions, null, 2), "utf-8");
    console.log(`[agent] Persisted ${sessions.length} session(s) for recovery`);
  } catch (err) {
    console.warn("[agent] Failed to persist sessions:", err instanceof Error ? err.message : String(err));
  }
}
```

### Auth Health Check with accountInfo()

```typescript
// server/src/agent/auth-check.ts -- enhanced version
// Source: SDK Query.accountInfo() API

import type { AccountInfo } from "@anthropic-ai/claude-agent-sdk";

export function checkAgentAuth(): void {
  const hasOAuthToken = !!process.env.CLAUDE_CODE_OAUTH_TOKEN;

  if (hasOAuthToken) {
    console.log("[agent-auth] Auth method: Subscription (Claude Max quota)");
  } else {
    console.warn(
      "[agent-auth] WARNING: No agent authentication configured. " +
      "Set CLAUDE_CODE_OAUTH_TOKEN in your environment."
    );
  }
}

/**
 * Verify the auth token is actually valid by calling accountInfo().
 * Must be called AFTER warm session start (requires active Query instance).
 */
export async function verifyAuthToken(getAccountInfo: () => Promise<AccountInfo>): Promise<void> {
  try {
    const info = await getAccountInfo();
    if (info.email) {
      console.log(
        `[agent-auth] Token verified: ${info.email}` +
        (info.subscriptionType ? ` (${info.subscriptionType})` : "") +
        (info.organization ? ` [${info.organization}]` : "")
      );
    } else {
      console.warn("[agent-auth] Token accepted but account details unavailable");
    }
  } catch (err) {
    console.error(
      "[agent-auth] Token verification FAILED:",
      err instanceof Error ? err.message : String(err),
      "-- Agent sessions will fail until auth is configured correctly"
    );
  }
}
```

### Updated AgentResult in Client Hook

```typescript
// client/src/hooks/useAgentStream.ts -- updated AgentResult
// Source: Application pattern (consuming new SSE fields)

export interface AgentResult {
  output: string;
  cost: number;
  duration: number;
  turns: number;
  stopReason: string;  // NEW: "success" | "error_max_turns" | "error_max_budget_usd" | etc.
}
```

### Stop Reason Display in AgentOutput

```typescript
// client/src/components/AgentOutput.tsx -- stop reason chip
// Source: Application pattern (displaying new field)

const STOP_REASON_LABELS: Record<string, string> = {
  success: "agent.stop_reason.success",
  error_max_turns: "agent.stop_reason.max_turns",
  error_max_budget_usd: "agent.stop_reason.budget_exceeded",
  error_during_execution: "agent.stop_reason.execution_error",
  error_max_structured_output_retries: "agent.stop_reason.output_error",
};

// In the result area JSX:
{result?.stopReason && (
  <span style={styles.stopReasonChip}>
    {t(STOP_REASON_LABELS[result.stopReason] || "agent.stop_reason.unknown")}
  </span>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Random UUID session IDs | Deterministic IDs from project ID | Phase 20 | Stable pause/resume across restarts |
| No stop reason in UI | Stop reason chip in result area | Phase 20 | Users know why session ended |
| Sessions lost on restart | Sessions persisted and recovered | Phase 20 | Server restarts don't lose work |
| Env var check only for auth | accountInfo() live verification | Phase 20 | Invalid tokens caught at boot |
| `persistSession: false` always | `persistSession: true` for interactive sessions | Phase 20 | SDK writes session files enabling resume |

**Deprecated/outdated:**
- `persistSession: false` in session-manager.ts: Will change to `true` (or omitted for default) for interactive sessions
- Random UUID session IDs in `start()`: Will be replaced by deterministic IDs
- Pure env var auth check: Will be supplemented by `accountInfo()` verification

## Open Questions

1. **listSessions() API does not exist in SDK v0.2.38**
   - What we know: The requirement references `listSessions()` for session discovery. This function does not exist in the current SDK.
   - What's unclear: Whether a future SDK version will add it, or whether the requirement intended a different approach.
   - Recommendation: Implement session recovery using our own metadata persistence (write `data/agent-sessions.json` at shutdown, read at startup). This is more reliable than parsing SDK internal files and doesn't depend on an API that doesn't exist yet. If `listSessions()` is added in a future SDK version, it can be adopted as a simplification.

2. **persistSession interaction with deterministic IDs**
   - What we know: `Options.sessionId` sets the session ID, and `persistSession: true` writes to `~/.claude/projects/{slug}/{sessionId}.jsonl`. With a deterministic ID, the same file will be reused/overwritten across sessions for the same project.
   - What's unclear: Whether the SDK appends to an existing JSONL file (continuing the transcript) or creates a new one. If it appends, this is perfect for our resume-after-restart use case. If it overwrites, previous session context is lost.
   - Recommendation: Test behavior with a small experiment. If the SDK appends, great. If it overwrites, we need to use `forkSession: true` with a new deterministic ID for each new session (e.g., `sha256(projectId + timestamp)`).

3. **accountInfo() availability timing**
   - What we know: `accountInfo()` is a method on the `Query` interface and requires the subprocess to be running.
   - What's unclear: Exact timing of when it becomes available relative to the init message.
   - Recommendation: Call it after consuming the initial turn in `warmSession.start()`. If it fails, log a warning but don't block startup.

4. **Session recovery across server crashes (non-graceful shutdown)**
   - What we know: The custom metadata file approach only works for graceful shutdowns where we write the file.
   - What's unclear: Whether we need to handle ungraceful crashes.
   - Recommendation: For v1, only handle graceful shutdowns. For a future enhancement, we could write metadata after every session state change (not just at shutdown) or add a periodic save interval.

## Sources

### Primary (HIGH confidence)

- **Agent SDK v0.2.38 TypeScript definitions** (`eluma/node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts`) -- Complete API: `Options.sessionId`, `Options.persistSession`, `SDKResultSuccess.subtype`, `SDKResultError.subtype`, `Query.accountInfo()`, `AccountInfo` type, `Options.resume`
- **Codebase analysis** (direct reads of `session-manager.ts`, `sse-adapter.ts`, `types.ts`, `auth-check.ts`, `warm-session.ts`, `app.ts`, `routes/agent.ts`, `AgentPanel.tsx`, `AgentOutput.tsx`, `useAgentStream.ts`) -- Complete current architecture
- **SDK session file format** (direct inspection of `~/.claude/projects/-Users-developer/{uuid}.jsonl`) -- JSONL transcript with sessionId, user/assistant messages

### Secondary (MEDIUM confidence)

- [Session Management - Claude API Docs](https://platform.claude.com/docs/en/agent-sdk/sessions) -- Official documentation on `resume`, `forkSession`, session ID capture from init messages
- [Agent SDK overview](https://platform.claude.com/docs/en/agent-sdk/overview) -- General SDK capabilities, hooks, permissions, sessions

### Tertiary (LOW confidence)

- **`listSessions()` existence** -- The Phase 20 requirements mention `listSessions()` but this function does NOT exist in SDK v0.2.38. Not found in type definitions, docs, or web search. Likely a planned feature or aspirational reference. Needs validation with the user. Our implementation uses custom metadata persistence as a substitute.
- **persistSession append vs overwrite behavior** -- Inferred from JSONL format (append-friendly) but not verified with testing.

## Metadata

**Confidence breakdown:**
- Stop reasons (SDKF-01): HIGH -- SDK types explicitly define subtypes, SSE adapter code is clear
- Session recovery (SDKF-02): MEDIUM -- `listSessions()` doesn't exist; custom metadata approach is solid but differs from requirement wording
- Deterministic IDs (SDKF-03): HIGH -- `Options.sessionId` is documented and typed; UUID generation is standard
- Auth health check (SDKF-04): HIGH -- `Query.accountInfo()` is clearly documented with typed return value

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable; Agent SDK version locked at 0.2.38)

---

## Implementation Plan Sketch (for planner reference)

### Suggested Plan Sequence

**Plan 20-01: Stop Reasons + Deterministic Session IDs**
- Add `stopReason` field to SSEEvent result/error data in `sse-adapter.ts`
- Create `server/src/agent/session-id.ts` with `deterministicSessionId()` function
- Update `session-manager.ts` `start()` to use deterministic ID and pass `sessionId` to SDK options
- Update `session-manager.ts` `start()` to set `persistSession: true` for interactive sessions
- Update `AgentResult` interface in `useAgentStream.ts` to include `stopReason`
- Update `AgentOutput.tsx` to display stop reason chip
- Add stop reason i18n keys to both `en.json` and `de.json`
- Update `types.ts` to add `stopReason` to SSEEvent/AgentSessionInfo if needed

**Plan 20-02: Session Recovery + Auth Health Check**
- Create `server/src/agent/session-recovery.ts` with `loadPersistedSessions()` and `persistSessions()`
- Update `session-manager.ts` cleanup/pause to call `persistSessions()`
- Update `session-manager.ts` with `recoverSessions()` method called at startup
- Update `app.ts` to call `recoverSessions()` after session manager init
- Add `getAccountInfo()` method to `WarmAgentSession` class
- Update `auth-check.ts` to add `verifyAuthToken()` async function
- Update `app.ts` to call `verifyAuthToken()` after warm session starts
- Update `AgentPanel.tsx` to show recovered sessions on mount
- Add API endpoint for listing recoverable sessions (GET /api/agent/recoverable/:projectId)
