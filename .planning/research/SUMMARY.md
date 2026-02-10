# Project Research Summary

**Project:** Eluma v1.3 SDK Migration & Stabilization
**Domain:** SDK authentication migration, session lifecycle, stabilization
**Researched:** 2026-02-10
**Confidence:** HIGH

## Executive Summary

This research reveals a critical insight: the Eluma project does NOT need to migrate packages. The @anthropic-ai/claude-code package referenced in the original request was renamed to @anthropic-ai/claude-agent-sdk, which is already installed at v0.2.37. The confusion stems from Anthropic's package naming: @anthropic-ai/claude-code is now CLI-only with a broken SDK entry point (GitHub issue #10191), while @anthropic-ai/claude-agent-sdk is the official programmatic SDK.

The "migration" is actually a stabilization pass with four minimal technical changes: (1) configure subscription auth via CLAUDE_CODE_OAUTH_TOKEN environment variable with zero code changes, (2) remove the deprecated persistSession option from session-manager.ts, (3) bump SDK version from 0.2.37 to 0.2.38 for latest parity, and (4) optionally adopt new SDK features (stop_reason field, listSessions() API, deterministic sessionId). The existing architecture is sound -- SSE streaming, session management, tool permissions, and pause/resume all work correctly and require no structural changes.

The main risk is authentication policy: while subscription-based auth (CLAUDE_CODE_OAUTH_TOKEN) works technically and eliminates per-token API costs, Anthropic's January 2026 policy tightening warns against third-party use of subscription auth. For personal/internal use this is low risk, but for any commercial distribution the API key path (ANTHROPIC_API_KEY) is the officially supported approach. The recommended solution is dual-mode auth: support both methods, let environment variables decide, document the tradeoffs clearly.

## Key Findings

### Recommended Stack

NO package migration is needed. The project already uses the correct package (@anthropic-ai/claude-agent-sdk). All four researchers independently confirmed this critical finding.

**Core technologies:**
- **@anthropic-ai/claude-agent-sdk v0.2.38**: Programmatic TypeScript SDK with query() async generator -- bump from current v0.2.37 for latest parity, no breaking changes
- **Subscription auth (CLAUDE_CODE_OAUTH_TOKEN)**: Uses Claude Pro/Max quota instead of per-token billing -- works technically via claude setup-token, but in policy gray area per January 2026 enforcement
- **API key auth (ANTHROPIC_API_KEY)**: Pay-per-token billing -- officially supported for third-party integrations, recommended for any commercial use
- **Dual-mode auth pattern**: Support both methods, no code changes needed -- SDK subprocess reads environment variables automatically in priority order

**What must change:**
1. Remove persistSession option (not in v0.1.0+ API, causes TypeScript errors on strict mode)
2. Set CLAUDE_CODE_OAUTH_TOKEN in server environment (NOT alongside ANTHROPIC_API_KEY)
3. Bump package version to 0.2.38
4. Optionally adopt: stop_reason field, listSessions() for session discovery, deterministic sessionId

**What NOT to change:**
- Do NOT switch to @anthropic-ai/claude-code (SDK entry point broken since v2.0.5)
- Do NOT adopt V2 SDK interface (marked unstable, APIs will change)
- Do NOT use bypassPermissions mode (silently disables canUseTool callback)

### Expected Features

**Must have (table stakes) -- all already working:**
- SSE streaming to browser with real-time agent output
- Per-project session enforcement (prevents concurrent sessions)
- Pause/resume agent sessions with SDK session ID
- Abort running sessions via AbortController
- Tool permission allowlist with 10-tool security boundary
- Bash command filtering for dangerous patterns
- Late-joining SSE replay with 2000-event buffer
- Session timeout (10 minutes) and graceful shutdown cleanup

