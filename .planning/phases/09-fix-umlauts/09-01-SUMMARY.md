---
phase: 09-fix-umlauts
plan: 01
subsystem: i18n
tags: [unicode, umlauts, german, i18n, l10n]

# Dependency graph
requires:
  - phase: 01-foundation-authentication
    provides: i18n system with de.json and server.ts translation files
provides:
  - Correct Unicode umlauts in all 434 German client-side translation values
  - Correct Unicode umlauts in 2 server-side German error messages
affects: [10-fix-en-json, 11-claude-md-encoding-rules]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Unicode-first German translations: always use native characters, never ASCII approximations"

key-files:
  created: []
  modified:
    - client/src/i18n/locales/de.json
    - server/src/i18n/server.ts

key-decisions:
  - "Manual line-by-line review rather than regex replacement to avoid false positives"
  - "Preserved Dauer/Neue/Aktuelle as correct German (not umlaut approximations)"
  - "Applied ss->eszett only for linguistically correct words (abschliessen, Grosses, Massnahmen)"

patterns-established:
  - "German text encoding: always ä/ö/ü/ß, never ae/oe/ue/ss approximations"
  - "False-positive awareness: Dauer, Neue, Aktuelle contain ue but are NOT umlauts"

# Metrics
duration: 4min
completed: 2026-02-09
---

# Phase 9 Plan 1: Fix Umlauts Summary

**Replaced all 129 ASCII umlaut approximations (ae/oe/ue/ss) with correct Unicode characters (ä/ö/ü/ß) across de.json and server.ts**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-09T14:07:52Z
- **Completed:** 2026-02-09T14:11:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Fixed 129 ASCII-to-Unicode value replacements in de.json (434 keys, all preserved)
- Fixed 2 server-side German error messages in server.ts
- Preserved all 22 interpolation tokens ({{count}}, {{name}}, {{phase}}, etc.)
- Preserved all false-positive words (Dauer, Neue, Aktuelle) unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix all ASCII umlaut approximations in de.json** - `4787732` (fix)
2. **Task 2: Fix ASCII umlaut approximations in server.ts** - `6fa0283` (fix)

## Files Created/Modified
- `client/src/i18n/locales/de.json` - All 434 German translation values corrected to use proper Unicode umlauts
- `server/src/i18n/server.ts` - 2 German error messages corrected: "Ungültige Anmeldedaten" and "Ungültige Anfrage"

## Decisions Made
- Manual review approach chosen over regex to ensure false positives (Dauer, Neue, Aktuelle) are never touched
- The ss-to-eszett conversion applied selectively: "abschließen", "Großes", "Maßnahmen", "regelmäßig" get ß, while "Passwort", "Ergebnisse", "Einfluss" correctly keep ss

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- German UI text now displays correct Unicode umlauts throughout
- Ready for Phase 10 (en.json fixes) and Phase 11 (CLAUDE.md encoding rules)
- No blockers

## Self-Check: PASSED

All files verified present, all commit hashes confirmed in git log.

---
*Phase: 09-fix-umlauts*
*Completed: 2026-02-09*
