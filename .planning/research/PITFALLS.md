# Pitfalls Research

**Domain:** Claude Agent SDK migration, stabilization, and authentication model change
**Researched:** 2026-02-10
**Confidence:** HIGH (verified against official docs, SDK TypeScript reference, GitHub issues, and codebase analysis)

## Critical Pitfalls

Mistakes that cause build failures, runtime errors, or authentication breakdowns.

### Pitfall 1: Using @anthropic-ai/claude-code Instead of @anthropic-ai/claude-agent-sdk

**What goes wrong:** Importing `query` from `@anthropic-ai/claude-code` fails at runtime with `ERR_MODULE_NOT_FOUND` because the `sdk.mjs` entry point is missing from published packages since v2.0.5.

**Why it happens:** The package names are confusingly similar. The user's original request references `@anthropic-ai/claude-code`. Older tutorials and blog posts may reference the old import path.

**Consequences:** Application fails to start. No agent sessions can be created.

**Prevention:** Always use `@anthropic-ai/claude-agent-sdk`. The project already does this correctly. Do not change the import.

**Detection:** TypeScript compilation error or runtime `ERR_MODULE_NOT_FOUND`.

### Pitfall 2: Setting Both Auth Environment Variables

**What goes wrong:** When both `ANTHROPIC_API_KEY` and `CLAUDE_CODE_OAUTH_TOKEN` are set, the SDK uses the API key (higher priority). The user believes they are using subscription quota but gets billed per-token via the API.

**Why it happens:** Developer adds subscription token to `.env` without removing the API key. Both exist, no error is thrown -- the SDK silently picks one.

**Consequences:** Unexpected API billing. Subscription quota goes unused. No error message warns the user.

**Prevention:**
- Document in `.env.example` that only ONE auth method should be active
- Add server startup log that reports which auth method is detected
- Consider a startup warning if both variables are set

**Detection:** Check `accountInfo()` after session init, or monitor API billing dashboard.

### Pitfall 3: persistSession Option No Longer in API

**What goes wrong:** The current code passes `persistSession: false` and `persistSession: true` to the `query()` options. This property is not in the v0.1.0+ API reference.

**Why it happens:** The option existed in an earlier SDK version or was never an official option. It was included in the initial implementation and never removed.

**Consequences:**
- At minimum: silently ignored (no effect)
- At worst: TypeScript strict mode rejects unknown properties, causing build failure on version bump
- Semantic confusion: developer thinks they are controlling persistence when they are not

**Prevention:** Remove `persistSession` from both `start()` and `resume()` calls in `session-manager.ts`. Session persistence is handled automatically by the SDK.

**Detection:** TypeScript compilation with strict mode / `noPropertyAccessFromIndexSignature`.

### Pitfall 4: OAuth Token Expiration Without Monitoring

**What goes wrong:** The `CLAUDE_CODE_OAUTH_TOKEN` expires or is revoked. Agent sessions start failing silently or with opaque error messages.

**Why it happens:** OAuth tokens have limited lifetimes. Unlike API keys (which are long-lived), subscription tokens may need periodic refresh via `claude setup-token`.

**Consequences:** All agent sessions fail. Users see generic "Agent session failed" errors without understanding the auth issue.

**Prevention:**
- Use `accountInfo()` at server startup to verify auth is working
- Log the `apiKeySource` from the `system.init` SDKMessage
- Add a health check endpoint that tests auth
- Document the `claude setup-token` re-authentication procedure

**Detection:** `SDKResultMessage` with `subtype: 'error_during_execution'` and auth-related error string.

## Moderate Pitfalls

### Pitfall 5: V2 SDK API Adoption Too Early

**What goes wrong:** Developer switches to `unstable_v2_createSession()` for its simpler API, then a breaking change in a minor version update breaks the integration.

**Why it happens:** V2 API is genuinely simpler for multi-turn conversations. The temptation to adopt is real.

**Prevention:** Do not use V2 API until Anthropic removes the `unstable_` prefix. Monitor the SDK changelog for stability announcements.

**Detection:** Import path includes `unstable_v2_`.

### Pitfall 6: Compression Middleware Buffering SSE