**Should have (competitive) -- quick wins during stabilization:**
- **stop_reason in SSE events**: Parse from SDKResultMessage, display "budget exceeded" vs "task complete" vs "max turns" in UI
- **listSessions() on startup**: Discover resumable sessions after server restart, supplement in-memory tracking
- **Deterministic sessionId**: Use project-{id} pattern for cleaner pause/resume UX
- **accountInfo() display**: Show subscription status or billing info in settings

**Defer (v2+) -- high effort, not critical:**
- Custom systemPrompt per GSD command (needs prompt engineering)
- SDK hooks for audit trail (JSONL event store already captures lifecycle)
- Custom subagents for specialized GSD commands

### Architecture Approach

The existing architecture is sound and requires no structural changes. The pattern is: Browser (React with EventSource) → Express SSE routes → Session Manager (singleton with in-memory Map, EventEmitter bridge, background stream consumption) → SDK query() async generator → SDK subprocess (inherits env vars for auth) → Claude API + built-in tools.

**Major components (all correct, no changes):**
1. **Session Manager** -- Lifecycle control (start, abort, pause, resume), per-project enforcement, EventEmitter for SSE
2. **SSE Adapter** -- Transforms SDKMessage union into flat browser-friendly events, ANSI stripping
3. **Tool Permissions** -- canUseTool callback with allowlist + bash pattern filtering (permissionMode: 'default')
4. **Background Stream Consumption** -- Decouples query() iteration from HTTP requests, prevents backpressure
5. **Replay Buffer + EventEmitter Bridge** -- Enables late-joining clients, supports multiple concurrent SSE connections

**Key patterns to follow:**
- Background consumption (always iterate query() regardless of connected clients)
- EventEmitter bridge (separate message production from consumption)
- canUseTool with permissionMode: 'default' (never use bypassPermissions)

### Critical Pitfalls

1. **Setting both ANTHROPIC_API_KEY and CLAUDE_CODE_OAUTH_TOKEN** -- SDK uses API key (higher priority), subscription token silently ignored, user gets billed unexpectedly. Prevention: Document "choose ONE" in .env.example, add startup log showing active auth method, consider startup warning if both detected.

2. **persistSession option no longer in API** -- Current code passes this to query(), but it's not in v0.1.0+ API reference. At minimum silently ignored, at worst TypeScript strict mode rejects unknown properties on version bump. Prevention: Remove from both start() and resume() in session-manager.ts before bumping version.

3. **OAuth token expiration without monitoring** -- CLAUDE_CODE_OAUTH_TOKEN has limited lifetime, unlike API keys. Sessions fail with opaque errors when expired. Prevention: Use accountInfo() at startup to verify auth, log apiKeySource from system.init message, document claude setup-token re-authentication procedure.

4. **Using @anthropic-ai/claude-code instead of @anthropic-ai/claude-agent-sdk** -- The old package's sdk.mjs entry point is missing since v2.0.5, import fails with ERR_MODULE_NOT_FOUND. Prevention: Project already uses correct package, do NOT change imports.

5. **canUseTool silently disabled by bypassPermissions** -- Changing permissionMode to 'bypassPermissions' (for "easier testing") disables the canUseTool callback, tool allowlist and bash filtering stop working. Prevention: Never use bypassPermissions with canUseTool, current code uses 'default' correctly, add comment explaining why.

## Implications for Roadmap

This milestone is fundamentally a **stabilization pass**, not a migration. The technical scope is minimal. The bulk of work is addressing the 23 pending verification tests and polish items identified in the existing .planning/phases/ structure.

### Suggested Phase Structure

Based on research, recommend splitting into 3 phases:

### Phase 1: Auth Configuration & SDK Cleanup
**Rationale:** Zero-risk changes first. Remove deprecated option, bump version, configure auth. No functional changes to session lifecycle.

**Delivers:**
- Subscription auth configured and working (CLAUDE_CODE_OAUTH_TOKEN)
- persistSession removed from session-manager.ts (prevents future TypeScript errors)
- SDK bumped to v0.2.38 (latest parity)
- Dual-mode auth documented in .env.example
- Startup validation that logs active auth method

