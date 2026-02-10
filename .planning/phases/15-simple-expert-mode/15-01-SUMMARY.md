---
phase: 15-simple-expert-mode
plan: 01
subsystem: ui
tags: [react-context, localStorage, mode-toggle, route-guard, i18n]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: AuthProvider, ProtectedRoute, useAuth patterns
  - phase: 10-client-i18n
    provides: i18n locale files structure and useTranslation convention
provides:
  - ModeProvider context with localStorage persistence
  - useMode hook (mode, isExpert, isSimple, setMode, toggleMode)
  - ModeToggle header component
  - ExpertRoute route guard
  - Conditional nav links in AppLayout
  - ExpertRoute wrapping on 7 expert-only routes
affects: [15-02-PLAN, any future route additions]

# Tech tracking
tech-stack:
  added: []
  patterns: [mode-context-provider, conditional-nav-rendering, expert-route-guard]

key-files:
  created:
    - client/src/hooks/useMode.ts
    - client/src/components/ModeToggle.tsx
    - client/src/components/ExpertRoute.tsx
  modified:
    - client/src/App.tsx
    - client/src/i18n/locales/en.json
    - client/src/i18n/locales/de.json

key-decisions:
  - "Default mode is 'simple' when no localStorage value exists (non-technical user first experience)"
  - "ModeProvider placed inside AuthProvider but outside Routes (all routes and AppLayout have access)"
  - "ModeToggle placed as first element in headerRight (before NotificationBell)"

patterns-established:
  - "Mode context pattern: ModeProvider + useMode mirrors AuthProvider + useAuth"
  - "ExpertRoute guard: same render-children-or-redirect pattern as ProtectedRoute"
  - "Conditional nav: {isExpert && (...)} wrapping for expert-only navigation items"

# Metrics
duration: 3min
completed: 2026-02-10
---

# Phase 15 Plan 01: Simple/Expert Mode Infrastructure Summary

**ModeProvider context with localStorage persistence, ModeToggle pill component, ExpertRoute guard, and full App.tsx integration with conditional nav and route protection**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-10T10:35:55Z
- **Completed:** 2026-02-10T10:38:50Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created ModeProvider context with localStorage persistence (key: eluma-mode) defaulting to "simple"
- ModeToggle two-button pill component matching LanguageSwitcher styling pattern
- ExpertRoute guard redirecting to /home in Simple mode, mirroring ProtectedRoute pattern
- App.tsx fully wired: ModeProvider wrapping routes, conditional nav (Soul Docs/AI/Integrations/Settings hidden in Simple mode), ExpertRoute on 7 expert-only routes
- i18n keys in both EN and DE locale files

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useMode hook, ModeToggle component, ExpertRoute guard, and i18n keys** - `04883ce` (feat)
2. **Task 2: Integrate ModeProvider, ModeToggle, conditional nav, and ExpertRoute into App.tsx** - `207afff` (feat)

## Files Created/Modified
- `client/src/hooks/useMode.ts` - ModeProvider context + useMode hook with localStorage persistence
- `client/src/components/ModeToggle.tsx` - Simple/Expert toggle pill for header
- `client/src/components/ExpertRoute.tsx` - Route guard redirecting to /home in Simple mode
- `client/src/App.tsx` - ModeProvider wrapping, conditional nav, ModeToggle in header, ExpertRoute on 7 routes
- `client/src/i18n/locales/en.json` - Added mode.simple, mode.expert, mode.toggle_label keys
- `client/src/i18n/locales/de.json` - Added mode.simple, mode.expert, mode.toggle_label keys (German)

## Decisions Made
- Default mode is "simple" when no localStorage value exists (aligns with non-technical user accessibility goal)
- ModeProvider placed inside AuthProvider but outside Routes so all authenticated components can access useMode
- ModeToggle placed as first element in headerRight div (before NotificationBell) for visibility
- Used 0.75rem font size for ModeToggle (slightly smaller than LanguageSwitcher's 0.875rem) to keep header compact

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Mode infrastructure complete and fully integrated
- Plan 02 can apply conditional rendering to individual page content areas
- All expert-only routes are guarded and nav links are conditionally rendered

## Self-Check: PASSED

- All 6 files verified present on disk
- Commit 04883ce (Task 1) verified in git log
- Commit 207afff (Task 2) verified in git log
- TypeScript type-check passes cleanly

---
*Phase: 15-simple-expert-mode*
*Completed: 2026-02-10*
