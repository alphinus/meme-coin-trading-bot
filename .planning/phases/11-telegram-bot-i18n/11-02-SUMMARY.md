---
phase: 11-telegram-bot-i18n
plan: 02
subsystem: telegram
tags: [i18n, ctx-t, fluent, formatters, commands, translate-func]

# Dependency graph
requires:
  - phase: 11-01
    provides: "ctx.t() available via i18n middleware, Fluent translation files with 140+ keys"
provides:
  - "All command handler reply strings use ctx.t() instead of hardcoded English"
  - "Formatter functions accept TranslateFunc parameter and use it for all labels"
  - "resolveUser helper uses ctx.t() for error messages"
  - "TranslateFunc type export for reuse in other modules"
affects: [11-03, 11-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TranslateFunc type for formatter function i18n: (key, params?) => string"
    - "escapeMd(t('key')) pattern for MarkdownV2-safe translated text"
    - "ctx.t passed to formatters as second/third parameter"
    - "Fluent strings kept as plain text, markdown formatting applied in code"

key-files:
  created: []
  modified:
    - "server/src/telegram/formatters.ts"
    - "server/src/telegram/commands.ts"
    - "server/src/telegram/locales/en.ftl"
    - "server/src/telegram/locales/de.ftl"
    - "server/src/telegram/menus/project-menu.ts"
    - "server/src/telegram/menus/idea-menu.ts"

key-decisions:
  - "Fluent strings kept as plain text, markdown formatting applied in TypeScript code (Option A from plan)"
  - "escapeMd applied to all t() output in MarkdownV2 messages for safe rendering"
  - "TranslateFunc type exported from formatters.ts for reuse across modules"

patterns-established:
  - "TranslateFunc parameter convention: format functions accept t as last parameter"
  - "escapeMd(t('key')) wrapping pattern for all translated text in MarkdownV2"
  - "ctx.t passed directly as TranslateFunc to formatter calls in command handlers"

# Metrics
duration: 5min
completed: 2026-02-09
---

# Phase 11 Plan 02: Command and Formatter i18n Summary

**All command handlers and formatter functions i18n-enabled with ctx.t() calls and TranslateFunc parameter, replacing 40+ hardcoded English strings**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-09T19:49:32Z
- **Completed:** 2026-02-09T19:54:40Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Defined TranslateFunc type and added t parameter to all 5 formatter functions (formatProjectDetail, formatProjectList, formatIdeaDetail, formatIdeaList, formatStatus)
- Replaced all 22 hardcoded English label strings in formatters.ts with t() calls wrapped in escapeMd()
- Replaced all 20 hardcoded English strings in commands.ts with ctx.t() calls (/start, /projects, /ideas, /status, /settings, /help, resolveUser)
- Added missing fmt-status-label and fmt-no-input translation keys to both en.ftl and de.ftl

## Task Commits

Each task was committed atomically:

1. **Task 1: Update formatters.ts to accept translation function parameter** - `33cbd2c` (feat)
2. **Task 2: Replace hardcoded strings in commands.ts with ctx.t()** - `eec25b3` (feat)

## Files Created/Modified
- `server/src/telegram/formatters.ts` - TranslateFunc type added; all 5 format functions accept t parameter; 22 label strings replaced with t() calls
- `server/src/telegram/commands.ts` - All command handlers use ctx.t(); pass ctx.t to formatter calls; resolveUser uses ctx.t
- `server/src/telegram/locales/en.ftl` - Added fmt-status-label, fmt-no-input keys
- `server/src/telegram/locales/de.ftl` - Added fmt-status-label, fmt-no-input keys
- `server/src/telegram/menus/project-menu.ts` - Updated formatProjectDetail call to pass ctx.t
- `server/src/telegram/menus/idea-menu.ts` - Updated formatIdeaDetail calls to pass ctx.t

## Decisions Made
- Kept Fluent strings as plain text with markdown formatting applied in TypeScript code (Option A from plan) for consistency with existing MarkdownV2 approach
- Applied escapeMd() to all t() output in MarkdownV2 messages to prevent Telegram parse errors
- Exported TranslateFunc type from formatters.ts so other modules can reference the same signature

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated menu call sites for new formatter signatures**
- **Found during:** Task 1
- **Issue:** project-menu.ts and idea-menu.ts call formatProjectDetail/formatIdeaDetail without the new t parameter, breaking TypeScript compilation
- **Fix:** Added ctx.t as second argument to all formatProjectDetail and formatIdeaDetail calls in menu files
- **Files modified:** server/src/telegram/menus/project-menu.ts, server/src/telegram/menus/idea-menu.ts
- **Verification:** npx tsc --noEmit passes
- **Committed in:** 33cbd2c (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix necessary for TypeScript compilation. No scope creep -- simply passing the new parameter through to existing call sites.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- commands.ts and formatters.ts are fully i18n-enabled
- ctx.t is passed through to all formatter functions
- Plan 03 (menu i18n) can now proceed -- menu files already have ctx.t passed to formatters
- Plan 04 (handler/notification i18n) can proceed independently

## Self-Check: PASSED

All files exist, all commits verified, TypeScript compiles cleanly.

---
*Phase: 11-telegram-bot-i18n*
*Completed: 2026-02-09*
