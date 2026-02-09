# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-09)

**Core value:** No project dies without a documented decision, and every thought trail is fully reconstructable.
**Current focus:** v1.1 i18n Quality — Phase 11: Telegram Bot i18n

## Current Position

Milestone: v1.1 i18n Quality
Phase: 11 of 11 (Telegram Bot i18n)
Plan: 4 of 4
Status: Phase Complete
Last activity: 2026-02-09 — Plan 11-03 complete (menu i18n)

Progress: [██████████] 100% (v1.0: 43/43 plans, v1.1: 10/10 plans — Phase 11: 4/4 complete)

## Performance Metrics

**Velocity (v1.0):**
- Total plans completed: 43
- Phases completed: 8
- Total execution time: 2 days
- Average per phase: ~5.4 plans

**v1.1 Metrics:**
| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 09    | 01   | 4min     | 2     | 2     |
| 10    | 01   | 4min     | 2     | 5     |
| 10    | 02   | 7min     | 2     | 8     |
| 10    | 04   | 5min     | 2     | 5     |
| 11    | 01   | 5min     | 2     | 5     |
| 11    | 02   | 5min     | 2     | 7     |
| 11    | 03   | 4min     | 2     | 6     |
| 11    | 04   | 6min     | 2     | 6     |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Recent decisions from PROJECT.md:
- Unicode umlauts mandatory: ASCII approximations unacceptable in German UI (v1.1)
- CLAUDE.md encoding rules: Prevent future umlaut/i18n regressions (v1.1)
- v1.1 scope: Quality-only milestone — fix what exists, no new features

Phase 9 decisions:
- Manual review over regex replacement to avoid false positives (Dauer, Neue, Aktuelle)
- Selective ss-to-eszett: only linguistically correct words get eszett

Phase 10-01 decisions:
- Moved status label mappings inside component body since t() requires hook context
- Module-level config objects retain non-i18n data; i18n labels resolved inside component

Phase 10-02 decisions:
- Used useTranslation from react-i18next directly per CLAUDE.md convention instead of useLanguage wrapper
- Moved TASK_TYPES/AVAILABLE_MODELS label data inside AiModelOverride component body for t() hook access

Phase 10-04 decisions:
- Used useTranslation from react-i18next directly per CLAUDE.md convention
- Simplified connected_detail strings to use t() interpolation with email/since params

Phase 11-01 decisions:
- defaultLocale set to "de" matching client-side fallback
- 140 translation keys per locale covering all bot subsystems including notifications
- Per-language setMyCommands moved from commands.ts to bot.ts setupBot()

Phase 11-02 decisions:
- Fluent strings kept as plain text, markdown formatting applied in TypeScript code (Option A)
- escapeMd applied to all t() output in MarkdownV2 messages
- TranslateFunc type exported from formatters.ts for reuse across modules

Phase 11-03 decisions:
- Settings channel/priority labels use key map pattern resolved dynamically via ctx.t()
- buildStepMessage accepts TranslateFunc parameter for better separation from BotContext
- Added menu-error-generating and settings-toggled/priority keys to both .ftl files

Phase 11-04 decisions:
- Separate -label suffixed keys for inline keyboard button labels to avoid key conflicts
- Voice handler captures userLang before background task spawn for i18n.t() in catch
- Per-recipient language in emitter via loadUser().language with "de" fallback

### Pending Todos

None.

### Blockers/Concerns

None identified during roadmap creation.

## Session Continuity

Last session: 2026-02-09
Stopped at: Completed 11-03-PLAN.md (menu i18n)
Next step: Phase 11 complete -- all 4 plans executed, v1.1 milestone complete
