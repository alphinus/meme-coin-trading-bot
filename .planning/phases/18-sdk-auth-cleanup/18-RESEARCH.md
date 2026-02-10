# Phase 18: SDK Auth & Cleanup - Research

**Researched:** 2026-02-10
**Domain:** Claude Agent SDK authentication configuration, deprecated option removal, version bump
**Confidence:** HIGH

## Summary

Phase 18 is a surgical cleanup phase with five discrete, well-scoped requirements. The codebase is already on the correct package (`@anthropic-ai/claude-agent-sdk` v0.2.37), the session manager architecture is sound, and no structural changes are needed. The work is: (1) configure subscription auth via `CLAUDE_CODE_OAUTH_TOKEN`, (2) add startup logging of active auth method, (3) add startup warning when both auth env vars are set, (4) bump SDK to v0.2.38 with clean TypeScript build, and (5) remove the deprecated `persistSession` option.

**Critical correction from prior research:** Inspection of the actual SDK type definitions (`sdk.d.ts` in the installed v0.2.37 package) reveals that `persistSession` IS still in the Options type (default `true`, controls whether sessions are saved to `~/.claude/projects/`). However, for this application's use case (ephemeral server-managed sessions), the correct value is `false` for `start()` and the option should be removed from `resume()` where it was set to `true` (resume already implies the session exists). The prior research incorrectly stated persistSession was removed from the API entirely. Additionally, `listSessions()` does NOT exist as an export in the current SDK -- it was mentioned in prior research but is not in the actual type definitions.

