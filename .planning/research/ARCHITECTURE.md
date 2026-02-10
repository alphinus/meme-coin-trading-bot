# Architecture: v1.3 SDK Migration & Stabilization

**Domain:** Claude Agent SDK integration with Express + SSE streaming architecture
**Researched:** 2026-02-10
**Overall confidence:** HIGH

## Current Architecture (Sound -- No Structural Changes Needed)

```
Browser (React)                    Server (Express)                   Claude Agent SDK
================                   ================                   ================

EventSource API  ---GET SSE--->    /api/agent/stream/:id
                                     |
useAgentStream() <--text/event--   SSE Adapter
                    stream           |  adaptMessage()
                                     |
Cancel Button    ---POST-------->  /api/agent/:id/abort
                                     |
                                   Session Manager (singleton)
                                     |  - In-memory Map
                                     |  - Per-project enforcement
                                     |  - Pause/Resume/Abort
                                     |  - Replay buffer (2000 events)
                                     |  - EventEmitter bridge
                                     |
                                     +--query()----------->  SDK Subprocess
                                     |  async generator      (Node.js child process)
                                     |                         |
                                     +--canUseTool()           +-- Claude API
                                     |  (permission check)     |   (via ANTHROPIC_API_KEY
                                     |                         |    or CLAUDE_CODE_OAUTH_TOKEN)
                                     +--AbortController        |
                                        (cancellation)         +-- Built-in tools
                                                                   (Read, Write, Edit,
                                                                    Bash, Glob, Grep,
                                                                    WebSearch, WebFetch)
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `session-manager.ts` | Session lifecycle (start, abort, pause, resume, cleanup). In-memory Map. EventEmitter for SSE. | SDK `query()`, Express routes, SSE adapter |
| `sse-adapter.ts` | Transform `SDKMessage` union into flat, browser-friendly SSE events. Strip ANSI. | Session manager (receives messages), Express response (sends events) |
| `tool-permissions.ts` | `canUseTool` callback. Allowlist + dangerous bash pattern filtering. | SDK subprocess (called per tool invocation) |
| `types.ts` | TypeScript interfaces for sessions, SSE events, start options. | All agent module files |
| Express routes | HTTP endpoints for start/stream/abort/pause/resume. | Session manager, Express middleware |
| React hooks | `useAgentStream()` -- EventSource connection, reconnection, state management. | Express SSE endpoint |

### Data Flow

1. **Start:** Client POSTs to `/api/agent/start` with prompt + projectId
2. **Session creation:** Session manager creates `query()` async generator with options
3. **Background consumption:** `consumeStream()` iterates the generator in background
4. **SSE forwarding:** Each `SDKMessage` passes through `adaptMessage()` -> `pushEvent()` -> EventEmitter
5. **Client connection:** Client opens `EventSource` to `/api/agent/stream/:id`
6. **Replay:** Late-joining clients receive buffered events before live stream
7. **Completion:** Result/error event triggers session state change + `end` emit
8. **Abort:** AbortController signal + `query.close()` terminates SDK subprocess

### Authentication Flow (Migration Target)

```
Server Startup
     |
     +-- Check environment variables:
     |     ANTHROPIC_API_KEY set?   --> API key auth (pay-per-token)
     |     CLAUDE_CODE_OAUTH_TOKEN? --> Subscription auth (Max quota)
     |     Neither?                 --> Error: no auth configured
     |
     +-- Log which auth method is active
     |
     +-- query() options do NOT include auth --
         SDK subprocess reads env vars directly
