---
phase: 20-sdk-feature-adoption
plan: 02
subsystem: agent
tags: [session-recovery, auth-health, accountInfo, persistence, sdk, i18n]

# Dependency graph
requires:
  - phase: 20-sdk-feature-adoption
    provides: "Deterministic session IDs, persistSession: true, stop reasons (plan 01)"
  - phase: 18-sdk-integration
    provides: Agent session manager, warm session singleton, auth-check module
  - phase: 13-agent-session-manager-sse-streaming
    provides: SSE streaming, pause/resume lifecycle, paused session API
provides:
  - loadPersistedSessions() and persistSessions() for session metadata persistence
  - recoverSessions() method on AgentSessionManager for startup recovery
  - getRecoverableSessions() method and GET /recoverable route
  - verifyAuthToken() async function for live token validation via accountInfo()
  - getAccountInfo() method and isReady getter on WarmAgentSession
  - Graceful shutdown persists running sessions as recoverable entries
affects: [21-polish-testing]

# Tech tracking
tech-stack:
  added: []
  patterns: [session-metadata-persistence, auth-health-check-at-startup, graceful-shutdown-recovery]

key-files:
  created:
    - server/src/agent/session-recovery.ts
  modified:
    - server/src/agent/session-manager.ts
    - server/src/agent/auth-check.ts
    - server/src/agent/warm-session.ts
    - server/src/app.ts
    - server/src/routes/agent.ts
    - client/src/i18n/locales/en.json
    - client/src/i18n/locales/de.json

key-decisions:
  - "Custom JSON metadata file (data/agent-sessions.json) over parsing SDK JSONL files for session recovery"
  - "Fire-and-forget auth verification: server always starts regardless of token validity"
  - "Running sessions converted to recoverable entries during graceful shutdown before abort"
  - "accountInfo() called via warm session query instance (streaming input mode) for reliability"

patterns-established:
  - "Session recovery: persist metadata on pause/shutdown, reload at startup into pausedSessions Map"
  - "Auth health check: verifyAuthToken() with callback pattern decouples auth-check from warm-session"
  - "Graceful degradation: auth failure logs warning but never prevents server startup"

# Metrics
duration: 10min
completed: 2026-02-11
---

# Phase 20 Plan 02: Session Recovery & Auth Health Check Summary

**Session metadata persisted to data/agent-sessions.json on pause/shutdown with automatic recovery at startup, plus live auth token validation via SDK accountInfo() logging email and subscription type**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-11T08:53:07Z
- **Completed:** 2026-02-11T09:03:23Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Sessions survive server restarts: metadata persisted to `data/agent-sessions.json` on every pause and during graceful shutdown
- Running sessions are converted to recoverable entries during graceful shutdown (not silently lost)
- Auth token validated at startup via SDK `accountInfo()` with clear log output (email, subscription type, organization)
- Invalid tokens produce a clear warning but do not prevent server startup
- New `GET /recoverable` API endpoint lists all recoverable sessions for the authenticated user
- i18n keys added for recovery banner and auth status in both English and German

## Task Commits

Each task was committed atomically:

1. **Task 1: Create session recovery module and integrate with session manager** - `965d129` (feat)
2. **Task 2: Add auth health check via accountInfo() and update client for recovered sessions** - `9229da5` (feat)

## Files Created/Modified
- `server/src/agent/session-recovery.ts` - New: loadPersistedSessions() and persistSessions() for JSON metadata file I/O
- `server/src/agent/session-manager.ts` - Added recoverSessions(), getRecoverableSessions(), persistCurrentSessions(); cleanup() now async with pre-abort persistence
- `server/src/agent/auth-check.ts` - Added verifyAuthToken() async function for live token validation via accountInfo()
- `server/src/agent/warm-session.ts` - Added getAccountInfo() method and isReady getter
- `server/src/app.ts` - Startup chain: warmSession.start() -> recoverSessions() -> verifyAuthToken(); graceful shutdown awaits async cleanup()
- `server/src/routes/agent.ts` - Added GET /recoverable endpoint for listing all recoverable sessions
- `client/src/i18n/locales/en.json` - Added agent.recovered_banner and agent.auth_status keys
- `client/src/i18n/locales/de.json` - Added agent.recovered_banner and agent.auth_status keys with proper Unicode umlauts

## Decisions Made
- Custom JSON metadata file (`data/agent-sessions.json`) for session recovery rather than parsing SDK JSONL files -- our metadata is simpler, decoupled from SDK internals
- Fire-and-forget auth verification pattern: `verifyAuthToken()` logs results but never throws, server always starts
- Running sessions converted to recoverable entries during graceful shutdown before aborting -- ensures no session is silently lost
- `accountInfo()` called via warm session's query instance (which uses streaming input mode) for maximum reliability
- `(this.queryInstance as any).accountInfo()` used since SDK TypeScript types may not expose accountInfo() yet

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- 18+ pre-existing TypeScript errors in telegram/menus, google/calendar, google/gmail, notifications/emitter, and routes/gsd -- all unrelated to this plan, no errors in any files modified by this plan

## User Setup Required

None - no external service configuration required. Auth health check uses the existing CLAUDE_CODE_OAUTH_TOKEN environment variable.

## Next Phase Readiness
- Phase 20 (SDK Feature Adoption) is complete: stop reasons, deterministic IDs, session recovery, and auth health check all wired
- Ready for Phase 21 (polish/testing) which addresses the 23 pending verification tests
- The pre-existing TypeScript errors should be addressed in Phase 21

## Self-Check: PASSED

All 8 files verified present on disk. Both task commits (965d129, 9229da5) verified in git log.

---
*Phase: 20-sdk-feature-adoption*
*Completed: 2026-02-11*
