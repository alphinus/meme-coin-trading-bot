---
phase: 17-guided-wizards
plan: 01
subsystem: ui, api
tags: [react, wizard, quality-gate, i18n, middleware, typescript]

# Dependency graph
requires:
  - phase: 05-gsd-workflow-engine
    provides: Workflow step definitions (definitions.ts) with phase/step IDs
  - phase: 06-voice-idea-pool
    provides: Idea graduation flow and idea routes
  - phase: 01-foundation
    provides: Express route patterns, event store, project routes
provides:
  - WizardShell reusable container component with step navigation and data accumulation
  - WizardStepIndicator with completed/active/future step states
  - Shared wizard types (WizardStep, WizardStepProps, GsdMandatoryQuestion, QualityGateResult)
  - MANDATORY_GSD_QUESTIONS constant with 6 curated pre-decision-point questions
  - Quality gate middleware (checkQualityGate) for project creation and idea graduation
  - Quality gate enforcement on POST /api/projects (GATE-02) and POST /api/ideas/:id/graduate (GATE-01)
  - Wizard i18n foundation keys in both EN and DE
affects: [17-02-onboarding-wizard, 17-03-idea-to-project-wizard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "WizardShell container pattern: step state + data accumulation + back/next navigation"
    - "Quality gate middleware pattern: checkQualityGate(source, sourceId, gsdAnswers) returns QualityGateResult"
    - "gsdAnswers record pattern: Record<string, string> keyed by question ID for gate validation"

key-files:
  created:
    - client/src/components/wizards/WizardShell.tsx
    - client/src/components/wizards/WizardStepIndicator.tsx
    - shared/types/wizard.ts
    - server/src/workflow/gsd-questions.ts
    - server/src/middleware/quality-gate.ts
  modified:
    - server/src/routes/projects.ts
    - server/src/routes/ideas.ts
    - client/src/i18n/locales/en.json
    - client/src/i18n/locales/de.json

key-decisions:
  - "shared/types/wizard.ts uses `any` for WizardStep.component (no React import in shared/)"
  - "Quality gate uses pragmatic gsdAnswers Record<string, string> approach instead of event-based lookup"
  - "6 mandatory questions selected from phases 1-3: idea_describe, idea_problem, idea_target, feas_technical, feas_resources, effort_scope"
  - "WizardShell uses useLanguage() hook (project convention) not useTranslation() directly"
  - "Quality gate returns 400 with full QualityGateResult details (not just boolean)"

patterns-established:
  - "WizardShell: generic wizard container accepting WizardStep[] with step indicator + content + cancel"
  - "Quality gate enforcement: same gate logic for both direct project creation and idea graduation (GATE-03)"
  - "wizard.* i18n namespace for all wizard-related strings"

# Metrics
duration: 4min
completed: 2026-02-10
---

# Phase 17 Plan 01: Wizard Foundation Summary

**Reusable WizardShell component with step indicator, shared wizard types, 6-question quality gate middleware enforcing GSD answers on project creation and idea graduation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-10T13:06:44Z
- **Completed:** 2026-02-10T13:11:30Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- WizardShell renders step indicator, navigates between steps, accumulates data, and calls onComplete
- WizardStepIndicator shows completed/active/future step circles with i18n labels (extracted from Setup.tsx pattern)
- Shared types exported for use by all wizard implementations (WizardStep, WizardStepProps, GsdMandatoryQuestion, QualityGateResult)
- MANDATORY_GSD_QUESTIONS defines 6 curated pre-decision-point questions from phases 1-3
- Quality gate middleware blocks project creation and idea graduation when mandatory questions are unanswered
- All new strings use i18n keys in both DE and EN with wizard.* namespace

## Task Commits

Each task was committed atomically:

1. **Task 1: Create WizardShell, WizardStepIndicator, and shared wizard types** - `58c48bf` (feat)
2. **Task 2: Define GSD mandatory questions and create quality gate middleware** - `1b0909d` (feat)

## Files Created/Modified
- `shared/types/wizard.ts` - WizardStep, WizardStepProps, GsdMandatoryQuestion, QualityGateResult types
- `client/src/components/wizards/WizardShell.tsx` - Reusable wizard container with step state, data accumulation, back/next/cancel
- `client/src/components/wizards/WizardStepIndicator.tsx` - Step circles with completed/active/future states
- `server/src/workflow/gsd-questions.ts` - MANDATORY_GSD_QUESTIONS array and getMandatoryGsdQuestions() function
- `server/src/middleware/quality-gate.ts` - checkQualityGate() function returning QualityGateResult
- `server/src/routes/projects.ts` - Added gsdAnswers to schema, quality gate check in POST handler
- `server/src/routes/ideas.ts` - Added quality gate check in graduation route
- `client/src/i18n/locales/en.json` - Added wizard.* and wizard.gate.* keys
- `client/src/i18n/locales/de.json` - Added wizard.* and wizard.gate.* keys

## Decisions Made
- Used `any` for WizardStep.component in shared types since React types are not available server-side (client narrows at usage site)
- Took pragmatic gsdAnswers Record<string, string> approach for quality gate rather than event-based lookup (simpler, Plan 03 wizard will collect and pass these)
- Selected 6 mandatory questions: 3 from idea phase (describe, problem, target), 2 from feasibility (technical, resources), 1 from effort (scope) -- skipping auto-advance, AI, and non-required steps
- Quality gate returns detailed QualityGateResult with per-question status for rich UI feedback
- WizardShell uses useLanguage() hook following Setup.tsx, IdeaPool, Dashboard pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- WizardShell foundation ready for Plan 02 (onboarding wizard) and Plan 03 (idea-to-project wizard)
- Quality gate middleware ready for Plan 03 GATE-01/GATE-02 enforcement
- Shared types ready for wizard step implementations

## Self-Check: PASSED

All created files verified on disk. Both task commits (58c48bf, 1b0909d) confirmed in git log. SUMMARY.md exists.

---
*Phase: 17-guided-wizards*
*Completed: 2026-02-10*
