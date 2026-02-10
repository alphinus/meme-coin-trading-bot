# Stack Research: Claude Code SDK Migration

**Project:** Eluma -- Claude Agent SDK stabilization and authentication migration
**Researched:** 2026-02-10
**Confidence:** HIGH (official Anthropic docs + installed codebase inspection)
**Scope:** Migration from current `@anthropic-ai/claude-agent-sdk` v0.2.37 to support subscription-based authentication. Evaluation of whether `@anthropic-ai/claude-code` package is appropriate, or whether the current SDK should be retained.

---

## Critical Finding: Package Naming Clarification

The user's request references `@anthropic-ai/claude-code` as the target package. Research reveals this is **not the correct package** for programmatic SDK usage:

| Package | Purpose | Status |
|---------|---------|--------|
| `@anthropic-ai/claude-code` | CLI tool (terminal application) | `sdk.mjs` entry point broken since v2.0.5. SDK export deprecated. |
| `@anthropic-ai/claude-agent-sdk` | Programmatic TypeScript SDK with `query()` | **Active, v0.2.38 latest.** Official replacement for SDK functionality. |
| `@anthropic-ai/sdk` | Direct Anthropic API client (messages, completions) | Separate concern -- already using `@ai-sdk/anthropic` via AI SDK v6. |

**The project already uses the correct package** (`@anthropic-ai/claude-agent-sdk` v0.2.37). The `@anthropic-ai/claude-code` package's `query` entrypoint was migrated to `@anthropic-ai/claude-agent-sdk` and the old package has a broken `sdk.mjs` entry point (GitHub issue #10191).

**Recommendation: Do NOT switch packages.** Stay on `@anthropic-ai/claude-agent-sdk`. Bump from v0.2.37 to v0.2.38 for latest parity.

---

## Recommended Stack Changes

### 1. Version Bump: `@anthropic-ai/claude-agent-sdk`

| Property | Current | Target | Why |
|----------|---------|--------|-----|
| Version | ^0.2.37 | ^0.2.38 | Latest release (2026-02-10). Parity with Claude Code v2.1.38. No breaking changes. |

**What changed between v0.2.37 and v0.2.38:**
- Parity update with Claude Code v2.1.38 (no new API surface changes)

**Recent additions available in current version (v0.2.37) that the codebase may not yet use:**
- `sessionId` option (v0.2.33): Specify custom UUID for sessions instead of auto-generated
- `debug` / `debugFile` options (v0.2.30): Programmatic debug logging
- `listSessions()` function (v0.2.27): Discover resumable sessions
- `stop_reason` field on `SDKResultSuccess` / `SDKResultError` (v0.2.31)
- V2 preview interface: `unstable_v2_createSession()`, `unstable_v2_prompt()` (available but unstable)

**Installation:**
```bash
npm install @anthropic-ai/claude-agent-sdk@^0.2.38 -w server
```

**Confidence: HIGH** -- Verified via official GitHub releases and npm registry.

---

### 2. Authentication: API Key vs. Subscription (The Core Question)

The user wants to "use local Claude subscription instead of API key." This is the central architectural question.

#### Option A: ANTHROPIC_API_KEY (Current, Officially Supported)

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

- **Billing:** Pay-per-token from Anthropic Console
- **Support:** Fully supported by Anthropic for SDK usage
- **Policy:** Explicitly allowed for third-party applications
- **Reliability:** Stable, no policy risk

#### Option B: CLAUDE_CODE_OAUTH_TOKEN (Subscription Auth)

```bash
# Generate token from CLI
claude setup-token
export CLAUDE_CODE_OAUTH_TOKEN=<generated-token>
# Remove ANTHROPIC_API_KEY to force subscription fallback
unset ANTHROPIC_API_KEY
```

- **Billing:** Uses Claude Pro/Max subscription quota (fixed monthly cost)
- **Support:** Works technically but sits in a POLICY GRAY AREA
- **Policy:** Anthropic explicitly states: "Unless previously approved, Anthropic does not allow third party developers to offer claude.ai login or rate limits for their products, including agents built on the Claude Agent SDK."
- **Risk:** Anthropic tightened enforcement in January 2026. Could break without notice.
- **Reliability:** Token may expire, requiring re-authentication via `claude setup-token`

#### Option C: Dual-Mode Auth (Recommended)

Support both authentication methods. Let the environment decide:

