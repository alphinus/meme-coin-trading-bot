---
phase: 12-infrastructure-safety
plan: 01
subsystem: infra
tags: [claude-agent-sdk, pm2, tool-permissions, canUseTool, agent-sessions]

# Dependency graph
requires: []
provides:
  - "@anthropic-ai/claude-agent-sdk installed and importable"
  - "Agent session TypeScript types (AgentSession, AgentSessionState, SSEEvent, SSEEventType)"
  - "canUseTool permission handler with 10-tool global allowlist and dangerous Bash pattern blocking"
  - "PM2 tuned for 1.5GB memory, 15s kill_timeout, 2GB V8 heap"
affects: [12-02, 13-agent-streaming, 14-agent-ui]

# Tech tracking
tech-stack:
  added: ["@anthropic-ai/claude-agent-sdk@^0.2.37", "strip-ansi@^7.1.2"]
  patterns: ["canUseTool callback with permissionMode: 'default'", "static hardcoded allowlist as security boundary", "regex-based dangerous Bash command blocking"]

key-files:
  created:
    - "server/src/agent/types.ts"
    - "server/src/agent/tool-permissions.ts"
  modified:
    - "server/package.json"
    - "ecosystem.config.cjs"

key-decisions:
  - "Used --legacy-peer-deps for SDK install due to zod@^4.0.0 peer dep vs project zod@3.25.76"
  - "canUseTool input typed as Record<string, unknown> (SDK actual type, not ToolInput from research)"
  - "PM2 memory 1536M with V8 heap 2048MB and 15s kill_timeout"

patterns-established:
  - "canUseTool pattern: async handler checking ALLOWED_TOOLS set, then DANGEROUS_BASH_PATTERNS for Bash commands"
  - "Agent types in server/src/agent/ directory -- all agent infrastructure goes here"

# Metrics
duration: 3min
completed: 2026-02-09
---

# Phase 12 Plan 01: Agent SDK Foundation Summary

**Claude Agent SDK installed with canUseTool permission handler (10-tool allowlist + 8 dangerous Bash patterns) and PM2 tuned to 1.5GB/15s grace period**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-09T22:26:19Z
- **Completed:** 2026-02-09T22:29:37Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Installed @anthropic-ai/claude-agent-sdk@^0.2.37 and strip-ansi@^7.1.2 in server workspace
- Created type definitions for agent sessions (AgentSession, AgentSessionState, SSEEvent, SSEEventType)
- Built canUseTool permission handler with exact SDK type alignment -- 10-tool allowlist (Read, Glob, Grep, Edit, Write, Bash, WebSearch, WebFetch, Task, TodoWrite) and 8 dangerous Bash regex patterns
- Tuned PM2 from 500MB to 1536MB memory, added 15s kill_timeout and 2GB V8 heap limit

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Agent SDK and create types + tool permission handler** - `0feee67` (feat)
2. **Task 2: Configure PM2 for Agent SDK memory requirements** - `c8fcea9` (chore)

## Files Created/Modified

- `server/src/agent/types.ts` - TypeScript types for agent sessions, SSE events, and session state
- `server/src/agent/tool-permissions.ts` - canUseTool handler with allowlist and dangerous Bash command blocking
- `server/package.json` - Added @anthropic-ai/claude-agent-sdk and strip-ansi dependencies
- `ecosystem.config.cjs` - PM2 config with raised memory limit, kill_timeout, and V8 heap args

## Decisions Made

- **--legacy-peer-deps for SDK install:** Agent SDK requires zod@^4.0.0 as peer dependency, but project uses zod@3.25.76 (which is the v3-to-v4 bridge version). The AI SDK packages accept `^3.25.76 || ^4.1.8`. Used --legacy-peer-deps rather than upgrading zod to avoid potential breakage across the existing AI SDK stack. The SDK loads and functions correctly.
- **Adapted imports from research:** Research suggested importing `CanUseTool`, `PermissionResult`, and `ToolInput` types. Actual SDK exports `CanUseTool` and `PermissionResult` but not `ToolInput` -- the input parameter is `Record<string, unknown>`. Adapted accordingly.
- **PM2 values from research recommendations:** 1536MB memory (1.5GB) covers ~300MB server baseline + up to 1GB agent child process with headroom. 15s kill_timeout gives graceful shutdown handler time. 2GB V8 heap prevents V8 OOM before PM2 RSS check.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Resolved zod peer dependency conflict**
- **Found during:** Task 1 (SDK installation)
- **Issue:** @anthropic-ai/claude-agent-sdk@0.2.37 requires `zod@^4.0.0` as peer dependency, but project has `zod@^3.24.0` (resolved to 3.25.76). npm refused to install.
- **Fix:** Used `--legacy-peer-deps` flag. The zod 3.25.x bridge version provides v4 compatibility. AI SDK packages also accept both versions. SDK loads and compiles correctly.
- **Files modified:** package-lock.json
- **Verification:** SDK imports work, tsc --noEmit passes, canUseTool function tested with allow/deny scenarios
- **Committed in:** 0feee67 (Task 1 commit)

**2. [Rule 1 - Bug] Adapted type imports to match actual SDK exports**
- **Found during:** Task 1 (tool-permissions.ts creation)
- **Issue:** Research indicated `ToolInput` as a named export. Actual SDK d.ts has no `ToolInput` -- the canUseTool input parameter is `Record<string, unknown>`.
- **Fix:** Removed ToolInput import, used `Record<string, unknown>` directly as the SDK type signature specifies.
- **Files modified:** server/src/agent/tool-permissions.ts
- **Verification:** tsc --noEmit passes, runtime canUseTool tests pass
- **Committed in:** 0feee67 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for correct installation and type safety. No scope creep.

## Issues Encountered

None beyond the deviations documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Agent SDK installed and proven importable -- Plan 02 can use `query()` immediately
- canUseTool handler ready to pass to `query()` options
- PM2 configured to handle agent session memory -- no more crash-restart risk
- Agent types ready for session manager and SSE writer in Plan 02
- Compression middleware SSE fix and graceful shutdown still needed (Plan 02 scope)

## Self-Check: PASSED

- FOUND: server/src/agent/types.ts
- FOUND: server/src/agent/tool-permissions.ts
- FOUND: ecosystem.config.cjs
- FOUND: 12-01-SUMMARY.md
- FOUND: 0feee67 (Task 1 commit)
- FOUND: c8fcea9 (Task 2 commit)

---
*Phase: 12-infrastructure-safety*
*Completed: 2026-02-09*
