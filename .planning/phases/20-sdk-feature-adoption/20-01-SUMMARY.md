---
phase: 20-sdk-feature-adoption
plan: 01
subsystem: agent
tags: [sse, uuid, session-id, stop-reason, i18n, sdk]

# Dependency graph
requires:
  - phase: 18-sdk-integration
    provides: Agent session manager, SSE adapter, SDK query lifecycle
  - phase: 13-agent-session-manager-sse-streaming
    provides: SSE event types, AgentOutput component, useAgentStream hook
provides:
  - stopReason field in SSE result and error events
  - deterministicSessionId() utility for stable session UUIDs from project ID
  - persistSession: true for interactive SDK sessions
  - Stop reason chip UI component with EN/DE translations
affects: [21-polish-testing, 20-02]

# Tech tracking
tech-stack:
  added: []
  patterns: [deterministic-uuid-from-hash, stop-reason-surfacing]

key-files:
  created:
    - server/src/agent/session-id.ts
  modified:
    - server/src/agent/sse-adapter.ts
    - server/src/agent/types.ts
    - server/src/agent/session-manager.ts
    - client/src/hooks/useAgentStream.ts
    - client/src/components/AgentOutput.tsx
    - client/src/i18n/locales/en.json
    - client/src/i18n/locales/de.json

key-decisions:
  - "SHA-256 hash with UUID v4 formatting for deterministic session IDs"
  - "persistSession: true enables SDK JSONL file persistence for session recovery"
  - "Error paths surface stopReason + cost/duration in AgentResult for unified display"

patterns-established:
  - "Deterministic UUID: SHA-256(prefix + entityId) formatted as UUID v4 with version/variant nibbles"
  - "Stop reason surfacing: SDK result.subtype mapped to i18n keys via STOP_REASON_KEYS constant"

# Metrics
duration: 10min
completed: 2026-02-11
---

# Phase 20 Plan 01: Stop Reasons & Deterministic Session IDs Summary

**Stop reason surfacing in SSE events with i18n UI chip, deterministic session IDs from SHA-256(projectId), and persistSession: true for SDK file persistence**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-11T08:04:06Z
- **Completed:** 2026-02-11T08:14:26Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- SSE result events now emit `stopReason: "success"` and error events emit the SDK subtype (e.g., `error_max_turns`)
- Session IDs are deterministic: same projectId always produces the same UUID via SHA-256 hash
- Interactive agent sessions use `persistSession: true` so the SDK writes session JSONL files for later recovery
- Client UI displays a styled chip (blue for success, red for errors) with localized stop reason text in EN and DE

## Task Commits

Each task was committed atomically:

1. **Task 1: Add stop reason to SSE adapter + types, create deterministic session ID utility** - `68a1cc5` (feat)
2. **Task 2: Display stop reason in client UI with i18n** - `0bd16e6` (feat)

## Files Created/Modified
- `server/src/agent/session-id.ts` - New: deterministicSessionId() function using SHA-256 + UUID v4 formatting
- `server/src/agent/types.ts` - Added AgentStopReason type for SDK result subtypes
- `server/src/agent/sse-adapter.ts` - Added stopReason field to both success and error result events
- `server/src/agent/session-manager.ts` - Replaced randomUUID with deterministicSessionId, set persistSession: true, added sessionId to query options
- `client/src/hooks/useAgentStream.ts` - Added stopReason to AgentResult interface, surface stop reason on error paths
- `client/src/components/AgentOutput.tsx` - Added STOP_REASON_KEYS mapping and styled stop reason chip in result area
- `client/src/i18n/locales/en.json` - Added agent.stop_reason translations (Task complete, Maximum turns reached, etc.)
- `client/src/i18n/locales/de.json` - Added agent.stop_reason translations with proper Unicode umlauts

## Decisions Made
- SHA-256 hash with UUID v4 formatting for deterministic session IDs -- uses "eluma-agent-session:" prefix + projectId as hash input, first 32 hex chars formatted with version nibble 4 and RFC 4122 variant
- persistSession: true enables SDK to write session JSONL files, making pause/resume across restarts possible
- Error paths now also create an AgentResult with stopReason + cost/duration so the UI can display stats even when the session ends in error

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- 18 pre-existing TypeScript errors in Telegram menus (TranslateFunction type incompatibility) -- unrelated to this plan, all in telegram/menus/ and other unrelated files. No errors in any files modified by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Stop reasons and deterministic session IDs are fully wired end-to-end (server -> SSE -> client UI)
- Ready for Phase 20 Plan 02 (session recovery and auth health check)
- The 18 pre-existing TS errors should be addressed in Phase 21 (polish/testing)

## Self-Check: PASSED

All 8 files verified present on disk. Both task commits (68a1cc5, 0bd16e6) verified in git log.

---
*Phase: 20-sdk-feature-adoption*
*Completed: 2026-02-11*
