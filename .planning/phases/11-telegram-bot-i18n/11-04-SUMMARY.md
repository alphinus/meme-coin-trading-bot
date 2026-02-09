---
phase: 11-telegram-bot-i18n
plan: 04
subsystem: telegram
tags: [grammyjs-i18n, fluent, ctx-t, i18n-t, handlers, notifications, per-recipient-language]

# Dependency graph
requires:
  - phase: 11-01
    provides: "I18n instance, ctx.t(), i18n.t(), Fluent .ftl locale files"
provides:
  - "All 3 handler files (text, voice, callback) fully i18n-enabled via ctx.t()"
  - "Voice handler background messages translated via i18n.t(language, key)"
  - "Notification emitter with per-recipient language resolution via loadUser().language"
  - "All EVENT_NOTIFICATION_MAP entries using translation keys instead of hardcoded English"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ctx.t() for all user-facing strings in bot handlers"
    - "i18n.t(language, key, params) for background messages outside bot context"
    - "Per-recipient language resolution via loadUser() in notification dispatch loop"
    - "NotificationMapping with titleKey/bodyKey instead of hardcoded title/body strings"

key-files:
  created: []
  modified:
    - "server/src/telegram/handlers/text.ts"
    - "server/src/telegram/handlers/voice.ts"
    - "server/src/telegram/handlers/callback.ts"
    - "server/src/notifications/emitter.ts"
    - "server/src/telegram/locales/de.ftl"
    - "server/src/telegram/locales/en.ftl"

key-decisions:
  - "Used separate handler-route-project-label and handler-route-idea-pool-label keys for inline keyboard button labels to avoid conflicting with existing message keys"
  - "Voice handler captures userLang before spawning background task for i18n.t() error messages"
  - "Calendar event notification simplified to single mapping (post-meeting title/body) since it is the primary use case"

patterns-established:
  - "Background message pattern: capture language before async spawn, use i18n.t(lang, key) in catch/background"
  - "Emitter per-recipient pattern: loadUser -> lang fallback to 'de' -> i18n.t(lang, titleKey/bodyKey)"

# Metrics
duration: 6min
completed: 2026-02-09
---

# Phase 11 Plan 04: Handler & Emitter i18n Summary

**All 3 handler files and notification emitter fully i18n-enabled with ctx.t() for handlers, i18n.t() for background/notification messages, and per-recipient language resolution in emitter**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-09T19:49:43Z
- **Completed:** 2026-02-09T19:56:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Replaced all hardcoded English strings in text.ts (5 ctx.t() calls), voice.ts (22 ctx.t()/i18n.t() calls), and callback.ts (6 ctx.t() calls) with translation keys
- Voice handler uses i18n.t(language, key) for all background messages (outside bot context) including error handling, transcription labels, routing suggestions, and inline keyboard button labels
- Rewrote notification emitter with NotificationMapping interface using titleKey/bodyKey instead of hardcoded strings, resolving per-recipient language via loadUser().language
- All 20 EVENT_NOTIFICATION_MAP entries converted to translation key references with bodyParams extractors
- Added 3 new translation keys (handler-routed, handler-route-project-label, handler-route-idea-pool-label) to both de.ftl and en.ftl

## Task Commits

Each task was committed atomically:

1. **Task 1: i18n for text.ts, voice.ts, and callback.ts handlers** - `7dee89b` (feat)
2. **Task 2: i18n for notification emitter** - `105c520` (feat)

## Files Created/Modified
- `server/src/telegram/handlers/text.ts` - All 5 user-facing strings replaced with ctx.t() translation calls
- `server/src/telegram/handlers/voice.ts` - 22 translation calls: ctx.t() for bot-context messages, i18n.t() for background messages with imported i18n instance
- `server/src/telegram/handlers/callback.ts` - All 6 user-facing strings replaced with ctx.t() translation calls
- `server/src/notifications/emitter.ts` - Rewritten with per-recipient language resolution, titleKey/bodyKey pattern, i18n.t() and loadUser() imports
- `server/src/telegram/locales/en.ftl` - Added handler-routed, handler-route-project-label, handler-route-idea-pool-label keys
- `server/src/telegram/locales/de.ftl` - Added matching German translations for the 3 new keys

## Decisions Made
- Used separate `-label` suffixed keys for inline keyboard button labels (handler-route-project-label, handler-route-idea-pool-label) to avoid conflicting with existing message confirmation keys (handler-route-project, handler-route-idea-pool)
- Voice handler captures `userLang` before spawning background task to ensure language is available in the `.catch()` handler even if user context is stale
- Calendar event notification simplified to single mapping using post-meeting title/body since it is the dominant use case for this event type
- Technical error fallback strings in catch blocks (text.ts, callback.ts) kept as-is per plan guidance -- they are engine errors, not user-facing UI strings

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added separate button label translation keys**
- **Found during:** Task 1 (voice.ts inline keyboard buttons)
- **Issue:** Plan referenced `handler-route-project` and `handler-route-idea-pool` for button labels with `{ name, confidence }` params, but those keys already exist in .ftl files with different semantics (confirmation messages without params)
- **Fix:** Created separate keys `handler-route-project-label` and `handler-route-idea-pool-label` for button labels with proper Fluent variable placeholders
- **Files modified:** de.ftl, en.ftl, voice.ts
- **Verification:** TypeScript compiles, no key conflicts
- **Committed in:** 7dee89b (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential to avoid key naming conflicts in Fluent translations. No scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All handler files and notification emitter are fully i18n-enabled
- Phase 11 plans 01-04 complete: infrastructure, commands/formatters (02-03 pending), handlers, and emitter all i18n-enabled
- TypeScript compiles cleanly with all changes

## Self-Check: PASSED

All files exist, all commits verified, summary created.

---
*Phase: 11-telegram-bot-i18n*
*Completed: 2026-02-09*
