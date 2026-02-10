---
phase: 15-simple-expert-mode
plan: 02
subsystem: ui
tags: [react-conditional-rendering, collapsible-section, mode-toggle, useMode]

# Dependency graph
requires:
  - phase: 15-simple-expert-mode
    provides: ModeProvider context, useMode hook (isExpert/isSimple), Plan 01 infrastructure
  - phase: 01-foundation
    provides: Dashboard and ProjectDetail page structure
provides:
  - Mode-conditional section visibility on Dashboard (AI widget, KPI overview, team manager, activity feed hidden in Simple)
  - CollapsibleSection component for expandable/collapsible content areas
  - Mode-conditional KPI sidebar visibility on ProjectDetail
  - Full-width layout in Simple mode ProjectDetail
affects: [any future page additions needing mode-aware rendering]

# Tech tracking
tech-stack:
  added: []
  patterns: [isExpert-conditional-rendering, collapsible-section-with-useEffect-auto-expand, mode-aware-layout-switching]

key-files:
  created: []
  modified:
    - client/src/pages/Dashboard.tsx
    - client/src/pages/ProjectDetail.tsx

key-decisions:
  - "CollapsibleSection auto-expands via useEffect when switching to Expert mode (prevents stale collapsed state)"
  - "Simple mode ProjectDetail uses undefined style (no flex layout) instead of custom single-column style for simplicity"
  - "PhaseManagement panel kept visible in both modes since it is a workflow action triggered by user click, not metadata"

patterns-established:
  - "isExpert && guard pattern: wrap expert-only JSX blocks with {isExpert && (...)} for conditional visibility"
  - "CollapsibleSection pattern: reusable component with defaultOpen prop driven by isExpert for mode-aware collapse behavior"
  - "Mode-aware layout: ternary on container style (isExpert ? twoColumnStyle : undefined) for adaptive layouts"

# Metrics
duration: 2min
completed: 2026-02-10
---

# Phase 15 Plan 02: Mode-Conditional Page Rendering Summary

**Dashboard hides KPI/AI/team sections in Simple mode; ProjectDetail collapses Phase Timeline and hides KPI sidebar with CollapsibleSection component**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-10T10:41:35Z
- **Completed:** 2026-02-10T10:43:44Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Dashboard conditionally hides AI Team Member widget, KPI overview section, and TeamManager/ActivityFeed grid in Simple mode
- Created CollapsibleSection component with chevron indicator, auto-expands via useEffect when switching to Expert mode
- ProjectDetail Phase Timeline collapsed by default in Simple mode (clickable to expand)
- KPI sidebar hidden in Simple mode with full-width main content layout
- AgentPanel, WorkflowEngine, and PhaseManagement remain visible in both modes

## Task Commits

Each task was committed atomically:

1. **Task 1: Apply mode-conditional rendering to Dashboard.tsx** - `d230ed5` (feat)
2. **Task 2: Apply collapsible sections and KPI hiding to ProjectDetail.tsx** - `e77d89c` (feat)

## Files Created/Modified
- `client/src/pages/Dashboard.tsx` - Added useMode hook, wrapped AI widget/KPI overview/team grid with isExpert && guards
- `client/src/pages/ProjectDetail.tsx` - Added CollapsibleSection component, wrapped Phase Timeline in collapsible, hid KPI sidebar in Simple mode

## Decisions Made
- CollapsibleSection auto-expands via useEffect when isExpert becomes true (prevents stale collapsed state after mode switch)
- Simple mode ProjectDetail uses `undefined` for container/column styles instead of creating a dedicated single-column style object (simpler, avoids style proliferation)
- PhaseManagement panel kept visible in both modes per plan's reconsidered decision (it's a user-triggered workflow action, not expert metadata)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Simple/Expert mode feature complete across both plans (infrastructure + page rendering)
- All 5 MODE requirements (MODE-01 through MODE-05) satisfied
- Phase 15 complete -- ready for next phase in roadmap

## Self-Check: PASSED

- All 2 modified files verified present on disk
- Commit d230ed5 (Task 1) verified in git log
- Commit e77d89c (Task 2) verified in git log
- TypeScript type-check passes cleanly

---
*Phase: 15-simple-expert-mode*
*Completed: 2026-02-10*
