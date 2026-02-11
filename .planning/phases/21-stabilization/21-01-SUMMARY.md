---
phase: 21-stabilization
plan: 01
subsystem: ui, i18n
tags: [react-i18next, i18n, typescript, navigation, tool-labels]

# Dependency graph
requires:
  - phase: 10-client-i18n-coverage
    provides: i18n infrastructure (react-i18next, useTranslation, locale files)
  - phase: 19-ai-function-migration
    provides: AgentOutput component with tool labels
provides:
  - Fully internationalized navigation bar (8 labels)
  - Fully internationalized AgentOutput tool labels (10 tools)
  - Fully internationalized IdeaPool page (13+ hardcoded strings replaced)
  - Fixed gsd.ts import path compilation error
affects: [21-02-PLAN, 21-03-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TOOL_LABEL_KEYS i18n map pattern for static label lookups"
    - "useTranslation hook in App.tsx layout component"

key-files:
  created: []
  modified:
    - server/src/routes/gsd.ts
    - client/src/App.tsx
    - client/src/components/AgentOutput.tsx
    - client/src/pages/IdeaPool.tsx
    - client/src/i18n/locales/en.json
    - client/src/i18n/locales/de.json

key-decisions:
  - "Used existing ideaPool camelCase namespace (not snake_case idea_pool) for new IdeaPool keys to maintain consistency with existing codebase"
  - "Used TOOL_LABEL_KEYS i18n key map pattern instead of inline t() calls for tool label lookup"

patterns-established:
  - "TOOL_LABEL_KEYS pattern: static Record mapping tool names to i18n keys, resolved via t() at render time"

# Metrics
duration: 6min
completed: 2026-02-11
---

# Phase 21 Plan 01: Bug Fix and i18n Polish Summary

**Fixed gsd.ts import path bug, internationalized nav bar (8 labels), AgentOutput tool labels (10 tools), and IdeaPool page (13+ strings) for complete DE/EN language support**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-11T09:48:49Z
- **Completed:** 2026-02-11T09:55:43Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Fixed gsd.ts import path from `../../workflow/definitions.js` to `../workflow/definitions.js`
- All 8 navigation labels in App.tsx now use t("nav.*") i18n calls
- AgentOutput.tsx tool progress labels use TOOL_LABEL_KEYS i18n map (10 tools in EN/DE)
- IdeaPool.tsx replaced all hardcoded English strings with t("ideaPool.*") calls
- Added 9 nav keys, 10 tool_label keys, and 8 ideaPool keys to both en.json and de.json
- Zero TypeScript compilation errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix gsd.ts import path and add missing nav i18n keys** - `05b1c2d` (fix)
2. **Task 2: Internationalize AgentOutput tool labels and IdeaPool hardcoded strings** - `bb74cec` (feat)

## Files Created/Modified
- `server/src/routes/gsd.ts` - Fixed import path from ../../ to ../workflow/definitions.js
- `client/src/App.tsx` - Added useTranslation hook, replaced 8 hardcoded nav strings with t() calls
- `client/src/components/AgentOutput.tsx` - Replaced TOOL_LABELS with TOOL_LABEL_KEYS i18n map
- `client/src/pages/IdeaPool.tsx` - Replaced 13+ hardcoded English strings with t() calls
- `client/src/i18n/locales/en.json` - Added nav, agent.tool_label, and ideaPool keys
- `client/src/i18n/locales/de.json` - Added nav, agent.tool_label, and ideaPool keys (German)

## Decisions Made
- Used existing `ideaPool` camelCase namespace for new IdeaPool keys rather than creating a separate `idea_pool` snake_case namespace, to maintain consistency with the 40+ existing `ideaPool.*` keys already in locale files
- Used TOOL_LABEL_KEYS i18n key map pattern (static Record<string, string> mapping tool names to i18n keys) for tool label lookup, keeping the map outside the component for performance

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Used existing ideaPool namespace instead of plan's idea_pool namespace**
- **Found during:** Task 2 (IdeaPool internationalization)
- **Issue:** Plan specified creating a new `idea_pool` snake_case namespace, but locale files already contain 40+ keys under `ideaPool` camelCase
- **Fix:** Added new keys to existing `ideaPool` namespace for consistency; reused existing keys (routing_title, routing_project, routing_confidence, archive, status_archived, title, subtitle, empty) instead of duplicating
- **Files modified:** client/src/i18n/locales/en.json, client/src/i18n/locales/de.json
- **Verification:** All t() calls resolve correctly, locale files parse as valid JSON
- **Committed in:** bb74cec (Task 2 commit)

**2. [Rule 2 - Missing Critical] Internationalized additional hardcoded strings not listed in plan**
- **Found during:** Task 2 (IdeaPool internationalization)
- **Issue:** "New Idea" and "{confidence}% match" strings in routing suggestions were hardcoded but not listed in plan
- **Fix:** Used existing ideaPool.routing_idea_pool and ideaPool.routing_confidence keys
- **Files modified:** client/src/pages/IdeaPool.tsx
- **Verification:** grep confirms no remaining hardcoded English strings in JSX
- **Committed in:** bb74cec (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 missing critical)
**Impact on plan:** Both deviations improve correctness and consistency. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All identified hardcoded English strings in nav, tool labels, and IdeaPool are now i18n-enabled
- gsd.ts import path bug is resolved
- Ready for 21-02 (verification testing) and 21-03 (remediation)

## Self-Check: PASSED

All 6 modified files exist. Both commit hashes (05b1c2d, bb74cec) verified in git log. Summary file exists at expected path.

---
*Phase: 21-stabilization*
*Completed: 2026-02-11*
