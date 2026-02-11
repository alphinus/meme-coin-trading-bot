# Phase 20: SDK Feature Adoption - Research

**Researched:** 2026-02-11
**Domain:** Claude Agent SDK session lifecycle, stop reason surfacing, session persistence/recovery, deterministic IDs, auth health check
**Confidence:** HIGH

## Summary

Phase 20 adopts four Agent SDK features that improve the agent session user experience: (1) surfacing stop reasons so users know WHY a session ended, (2) recovering resumable sessions after server restart by persisting session metadata to disk, (3) using deterministic session IDs based on project ID so pause/resume is stable across restarts, and (4) calling `accountInfo()` at server startup to validate the auth token before any user triggers a session.

The codebase is well-prepared for this phase. Phase 13 built the full session manager with SSE streaming, and Phase 19 migrated all AI calls to the Agent SDK. The session manager (`server/src/agent/session-manager.ts`) already captures the SDK session ID from init messages, supports pause/resume with the SDK `resume` option, and forwards structured SSE events through the adapter. The four Phase 20 features are additive enhancements to this existing architecture -- no rewrites needed.

The Agent SDK v0.2.38 provides all required primitives: `SDKResultMessage` carries `subtype` fields (`success`, `error_max_turns`, `error_max_budget_usd`, `error_during_execution`, `error_max_structured_output_retries`) that map directly to user-visible stop reasons; `Options.sessionId` accepts a custom UUID for deterministic session IDs; `Options.persistSession` (default `true`) causes sessions to be written as JSONL files to `~/.claude/projects/{project-slug}/`; and `Query.accountInfo()` returns `AccountInfo` with `email`, `organization`, `subscriptionType`, and `tokenSource` fields.

**Critical finding:** There is NO `listSessions()` method in the SDK (v0.2.38 or in the official TypeScript reference docs). The SDKF-02 requirement references it but it does not exist. Session recovery must use our own metadata persistence approach.

**Critical finding:** GitHub issue #8069 confirms that resuming a session gives it a DIFFERENT `session_id` from the original, even though context is preserved. This is a known SDK behavior. The deterministic `Options.sessionId` applies to the INITIAL session; on resume, the SDK may generate a new ID. Our implementation must track sessions by our own deterministic ID (as the Map key) and use the SDK's captured `session_id` (from the init message) for the `resume` option. These are separate concepts.

**Primary recommendation:** Implement the four requirements as two plans: Plan 20-01 (stop reasons + deterministic IDs -- both are session-manager + SSE adapter changes), Plan 20-02 (session recovery on restart + auth health check -- both are server startup changes).

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/claude-agent-sdk` | 0.2.38 | All four features use SDK primitives | Already installed; provides sessionId, accountInfo(), SDKResultMessage subtypes, persistSession |
| `crypto` | built-in | `createHash('sha256')` for deterministic UUID from project ID | Standard Node.js, zero dependencies |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `fs/promises` | built-in | Read/write JSON session metadata file at startup/shutdown | Session recovery (SDKF-02) |
| `os` | built-in | `os.homedir()` to locate `~/.claude/projects/` if needed | Session file discovery (future) |
| `path` | built-in | Path manipulation for session file locations | Session metadata file path |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom JSON metadata file | Parsing SDK JSONL session files | JSONL format is undocumented SDK internal; custom JSON is simpler and decoupled |
| SHA-256 deterministic ID | UUID v5 (`uuid` package) | SHA-256 is already available via `crypto`, avoids new dependency; truncate to UUID format |
| `accountInfo()` via Query | Manual token validation HTTP call | `accountInfo()` is the SDK's blessed approach, returns structured data |
| Our own metadata persistence | SDK `listSessions()` | `listSessions()` does not exist in SDK v0.2.38 -- not an option |

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
  i18n/locales/
    en.json                # English translations (agent.* keys)
    de.json                # German translations (agent.* keys)
```

### Pattern 1: Stop Reason Extraction from SDKResultMessage

