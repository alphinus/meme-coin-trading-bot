---
phase: 11-telegram-bot-i18n
plan: 03
subsystem: telegram
tags: [i18n, ctx-t, fluent, menus, settings, workflow, translate-func]

# Dependency graph
requires:
  - phase: 11-02
    provides: "TranslateFunc type, ctx.t() available in formatters, formatter calls already accept t parameter"
provides:
  - "All 4 menu files fully i18n-enabled with ctx.t() calls"
  - "Project and idea menus use translated button labels, callback answers, and status messages"
  - "Settings menu uses translated channel names, priority labels, and toggle feedback"
  - "Workflow menu buildStepMessage accepts TranslateFunc for translated instructions"
  - "All handleAdvanceResult and renderCurrentWorkflowStep messages translated"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Channel/priority label maps keyed by translation key string for dynamic ctx.t() lookup"
    - "buildStepMessage(stepDef, t) pattern: pass TranslateFunc to non-ctx functions"
    - "escapeMd(ctx.t('key')) pattern for MarkdownV2-safe translated text in menus"

key-files:
  created: []
  modified:
    - "server/src/telegram/menus/project-menu.ts"
    - "server/src/telegram/menus/idea-menu.ts"
    - "server/src/telegram/menus/settings-menu.ts"
    - "server/src/telegram/menus/workflow-menu.ts"
    - "server/src/telegram/locales/en.ftl"
    - "server/src/telegram/locales/de.ftl"

key-decisions:
  - "Settings channel/priority labels use key maps (CHANNEL_KEYS, PRIORITY_KEYS) resolved dynamically via ctx.t()"
  - "buildStepMessage accepts TranslateFunc parameter rather than full ctx for better separation"
  - "Added menu-error-generating and settings-toggled/priority keys to both .ftl files"

patterns-established:
  - "Dynamic label map pattern: Record<Type, string> mapping to translation keys, resolved via ctx.t(KEY_MAP[value])"
  - "TranslateFunc parameter convention for non-ctx helper functions in workflow module"

# Metrics
duration: 4min
completed: 2026-02-09
---

# Phase 11 Plan 03: Menu i18n Summary

**All 4 Telegram menu files i18n-enabled with ctx.t() calls replacing 35+ hardcoded English strings for button labels, callbacks, and status messages**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-09T19:58:45Z
- **Completed:** 2026-02-09T20:03:21Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Replaced all hardcoded English button labels, callback answers, and status messages in project-menu.ts (7 ctx.t calls) and idea-menu.ts (21 ctx.t calls)
- Settings menu refactored from static CHANNEL_LABELS to dynamic CHANNEL_KEYS/PRIORITY_KEYS maps with ctx.t() resolution; added 5 new translation keys (priority-low/medium/high/critical, settings-toggled)
- Workflow menu buildStepMessage now accepts TranslateFunc parameter; all instructions (type-your-answer, continue, processing) and all status messages (phase-complete, lifecycle-complete, archived, deferred, not-found, link-first) use ctx.t()

## Task Commits

Each task was committed atomically:

1. **Task 1: i18n for project-menu.ts and idea-menu.ts** - `079df0c` (feat)
2. **Task 2: i18n for settings-menu.ts and workflow-menu.ts** - `686faab` (feat)

## Files Created/Modified
- `server/src/telegram/menus/project-menu.ts` - All button labels and callback answers use ctx.t(); removed unused escapeMd import
- `server/src/telegram/menus/idea-menu.ts` - Refine, propose-graduation, vote-yes/no, back, and error buttons all use ctx.t(); graduation message uses escapeMd(ctx.t())
- `server/src/telegram/menus/settings-menu.ts` - CHANNEL_LABELS replaced with CHANNEL_EMOJIS + CHANNEL_KEYS/PRIORITY_KEYS maps; all labels and callbacks translated
- `server/src/telegram/menus/workflow-menu.ts` - buildStepMessage accepts TranslateFunc; all reply messages in handleAdvanceResult and renderCurrentWorkflowStep use ctx.t()
- `server/src/telegram/locales/en.ftl` - Added menu-error-generating, settings-priority-low/medium/high/critical, settings-toggled keys
- `server/src/telegram/locales/de.ftl` - Added menu-error-generating, settings-priority-low/medium/high/critical, settings-toggled keys

## Decisions Made
- Settings channel and priority labels use key map pattern (Record mapping to translation key strings) resolved dynamically via ctx.t() inside the dynamic callback -- keeps emoji in code, translates labels
- buildStepMessage accepts TranslateFunc parameter (not full BotContext) for better function separation -- callers pass ctx.t
- Added menu-error-generating key for "Error generating question" callback answer (not in original .ftl files)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added menu-error-generating translation key**
- **Found during:** Task 1 (idea-menu.ts)
- **Issue:** Plan referenced translating "Error generating question" callback but no .ftl key existed for it
- **Fix:** Added `menu-error-generating` key to both en.ftl ("Error generating question") and de.ftl ("Fehler beim Generieren der Frage")
- **Files modified:** server/src/telegram/locales/en.ftl, server/src/telegram/locales/de.ftl
- **Verification:** ctx.t("menu-error-generating") resolves correctly
- **Committed in:** 079df0c (Task 1 commit)

**2. [Rule 1 - Bug] Removed unused escapeMd import from project-menu.ts**
- **Found during:** Task 1 (project-menu.ts)
- **Issue:** After replacing hardcoded strings with ctx.t(), the escapeMd import was no longer used
- **Fix:** Removed escapeMd from the import statement
- **Files modified:** server/src/telegram/menus/project-menu.ts
- **Verification:** npx tsc --noEmit passes
- **Committed in:** 079df0c (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 4 menu files are fully i18n-enabled
- Combined with plan 02 (commands/formatters) and plan 04 (handlers/emitters), the entire Telegram bot subsystem is i18n-complete
- Phase 11 can be marked complete once this plan's summary is recorded

## Self-Check: PASSED

All files exist, all commits verified, TypeScript compiles cleanly.

---
*Phase: 11-telegram-bot-i18n*
*Completed: 2026-02-09*