```

No code changes needed in the session manager for auth. The SDK subprocess inherits the server's environment and discovers credentials automatically.

## Patterns to Follow

### Pattern 1: Background Stream Consumption

**What:** The session manager starts `query()` and immediately begins iterating the async generator in a background `consumeStream()` method, decoupled from any HTTP request.

**When:** Always -- the generator must be consumed regardless of whether any SSE client is connected.

**Why correct:** If the generator is not consumed, backpressure prevents the SDK subprocess from making progress. Decoupling consumption from SSE connection means late-joining clients work and disconnected clients do not stall the agent.

### Pattern 2: EventEmitter Bridge

**What:** `pushEvent()` adds to a replay buffer AND emits to live listeners via EventEmitter.

**When:** Every message from the SDK generator.

**Why correct:** Separates message production (SDK) from message consumption (SSE clients). Multiple SSE clients can connect. Buffer provides replay for reconnection. EventEmitter is lightweight and built into Node.js.

### Pattern 3: canUseTool as Security Layer

**What:** `permissionMode: 'default'` with a `canUseTool` callback that implements an allowlist.

**When:** Every tool invocation by the agent.

**Why correct:** `permissionMode: 'bypassPermissions'` silently disables `canUseTool` (documented SDK behavior). Using `'default'` ensures the callback is always invoked. The allowlist + bash pattern filtering provides defense-in-depth.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Using bypassPermissions with canUseTool

**What:** Setting `permissionMode: 'bypassPermissions'` while also providing a `canUseTool` callback.

**Why bad:** `bypassPermissions` silently disables the `canUseTool` callback. The permission function never runs. This creates a false sense of security.

**Instead:** Use `permissionMode: 'default'` with `canUseTool`. This is what the current code does correctly.

### Anti-Pattern 2: Consuming SDK Generator in SSE Route Handler

**What:** Iterating `query()` directly inside the Express route handler for SSE streaming.

**Why bad:** If the client disconnects, the generator iteration stops, stalling the agent. If the client reconnects, a new route handler starts but the old generator is abandoned.

**Instead:** Use the background consumption pattern with EventEmitter bridge (current architecture).

### Anti-Pattern 3: Switching to @anthropic-ai/claude-code for SDK

**What:** Using `import { query } from '@anthropic-ai/claude-code'` instead of the agent SDK.

**Why bad:** The `sdk.mjs` entry point is missing from published packages since v2.0.5. Import will fail at runtime with `ERR_MODULE_NOT_FOUND`.

**Instead:** Use `import { query } from '@anthropic-ai/claude-agent-sdk'` (current code is correct).

### Anti-Pattern 4: Setting Both ANTHROPIC_API_KEY and CLAUDE_CODE_OAUTH_TOKEN

**What:** Having both environment variables set simultaneously.

**Why bad:** `ANTHROPIC_API_KEY` takes priority. The subscription token is silently ignored. User thinks they are using subscription quota but is actually billed per-token.

**Instead:** Set exactly one. Document this clearly in `.env.example`.

## Scalability Considerations

Not a primary concern for this milestone (single-user internal tool), but documented for completeness:

| Concern | Current (1 user) | At 10 users | At 100 users |
|---------|-------------------|-------------|--------------|
| Session memory | In-memory Map, ~50KB/session | Same approach, add TTL cleanup | Redis for session state, or database-backed |
| SSE connections | EventEmitter, 20 max listeners | Sufficient | Need connection pooling or WebSocket upgrade |
| SDK subprocess | One per session, ~100MB each | PM2 memory limits become critical | Dedicated worker processes or containerized agents |
| Auth tokens | Single token per server | Per-user API keys via middleware | OAuth flow per user, token management service |
| Replay buffer | 2000 events in memory | Same, add per-user buffer limits | External message queue (Redis Streams) |

## Sources

- [Agent SDK TypeScript Reference](https://platform.claude.com/docs/en/agent-sdk/typescript) -- `query()` return type, Options, permissionMode behavior
- [Agent SDK Streaming Output](https://platform.claude.com/docs/en/agent-sdk/streaming-output) -- Message flow, StreamEvent reference
- [Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview) -- SDK vs CLI vs Client SDK comparison
- Direct codebase inspection: `session-manager.ts`, `sse-adapter.ts`, `tool-permissions.ts`, `types.ts`

---

*Architecture documentation for: Claude Agent SDK Integration*
*Researched: 2026-02-10*