**What:** The SDK's `SDKResultMessage` union type carries a `subtype` field that encodes why the session ended. Currently, the SSE adapter maps this to either `result` or `error` events but does not include the specific stop reason.

**When to use:** Every time a session ends -- the SSE adapter should include the stop reason in the event data, and the UI should display it.

**SDK type reference (verified from `sdk.d.ts` and official TypeScript reference docs):**
```typescript
// SDKResultSuccess
type SDKResultSuccess = {
  type: 'result';
  subtype: 'success';
  result: string;
  duration_ms: number;
  num_turns: number;
  total_cost_usd: number;
  stop_reason: string | null;
  // ...
};

// SDKResultError
type SDKResultError = {
  type: 'result';
  subtype: 'error_during_execution'
    | 'error_max_turns'
    | 'error_max_budget_usd'
    | 'error_max_structured_output_retries';
  duration_ms: number;
  num_turns: number;
  total_cost_usd: number;
  stop_reason: string | null;
  errors: string[];
  // ...
};
```

**Stop reason mapping for UI display:**

| SDK `subtype` | EN label | DE label |
|---------------|----------|----------|
| `success` | "Task complete" | "Aufgabe abgeschlossen" |
| `error_max_turns` | "Maximum turns reached" | "Maximale Durchlaufe erreicht" |
| `error_max_budget_usd` | "Budget limit reached" | "Budgetlimit erreicht" |
| `error_during_execution` | "Error during execution" | "Fehler bei der Ausfuhrung" |
| `error_max_structured_output_retries` | "Output format error" | "Ausgabeformatfehler" |

**Current SSE adapter code** (`sse-adapter.ts` lines 57-83):
```typescript
case "result": {
  if (message.subtype === "success") {
    return [{
      type: "result",
      data: {
        output: stripAnsi(message.result),
        cost: message.total_cost_usd,
        duration: message.duration_ms,
        turns: message.num_turns,
        // MISSING: stopReason
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
      // MISSING: stopReason
    },
    timestamp: now,
  }];
}
```

**Required change:** Add `stopReason: "success"` to the success data and `stopReason: message.subtype` to the error data.

### Pattern 2: Deterministic Session IDs from Project ID

**What:** Currently, `session-manager.ts` generates a random UUID for each session via `randomUUID()` (lines 56, 255). The SDK's `Options.sessionId` field accepts a custom UUID. By deriving the session ID deterministically from the project ID, pause/resume can target the correct session without fragile in-memory lookups.

**SDK option (verified from `sdk.d.ts` line 732-736 and official docs):**
```typescript
/**
 * Use a specific session ID for the conversation instead of an auto-generated one.
 * Must be a valid UUID. Cannot be used with `continue` or `resume` unless
 * `forkSession` is also set (to specify a custom ID for the forked session).
 */
sessionId?: string;
```

**CRITICAL CONSTRAINT:** `sessionId` "Cannot be used with `continue` or `resume` unless `forkSession` is also set." This means:
- For `start()`: Pass `sessionId` with our deterministic UUID -- works fine.
- For `resume()`: Do NOT pass `sessionId` along with `resume` unless also setting `forkSession: true`. The current `resume()` code correctly passes only `resume: paused.sdkSessionId` without `sessionId`.

