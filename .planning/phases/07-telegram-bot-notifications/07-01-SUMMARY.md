---
phase: 07-telegram-bot-notifications
plan: 01
subsystem: telegram, notification
tags: [grammy, telegram-bot, webhook, event-sourcing, nodemailer, i18n]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Express app, event store, user auth, team reducers"
provides:
  - "grammY bot instance with typed BotContext (File + Menu + I18n + Session flavors)"
  - "Telegram-Eluma user linking via 6-digit one-time codes with 10-minute expiry"
  - "Express webhook route for Telegram updates (registered before JSON parser)"
  - "Shared types for Telegram links and notification preferences/channels/priorities"
  - "5 new event types: telegram.user_linked, telegram.user_unlinked, notification.preference_updated, notification.created, notification.read"
affects: [07-telegram-bot-notifications, 08-integrations-search]

# Tech tracking
tech-stack:
  added: [grammy, "@grammyjs/files", "@grammyjs/menu", "@grammyjs/conversations", "@grammyjs/i18n", nodemailer, "@types/nodemailer"]
  patterns: ["null-guard bot pattern (graceful no-op when token missing)", "webhook before JSON parser", "one-time code linking flow via event store"]

key-files:
  created:
    - shared/types/telegram.ts
    - shared/types/notification.ts
    - server/src/telegram/types.ts
    - server/src/telegram/bot.ts
    - server/src/routes/telegram.ts
  modified:
    - shared/types/events.ts
    - server/src/telegram/auth.ts
    - server/src/app.ts
    - server/package.json

key-decisions:
  - "Null-guard bot pattern: bot exports null when TELEGRAM_BOT_TOKEN not set, all consumers check before use"
  - "Webhook route registered BEFORE express.json() in app.ts for grammY raw body access"
  - "Linking codes stored in separate telegram_linking aggregate with subType field for code_generated/code_consumed"
  - "Re-exported getTeamForUser from existing team reducer rather than re-implementing in auth module"
  - "setupBot() called in async IIFE at bottom of app.ts with try/catch for non-blocking initialization"

patterns-established:
  - "Null bot guard: consumers check `if (!bot)` before using Telegram features"
  - "Pre-JSON-parser webhook: Telegram route must always precede express.json() in middleware chain"
  - "One-time code linking: 6-digit numeric code with 10-min TTL for cross-platform account linking"

# Metrics
duration: 7min
completed: 2026-02-08
---

# Phase 7 Plan 1: Telegram Bot Infrastructure Summary

**grammY bot instance with typed BotContext, Telegram-Eluma user linking via one-time codes, webhook Express route, and shared notification/telegram types**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-08T18:01:47Z
- **Completed:** 2026-02-08T18:08:21Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Installed grammY v1.39+ with files, menu, conversations, i18n plugins and nodemailer
- Created shared types for both Telegram (TelegramLink, TelegramLinkingCode) and notification domains (channels, priorities, preferences, DEFAULT_PREFERENCES)
- Added 5 new event types to the EventType union and EVENT_TYPES array
- Built bot instance with BotContext combining FileFlavor, MenuFlavor, I18nFlavor, and SessionData
- Implemented full Telegram-Eluma user linking: getTelegramLink, linkTelegramUser, resolveElumaUser, generateLinkingCode, consumeLinkingCode
- Created webhook route with secret validation, registered BEFORE express.json() in app.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Install grammY ecosystem and create shared types** - `ade54bc` (feat)
2. **Task 2: Create bot instance, auth linking, webhook route** - `df3f13a` (feat)

## Files Created/Modified
- `shared/types/telegram.ts` - TelegramLink and TelegramLinkingCode interfaces
- `shared/types/notification.ts` - NotificationChannel, NotificationPriority, NotificationPreferenceState, NotificationEvent, DEFAULT_PREFERENCES
- `shared/types/events.ts` - Added 5 telegram/notification event types to union and const array
- `server/src/telegram/types.ts` - SessionData interface and BotContext type combining all plugin flavors
- `server/src/telegram/bot.ts` - Bot instance creation with hydrateFiles, session middleware, setupBot for webhook/polling
- `server/src/telegram/auth.ts` - Full linking module: getTelegramLink, getTelegramLinkByElumaUser, linkTelegramUser, resolveElumaUser, generateLinkingCode, consumeLinkingCode
- `server/src/routes/telegram.ts` - Express webhook route with secret validation and grammY webhookCallback
- `server/src/app.ts` - Imported telegramRouter and setupBot, registered webhook before JSON parser
- `server/package.json` - Added grammy, @grammyjs/*, nodemailer dependencies

## Decisions Made
- Null-guard bot pattern: export null bot when token not configured, graceful no-op for all consumers
- Webhook route registered BEFORE express.json() so grammY receives the raw body
- Linking codes use separate `telegram_linking` aggregate with `subType` field (code_generated/code_consumed) rather than separate event types
- Re-exported `getTeamForUser` from existing team reducer for convenience access in auth module
- setupBot() runs in async IIFE at app.ts bottom with try/catch for non-blocking initialization
- Replaced existing stub files (bot.ts, auth.ts from Phase 6 forward-prep) with full implementations

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-existing stub files from Phase 6**
- **Found during:** Task 2
- **Issue:** server/src/telegram/bot.ts and auth.ts already existed as stubs from a previous phase's forward preparation
- **Fix:** Replaced stubs with full implementations while preserving the API surface (getTelegramLinkByElumaUser was already imported by notifications/channels/telegram.ts)
- **Files modified:** server/src/telegram/bot.ts, server/src/telegram/auth.ts
- **Verification:** Full TypeScript compilation passes, existing consumers compile correctly
- **Committed in:** df3f13a (Task 2 commit)

**2. [Rule 1 - Bug] Removed unused TeamState import**
- **Found during:** Task 2
- **Issue:** Unused `import type { TeamState }` in auth.ts since getTeamForUser is re-exported rather than re-implemented
- **Fix:** Removed the unused import to keep code clean
- **Files modified:** server/src/telegram/auth.ts
- **Committed in:** df3f13a (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for clean implementation. No scope creep.

## User Setup Required

**External services require manual configuration.** The following environment variables need to be set before Telegram bot features will function:

- `TELEGRAM_BOT_TOKEN` - Create a bot via @BotFather in Telegram, copy the token
- `TELEGRAM_WEBHOOK_SECRET` - Generate a random string (e.g., `openssl rand -hex 16`) for webhook URL security
- `TELEGRAM_WEBHOOK_URL` (optional) - Set for production webhook mode; omit for development long-polling

## Issues Encountered
None

## Next Phase Readiness
- Bot infrastructure ready for command handlers (Plan 07-03)
- Shared notification types available for notification engine (Plan 07-02)
- User linking flow ready for Telegram /link command implementation
- Webhook route functional once TELEGRAM_BOT_TOKEN is provided

---
*Phase: 07-telegram-bot-notifications*
*Completed: 2026-02-08*