**Primary recommendation:** Execute the five requirements in strict dependency order -- remove `persistSession` from `resume()` first, bump SDK version second, then add auth detection/logging, and finally configure subscription auth in `.env`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/claude-agent-sdk` | 0.2.38 (bump from 0.2.37) | Agent session lifecycle via `query()` async generator | Only official programmatic SDK. Already installed, zero migration needed. |

### Supporting (no changes)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `strip-ansi` | (existing) | Strip ANSI from SDK text output in SSE adapter | Every text event |
| `express` | 4.x (existing) | HTTP + SSE routes for agent session management | All agent endpoints |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@anthropic-ai/claude-agent-sdk` | `@anthropic-ai/claude-code` | **Do NOT switch.** CLI-only package, `sdk.mjs` entry broken since v2.0.5 (GitHub issue #10191). |
| V1 `query()` API | V2 `unstable_v2_createSession()` | **Do NOT adopt.** Marked `@alpha`, APIs will change, missing features vs V1. |

**Installation:**
```bash
npm install @anthropic-ai/claude-agent-sdk@^0.2.38 -w server
```

## Architecture Patterns

### Recommended Project Structure (no changes needed)
```
server/src/agent/
  session-manager.ts   # Session lifecycle (start, abort, pause, resume)
  sse-adapter.ts       # SDKMessage -> flat SSE events
  tool-permissions.ts  # canUseTool with allowlist + bash filtering
  types.ts             # TypeScript interfaces
server/src/app.ts      # Express app setup, startup initialization
server/src/index.ts    # Server entry point
```

### Pattern 1: Auth Detection at Startup
**What:** Check environment variables at server startup to determine and log which authentication method the SDK subprocess will use.
**When to use:** Server startup, before any agent sessions are created.
**Why:** The SDK subprocess reads env vars automatically -- there is no programmatic auth config in `query()`. The server must inspect the same env vars to know what the SDK will do.

**Key insight from SDK source:** The SDK's `query()` function does NOT accept auth credentials. Authentication is handled entirely by the subprocess which inherits `process.env`. The subprocess checks in this priority order:
1. `ANTHROPIC_API_KEY` -- if set, uses API key auth (pay-per-token)
2. `CLAUDE_CODE_OAUTH_TOKEN` -- if set (and no API key), uses subscription auth
3. Neither -- subprocess fails with auth error

**Code location for auth logging:** `server/src/app.ts` (after imports, before route setup) or a new `server/src/startup/auth-check.ts` module.

```typescript
// Source: SDK type definitions + official docs
// The SDK reads these env vars in its subprocess:
function logAuthMethod(): void {
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  const hasOAuthToken = !!process.env.CLAUDE_CODE_OAUTH_TOKEN;

  if (hasApiKey && hasOAuthToken) {
    console.warn(
      "[auth] WARNING: Both ANTHROPIC_API_KEY and CLAUDE_CODE_OAUTH_TOKEN are set. " +
      "SDK will use API key (higher priority). Subscription token will be ignored. " +
      "Remove one to avoid billing surprises."
    );
  }

  if (hasApiKey) {
    console.log("[auth] Agent SDK auth: API key (pay-per-token billing)");
  } else if (hasOAuthToken) {
    console.log("[auth] Agent SDK auth: Subscription (Claude Max quota)");
  } else {
    console.warn("[auth] WARNING: No agent auth configured. Set ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN.");
  }
}
```

### Pattern 2: Runtime Auth Verification via `apiKeySource`
**What:** After a session starts, the SDK sends a `system.init` message containing `apiKeySource: ApiKeySource` (one of `'user' | 'project' | 'org' | 'temporary'`). This confirms which auth method the subprocess actually resolved to.
**When to use:** In `consumeStream()` where the init message is already captured for `sdkSessionId`.
**Current code already captures session_id from init:**
```typescript
// session-manager.ts line 321-323 (current code)
if (msg.type === "system" && msg.subtype === "init" && msg.session_id) {
  session.sdkSessionId = msg.session_id as string;
}
```
**Enhancement:** Also capture `apiKeySource` for logging/debugging.

### Pattern 3: `persistSession: false` for Server-Managed Sessions
**What:** The `persistSession` option (boolean, default `true`) controls whether the SDK saves session transcripts to `~/.claude/projects/`. For server-managed sessions where the server owns the lifecycle, this should be `false` to avoid disk accumulation.
**Actual SDK type (verified from installed sdk.d.ts):**
```typescript
// From sdk.d.ts lines 597-599:
/**
 * When false, disables session persistence to disk. Sessions will not be
 * saved to ~/.claude/projects/ and cannot be resumed later.
 * @default true
 */
persistSession?: boolean;
```
**What must change:**
- `start()` already passes `persistSession: false` -- CORRECT, keep it
- `resume()` passes `persistSession: true` -- this contradicts the start setting and is redundant since `resume` implies the session exists. Remove this line. Resume already works via the `resume: sessionId` option which tells the SDK to load the existing session.

### Anti-Patterns to Avoid
- **Setting both ANTHROPIC_API_KEY and CLAUDE_CODE_OAUTH_TOKEN:** API key wins silently. User thinks they use subscription but gets billed per-token.
- **Removing `persistSession: false` from `start()`:** Would cause SDK to write session files to disk for every server-managed session, accumulating files in `~/.claude/projects/`.
- **Using `bypassPermissions` mode:** Silently disables `canUseTool` callback. Current code correctly uses `'default'`.
- **Passing auth credentials via `env` option to `query()`:** Unnecessary and fragile. The SDK subprocess inherits `process.env` automatically. Just set the env var once at server level.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth method detection | Custom token introspection | Check `process.env` for known vars | SDK uses env vars, not programmatic auth |
| Token validation at startup | HTTP call to Anthropic API | `query.accountInfo()` after first session | SDK provides built-in account info query |
| Session persistence | Custom file-based session storage | SDK's built-in `resume` option | SDK handles session serialization internally |
| ANSI stripping | Custom regex | `strip-ansi` (already used) | Battle-tested, handles all escape sequences |

**Key insight:** Auth for the Agent SDK is environment-variable-based. The server's role is to (a) detect which vars are set, (b) log what the SDK will use, and (c) warn on ambiguous configuration. There is no auth API to call.

## Common Pitfalls

### Pitfall 1: Both Auth Env Vars Set Simultaneously
**What goes wrong:** `ANTHROPIC_API_KEY` takes priority over `CLAUDE_CODE_OAUTH_TOKEN`. User believes they use subscription quota but gets billed per-token via the API. No error is thrown.
**Why it happens:** Developer adds subscription token to `.env` without removing the API key. Both exist, SDK silently picks API key.
**How to avoid:**
- Add startup check that warns if both are set (SDKA-03 requirement)
- Document in `.env.example` that only ONE should be active
- Log active auth method at startup (SDKA-02 requirement)
**Warning signs:** Unexpected API billing charges. `apiKeySource` in init message shows `'user'` when expecting subscription.

### Pitfall 2: Incorrect `persistSession` Handling in `resume()`
**What goes wrong:** Current `resume()` passes `persistSession: true` while `start()` passes `persistSession: false`. This inconsistency means resumed sessions write to disk while fresh sessions don't.
**Why it happens:** Original implementation assumed resume needed persistence enabled to find the session. In reality, the `resume: sessionId` option handles session loading independently.
**How to avoid:** Either remove `persistSession` from `resume()` entirely (it defaults to `true`), or explicitly set it to `false` to match `start()`. For server-managed sessions, `false` is correct.
**Warning signs:** Growing `.claude/projects/` directory on the server filesystem.

### Pitfall 3: SDK Version Bump Breaks TypeScript Build
**What goes wrong:** Bumping from v0.2.37 to v0.2.38 causes TypeScript errors if code relies on types that changed between versions.
**Why it happens:** SDK parity updates may adjust type signatures.
**How to avoid:**
- Order of operations: fix any type issues BEFORE bumping (or in same commit)
- Run `npm run build` immediately after version bump to verify
- The v0.2.37->v0.2.38 changelog shows "parity update" only, no API surface changes
**Warning signs:** `npm run build` fails after `npm install`.

### Pitfall 4: OAuth Token Expiration
**What goes wrong:** `CLAUDE_CODE_OAUTH_TOKEN` expires or is revoked. Agent sessions fail with opaque errors.
**Why it happens:** OAuth tokens have limited lifetimes, unlike long-lived API keys.
**How to avoid:**
- Document `claude setup-token` re-authentication procedure
- Log `apiKeySource` from init message for debugging
- Consider `accountInfo()` call for health-check validation
**Warning signs:** Sessions suddenly fail with auth-related errors after working previously.

### Pitfall 5: `CanUseTool` Signature Mismatch After Upgrade
**What goes wrong:** The `CanUseTool` type in v0.2.38 may have additional required properties in the `options` parameter (e.g., `toolUseID: string` is now present). If the code destructures or validates the options object strictly, it could fail.
**Why it happens:** SDK type evolution adds fields to callback parameters.
**How to avoid:** Current code uses `_options` (ignores the parameter), which is compatible. Do NOT start destructuring the options object without checking the current type signature.
**Warning signs:** TypeScript errors in `tool-permissions.ts` after version bump.

## Code Examples

### Example 1: Auth Detection and Logging (SDKA-02, SDKA-03)
```typescript
// Source: Direct analysis of SDK env var behavior + official docs
// Location: server/src/app.ts (or new server/src/agent/auth-check.ts)

/**
 * Detect and log which authentication method the Agent SDK will use.
 * Called once at server startup before any agent sessions.
 *
 * The SDK subprocess inherits process.env and checks:
 * 1. ANTHROPIC_API_KEY (highest priority, pay-per-token)
 * 2. CLAUDE_CODE_OAUTH_TOKEN (subscription auth, Claude Max quota)
 */
export function checkAgentAuth(): void {
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  const hasOAuthToken = !!process.env.CLAUDE_CODE_OAUTH_TOKEN;

  // SDKA-03: Warn if both are set
  if (hasApiKey && hasOAuthToken) {
    console.warn(
      "[agent-auth] WARNING: Both ANTHROPIC_API_KEY and CLAUDE_CODE_OAUTH_TOKEN are set. " +
      "The SDK will use the API key (higher priority). " +
      "The subscription token will be silently ignored. " +
      "To use subscription auth, remove ANTHROPIC_API_KEY from your environment."
    );
  }

  // SDKA-02: Log which auth method is active
  if (hasApiKey) {
    console.log("[agent-auth] Auth method: API key (pay-per-token billing)");
  } else if (hasOAuthToken) {
    console.log("[agent-auth] Auth method: Subscription (Claude Max quota)");
  } else {
    console.warn(
      "[agent-auth] WARNING: No agent authentication configured. " +
      "Set ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN. " +
      "Agent sessions will fail until auth is configured."
    );
  }
}
```

### Example 2: Remove persistSession from resume() (SDKA-05)
```typescript
// Source: Installed sdk.d.ts type definitions (verified)
// Location: server/src/agent/session-manager.ts resume() method

// BEFORE (current code, line ~258-272):
const agentQuery = query({
  prompt: "Continue where you left off",
  options: {
    cwd: process.cwd(),
    abortController,
    canUseTool,
    permissionMode: "default",
    includePartialMessages: true,
    maxTurns: 25,
    maxBudgetUsd: 2.0,
    persistSession: true,    // <-- REMOVE THIS LINE
    resume: paused.sdkSessionId,
    settingSources: [],
  },
});

// AFTER:
const agentQuery = query({
  prompt: "Continue where you left off",
  options: {
    cwd: process.cwd(),
    abortController,
    canUseTool,
    permissionMode: "default",
    includePartialMessages: true,
    maxTurns: 25,
    maxBudgetUsd: 2.0,
    // persistSession removed -- resume handles session loading via resume option
    resume: paused.sdkSessionId,
    settingSources: [],
  },
});
```

### Example 3: Capture apiKeySource from Init Message
```typescript
// Source: SDKSystemMessage type from sdk.d.ts
// Location: session-manager.ts consumeStream() method

// Current code (lines 320-323):
if (msg.type === "system" && msg.subtype === "init" && msg.session_id) {
  session.sdkSessionId = msg.session_id as string;
}

// Enhanced:
if (msg.type === "system" && msg.subtype === "init") {
  if (msg.session_id) {
    session.sdkSessionId = msg.session_id as string;
  }
  // Log the auth method the SDK subprocess actually resolved
  if (msg.apiKeySource) {
    console.log(`[agent] Session ${session.id} auth: apiKeySource=${msg.apiKeySource}`);
  }
}
```

### Example 4: SDK Version Bump (SDKA-04)
```bash
# From project root:
cd /Users/developer/eluma
npm install @anthropic-ai/claude-agent-sdk@^0.2.38 -w server

# Verify TypeScript compilation:
cd server && npm run build

# Expected: zero errors
```

### Example 5: Environment Configuration for Subscription Auth (SDKA-01)
```bash
# Step 1: Generate OAuth token (run on server machine, one-time)
claude setup-token

# Step 2: Update .env -- choose ONE method
# For subscription auth (personal/development use):
CLAUDE_CODE_OAUTH_TOKEN=<token-from-setup>
# Comment out or remove ANTHROPIC_API_KEY

# For API key auth (production/commercial use):
ANTHROPIC_API_KEY=sk-ant-...
# Do NOT set CLAUDE_CODE_OAUTH_TOKEN alongside this
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@anthropic-ai/claude-code` for SDK | `@anthropic-ai/claude-agent-sdk` | SDK v0.1.0 (renamed) | Must use new package name. Old package SDK entry broken. |
| `persistSession` not documented | `persistSession` in Options (default true) | Verified in v0.2.37 sdk.d.ts | Still a valid option. Controls disk persistence. |
| `listSessions()` mentioned in research | NOT in actual SDK exports | Verified v0.2.37 | Previous research incorrect. Do not plan for `listSessions()`. |
| `stop_reason` not in result | `stop_reason: string \| null` on both SDKResultSuccess and SDKResultError | v0.2.31+ | Available for UI enhancement (Phase 20 scope, not Phase 18). |
| `sessionId` not configurable | `sessionId` option in query() Options | v0.2.33+ | Can use deterministic IDs (Phase 20 scope, not Phase 18). |

**Deprecated/outdated:**
- `@anthropic-ai/claude-code` SDK entry point: Broken since v2.0.5, do not use
- Previous research claim that `persistSession` was removed from API: **INCORRECT** -- it is still in the Options type with documentation

## Open Questions

1. **OAuth Token Lifetime**
   - What we know: `CLAUDE_CODE_OAUTH_TOKEN` has a limited lifetime (confirmed in docs and issues). Tokens can be refreshed via `claude setup-token`.
   - What's unclear: Exact TTL. Is there a refresh mechanism that doesn't require manual `claude setup-token`?
   - Recommendation: Document the re-auth procedure. Log auth failures clearly. Consider health check at startup via `accountInfo()` (but this requires an active session, so may not be practical for startup validation).

2. **`apiKeySource` Values for Subscription Auth**
   - What we know: The type is `'user' | 'project' | 'org' | 'temporary'`. API key auth typically shows `'user'`.
   - What's unclear: What value does subscription auth via `CLAUDE_CODE_OAUTH_TOKEN` report?
   - Recommendation: Log the value during first session and observe. Not a blocker -- startup env var check covers the detection requirement.

3. **TypeScript Strictness on SDK v0.2.38**
   - What we know: Changelog says "parity update with Claude Code v2.1.38", no API surface changes documented.
   - What's unclear: Whether the bundled `sdk.d.ts` types changed between 0.2.37 and 0.2.38 in ways that affect compilation.
   - Recommendation: Bump version and run `npm run build` immediately. Fix any errors before proceeding. Risk is LOW.

## Specific Files That Must Change

| File | Change | Requirement |
|------|--------|-------------|
| `server/package.json` | Bump `@anthropic-ai/claude-agent-sdk` from `^0.2.37` to `^0.2.38` | SDKA-04 |
| `server/src/agent/session-manager.ts` | Remove `persistSession: true` from `resume()` options (line ~269). Keep `persistSession: false` in `start()`. | SDKA-05 |
| `server/src/app.ts` (or new auth-check module) | Add `checkAgentAuth()` function called at startup | SDKA-02, SDKA-03 |
| `.env` | Set `CLAUDE_CODE_OAUTH_TOKEN`, optionally remove `ANTHROPIC_API_KEY` | SDKA-01 |
| `.env.example` (if exists, or create) | Document both auth methods with "choose ONE" guidance | SDKA-01, SDKA-03 |

## Exact Code Locations

### `persistSession` in session-manager.ts
- **Line 69** (`start()`): `persistSession: false` -- KEEP THIS (correct for server-managed sessions)
- **Line 268** (`resume()`): `persistSession: true` -- REMOVE THIS (inconsistent, redundant with `resume` option)

### Auth env var references
- **`.env` line 7**: `ANTHROPIC_API_KEY=sk-ant-...` -- Currently the only auth method configured
- **`server/src/ai/providers.ts` lines 21-29**: Warns about missing `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` -- these are for AI SDK v6 (separate from Agent SDK), do NOT change in Phase 18

### Server startup
- **`server/src/app.ts`**: Main app initialization. Auth check should be added after imports, before route setup.
- **`server/src/index.ts`**: Minimal entry point (ViteExpress listen). Auth check goes in `app.ts`, not here.

## Sources

### Primary (HIGH confidence)
- Installed SDK type definitions: `/Users/developer/eluma/node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts` -- Complete Options type, Query interface, SDKMessage types, persistSession confirmed present
- [Agent SDK TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript) -- Complete query() API, Options type, all SDK features
- [Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview) -- Auth setup, capabilities, policy notice about third-party OAuth
- [TypeScript SDK Changelog](https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md) -- v0.2.38 is parity update, no API surface changes
- Direct codebase inspection: `server/src/agent/session-manager.ts`, `server/src/agent/sse-adapter.ts`, `server/src/agent/tool-permissions.ts`, `server/src/agent/types.ts`, `server/src/app.ts`, `server/src/index.ts`, `server/package.json`, `.env`

### Secondary (MEDIUM confidence)
- [GitHub Issue #10191](https://github.com/anthropics/claude-code/issues/10191) -- Confirms @anthropic-ai/claude-code SDK entry point broken
- [GitHub Issue #11](https://github.com/anthropics/claude-agent-sdk-typescript/issues/11) -- Subscription auth works via CLAUDE_CODE_OAUTH_TOKEN
- [npm registry](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) -- v0.2.38 confirmed as latest available version

### Tertiary (LOW confidence)
- Prior v1.3 research files (`.planning/research/SUMMARY.md`, `STACK.md`, `PITFALLS.md`) -- Valuable context but contained one significant error (persistSession removal claim) and one factual error (listSessions availability). Cross-referenced and corrected in this research.

## Corrections to Prior Research

| Prior Claim | Actual Finding | Impact |
|-------------|---------------|--------|
| "`persistSession` not in v0.1.0+ API reference" | `persistSession` IS in Options type (sdk.d.ts line 597-599, default `true`) | SDKA-05 is about removing from `resume()` only, not removing entirely. Keep `false` in `start()`. |
| "`listSessions()` function available (v0.2.27)" | `listSessions` is NOT exported in sdk.d.ts | Phase 20 SDKF-02 needs re-evaluation (out of Phase 18 scope). |
| "persistSession must be removed before SDK version bump" | Not strictly necessary since the option exists in the API. But cleaning up `resume()` before bump is still good practice. | Lower risk than previously assessed. |

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Verified from installed SDK types, npm registry, official docs
- Architecture: HIGH -- Direct codebase inspection, patterns validated against SDK reference
- Pitfalls: HIGH -- Each pitfall mapped to specific code lines, verified against SDK type definitions
- Auth mechanisms: HIGH -- Official docs + env var inspection + SDK type definitions

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable domain, SDK parity updates only)