**What goes wrong:** SSE events are buffered by Express `compression` middleware and arrive in bursts instead of real-time streaming.

**Why it happens:** `compression` middleware buffers response bodies for gzip efficiency. SSE requires immediate delivery.

**Prevention:** The current code correctly calls `res.flush()` after every `res.write()`. This is already handled. Do not remove the `flush()` calls.

**Detection:** SSE events arrive in bursts rather than smoothly. Agent output appears chunky.

### Pitfall 7: canUseTool Silently Disabled by bypassPermissions

**What goes wrong:** Changing `permissionMode` from `'default'` to `'bypassPermissions'` (perhaps for "easier testing") silently disables the `canUseTool` callback. The tool allowlist and bash command filtering stop working.

**Why it happens:** `bypassPermissions` is documented to skip all permission checks, including `canUseTool`. This is not intuitive -- developers expect the callback to still run.

**Prevention:** Never use `permissionMode: 'bypassPermissions'` with `canUseTool`. The current code uses `'default'` correctly. Add a comment explaining why.

**Detection:** Agent uses tools outside the allowlist without being denied.

### Pitfall 8: SDK Subprocess Requires Claude CLI on PATH

**What goes wrong:** The `@anthropic-ai/claude-agent-sdk` internally spawns a subprocess. If the required runtime is not available, `query()` fails.

**Why it happens:** Fresh server deployments may not have all prerequisites. The SDK bundles its own executable but may have PATH requirements.

**Prevention:**
- Ensure `@anthropic-ai/claude-code` is installed globally: `npm install -g @anthropic-ai/claude-code@latest`
- Or: verify the SDK's bundled executable works in the deployment environment
- Test after deployment that `query()` actually starts successfully

**Detection:** `query()` throws immediately with an ENOENT or subprocess spawn error.

## Minor Pitfalls

### Pitfall 9: Replay Buffer Memory Growth

**What goes wrong:** Sessions with very long output (thousands of tool calls) can accumulate a large replay buffer.

**Prevention:** Already handled -- MAX_BUFFER_SIZE is capped at 2000 events. No change needed.

### Pitfall 10: EventEmitter Max Listeners Warning

**What goes wrong:** More than 20 SSE clients connect to a single session, triggering Node.js MaxListenersExceededWarning.

**Prevention:** Already handled -- `emitter.setMaxListeners(20)`. For single-user app, 20 is more than enough.

### Pitfall 11: Session Timeout During Long Operations

**What goes wrong:** A legitimate long-running agent task (e.g., analyzing a large codebase) gets killed by the 10-minute timeout.

**Prevention:** Make timeout configurable per session type. Consider extending for known-long operations.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Auth configuration | Both env vars set simultaneously | Startup validation, log active auth method |
| SDK version bump | `persistSession` TypeScript error | Remove option before bumping version |
| stop_reason adoption | Field may be undefined for older session types | Always check for undefined before using |
| listSessions() integration | Returns filesystem sessions, not in-memory | Use as supplement, not replacement for in-memory Map |
| Subscription auth in CI/CD | CI environment has no Claude login | Always use API key in CI; subscription for dev only |

## Sources

- [Agent SDK TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript) -- Options type (no `persistSession`), `permissionMode` behavior
- [Agent SDK Streaming Output](https://platform.claude.com/docs/en/agent-sdk/streaming-output) -- StreamEvent known limitations
- [#10191: Missing sdk.mjs](https://github.com/anthropics/claude-code/issues/10191) -- Package entry point broken
- [#6536: OAuth token discussion](https://github.com/anthropics/claude-code/issues/6536) -- Auth method constraints
- [#11: Claude Max Usage](https://github.com/anthropics/claude-agent-sdk-typescript/issues/11) -- Subscription auth works but has caveats
- [expressjs/compression #17](https://github.com/expressjs/compression/issues/17) -- SSE + compression conflict
- Direct codebase inspection: `session-manager.ts`, `sse-adapter.ts`, `tool-permissions.ts`

---

*Pitfall documentation for: Claude Agent SDK Migration*
*Researched: 2026-02-10*