```typescript
// The SDK already handles this internally:
// 1. If ANTHROPIC_API_KEY is set -> uses API key billing
// 2. If only CLAUDE_CODE_OAUTH_TOKEN is set -> uses subscription
// 3. If neither -> errors
//
// No code changes needed in session-manager.ts.
// The query() function reads env vars automatically.
```

**Why Dual-Mode:**
- No code changes required -- the SDK's subprocess already checks environment variables in priority order
- For the Eluma developer (personal use), OAuth token works fine
- For any future deployment or sharing, API key provides the officially supported path
- Removes hard dependency on either authentication method

**What must change for subscription auth:**
1. Ensure `ANTHROPIC_API_KEY` is NOT set when subscription auth is desired
2. Run `claude setup-token` once on the server machine to generate the OAuth token
3. Set `CLAUDE_CODE_OAUTH_TOKEN` in the server's environment (NOT in `.env` alongside `ANTHROPIC_API_KEY`)
4. The SDK subprocess picks up the token automatically

**Confidence: MEDIUM** -- OAuth token auth works per community demonstrations and issue discussions, but Anthropic's official policy discourages third-party use. For personal/internal tooling, LOW risk. For commercial distribution, HIGH risk.

---

### 3. Existing API Surface Audit (No Changes Needed)

The current `session-manager.ts` implementation is well-structured and uses the SDK correctly. Here is the audit of SDK features currently in use:

| Feature | Status | Code Location |
|---------|--------|---------------|
| `query()` async generator | In use | `session-manager.ts:59-72, 258-272` |
| `includePartialMessages: true` | In use | Both `start()` and `resume()` |
| `abortController` | In use | Passed to every `query()` call |
| `canUseTool` callback | In use | `tool-permissions.ts` (10-tool allowlist + bash filtering) |
| `permissionMode: 'default'` | In use | Correct -- allows canUseTool to function |
| `maxTurns` / `maxBudgetUsd` | In use | Configurable per session |
| `settingSources: []` | In use | Correct for SDK isolation |
| `resume` (session resume) | In use | `resume()` method uses SDK session ID |
| `Query.close()` | In use | Called during abort and pause |
| SDK session ID capture | In use | Extracted from `system.init` message |
| `SDKMessage` type | In use | `sse-adapter.ts` handles full union |
| `SDKPartialAssistantMessage` (stream_event) | In use | Handles text_delta, content_block_start/stop |
| `SDKResultMessage` | In use | Handles success and error subtypes |
| `SDKSystemMessage` | In use | Handles init and compacting |

**One issue found:** The current code passes `persistSession: false` and `persistSession: true` in the options. This property does NOT appear in the official v0.1.0+ API reference (Options type). It may be silently ignored or may have been removed. The SDK's session persistence is now controlled differently:
- Sessions are automatically persisted by the SDK subprocess
- `resume` option with a session ID handles resumption
- `forkSession` option creates a fork instead of continuing

**Action needed:** Remove `persistSession` from both `start()` and `resume()` calls. It is not in the current API surface and may generate TypeScript errors on upgrade.

---

### 4. Identified Missing SDK Features (Not Yet Used)

These SDK features are available but not used in the current codebase. They are relevant for the stabilization milestone:

| Feature | SDK API | Value for Eluma |
|---------|---------|-----------------|
| `listSessions()` | Top-level function | Could replace manual paused-session tracking. Discover all resumable sessions per working directory. |
| `sessionId` option | `options.sessionId` (v0.2.33) | Could use deterministic session IDs (e.g., `project-${projectId}`) instead of random UUIDs for cleaner pause/resume. |
| `stop_reason` field | `SDKResultMessage.stop_reason` | Better error categorization in SSE adapter (distinguish max_turns vs budget vs natural stop). |
| `accountInfo()` | `query.accountInfo()` | Display billing info / subscription status in UI. |
| `supportedModels()` | `query.supportedModels()` | Show available models in settings. |
| `systemPrompt` option | `options.systemPrompt` | Could provide project-specific context to the agent. Currently uses SDK default (minimal prompt). |
| V2 Session API | `unstable_v2_createSession()` | Simpler multi-turn pattern. NOT recommended yet -- marked unstable, missing features like `forkSession`. |
| Hooks | `options.hooks` | Could add logging, audit trail, or custom validation at hook points. |
| Subagents | `options.agents` | Could create specialized sub-agents for different GSD commands. |

---

## What NOT to Change

