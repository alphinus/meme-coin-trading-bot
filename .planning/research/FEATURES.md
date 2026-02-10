# Feature Landscape: v1.3 Claude Code SDK Migration & Stabilization

**Domain:** SDK stabilization, authentication migration, session lifecycle enhancement
**Researched:** 2026-02-10
**Overall Confidence:** HIGH (official docs verified, codebase inspected, policy confirmed)

## Table Stakes

Features that must work after migration. Missing = regression.

| Feature | Why Expected | Complexity | Status |
|---------|--------------|------------|--------|
| SSE streaming to browser | Core UX -- real-time agent output | Already working | No changes needed |
| Per-project session enforcement | Prevents concurrent sessions on same project | Already working | No changes needed |
| Pause/resume agent sessions | User-facing feature in GSD workflow | Already working | Remove `persistSession` only |
| Abort running sessions | User-facing cancel button | Already working | No changes needed |
| Tool permission allowlist | Security boundary for agent actions | Already working | No changes needed |
| Bash command filtering | Defense-in-depth for dangerous commands | Already working | No changes needed |
| Late-joining SSE replay | Reconnecting clients get buffered events | Already working | No changes needed |
| Session timeout (10 min) | Safety limit prevents runaway sessions | Already working | No changes needed |
| Graceful shutdown cleanup | Server restart aborts active sessions cleanly | Already working | No changes needed |
| Subscription auth | Use Claude Max quota instead of API key | Not yet configured | Environment variable config |

## Differentiators

Features that improve the product. Not required for migration but worth adopting.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| `stop_reason` in SSE events | Client can show "budget exceeded" vs "task complete" vs "max turns" | Low | Parse new field from `SDKResultMessage` |
| `listSessions()` on startup | Recover resumable sessions after server restart | Medium | Supplements in-memory tracking |
| Deterministic `sessionId` | Cleaner pause/resume (e.g., `project-{id}`) | Low | Pass `sessionId` option to `query()` |
| `accountInfo()` display | Show subscription status / billing info in UI | Low | Call once per session, display in settings |
| `systemPrompt` per command | GSD commands can provide project-specific context | Medium | Requires prompt design per command type |
| SDK hooks for audit trail | Log all tool uses to JSONL event store | Medium | `PostToolUse` hook emits events |
| Custom subagents | Specialized agents for different GSD commands (research, plan, execute) | High | Requires agent prompt engineering |

## Anti-Features

Features to explicitly NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| V2 SDK session API | Marked "unstable preview", missing features, APIs will change | Stay on V1 `query()` async generator |
| Direct claude.ai OAuth login flow | Anthropic policy prohibits third-party OAuth login UX | Use `claude setup-token` CLI command, document procedure |
| Custom tool implementations | SDK already provides Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch | Use built-in tools via `allowedTools` |
| Bidirectional streaming (WebSocket) | Agent output is server-to-client only | Keep SSE (correct pattern for unidirectional) |
| Multi-user concurrent sessions | Adds significant complexity, not needed for current user base | Keep per-project single-session enforcement |
| SDK sandbox mode | Adds container-level isolation; overkill for current controlled environment | Keep `canUseTool` allowlist + bash filtering |

## Feature Dependencies

```
Subscription Auth -> Environment config (no code dependency)
stop_reason handling -> SSE adapter update (independent)
listSessions() -> Session manager enhancement (independent)
Deterministic sessionId -> Session manager update (independent)
systemPrompt per command -> Command registry integration (depends on existing GSD commands)
SDK hooks -> JSONL event store integration (depends on existing event system)
Custom subagents -> Agent prompt design + command registry (depends on systemPrompt)
```

## MVP Recommendation (This Milestone)

Prioritize:
1. **Subscription auth configuration** -- user's stated goal, zero code changes
2. **Remove `persistSession`** -- required for clean TypeScript compilation
3. **Version bump to v0.2.38** -- latest parity, no breaking changes
4. **`stop_reason` in SSE adapter** -- low effort, immediate UX improvement

Defer:
- `listSessions()`: Useful but requires careful testing of filesystem-based session discovery
- Custom subagents: High effort, needs prompt engineering, better suited for a future milestone
- SDK hooks for audit: Medium effort, low urgency -- JSONL event store already captures session lifecycle events

## Sources

- [Agent SDK TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript) -- Complete Options type, all available features
- [Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview) -- Capabilities, auth, built-in tools
- [TypeScript SDK Changelog](https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md) -- Feature availability by version
- Direct codebase inspection: `session-manager.ts`, `sse-adapter.ts`, `tool-permissions.ts`

---

*Feature landscape for: Claude Agent SDK Migration*
*Researched: 2026-02-10*
