---
phase: 11-telegram-bot-i18n
plan: 01
subsystem: telegram
tags: [grammyjs-i18n, fluent, ftl, i18n, telegram-bot, locale-negotiator]

# Dependency graph
requires: []
provides:
  - "I18n instance with custom localeNegotiator reading user.language"
  - "German Fluent translation file (de.ftl) with 140 translation keys"
  - "English Fluent translation file (en.ftl) with 140 translation keys (1:1 parity)"
  - "ctx.t() available in all bot handlers via i18n middleware"
  - "i18n.t(locale, key) available for standalone translation outside bot context"
  - "Per-language Telegram command descriptions (DE and EN)"
affects: [11-02, 11-03, 11-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "I18n middleware in bot pipeline: session -> i18n -> menus -> commands -> handlers"
    - "Custom localeNegotiator reading Eluma user.language via resolveElumaUser"
    - "Fluent .ftl format with { $varName } variable syntax"
    - "Per-language setMyCommands registration in setupBot()"
    - "Standalone i18n.t(locale, key) for notification translation outside bot context"

key-files:
  created:
    - "server/src/telegram/i18n.ts"
    - "server/src/telegram/locales/de.ftl"
    - "server/src/telegram/locales/en.ftl"
  modified:
    - "server/src/telegram/bot.ts"
    - "server/src/telegram/commands.ts"

key-decisions:
  - "defaultLocale set to 'de' matching client-side fallback"
  - "140 translation keys per locale covering all bot subsystems including notifications"
  - "Per-language setMyCommands moved from commands.ts to bot.ts setupBot()"

patterns-established:
  - "Fluent .ftl files as plain text -- no MarkdownV2 escaping in translation strings"
  - "i18n.loadLocaleSync with import.meta.dirname for path resolution"
  - "localeNegotiator resolves Eluma user profile language, not Telegram language_code"

# Metrics
duration: 5min
completed: 2026-02-09
---

# Phase 11 Plan 01: i18n Infrastructure Summary

**grammY i18n plugin wired with custom locale negotiator, 140-key German/English Fluent translations, and per-language command registration**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-09T19:41:40Z
- **Completed:** 2026-02-09T19:46:56Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created I18n instance with custom localeNegotiator that reads user.language from Eluma user profile
- Created 140-key German Fluent translation file (de.ftl) with proper Unicode umlauts covering all bot subsystems
- Created 140-key English Fluent translation file (en.ftl) with exact 1:1 key parity
- Wired i18n middleware into bot pipeline in correct position (after session, before menus)
- Registered per-language command descriptions for both DE and EN via setMyCommands

## Task Commits

Each task was committed atomically:

1. **Task 1: Create i18n instance and Fluent translation files** - `bf5d4f5` (feat)
2. **Task 2: Wire i18n middleware into bot pipeline and register per-language commands** - `4d821a6` (feat)

## Files Created/Modified
- `server/src/telegram/i18n.ts` - I18n instance with custom localeNegotiator and Fluent file loading
- `server/src/telegram/locales/de.ftl` - Complete German Fluent translations (140 keys, 7 sections)
- `server/src/telegram/locales/en.ftl` - Complete English Fluent translations (140 keys, 1:1 parity)
- `server/src/telegram/bot.ts` - i18n middleware registration and per-language setMyCommands
- `server/src/telegram/commands.ts` - Removed old single-language setMyCommands call

## Decisions Made
- defaultLocale set to "de" to match the client-side fallback language convention
- 140 translation keys per locale (exceeding the ~100 estimate) to cover all user-facing strings across commands, formatters, menus, workflow, handlers, callbacks, notifications, and settings
- Per-language setMyCommands registration moved from commands.ts registerCommands() to bot.ts setupBot() for cleaner separation -- bot.ts owns startup concerns, commands.ts owns handler logic

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ctx.t() is now available in every handler via i18n middleware
- i18n.t(locale, key) is available for standalone translation (notifications)
- All 140 translation keys ready for Plans 02-04 to consume via ctx.t() replacements
- Bot compiles and pipeline order is correct

## Self-Check: PASSED

All files exist, all commits verified, summary created.

---
*Phase: 11-telegram-bot-i18n*
*Completed: 2026-02-09*