| Temptation | Why NOT |
|------------|---------|
| Switch to `@anthropic-ai/claude-code` | SDK entry point is broken (missing `sdk.mjs`). Package is CLI-only. Deprecated for SDK use. |
| Switch to V2 SDK interface | Marked "unstable preview". Missing features (`forkSession`). APIs may change. |
| Add WebSocket for streaming | SSE is already working, correct for unidirectional streaming. No reason to change. |
| Add `@anthropic-ai/sdk` for API calls | Already using AI SDK v6 with `@ai-sdk/anthropic` provider for direct API calls. Separate concern from agent sessions. |
| Remove `canUseTool` for `allowedTools` only | `canUseTool` provides runtime Bash command filtering that `allowedTools` cannot. Keep both. |
| Add `better-sse` or `express-sse` | Native SSE is already working with ~15 lines. No value in a library. |
| Add state management library | Existing Context + localStorage pattern is sufficient. |
| Replace EventEmitter with RxJS | EventEmitter works. RxJS would add significant complexity for zero user-facing benefit. |

---

## What to Install

```bash
# Bump existing dependency to latest
npm install @anthropic-ai/claude-agent-sdk@^0.2.38 -w server
```

**That is it.** No new dependencies required. The migration is about:
1. Removing the `persistSession` option (no longer in API)
2. Configuring authentication environment variables
3. Optionally adopting new SDK features (`listSessions`, `sessionId`, `stop_reason`)

---

## Environment Variable Configuration

### For API Key Auth (Production / Commercial)

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-...
```

### For Subscription Auth (Personal / Development)

```bash
# Generate token (run once on server machine)
claude setup-token

# .env (do NOT set ANTHROPIC_API_KEY alongside this)
CLAUDE_CODE_OAUTH_TOKEN=<token-from-setup>
```

### For Dual-Mode (Recommended)

```bash
# .env.example -- document both options
# Choose ONE authentication method:

# Option 1: API Key (pay-per-token, officially supported)
# ANTHROPIC_API_KEY=sk-ant-...

# Option 2: Subscription (uses Claude Pro/Max quota)
# Run `claude setup-token` first, then set:
# CLAUDE_CODE_OAUTH_TOKEN=<your-token>
```

**Prerequisite for subscription auth:** Claude Code CLI must be installed globally (`npm install -g @anthropic-ai/claude-code@latest`) and the user must be authenticated via `claude login` or `claude setup-token`.

---

## Integration Points with Existing Stack (Unchanged)

The existing integration architecture is sound and needs no structural changes:

| Integration | How It Works | Changes Needed |
|-------------|-------------|----------------|
| Express SSE routes | `GET /api/agent/stream/:sessionId` with `text/event-stream` | None |
| React client | `EventSource` + custom `useAgentStream()` hook | None |
| SSE adapter | `adaptMessage()` transforms SDKMessage to flat events | Minor: add `stop_reason` handling |
| Tool permissions | `canUseTool` callback with allowlist + bash filtering | None |
| Session manager | In-memory Map, per-project enforcement, pause/resume | Remove `persistSession`, optionally adopt `listSessions` |
| Compression middleware | `res.flush()` after every SSE write | None (already handled) |
| JSONL event store | `agent.session_started`, `agent.session_completed` events | None |
| PM2 process manager | 1536MB memory limit, 2048MB V8 heap | None |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@anthropic-ai/claude-agent-sdk@0.2.38` | Node.js 18+ | Requires `claude` CLI on PATH for subprocess |
| `@anthropic-ai/claude-agent-sdk@0.2.38` | TypeScript 5.0+ | Full type exports. `await using` needs TS 5.2+ (only for V2 API, not needed). |
| `@anthropic-ai/claude-agent-sdk@0.2.38` | `ai@6.x` / `@ai-sdk/anthropic@3.x` | No conflict -- different packages, different concerns |
| `@anthropic-ai/claude-agent-sdk@0.2.38` | Express 4.x | SDK is transport-agnostic. SSE forwarding is our code. |
| Subscription auth (OAuth) | Claude Code CLI v2.1.x+ | CLI must be installed and authenticated |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| SDK package | `@anthropic-ai/claude-agent-sdk` (keep current) | `@anthropic-ai/claude-code` | Broken SDK entry point. Deprecated for programmatic use. |
| SDK API | V1 `query()` async generator | V2 `unstable_v2_createSession()` | Marked unstable. Missing `forkSession`. APIs may change before stable release. |
| Auth (personal) | `CLAUDE_CODE_OAUTH_TOKEN` | `ANTHROPIC_API_KEY` only | User explicitly wants subscription auth for development use. |
| Auth (commercial) | `ANTHROPIC_API_KEY` | `CLAUDE_CODE_OAUTH_TOKEN` | Anthropic policy prohibits subscription auth in third-party products. |
| Session tracking | Keep in-memory Map + EventEmitter | Replace with `listSessions()` entirely | `listSessions()` is filesystem-based, not real-time. In-memory tracking needed for SSE streaming. Can supplement, not replace. |