**Addresses features:**
- Table stakes: Subscription auth (not yet configured)

**Avoids pitfalls:**
- Pitfall 2: Both auth vars set (via startup logging)
- Pitfall 3: persistSession TypeScript error (removed before version bump)
- Pitfall 4: OAuth token expiration (via startup validation)

**Research flag:** No additional research needed -- official SDK docs are comprehensive, pattern is well-documented.

### Phase 2: SDK Feature Adoption
**Rationale:** Low-hanging fruit that improves UX with minimal risk. All features are available in current v0.2.37, just not yet used.

**Delivers:**
- stop_reason field in SSE events (better error categorization)
- Deterministic sessionId for cleaner pause/resume
- listSessions() supplement to in-memory tracking
- accountInfo() displayed in settings or logs

**Addresses features:**
- Differentiator: stop_reason in SSE events
- Differentiator: listSessions() on startup
- Differentiator: Deterministic sessionId
- Differentiator: accountInfo() display

**Uses stack:**
- SDKResultMessage.stop_reason (v0.2.31)
- listSessions() API (v0.2.27)
- sessionId option (v0.2.33)
- query.accountInfo() method

**Implements architecture:**
- SSE adapter enhancement (stop_reason handling)
- Session manager enhancement (listSessions integration)

**Avoids pitfalls:**
- Pitfall 5: V2 API adoption (explicitly NOT adopting unstable APIs)

**Research flag:** No additional research needed -- all APIs documented in official TypeScript reference.

### Phase 3: Stabilization Pass
**Rationale:** Address the 23 pending verification tests and known gaps across all v1.2 phases. This is where the bulk of effort goes.

**Delivers:**
- All pending verification tests passing
- Bug fixes for edge cases discovered during verification
- UX polish for agent streaming, project management, GitHub integration
- Performance validation under load
- Documentation updates reflecting stabilized features

**Addresses features:**
- All table stakes features verified working end-to-end
- Polish items from differentiators list

**Avoids pitfalls:**
- Pitfall 6: Compression middleware buffering (verify res.flush() still working)
- Pitfall 7: canUseTool disabled (verify permissionMode stays 'default')
- Pitfall 9: Replay buffer memory growth (verify MAX_BUFFER_SIZE=2000 enforced)
- Pitfall 10: EventEmitter max listeners (verify setMaxListeners(20) sufficient)

**Research flag:** NO phase-level research needed. This is execution against existing specs. Individual bugs may need targeted investigation, but not systematic research.

### Phase Ordering Rationale

**Why auth/cleanup first:**
- persistSession removal must happen before version bump (prevents TypeScript errors)
- Auth configuration has zero code risk -- SDK subprocess handles everything
- Enables immediate subscription cost savings for development work
- Validates that dual-mode auth works before any other changes

**Why feature adoption second:**
- Builds on stable auth foundation
- All features are additive -- no breaking changes to existing code
- stop_reason and listSessions provide immediate value for Phase 3 debugging
- Low risk, high visibility improvements

**Why stabilization last:**
- Benefits from improved debugging (stop_reason, listSessions)
- Largest scope, most unknowns -- better informed after Phases 1-2
- Can parallelize bug fixes across multiple sessions
- Natural checkpoint for v1.3 milestone completion

### Research Flags

**No additional research needed for any phase.** All three researchers achieved HIGH confidence ratings. Stack research verified official docs and inspected codebase. Features research cataloged available APIs. Architecture research validated existing patterns. Pitfalls research identified specific code locations and prevention strategies.

**Standard patterns (skip research-phase):**
- Phase 1: Official SDK docs are comprehensive, auth pattern well-documented
- Phase 2: All APIs in official TypeScript reference with examples
- Phase 3: Execution against existing verification specs, no new domain knowledge