**CRITICAL FINDING (GitHub issue #8069):** When resuming, the SDK gives the session a NEW session_id, different from the original. This means our internal tracking ID and the SDK's session ID are inherently decoupled after resume. Strategy:
- Use our deterministic ID as the **session manager Map key** (stable across server restarts for the same project).
- Use the SDK's `session_id` from the init message as the **SDK session identifier** for `resume` operations.
- These are separate concepts and that is fine.

**Implementation pattern:**
```typescript
import { createHash } from "crypto";

/**
 * Derive a deterministic, valid UUID from a project ID.
 * Same project ID always produces the same session ID.
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

### Pattern 3: Session Recovery via Custom Metadata File

**What:** The SDK persists session JSONL files to `~/.claude/projects/{project-slug}/` when `persistSession` is not `false` (default is `true`). Currently, the session manager sets `persistSession: false`, which means sessions are not written to disk. To enable recovery after restart, we need two things: (1) enable `persistSession: true` so the SDK can resume sessions, and (2) persist our own lightweight metadata file so we know which sessions to offer as resumable.

**Why not use SDK JSONL files directly:** The JSONL format is an internal SDK implementation detail with no documented schema. Parsing it would couple us to undocumented internals. Our own JSON metadata file is simple and fully under our control.

**Why there is no `listSessions()`:** Verified in SDK v0.2.38 type definitions AND official TypeScript reference docs -- this function does not exist. The requirement references it but it is not available. Our metadata file approach is the correct substitute.

**Implementation approach:**
1. Create `server/src/agent/session-recovery.ts` with `loadPersistedSessions()` and `persistSessions()`.
2. Write a simple JSON file (`data/agent-sessions.json`) containing session metadata.
3. Call `persistSessions()` on every pause and during graceful shutdown.
4. Call `loadPersistedSessions()` at server startup to populate `pausedSessions` Map.
5. Enable `persistSession: true` in session manager so the SDK writes JSONL files that `resume` can read.

### Pattern 4: Auth Health Check via accountInfo()

**What:** The current `auth-check.ts` only checks if `CLAUDE_CODE_OAUTH_TOKEN` is set in the environment. It does not verify the token is actually valid. The SDK's `Query.accountInfo()` returns `AccountInfo` with `email`, `organization`, `subscriptionType`, and `tokenSource`.

**SDK API (verified from `sdk.d.ts` line 1055-1060 and official docs):**
```typescript
// On the Query interface:
accountInfo(): Promise<AccountInfo>;

// AccountInfo type:
type AccountInfo = {
  email?: string;
  organization?: string;
  subscriptionType?: string;
  tokenSource?: string;
  apiKeySource?: string;
};
```

**Availability note:** `accountInfo()` is listed under "Control Requests" on the Query interface with the umbrella comment "only supported when streaming input/output is used." However, unlike `interrupt()`, `setPermissionMode()`, and `setModel()`, `accountInfo()` does NOT have an individual "Only available in streaming input mode" annotation. The official docs also list it without this caveat. The warm session DOES use streaming input mode (via `streamInput()`), so this should work regardless.

**Timing:** Call `accountInfo()` AFTER `consumeCurrentTurn()` in the warm session's `start()` method (i.e., after the initial READY response is received). This guarantees the subprocess is alive and accepting control requests.

**Implementation:** Add a `getAccountInfo()` method to `WarmAgentSession` that delegates to `this.queryInstance.accountInfo()`. In `app.ts`, call `verifyAuthToken()` after warm session starts, passing `() => warmSession.getAccountInfo()` as a callback.

### Anti-Patterns to Avoid

- **DO NOT parse SDK JSONL files for session recovery without a stable schema guarantee.** The JSONL format is an internal implementation detail. Use our own metadata persistence.
- **DO NOT use `unstable_v2_createSession()` or `unstable_v2_resumeSession()`.** They are marked `@alpha` and `UNSTABLE` in the SDK types. Stick with stable `query()` + `Options.resume`.
- **DO NOT pass `sessionId` together with `resume` (without `forkSession`).** The SDK docs explicitly state this is not allowed.
- **DO NOT use `persistSession: true` for the warm session.** The warm session is for lightweight AI calls, not interactive user sessions. Only enable persistence for interactive agent sessions in `session-manager.ts`.
- **DO NOT make accountInfo() a blocking prerequisite for server startup.** It should be fire-and-forget with a warning log on failure. The server should still start even with an invalid token.
- **DO NOT forget to update BOTH `de.json` and `en.json` when adding stop reason translations.** Project convention (CLAUDE.md) requires same-commit updates to both translation files.
- **DO NOT use ASCII approximations for German umlauts.** Use `Ausfuhrung` -> `Ausführung`, `Durchlaufe` -> `Durchläufe`, etc.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stop reason classification | Custom result parsing logic | SDK's `SDKResultMessage.subtype` field | SDK already categorizes into success/error_max_turns/error_max_budget_usd/etc. |
| Auth token validation | Custom HTTP request to Anthropic API | `Query.accountInfo()` | SDK handles token exchange and validation internally |
| Deterministic UUID generation | Full UUID v5 implementation | `crypto.createHash('sha256')` + format | SHA-256 is available natively, just need 16 bytes formatted as UUID |
| Session file persistence format | Custom binary or JSON format | SDK's built-in JSONL persistence (`persistSession: true`) | SDK handles all serialization, compatibility, and lifecycle |

**Key insight:** All four features are adopting EXISTING SDK capabilities, not building new ones. The work is integration (connecting SDK outputs to our SSE events and UI), not invention.

## Common Pitfalls

### Pitfall 1: sessionId + resume Conflict

**What goes wrong:** Passing `sessionId` AND `resume` options together causes the SDK to reject the call.
**Why it happens:** The SDK docs state "Cannot be used with `continue` or `resume` unless `forkSession` is also set."
**How to avoid:** In `start()`, pass `sessionId` (deterministic). In `resume()`, pass only `resume` (SDK session ID from init message), do NOT pass `sessionId`.
**Warning signs:** SDK throws an error about incompatible options.

### Pitfall 2: Resume Gives Different Session ID

**What goes wrong:** After resume, the SDK init message contains a DIFFERENT `session_id` than the original session. Code that assumes the session ID stays the same will break.
**Why it happens:** Known SDK behavior (GitHub issue #8069). The SDK generates a new session ID on resume.
**How to avoid:** Always capture the new `session_id` from the init message after resume. Use our deterministic ID as the Map key (stable), and the SDK's session_id for the `resume` option (may change). The `session-manager.ts` already captures `session_id` from init messages (line 321-322), which is correct.
**Warning signs:** Session shows different `sdkSessionId` after resume vs before.

### Pitfall 3: persistSession Conflicting with Warm Session

**What goes wrong:** Enabling `persistSession: true` globally causes the warm session to write files to `~/.claude/projects/`, creating clutter.
**Why it happens:** The warm session currently sets `persistSession: false` (line 59 of warm-session.ts). Only the session manager needs to change.
**How to avoid:** Change `persistSession` to `true` ONLY in `session-manager.ts` (for interactive sessions). Keep `persistSession: false` in `warm-session.ts`.
**Warning signs:** Unexpected JSONL files appearing in `~/.claude/projects/` from non-interactive sessions.

### Pitfall 4: Stop Reason Not Propagated Through Full Stack

**What goes wrong:** The stop reason shows as "undefined" in the UI because only some layers were updated.
**Why it happens:** The SSE event schema, SSE adapter, client hook, and component all need coordinated changes.
**How to avoid:** Update ALL layers in the same plan: `sse-adapter.ts` (emit stopReason), `types.ts` (AgentStopReason type), `useAgentStream.ts` (AgentResult interface + error handler), `AgentOutput.tsx` (display chip), `en.json` + `de.json` (translations).
**Warning signs:** Stop reason appears as "undefined" or missing entirely in the client.

### Pitfall 5: accountInfo() Timing Race

**What goes wrong:** Calling `accountInfo()` before the warm session's query subprocess has fully initialized causes a timeout or error.
**Why it happens:** `accountInfo()` is a control request that requires the subprocess to be ready.
**How to avoid:** Call `accountInfo()` AFTER `consumeCurrentTurn()` completes in `warmSession.start()`. The warm session's `start()` method already waits for the initial READY response, so adding `accountInfo()` after that is safe.
**Warning signs:** `accountInfo()` throws a timeout error during startup.

### Pitfall 6: Deterministic UUID Format Validation

**What goes wrong:** The SDK rejects the deterministic session ID because it's not a valid UUID format.
**Why it happens:** The `Options.sessionId` documentation says "Must be a valid UUID." A SHA-256 hash truncated to 32 hex chars is not automatically a valid UUID.
**How to avoid:** After hashing, explicitly set the UUID version bits (version 4: set the first nibble of the 7th byte to 4) and variant bits (set the first 2 bits of the 9th byte to 10). Format with standard UUID dashes: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.
**Warning signs:** SDK throws "Invalid session ID" error on session start.

### Pitfall 7: Graceful Shutdown Session Persistence

**What goes wrong:** After server restart, sessions that were actively running (not paused) are lost.
**Why it happens:** The `cleanup()` method aborts running sessions but doesn't persist their metadata.
**How to avoid:** In `cleanup()`, convert running sessions to persisted entries BEFORE aborting them. Change `cleanup()` to async so it can write the metadata file.
**Warning signs:** Users see no recoverable sessions after restart, even though sessions were active.

### Pitfall 8: i18n Missing for New Stop Reason Strings

**What goes wrong:** Stop reason labels appear in English even when the user's language is German.
**Why it happens:** Stop reason strings are added to `en.json` but forgotten in `de.json`, or vice versa.
**How to avoid:** Update both `en.json` and `de.json` in the same commit (CLAUDE.md mandatory rule). Use proper Unicode umlauts in German text.
**Warning signs:** Mixed-language UI elements in the agent output panel.

## Code Examples

Verified patterns from SDK types and official documentation:

### Stop Reason in SSE Adapter

```typescript
// server/src/agent/sse-adapter.ts -- updated result handling
// Source: SDK sdk.d.ts SDKResultSuccess/SDKResultError types

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

### Deterministic Session ID

```typescript
// server/src/agent/session-id.ts
// Source: Node.js crypto module + SDK Options.sessionId docs

import { createHash } from "crypto";

/**
 * Derive a deterministic, valid UUID from a project ID.
 * Same project ID always produces the same session ID.
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

import { readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";

const SESSION_FILE = join(process.cwd(), "data", "agent-sessions.json");

export interface PersistedSessionInfo {
  projectId: string;
  sdkSessionId: string;
  userId: string;
  savedAt: string;
}

export async function loadPersistedSessions(): Promise<PersistedSessionInfo[]> {
  try {
    const raw = await readFile(SESSION_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return []; // File doesn't exist or is invalid
  }
}

export async function persistSessions(sessions: PersistedSessionInfo[]): Promise<void> {
  try {
    await mkdir(dirname(SESSION_FILE), { recursive: true });
    await writeFile(SESSION_FILE, JSON.stringify(sessions, null, 2), "utf-8");
    console.log(`[agent-recovery] Persisted ${sessions.length} session(s) to disk`);
  } catch (err) {
    console.warn("[agent-recovery] Failed to persist sessions:",
      err instanceof Error ? err.message : String(err));
  }
}
```

### Auth Health Check with accountInfo()

```typescript
// server/src/agent/auth-check.ts -- enhanced version
// Source: SDK Query.accountInfo() API + AccountInfo type

export async function verifyAuthToken(
  getAccountInfo: () => Promise<Record<string, unknown>>
): Promise<void> {
  try {
    const info = await getAccountInfo();
    const email = info.email as string | undefined;
    const subscriptionType = info.subscriptionType as string | undefined;
    const organization = info.organization as string | undefined;

    if (email) {
      console.log(
        `[agent-auth] Token verified: ${email}` +
        (subscriptionType ? ` (${subscriptionType})` : "") +
        (organization ? ` [${organization}]` : "")
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
// client/src/hooks/useAgentStream.ts
// Source: Application pattern (consuming new SSE fields)

export interface AgentResult {
  output: string;
  cost: number;
  duration: number;
  turns: number;
  stopReason?: string;  // "success" | "error_max_turns" | "error_max_budget_usd" | etc.
}
```

### Stop Reason Display in AgentOutput

```typescript
// client/src/components/AgentOutput.tsx
// Source: Application pattern (displaying new field)

const STOP_REASON_KEYS: Record<string, string> = {
  success: "agent.stop_reason.success",
  error_max_turns: "agent.stop_reason.max_turns",
  error_max_budget_usd: "agent.stop_reason.budget_exceeded",
  error_during_execution: "agent.stop_reason.execution_error",
  error_max_structured_output_retries: "agent.stop_reason.output_error",
};

// In the result area JSX:
{result?.stopReason && (
  <div style={{
    ...styles.stopReasonChip,
    ...(result.stopReason !== "success" ? {
      backgroundColor: "#fef2f2",
      color: "#991b1b",
    } : {}),
  }}>
    {t(STOP_REASON_KEYS[result.stopReason] || "agent.stop_reason.unknown")}
  </div>
)}
```

### WarmAgentSession.getAccountInfo()

```typescript
// server/src/agent/warm-session.ts -- new method
// Source: SDK Query interface accountInfo() method

async getAccountInfo(): Promise<Record<string, unknown>> {
  if (!this.started || !this.queryInstance) {
    throw new Error("[warm-session] Cannot get account info -- session not started");
  }
  const info = await this.queryInstance.accountInfo();
  return info as unknown as Record<string, unknown>;
}

get isReady(): boolean {
  return this.started && !this.stopped;
}
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
   - What we know: The requirement references `listSessions()` for session discovery. This function does not exist in the SDK type definitions OR the official TypeScript reference documentation.
   - What's unclear: Whether a future SDK version will add it.
   - Recommendation: Implement session recovery using our own metadata persistence (write `data/agent-sessions.json` at shutdown/pause, read at startup). This is more reliable and doesn't depend on an API that doesn't exist. If `listSessions()` is added later, it can be adopted as a simplification.

2. **persistSession append vs overwrite behavior**
   - What we know: `Options.sessionId` sets the session ID, and `persistSession: true` writes to `~/.claude/projects/{slug}/{sessionId}.jsonl`. With a deterministic ID, the same file path is used for the same project.
   - What's unclear: Whether the SDK appends to an existing JSONL file (continuing the transcript) or creates a new one. JSONL format is append-friendly, but this is not documented.
   - Recommendation: Test during implementation. If the SDK overwrites, we may need to use `forkSession: true` with a unique session ID per new session (e.g., `sha256(projectId + timestamp)`). If it appends, our deterministic ID approach works perfectly.

3. **accountInfo() control request mode requirement**
   - What we know: `accountInfo()` is listed under "Control Requests" on the Query interface with an umbrella comment "only supported when streaming input/output is used." However, unlike `interrupt()` etc., `accountInfo()` does NOT have an individual "streaming input only" annotation. The official docs also list it without this caveat.
   - What's unclear: Whether `accountInfo()` actually requires streaming input mode or if it works on any Query instance.
   - Recommendation: Use the warm session's query instance (which IS in streaming input mode) to be safe. This avoids the question entirely.

4. **Session recovery across ungraceful crashes**
   - What we know: The custom metadata file approach only works for graceful shutdowns and pauses.
   - What's unclear: Whether we need to handle ungraceful crashes (kill -9, power loss).
   - Recommendation: For v1, only handle graceful shutdowns and explicit pauses. Could enhance later by writing metadata after every state change (not just shutdown) or adding a periodic save interval.

## Sources

### Primary (HIGH confidence)

- **Agent SDK v0.2.38 TypeScript definitions** (`eluma/node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts`) -- Complete API: `Options.sessionId` (line 736), `Options.persistSession` (line 599), `SDKResultSuccess.subtype` (line 1505), `SDKResultError.subtype` (line 1486), `Query.accountInfo()` (line 1060), `AccountInfo` type (line 22), `Options.resume` (line 730), `Options.forkSession` (line 570)
- **Official TypeScript SDK reference** (https://platform.claude.com/docs/en/agent-sdk/typescript) -- Complete API reference confirming all Query methods, Options fields, SDKResultMessage subtypes, and AccountInfo type
- **Official Session Management docs** (https://platform.claude.com/docs/en/agent-sdk/sessions) -- Session creation, resume, fork behavior, sessionId capture from init messages
- **Codebase analysis** (direct reads of all 10 source files in `server/src/agent/`, `server/src/routes/agent.ts`, `server/src/app.ts`, `client/src/hooks/useAgentStream.ts`, `client/src/components/AgentOutput.tsx`, `client/src/components/AgentPanel.tsx`, `client/src/i18n/locales/en.json`, `client/src/i18n/locales/de.json`)

### Secondary (MEDIUM confidence)

- **GitHub issue #8069** (https://github.com/anthropics/claude-code/issues/8069) -- Confirmed that resume gives a different session_id from the original; session memory works but ID changes. This is a known behavior, not a bug fix we can wait for.
- **npm package page** (https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) -- Version 0.2.38 confirmed as current installed version

### Tertiary (LOW confidence)

- **`listSessions()` existence** -- The Phase 20 requirements mention `listSessions()` but this function does NOT exist in SDK v0.2.38. Not found in type definitions, official docs, or web search. Needs validation with the user. Our implementation uses custom metadata persistence as a substitute.
- **persistSession append vs overwrite** -- Inferred from JSONL format (append-friendly) but not verified with testing.

## Metadata

**Confidence breakdown:**
- Stop reasons (SDKF-01): HIGH -- SDK types explicitly define subtypes (verified in sdk.d.ts AND official docs), SSE adapter code is straightforward
- Session recovery (SDKF-02): MEDIUM -- `listSessions()` doesn't exist; custom metadata approach is solid but differs from requirement wording
- Deterministic IDs (SDKF-03): HIGH -- `Options.sessionId` is documented and typed; UUID generation is standard crypto; sessionId+resume constraint documented
- Auth health check (SDKF-04): HIGH -- `Query.accountInfo()` is documented with typed return value in both sdk.d.ts and official docs

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (stable; Agent SDK version locked at 0.2.38)

---

## Implementation Plan Sketch (for planner reference)

### Suggested Plan Sequence

**Plan 20-01: Stop Reasons + Deterministic Session IDs**
- Create `server/src/agent/session-id.ts` with `deterministicSessionId()` function
- Add `AgentStopReason` type to `server/src/agent/types.ts`
- Add `stopReason` field to SSE adapter result/error events in `sse-adapter.ts`
- Update `session-manager.ts` `start()` to use deterministic ID and pass `sessionId` to SDK options
- Update `session-manager.ts` `start()` to set `persistSession: true` for interactive sessions
- Update `session-manager.ts` `resume()` to use deterministic ID as Map key (NOT as SDK sessionId)
- Remove `randomUUID` import from `session-manager.ts`
- Update `AgentResult` interface in `useAgentStream.ts` to include `stopReason`
- Update error handler in `useAgentStream.ts` to capture `stopReason` from error events
- Update `AgentOutput.tsx` to display stop reason chip with conditional success/error styling
- Add stop reason i18n keys to both `en.json` and `de.json` (proper Unicode umlauts)

**Plan 20-02: Session Recovery + Auth Health Check**
- Create `server/src/agent/session-recovery.ts` with `loadPersistedSessions()` and `persistSessions()`
- Add `recoverSessions()` public method to `AgentSessionManager`
- Add `persistCurrentSessions()` private method to `AgentSessionManager`
- Update `pause()` to call `persistCurrentSessions()` after storing paused info
- Update `cleanup()` to async, persist running sessions before aborting
- Update `app.ts` startup chain: `warmSession.start()` then `recoverSessions()` then `verifyAuthToken()`
- Update `app.ts` graceful shutdown to `await agentSessions.cleanup()`
- Add `getAccountInfo()` method and `isReady` getter to `WarmAgentSession`
- Add `verifyAuthToken()` async function to `auth-check.ts`
- Add optional `GET /recoverable` route to `routes/agent.ts` for listing all recoverable sessions
- Add i18n keys for recovery UI to both `en.json` and `de.json`
