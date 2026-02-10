---
phase: 17-guided-wizards
plan: 05
subsystem: ui
tags: [react, wizard, quality-gate, i18n, graduation]

# Dependency graph
requires:
  - phase: 17-guided-wizards/01
    provides: WizardShell, WizardStepIndicator, quality gate middleware, shared wizard types
provides:
  - IdeaToProjectWizard with question-per-screen flow (WIZ-03)
  - QualityGateIndicator progress bar component (GATE-04)
  - useQualityGate hook for answer tracking
  - IdeaGraduation wizard integration with quality gate enforcement (GATE-01)
  - wizard.gsd.* i18n keys in DE and EN
affects: [idea-pool, graduation, project-creation]

# Tech tracking
tech-stack:
  added: []
  patterns: [quality-gate-enforcement, question-per-screen-wizard, client-side-question-mirror]

key-files:
  created:
    - client/src/hooks/useQualityGate.ts
    - client/src/components/QualityGateIndicator.tsx
    - client/src/components/wizards/IdeaToProjectWizard/IdeaToProjectWizard.tsx
    - client/src/components/wizards/IdeaToProjectWizard/StepQuestion.tsx
    - client/src/components/wizards/IdeaToProjectWizard/StepProjectReady.tsx
  modified:
    - client/src/components/IdeaGraduation.tsx
    - client/src/i18n/locales/en.json
    - client/src/i18n/locales/de.json

key-decisions:
  - "Client-side question mirror: 6 mandatory GSD questions defined in useQualityGate.ts mirroring server/src/workflow/gsd-questions.ts (server remains validation source of truth)"
  - "QualityGateIndicator used as primary progress indicator instead of WizardStepIndicator (7 steps too cramped for labeled dots)"
  - "IdeaToProjectWizard manages own step navigation instead of WizardShell (custom per-question props needed)"
  - "No mode bypass for quality gate: wizard enforced identically in Simple and Expert mode (GATE-03)"

patterns-established:
  - "Quality gate client enforcement: block graduation UI until wizard complete, show progress indicator"
  - "Question-per-screen wizard: custom wizard component with useQualityGate hook for non-WizardShell flows"

# Metrics
duration: 5min
completed: 2026-02-10
---

# Phase 17 Plan 05: Idea-to-Project Wizard & Quality Gate Summary

**Question-per-screen wizard with QualityGateIndicator progress bar blocking idea graduation until all 6 mandatory GSD questions answered**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-10T14:52:58Z
- **Completed:** 2026-02-10T14:58:18Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Built IdeaToProjectWizard presenting 6 mandatory GSD questions one per screen with textarea/button-group inputs
- Created QualityGateIndicator with progress bar showing answered vs remaining count (GATE-04)
- Wired IdeaGraduation to require wizard completion before graduation proposal (GATE-01)
- Quality gate enforced identically in Simple and Expert mode with no bypass (GATE-03)
- All wizard text i18n'd in DE and EN with wizard.gsd.* namespace

## Task Commits

Each task was committed atomically:

1. **Task 1: Build QualityGateIndicator, useQualityGate hook, and IdeaToProjectWizard** - `039d612` (feat)
2. **Task 2: Wire IdeaToProjectWizard into IdeaGraduation flow** - `a87660c` (feat)

## Files Created/Modified
- `client/src/hooks/useQualityGate.ts` - Hook tracking 6 mandatory GSD questions and answers with computed progress
- `client/src/components/QualityGateIndicator.tsx` - Progress bar with answered/remaining count and status text
- `client/src/components/wizards/IdeaToProjectWizard/StepQuestion.tsx` - Single question screen with textarea/choice input and navigation
- `client/src/components/wizards/IdeaToProjectWizard/StepProjectReady.tsx` - Final confirmation with answer summary and Create Project button
- `client/src/components/wizards/IdeaToProjectWizard/IdeaToProjectWizard.tsx` - Main wizard orchestrating question-per-screen flow
- `client/src/components/IdeaGraduation.tsx` - Updated to require wizard completion before graduation proposal
- `client/src/i18n/locales/en.json` - Added wizard.gsd.* and wizard.gate.ready keys
- `client/src/i18n/locales/de.json` - Added wizard.gsd.* and wizard.gate.ready keys

## Decisions Made
- Client-side question definitions mirror server gsd-questions.ts rather than importing (server file has server-only path conventions)
- QualityGateIndicator used instead of WizardStepIndicator for progress (7 labeled dots would be cramped)
- IdeaToProjectWizard does not use WizardShell (needs custom per-question props per step)
- Expert mode shows question descriptions; Simple mode shows titles only; quality gate itself is identical in both modes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Replaced hardcoded English strings in IdeaGraduation with i18n t() calls**
- **Found during:** Task 2
- **Issue:** Original IdeaGraduation.tsx had hardcoded English strings ("Ready for Graduation", "Proposing...", "Approve", etc.) violating i18n requirement
- **Fix:** Replaced all user-facing strings with t() calls using existing ideaPool.* i18n keys
- **Files modified:** client/src/components/IdeaGraduation.tsx
- **Verification:** TypeScript compiles clean, all strings use t() function
- **Committed in:** a87660c (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Necessary for i18n correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- IdeaToProjectWizard and quality gate enforcement are complete
- Remaining Phase 17 plans (02-04) can proceed independently if needed
- Server-side quality gate validation already exists from Plan 01

## Self-Check: PASSED

All 6 created files verified on disk. Both commits (039d612, a87660c) verified in git log. Summary file exists.

---
*Phase: 17-guided-wizards*
*Completed: 2026-02-10*
