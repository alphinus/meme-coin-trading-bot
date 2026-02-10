---
phase: 18-sdk-auth-cleanup
plan: 01
subsystem: agent
tags: [claude-agent-sdk, session-management, sdk-upgrade]

# Dependency graph
requires:
  - phase: 13-agent-session-manager-sse-streaming
    provides: "Agent session manager with start/pause/resume lifecycle"
provides:
  - "Clean resume() without deprecated persistSession: true"
  - "SDK v0.2.38 installed and working"
  - "Consistent persistSession usage across start() and resume()"
affects: [18-02-PLAN, agent-sdk-auth, session-management]

# Tech tracking
tech-stack:
  added: ["@anthropic-ai/claude-agent-sdk@0.2.38"]
  patterns: ["--legacy-peer-deps for SDK install (zod@4 peer dep vs project zod@3)"]

key-files:
  created: []
  modified:
    - "server/src/agent/session-manager.ts"
    - "server/package.json"
    - "package-lock.json"

key-decisions:
  - "Used --legacy-peer-deps for SDK install due to zod@4 peer dep conflict with project zod@3"
  - "Only removed persistSession from resume(); start() retains persistSession: false for server-managed sessions"

patterns-established:
  - "SDK install requires --legacy-peer-deps until project migrates to zod@4"

# Metrics
duration: 19min
completed: 2026-02-10
---

# Phase 18 Plan 01: SDK Auth Cleanup Summary

**Removed deprecated persistSession: true from resume() and bumped Agent SDK to v0.2.38 for consistent session handling**

## Performance

- **Duration:** 19 min
- **Started:** 2026-02-10T19:06:20Z
- **Completed:** 2026-02-10T19:25:44Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Removed `persistSession: true` from `resume()` query options, eliminating the inconsistency where `start()` used `false` but `resume()` used `true`
- Bumped `@anthropic-ai/claude-agent-sdk` from `^0.2.37` to `^0.2.38` in package.json
- Installed SDK v0.2.38 successfully (required `--legacy-peer-deps` due to zod@4 peer dependency)
- Verified zero TypeScript errors in session-manager.ts (pre-existing errors in unrelated files remain unchanged)

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove persistSession from resume() and bump SDK to v0.2.38** - `c3be606` (fix)

**Plan metadata:** `66907aa` (docs: complete plan)

## Files Created/Modified
- `server/src/agent/session-manager.ts` - Removed `persistSession: true` from resume() query options (line 268)
- `server/package.json` - Bumped SDK version from `^0.2.37` to `^0.2.38`
- `package-lock.json` - Updated lockfile with SDK v0.2.38

## Decisions Made
- **--legacy-peer-deps for install:** SDK v0.2.38 requires `zod@^4.0.0` as a peer dependency, but the project uses `zod@3.25.76` (shared across ai-sdk, server, and shared packages). Using `--legacy-peer-deps` is safe because the SDK already worked with zod@3 at v0.2.37 (same peer dep). A full zod migration is out of scope for this cleanup phase.
- **Only remove resume()'s persistSession:** The `persistSession: false` in `start()` is intentional -- it prevents the SDK from writing session files to `~/.claude/projects/` since sessions are server-managed. The `resume()` had `persistSession: true` which contradicted this design and was redundant (the `resume: sessionId` option handles session loading independently).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used --legacy-peer-deps for npm install**
- **Found during:** Task 1 (npm install)
- **Issue:** `npm install -w server` failed with peer dependency conflict -- SDK v0.2.38 requires `zod@^4.0.0` but project uses `zod@3.25.76`
- **Fix:** Used `npm install -w server --legacy-peer-deps` which is how v0.2.37 was originally installed (same peer dep existed)
- **Files modified:** package-lock.json
- **Verification:** `node -e "require('./node_modules/@anthropic-ai/claude-agent-sdk/package.json').version"` outputs `0.2.38`
- **Committed in:** c3be606 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix necessary to complete npm install. No scope creep. Same workaround already in use for v0.2.37.

## Issues Encountered
- Pre-existing TypeScript errors exist in 7 unrelated files (google/calendar.ts, google/gmail.ts, notifications/emitter.ts, routes/gsd.ts, search/engine.ts, telegram commands/menus). These are NOT caused by our changes and existed before this plan. Zero errors in session-manager.ts. The plan's "zero TypeScript errors" criterion applies to our changed files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- session-manager.ts is now clean and consistent: `persistSession: false` in `start()`, no `persistSession` in `resume()`
- SDK v0.2.38 installed and working, ready for Plan 18-02 (auth features)
- Pre-existing TS errors in unrelated files should be addressed in a future maintenance phase

## Self-Check: PASSED

- FOUND: server/src/agent/session-manager.ts
- FOUND: server/package.json
- FOUND: commit c3be606
- FOUND: 18-01-SUMMARY.md

---
*Phase: 18-sdk-auth-cleanup*
*Completed: 2026-02-10*
