---
phase: 17-guided-wizards
plan: 04
subsystem: ui
tags: [react, wizard, onboarding, i18n, localStorage]

# Dependency graph
requires:
  - phase: 17-guided-wizards
    provides: WizardShell, WizardStepIndicator, shared/types/wizard.ts
provides:
  - OnboardingWizard (3-step first-time user flow on Dashboard)
  - IdeaCreationWizard (3-step guided idea creation on IdeaPool)
  - useOnboarding hook (localStorage-based first-visit detection)
  - wizard.onboarding.* and wizard.idea.* i18n keys (EN + DE)
affects: [17-guided-wizards, dashboard, idea-pool]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useOnboarding hook with localStorage flag for one-time wizard display"
    - "Full-page wizard overlay via early-return pattern in page components"

key-files:
  created:
    - client/src/hooks/useOnboarding.ts
    - client/src/components/wizards/OnboardingWizard/OnboardingWizard.tsx
    - client/src/components/wizards/OnboardingWizard/StepWelcome.tsx
    - client/src/components/wizards/OnboardingWizard/StepFlowOverview.tsx
    - client/src/components/wizards/OnboardingWizard/StepGetStarted.tsx
    - client/src/components/wizards/IdeaCreationWizard/IdeaCreationWizard.tsx
    - client/src/components/wizards/IdeaCreationWizard/StepInputType.tsx
    - client/src/components/wizards/IdeaCreationWizard/StepProvideInput.tsx
    - client/src/components/wizards/IdeaCreationWizard/StepConfirmation.tsx
  modified:
    - client/src/pages/Dashboard.tsx
    - client/src/pages/IdeaPool.tsx
    - client/src/i18n/locales/en.json
    - client/src/i18n/locales/de.json

key-decisions:
  - "OnboardingWizard uses early-return pattern in Dashboard (full-page overlay, not modal)"
  - "IdeaCreationWizard shows for all modes (simple + expert) with Guided Create button in header"
  - "Voice input embeds existing VoiceRecorder component; GitHub input calls /api/github/analyze"
  - "No onCancel for onboarding (users must complete once); cancel available for idea wizard"

patterns-established:
  - "localStorage-based one-time wizard: useOnboarding hook pattern"
  - "Wizard overlay via conditional early return before page JSX"

# Metrics
duration: 6min
completed: 2026-02-10
---

# Phase 17 Plan 04: Onboarding + Idea Creation Wizards Summary

**3-step onboarding wizard for first-time Dashboard visitors and 3-step guided idea creation wizard for IdeaPool, both using WizardShell with full DE/EN i18n**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-10T14:52:19Z
- **Completed:** 2026-02-10T14:58:43Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- OnboardingWizard (Welcome -> How It Works -> Get Started) shows for first-time Dashboard visitors, with localStorage-based completion flag preventing re-display
- IdeaCreationWizard (Input Type -> Provide Input -> Confirm) available via "Guided Create" button on IdeaPool, supporting text, voice (VoiceRecorder), and GitHub URL input
- All wizard text i18n'd with wizard.onboarding.* and wizard.idea.* keys in both EN and DE
- Both wizards use WizardShell from Plan 01 for consistent styling and step navigation

## Task Commits

Each task was committed atomically:

1. **Task 1: Build OnboardingWizard with useOnboarding hook and Dashboard integration** - `58df18a` (feat)
2. **Task 2: Build IdeaCreationWizard and integrate into IdeaPool page** - `19b7c07` (feat)

## Files Created/Modified
- `client/src/hooks/useOnboarding.ts` - localStorage-based first-visit detection hook
- `client/src/components/wizards/OnboardingWizard/OnboardingWizard.tsx` - 3-step onboarding wizard shell
- `client/src/components/wizards/OnboardingWizard/StepWelcome.tsx` - Welcome step with title and description
- `client/src/components/wizards/OnboardingWizard/StepFlowOverview.tsx` - Visual 3-stage flow explanation with numbered cards
- `client/src/components/wizards/OnboardingWizard/StepGetStarted.tsx` - Action selection: Create Idea or Explore Dashboard
- `client/src/components/wizards/IdeaCreationWizard/IdeaCreationWizard.tsx` - 3-step idea creation wizard shell
- `client/src/components/wizards/IdeaCreationWizard/StepInputType.tsx` - Input type selection cards (text/voice/GitHub)
- `client/src/components/wizards/IdeaCreationWizard/StepProvideInput.tsx` - Dynamic input (textarea/VoiceRecorder/URL)
- `client/src/components/wizards/IdeaCreationWizard/StepConfirmation.tsx` - Review with type badge and Create button
- `client/src/pages/Dashboard.tsx` - Added onboarding wizard overlay for first-time users
- `client/src/pages/IdeaPool.tsx` - Added "Guided Create" button and wizard overlay
- `client/src/i18n/locales/en.json` - Added wizard.onboarding.* and wizard.idea.* keys
- `client/src/i18n/locales/de.json` - Added wizard.onboarding.* and wizard.idea.* keys

## Decisions Made
- OnboardingWizard uses early-return pattern in Dashboard (full-page overlay, not modal) -- consistent with Setup.tsx pattern
- IdeaCreationWizard available in both Simple and Expert modes -- no mode gating for guided workflows
- Voice input embeds existing VoiceRecorder with same props as IdeaPool usage
- GitHub input calls /api/github/analyze endpoint (same as existing GitHubAnalyze component)
- No onCancel for onboarding wizard (users must go through it once); cancel button available for idea creation wizard

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- WIZ-01 (onboarding wizard) and WIZ-02 (idea creation wizard) verification gaps are now closed
- Plan 05 (quality gate wizard) can proceed independently
- All wizard infrastructure (WizardShell, step indicators, types) from Plan 01 remains stable

## Self-Check: PASSED

All 9 created files verified present. Both task commits (58df18a, 19b7c07) verified in git log.

---
*Phase: 17-guided-wizards*
*Completed: 2026-02-10*