---

## Migration Checklist (Code Changes)

Specific file changes needed for this milestone:

### 1. `server/src/agent/session-manager.ts`

- [ ] Remove `persistSession: false` from `start()` options (line ~69)
- [ ] Remove `persistSession: true` from `resume()` options (line ~269)
- [ ] Optionally: Use `sessionId` option for deterministic session IDs
- [ ] Optionally: Use `listSessions()` to discover resumable sessions on startup

### 2. `server/src/agent/sse-adapter.ts`

- [ ] Add handling for `stop_reason` field in result messages (available since v0.2.31)
- [ ] Consider handling `compact_boundary` system message for UI feedback

### 3. Environment configuration

- [ ] Update `.env.example` to document both auth methods
- [ ] Document `claude setup-token` procedure for subscription auth
- [ ] Ensure server startup logs which auth method is active (check for `ANTHROPIC_API_KEY` vs `CLAUDE_CODE_OAUTH_TOKEN`)

### 4. `server/package.json`

- [ ] Bump `@anthropic-ai/claude-agent-sdk` from `^0.2.37` to `^0.2.38`

---

## Sources

### Official Documentation (HIGH confidence)

- [Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview) -- Capabilities, installation, auth setup
- [Agent SDK TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript) -- Complete `query()` API, all types, all options
- [Agent SDK Streaming Output](https://platform.claude.com/docs/en/agent-sdk/streaming-output) -- `includePartialMessages`, StreamEvent flow
- [Agent SDK Migration Guide](https://platform.claude.com/docs/en/agent-sdk/migration-guide) -- `@anthropic-ai/claude-code` to `@anthropic-ai/claude-agent-sdk`
- [Agent SDK TypeScript V2 Preview](https://platform.claude.com/docs/en/agent-sdk/typescript-v2-preview) -- `unstable_v2_createSession()`, NOT recommended for production
- [TypeScript SDK Changelog](https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md) -- Version history, v0.2.38 is latest
- [TypeScript SDK Releases](https://github.com/anthropics/claude-agent-sdk-typescript/releases) -- Release dates and notes

### GitHub Issues (MEDIUM confidence)

- [#10191: @anthropic-ai/claude-code missing sdk.mjs](https://github.com/anthropics/claude-code/issues/10191) -- Confirms SDK entry point broken, migration to new package
- [#11: Claude Max Usage](https://github.com/anthropics/claude-agent-sdk-typescript/issues/11) -- Subscription auth works via `CLAUDE_CODE_OAUTH_TOKEN`
- [#6536: SDK CLAUDE_CODE_OAUTH_TOKEN](https://github.com/anthropics/claude-code/issues/6536) -- OAuth token discussion and workarounds
- [#5891: SDK requires API key vs CLI uses subscription](https://github.com/anthropics/claude-code/issues/5891) -- Documents the auth dichotomy

### Community Sources (LOW-MEDIUM confidence)

- [claude_agent_sdk_oauth_demo](https://github.com/weidwonder/claude_agent_sdk_oauth_demo) -- Working example of OAuth token auth with Agent SDK
- [Claude Code Cripples Third-Party Agents from OAuth](https://jpcaparas.medium.com/claude-code-cripples-third-party-coding-agents-from-using-oauth-6548e9b49df3) -- January 2026 policy enforcement tightening

### Direct Codebase Inspection (HIGH confidence)

- `server/package.json` -- Current `@anthropic-ai/claude-agent-sdk@^0.2.37`
- `server/src/agent/session-manager.ts` -- Full session lifecycle, `query()` usage, pause/resume
- `server/src/agent/sse-adapter.ts` -- SDKMessage to SSE event transformation
- `server/src/agent/tool-permissions.ts` -- canUseTool callback with allowlist + bash filtering
- `server/src/agent/types.ts` -- Session types, imports `Query` from SDK

---

*Stack research for: Claude Agent SDK migration and subscription authentication*
*Researched: 2026-02-10*