**If gaps emerge during execution:**
- Use `/gsd:research-topic` for specific questions (not `/gsd:research-phase`)
- Example: "How does listSessions() interact with working directory changes?"
- Example: "What's the exact OAuth token expiration policy?"

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Official Anthropic docs verified, current package.json inspected, SDK changelog reviewed, GitHub issues confirm package naming situation |
| Features | **HIGH** | All table stakes features verified working in codebase, new features documented in official TypeScript reference, complexity assessed from API surface |
| Architecture | **HIGH** | Direct codebase inspection, patterns validated against official SDK examples, data flow traced through session-manager.ts and sse-adapter.ts |
| Pitfalls | **HIGH** | Each pitfall mapped to specific code locations, prevention strategies verified against SDK docs, detection methods tested |

**Overall confidence:** **HIGH**

All four researchers converged on the same conclusions independently. Research is backed by official Anthropic documentation, direct codebase inspection, published GitHub issues, and npm package verification. The "no migration needed" finding was consistent across all research files.

### Gaps to Address

**None requiring pre-planning research.** However, during execution watch for:

- **OAuth token lifecycle in production**: Research confirms tokens can expire, but exact TTL and refresh mechanism not fully documented. Document the re-authentication procedure clearly. Handle auth failures gracefully with user-friendly error messages.

- **listSessions() filesystem behavior**: API is documented, but interaction with PM2 restarts and multiple working directories needs testing. Validate that session discovery works reliably across server restarts.

- **stop_reason field coverage**: Confirm that stop_reason appears in all result types (success and error). Add fallback handling if undefined for backwards compatibility.

- **CI/CD environment for subscription auth**: Subscription auth requires `claude login`, which won't work in headless CI environments. Document that CI must use ANTHROPIC_API_KEY, subscription is dev-only.

**All gaps are validation items, not knowledge gaps.** Proceed with implementation, validate during Phase 2 testing.

## Sources

### Primary (HIGH confidence)
- [Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview) -- Capabilities, auth setup, built-in tools
- [Agent SDK TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript) -- Complete query() API, Options type, all SDK features
- [Agent SDK Streaming Output](https://platform.claude.com/docs/en/agent-sdk/streaming-output) -- StreamEvent flow, includePartialMessages behavior
- [Agent SDK Migration Guide](https://platform.claude.com/docs/en/agent-sdk/migration-guide) -- Package rename from claude-code to claude-agent-sdk
- [TypeScript SDK Changelog](https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md) -- Version history, v0.2.38 latest
- [TypeScript SDK Releases](https://github.com/anthropics/claude-agent-sdk-typescript/releases) -- Release dates and notes
- Direct codebase inspection: server/package.json, server/src/agent/session-manager.ts, server/src/agent/sse-adapter.ts, server/src/agent/tool-permissions.ts

### Secondary (MEDIUM confidence)
- [GitHub Issue #10191](https://github.com/anthropics/claude-code/issues/10191) -- Confirms @anthropic-ai/claude-code SDK entry point broken
- [GitHub Issue #11](https://github.com/anthropics/claude-agent-sdk-typescript/issues/11) -- Subscription auth works via CLAUDE_CODE_OAUTH_TOKEN
- [GitHub Issue #6536](https://github.com/anthropics/claude-code/issues/6536) -- OAuth token discussion and workarounds
- [GitHub Issue #5891](https://github.com/anthropics/claude-code/issues/5891) -- Documents API key vs subscription auth dichotomy

### Tertiary (LOW-MEDIUM confidence)
- [claude_agent_sdk_oauth_demo](https://github.com/weidwonder/claude_agent_sdk_oauth_demo) -- Working community example of OAuth auth
- [Medium: Claude Code Cripples Third-Party Agents](https://jpcaparas.medium.com/claude-code-cripples-third-party-coding-agents-from-using-oauth-6548e9b49df3) -- January 2026 policy enforcement context

---
*Research completed: 2026-02-10*
*Ready for roadmap: yes*
