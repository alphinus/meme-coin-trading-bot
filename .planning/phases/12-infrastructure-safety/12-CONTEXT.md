# Phase 12: Infrastructure & Safety - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Server can run Claude Agent SDK sessions safely without crashes, memory limits, or SSE buffering. This phase installs the Agent SDK, tunes PM2, fixes SSE compression, implements tool permissions via canUseTool, and adds graceful shutdown. No user-facing UI — pure backend infrastructure that Phase 13+ builds on.

</domain>

<decisions>
## Implementation Decisions

### Tool permissions
- Single global allowlist for all agent sessions (not per-command)
- Full Bash access allowed — agents need it for npm, git, builds
- WebSearch and WebFetch allowed — agents need web access for research commands
- Only rejected tool calls are logged (not all calls) — keeps logs clean, surfaces issues
- Global allowlist only for now — no per-user or per-project restrictions
- Allowlist config approach and dangerous command blocking: Claude's Discretion

### Memory & resource limits
- PM2 memory limit to be raised from 500MB — Claude picks the right number based on Agent SDK usage
- No per-session timeout — sessions run to completion (GSD workflows can be long-running)
- PM2 handles memory overflows — if limit exceeded, PM2 restarts the process and session is lost
- One concurrent agent session per project — multiple projects can run in parallel

### SSE streaming behavior
- Regular heartbeat/keepalive pings to detect dead connections
- Event IDs included from the start — sequential IDs per stream, prepares for Phase 13 reconnection
- Structured JSON payloads for all SSE events (e.g., `{type: 'token', data: '...'}`) — client parses and renders
- Compression fix approach: Claude's Discretion (disable for SSE routes vs flush-on-write)

### Shutdown & cleanup
- Grace period on SIGTERM: Claude's Discretion (pick reasonable duration)
- Send a final SSE event notifying clients their session was interrupted before closing connection
- Interrupted sessions marked as 'interrupted' — user sees status and can choose to retry on next visit
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

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Key technical constraint: compression middleware is known to silently buffer SSE (noted in STATE.md blockers), so this must be explicitly verified as working.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-infrastructure-safety*
*Context gathered: 2026-02-09*
