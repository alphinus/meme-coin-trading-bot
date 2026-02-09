---
phase: 07-telegram-bot-notifications
plan: 06
subsystem: telegram, notifications, api
tags: [grammy, domain-events, fire-and-forget, notification-emitter, workflow-menu]

# Dependency graph
requires:
  - phase: 07-telegram-bot-notifications (plans 01-05)
    provides: "Bot framework, menus, notification emitter module, workflow menu module"
provides:
  - "Workflow menu wired to project detail button in Telegram"
  - "Notification emitter wired into all route handlers and workflow engine"
  - "Domain events now trigger multi-channel notifications end-to-end"
affects: [08-integrations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "emitNotificationForEvent fire-and-forget pattern (matches processEventForDocumentation and evaluateTriggersForEvent)"

key-files:
  created: []
  modified:
    - server/src/telegram/menus/project-menu.ts
    - server/src/routes/projects.ts
    - server/src/routes/ideas.ts
    - server/src/workflow/engine.ts

key-decisions:
  - "No changes needed to ai.ts routes -- mapped AI events fire from trigger engine and mediation module, not route handlers"
  - "project.phase_completed events in workflow engine not wired to emitter because they are not in EVENT_NOTIFICATION_MAP"

patterns-established:
  - "Triple fire-and-forget pattern: processEventForDocumentation + evaluateTriggersForEvent + emitNotificationForEvent after every appendEvent call"

# Metrics
duration: 3min
completed: 2026-02-08
---

# Phase 7 Plan 6: Gap Closure Summary

**Workflow menu wired to project detail button and notification emitter connected to all 17 event emission sites across route handlers and workflow engine**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-08T20:12:12Z
- **Completed:** 2026-02-08T20:15:28Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Replaced "Workflow coming soon" stub with live renderCurrentWorkflowStep call in Telegram project detail menu
- Added emitNotificationForEvent import and calls to projects.ts (6 sites), ideas.ts (7 sites), and workflow engine.ts (4 sites)
- All 17 notification emission points follow the existing fire-and-forget pattern (no await)
- Both verification truth gaps from 07-VERIFICATION.md are now closed

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire workflow menu to project detail button** - `0c7d875` (feat)
2. **Task 2: Wire notification emitter into route handlers and workflow engine** - `bf00db0` (feat)

## Files Created/Modified
- `server/src/telegram/menus/project-menu.ts` - Replaced stub Workflow button with renderCurrentWorkflowStep call, added import
- `server/src/routes/projects.ts` - Added emitNotificationForEvent import and 6 fire-and-forget calls after event emissions
- `server/src/routes/ideas.ts` - Added emitNotificationForEvent import and 7 fire-and-forget calls after event emissions
- `server/src/workflow/engine.ts` - Added emitNotificationForEvent import and 4 fire-and-forget calls for step_completed, archived, and phase_advanced events

## Decisions Made
- ai.ts routes were intentionally skipped: the events they emit (ai.member_configured, ai.message_read, etc.) are not in EVENT_NOTIFICATION_MAP. The mapped AI events (ai.trigger_fired, ai.mediation_completed) fire from the trigger engine and mediation module, not from route handlers.
- project.phase_completed events in the workflow engine were not wired to the emitter because they are not in EVENT_NOTIFICATION_MAP (only project.phase_advanced is mapped).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 7 (Telegram Bot & Notifications) is now fully complete with all 6 plans executed
- All 5 verification truths from 07-VERIFICATION.md are achievable
- Ready for Phase 8 (Integrations)

## Self-Check: PASSED

- All 4 modified files exist
- Commit 0c7d875 (Task 1) verified
- Commit bf00db0 (Task 2) verified

---
*Phase: 07-telegram-bot-notifications*
*Completed: 2026-02-08*
