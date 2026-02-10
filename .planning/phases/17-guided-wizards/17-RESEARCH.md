# Phase 17: Guided Wizards - Research

**Researched:** 2026-02-10
**Domain:** Multi-step wizard UI patterns, quality gates, progress tracking in React + Express event-sourced SPA
**Confidence:** HIGH

## Summary

Phase 17 introduces guided wizard flows for three major user journeys (onboarding, idea creation, idea-to-project conversion) and enforces quality gates that prevent project creation without completing mandatory GSD questions. The codebase already has two mature wizard-like systems: the `Setup.tsx` page (3-step linear wizard with step indicator, back/next navigation, and inline `React.CSSProperties` styling) and the `WorkflowEngine` (server-authoritative step definitions with 5 step types, `StepProgress` dot indicator, conditional branching, and event-sourced state). The project's out-of-scope note explicitly says "react-use-wizard library (existing Setup.tsx wizard pattern reusable)" -- meaning the implementation should build on the existing Setup.tsx pattern rather than introducing a third-party wizard library.

The key architectural challenge is that the existing `WorkflowEngine` is tightly coupled to projects (it requires a `projectId` and fetches workflow state from the JSONL event store). The new wizards (onboarding, idea creation) operate *before* a project exists. This means either: (A) extracting a standalone wizard container from Setup.tsx's pattern (step state managed in React `useState`, no server persistence needed for short-lived wizards), or (B) extending WorkflowEngine to support non-project contexts. Option A is simpler and aligned with the Setup.tsx reuse directive.

The quality gate requirements (GATE-01 through GATE-04) require server-side enforcement: the project creation API (`POST /api/projects`) and the idea graduation flow must check that all mandatory GSD questions are answered before allowing the operation. Currently, project creation has no such validation -- it only requires a name and description via Zod schema.

**Primary recommendation:** Build a reusable `WizardShell` component extracted from Setup.tsx's pattern (step indicator, back/next, step container with key-based transitions). Use it for all three wizard flows. Implement quality gates as server-side middleware on project creation and idea graduation endpoints. Define GSD mandatory questions as a configuration constant shared between client and server.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x | Wizard UI components | Already in project |
| react-router-dom | 7.x | Wizard page routing | Already in project |
| react-i18next | 15.x | All wizard text through i18n | Already in project, mandatory per CLAUDE.md |
| Zod | 3.x | Server-side quality gate validation | Already used for all API validation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-markdown | 10.x | Rendering AI-generated content in wizard steps | Already installed, used in IdeaRefinement |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom WizardShell from Setup.tsx | react-use-wizard | Out of scope per project decision. Custom is simpler, no dependency, matches existing styling |
| Custom WizardShell from Setup.tsx | react-step-wizard | Same as above -- existing pattern sufficient, no need for external dependency |
| useState-based wizard state | WorkflowEngine server state | WorkflowEngine requires projectId and server persistence -- overkill for short-lived onboarding and idea creation wizards |
| Client-side quality gates only | Server + client enforcement | Client-side only is bypassable. Server enforcement is required for GATE-01 through GATE-04 |

**Installation:**
```bash
# No new packages needed -- all dependencies already exist in the project
```

## Architecture Patterns

### Recommended Project Structure

```
client/src/
  components/
    wizards/
      WizardShell.tsx            # Reusable wizard container (extracted from Setup.tsx pattern)
      WizardStepIndicator.tsx    # Step circles + lines (extracted from Setup.tsx)
      OnboardingWizard/
        OnboardingWizard.tsx     # WIZ-01: First-use onboarding
        StepWelcome.tsx          # Welcome + flow explanation
        StepFlowOverview.tsx     # Idea -> Project -> Execution visual
        StepGetStarted.tsx       # Choose first action
      IdeaCreationWizard/
        IdeaCreationWizard.tsx   # WIZ-02: Guided idea creation
        StepInputType.tsx        # Choose text/voice/GitHub
        StepProvideInput.tsx     # Input entry based on type
        StepProcessing.tsx       # AI processing display
        StepConfirmation.tsx     # Idea landed in pool
      IdeaToProjectWizard/
        IdeaToProjectWizard.tsx  # WIZ-03/WIZ-04: GSD questioning wizard
        StepQuestion.tsx         # Single GSD question per screen
        StepProgress.tsx         # Question progress indicator
        StepProjectReady.tsx     # All questions answered, create project
    QualityGateIndicator.tsx     # GATE-04: Progress indicator for question completion

server/src/
  workflow/
    gsd-questions.ts             # GSD mandatory question definitions (shared config)
  middleware/
    quality-gate.ts              # GATE-01/02: Server-side validation middleware

shared/types/
  wizard.ts                      # Wizard-related shared types (GSD question list, gate status)
```

### Pattern 1: Reusable WizardShell (Extracted from Setup.tsx)

**What:** A generic wizard container that manages step state, renders a step indicator, and provides back/next navigation. Each wizard defines its own steps as React components with `onComplete` callbacks.

**When to use:** All three wizard flows (onboarding, idea creation, idea-to-project).

**Example:**
```typescript
// Source: Extracted from client/src/pages/Setup.tsx pattern
interface WizardStep {
  id: string;
  labelKey: string;  // i18n key for step label
  component: React.ComponentType<WizardStepProps>;
}

interface WizardStepProps {
  onComplete: (data?: Record<string, unknown>) => void;
  onBack?: () => void;
  wizardData: Record<string, unknown>;  // Accumulated data from previous steps
}

interface WizardShellProps {
  steps: WizardStep[];
  onComplete: (allData: Record<string, unknown>) => void;
  onCancel?: () => void;
  titleKey?: string;
}

function WizardShell({ steps, onComplete, onCancel, titleKey }: WizardShellProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<Record<string, unknown>>({});
  const { t } = useTranslation();

  const goNext = useCallback((stepData?: Record<string, unknown>) => {
    const newData = { ...wizardData, ...stepData };
    setWizardData(newData);

    if (currentStep === steps.length - 1) {
      onComplete(newData);
    } else {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, steps.length, wizardData, onComplete]);

  const goBack = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, []);

  const StepComponent = steps[currentStep].component;

  return (
    <div style={styles.container}>
      {titleKey && <h2 style={styles.title}>{t(titleKey)}</h2>}
      <WizardStepIndicator
        steps={steps}
        currentIndex={currentStep}
      />
      <div key={steps[currentStep].id} style={styles.stepContent}>
        <StepComponent
          onComplete={goNext}
          onBack={currentStep > 0 ? goBack : undefined}
          wizardData={wizardData}
        />
      </div>
      {onCancel && (
        <button type="button" onClick={onCancel} style={styles.cancelLink}>
          {t("common.cancel")}
        </button>
      )}
    </div>
  );
}
```

### Pattern 2: Quality Gate Server Middleware

**What:** Server-side validation that checks whether all mandatory GSD questions have been answered before allowing project creation or idea graduation. Returns a structured error response with which questions are missing.

**When to use:** On `POST /api/projects` (direct project creation) and on idea graduation endpoints.

**Example:**
```typescript
// Source: Pattern derived from existing Zod validation middleware in server/src/middleware/validate.ts
// and existing workflow step required-checking in server/src/events/reducers/workflow.ts

interface GsdQuestionStatus {
  questionId: string;
  questionKey: string;  // i18n key
  answered: boolean;
  answer?: string;
}

interface QualityGateResult {
  passed: boolean;
  questions: GsdQuestionStatus[];
  answeredCount: number;
  totalRequired: number;
}

// Server-side: check before creating project from idea
async function checkQualityGate(ideaId: string): Promise<QualityGateResult> {
  const questions = getMandatoryGsdQuestions();
  const answers = await getGsdAnswersForIdea(ideaId);

  const statuses = questions.map((q) => ({
    questionId: q.id,
    questionKey: q.labelKey,
    answered: !!answers[q.id],
    answer: answers[q.id]?.toString(),
  }));

  return {
    passed: statuses.every((s) => s.answered),
    questions: statuses,
    answeredCount: statuses.filter((s) => s.answered).length,
    totalRequired: statuses.length,
  };
}
```

### Pattern 3: GSD Question-Per-Screen Wizard (WIZ-03)

**What:** The idea-to-project wizard presents GSD deep questions one at a time with clear action buttons, progress indication, and explanation text. This is the most complex wizard and the core of the quality gate system.

**When to use:** When converting an idea to a project (via idea graduation or direct project creation).

**Example:**
```typescript
// Renders one GSD question at a time with progress bar
// Similar to how WorkflowEngine renders steps, but standalone without project binding

interface GsdQuestion {
  id: string;
  titleKey: string;
  descriptionKey: string;
  type: "text" | "choice" | "ai_guided";
  required: boolean;
  options?: { value: string; labelKey: string }[];
  validation?: { minLength?: number; maxLength?: number };
}

function StepQuestion({
  question,
  onAnswer,
  onBack,
  currentIndex,
  totalQuestions,
}: {
  question: GsdQuestion;
  onAnswer: (answer: unknown) => void;
  onBack?: () => void;
  currentIndex: number;
  totalQuestions: number;
}) {
  const { t } = useTranslation();

  return (
    <div style={styles.questionCard}>
      {/* Progress indicator (GATE-04) */}
      <div style={styles.progressHeader}>
        <span>{t("wizard.question_of", {
          current: String(currentIndex + 1),
          total: String(totalQuestions),
        })}</span>
        <div style={styles.progressBar}>
          <div style={{
            ...styles.progressFill,
            width: `${((currentIndex) / totalQuestions) * 100}%`,
          }} />
        </div>
      </div>

      {/* Question content */}
      <h3 style={styles.questionTitle}>{t(question.titleKey)}</h3>
      <p style={styles.questionDescription}>{t(question.descriptionKey)}</p>

      {/* Input based on type */}
      {question.type === "text" && <TextInputArea ... />}
      {question.type === "choice" && <ChoiceButtons ... />}

      {/* Navigation */}
      <div style={styles.navigation}>
        {onBack && (
          <button type="button" onClick={onBack}>{t("common.back")}</button>
        )}
        <button type="button" onClick={() => onAnswer(answer)}>
          {t("common.next")}
        </button>
      </div>
    </div>
  );
}
```

### Pattern 4: Onboarding Trigger Detection

**What:** Detecting first-time users to trigger the onboarding wizard. Uses localStorage to track whether onboarding has been completed.

**When to use:** On first login after initial setup.

**Example:**
```typescript
// In Dashboard or a wrapper component
const ONBOARDING_KEY = "eluma-onboarding-completed";

function useOnboardingCheck(): { showOnboarding: boolean; completeOnboarding: () => void } {
  const [show, setShow] = useState(() => {
    return !localStorage.getItem(ONBOARDING_KEY);
  });

  const complete = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setShow(false);
  }, []);

  return { showOnboarding: show, completeOnboarding: complete };
}
```

### Anti-Patterns to Avoid

- **Third-party wizard libraries:** `react-use-wizard`, `react-step-wizard` -- explicitly out of scope. The Setup.tsx pattern provides everything needed.
- **Extending WorkflowEngine for non-project wizards:** The WorkflowEngine is project-scoped (requires projectId, persists to JSONL store, tied to lifecycle phases). Onboarding and idea creation wizards are ephemeral -- they do not need server persistence. Forcing them into WorkflowEngine would add unnecessary complexity.
- **Client-only quality gates:** Checking mandatory questions only in the browser is trivially bypassable. GATE-01 and GATE-02 must have server-side enforcement.
- **Hardcoded wizard text:** Every string in every wizard must use i18n keys. This is a CLAUDE.md mandate -- "Every user-facing string must go through the i18n system."
- **Separate Simple/Expert wizard UIs:** Building two separate wizard flows doubles maintenance. Use the same wizard in both modes. In Expert mode, show additional detail/explanation text per step.
- **Wizard-for-everything:** Only use wizards for the three specified flows (onboarding, idea creation, idea-to-project). Do not add wizards to existing flows that already work (project editing, settings, etc.).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Step indicator UI | New step indicator component from scratch | Extract from existing Setup.tsx (lines 47-81) | Setup.tsx already has a working, styled step indicator with completed/active/future states |
| Step progress dots | New dots component from scratch | Reuse existing `StepProgress` component for workflow steps, or adapt Setup.tsx circles for standalone wizards | Two patterns already exist in the codebase |
| Wizard state management | Custom state machine library or XState | React `useState` + `useCallback` (same pattern as Setup.tsx) | Ephemeral wizard state does not need a state machine. The wizard is 3-5 steps with linear progression. |
| Quality gate validation | Custom validation logic for each endpoint | Zod schema extension on existing `createProjectSchema` + shared `MANDATORY_GSD_QUESTIONS` constant | Zod validation middleware already exists in every route |
| i18n key management | Manual JSON editing | Follow existing pattern in `client/src/i18n/locales/{de,en}.json` with nested namespaces | Project mandate: both files updated in same commit |

**Key insight:** The codebase already has all the building blocks. The task is composition (combining existing patterns into new wizard flows), not invention. The Setup.tsx wizard pattern, the WorkflowEngine step types, the StepProgress indicator, and the i18n infrastructure are all mature and tested. The only genuinely new work is: (1) the WizardShell extraction/generalization, (2) the GSD mandatory questions definition, (3) the server-side quality gate middleware, and (4) the onboarding trigger detection.

## Common Pitfalls

### Pitfall 1: Wizard State Lost on Browser Back Button

**What goes wrong:** User presses the browser's back button during a wizard, losing all entered data and seeing the previous page instead of the previous wizard step.
**Why it happens:** React state is ephemeral. Browser navigation operates on the URL history, not React component state. The Setup.tsx wizard does not use URL-based step tracking.
**How to avoid:** Two approaches: (A) Accept this limitation for short wizards (3-5 steps) and show a "Cancel" confirmation dialog. (B) For the longer idea-to-project wizard, store wizard progress in `localStorage` with a session key and restore on re-entry. Approach A is recommended for WIZ-01 and WIZ-02 (short); Approach B for WIZ-03 (longer, more data entry).
**Warning signs:** User complaints about lost data. High wizard abandonment rates.

### Pitfall 2: Quality Gate Check Race Condition

**What goes wrong:** User completes the last GSD question and clicks "Create Project" before the server has processed the final answer. The quality gate check sees the answer as missing and rejects the request.
**Why it happens:** If GSD answers are saved asynchronously (e.g., event-sourced with eventual consistency), the gate check may read stale state.
**How to avoid:** Use synchronous answer persistence. When the user answers the final question, the client sends the answer, waits for server confirmation, then sends the "create project" request. Alternatively, include all GSD answers in the project creation payload itself (single atomic operation).
**Warning signs:** Intermittent "not all questions answered" errors after the user completed all questions.

### Pitfall 3: i18n Key Explosion

**What goes wrong:** Three wizards with 3-5 steps each, each step with title, description, placeholder, button labels, error messages, and help text -- easily 100+ new i18n keys. Without structure, the translation files become unmanageable.
**Why it happens:** Each wizard step needs at least 3-4 translated strings. The GSD questions alone need title + description + placeholder for each.
**How to avoid:** Use a consistent namespace hierarchy: `wizard.onboarding.step1_title`, `wizard.idea.input_type_title`, `wizard.gsd.q1_title`. Define a naming convention before writing any keys. Add all keys for both languages in the same commit (CLAUDE.md mandate).
**Warning signs:** Duplicate i18n keys, inconsistent naming, missing DE or EN translations.

### Pitfall 4: Onboarding Wizard Blocks Returning Users

**What goes wrong:** The onboarding wizard triggers every time a user logs in because the completion state was lost (localStorage cleared, different browser, incognito mode).
**Why it happens:** Relying solely on localStorage for onboarding completion state.
**How to avoid:** Use a dual approach: (1) localStorage for immediate detection, (2) a server-side flag (e.g., a system event `user.onboarding_completed`) as the source of truth. Check server state on login and sync to localStorage.
**Warning signs:** Users reporting "I already did this" when seeing the onboarding wizard again.

### Pitfall 5: Mode-Aware Wizards Creating Dual Maintenance Burden

**What goes wrong:** Building separate Simple and Expert wizard experiences that diverge over time.
**Why it happens:** The temptation to show different content in Simple vs Expert mode (Pitfall 6 from PITFALLS.md research).
**How to avoid:** Use a SINGLE wizard flow for both modes. In Expert mode, show additional explanation text (the `descriptionKey` rendering) and optional advanced options. In Simple mode, hide the description and show only the title and primary action. Use `useMode().isExpert` for conditional rendering within the same component tree.
**Warning signs:** Components with `if (isSimple) { return <SimpleWizard /> } else { return <ExpertWizard /> }`.

## Code Examples

Verified patterns from existing codebase:

### Setup.tsx Step Indicator (Source of Truth for WizardStepIndicator)
```typescript
// Source: client/src/pages/Setup.tsx lines 47-81
// This is the exact pattern to extract into WizardStepIndicator.tsx
{Array.from({ length: TOTAL_STEPS }, (_, i) => {
  const stepNum = i + 1;
  const isActive = stepNum === currentStep;
  const isCompleted = stepNum < currentStep;
  return (
    <div key={stepNum} style={styles.stepItem}>
      <div style={{
        ...styles.stepCircle,
        backgroundColor: isActive ? "#2563eb"
          : isCompleted ? "#22c55e" : "#e5e7eb",
        color: isActive || isCompleted ? "#ffffff" : "#9ca3af",
      }}>
        {isCompleted ? "\u2713" : stepNum}
      </div>
      <span style={{
        ...styles.stepLabel,
        color: isActive ? "#2563eb" : "#9ca3af",
        fontWeight: isActive ? 600 : 400,
      }}>
        {stepLabels[i]}
      </span>
      {i < TOTAL_STEPS - 1 && <div style={styles.stepLine} />}
    </div>
  );
})}
```

### Workflow StepProgress Dots (Reference for GSD Question Progress)
```typescript
// Source: client/src/components/workflow/StepProgress.tsx
// This component shows dot-based progress for workflow steps
// Adapt this for GSD question progress indicator (GATE-04)
<div style={styles.dotsRow}>
  {steps.map((step) => {
    const isCompleted = completedStepIds.includes(step.id);
    const isCurrent = step.id === currentStepId;
    let dotStyle = isCompleted ? styles.dotCompleted
      : isCurrent ? styles.dotCurrent : styles.dotFuture;
    return <div key={step.id} style={dotStyle} title={t(step.titleKey)} />;
  })}
</div>
<p style={styles.label}>
  {t("workflow.step_of", { current: String(currentNumber), total: String(steps.length) })}
</p>
```

### Existing Project Creation (Where Quality Gate Must Be Added)
```typescript
// Source: server/src/routes/projects.ts lines 33-42
// Current validation -- NO quality gate check
const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(2000),
  members: z.array(z.string()).optional().default([]),
});

// Quality gate addition: extend schema or add middleware that checks
// GSD question answers before allowing project creation
```

### Mode-Aware Rendering Pattern (For Wizard Steps)
```typescript
// Source: client/src/App.tsx lines 82-117
// Same pattern for showing/hiding wizard details by mode
const { isExpert } = useMode();

{/* Always shown: question title and primary action */}
<h3>{t(question.titleKey)}</h3>
<ActionButton />

{/* Expert-only: additional context and explanation */}
{isExpert && <p style={styles.description}>{t(question.descriptionKey)}</p>}
{isExpert && <HelpText />}
```

### i18n Pattern for Wizard Keys
```typescript
// Source: client/src/i18n/locales/en.json, workflow namespace (lines 293-350)
// Follow this exact nesting pattern for wizard keys
{
  "wizard": {
    "onboarding": {
      "welcome_title": "Welcome to Eluma",
      "welcome_desc": "Let us show you how Eluma works...",
      "flow_title": "How Eluma Works",
      "flow_step1": "Capture ideas by voice, text, or GitHub link",
      "flow_step2": "Answer guided questions to refine your idea",
      "flow_step3": "Graduate ideas into structured projects",
      "get_started": "Get Started"
    },
    "idea": {
      "input_type_title": "How would you like to add your idea?",
      "input_text": "Type it out",
      "input_voice": "Record by voice",
      "input_github": "Analyze a GitHub repo"
    },
    "gsd": {
      "intro_title": "Let's define your project",
      "intro_desc": "Answer these questions to turn your idea into a well-defined project.",
      "progress": "{{answered}} of {{total}} questions answered",
      "gate_blocked": "All questions must be answered before creating a project",
      "project_ready": "Your project is ready to be created!"
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Third-party wizard libraries (react-use-wizard, react-step-wizard) | Custom lightweight wizards with React hooks | 2024-2025 | Libraries add dependencies for a simple pattern. Modern React (hooks, context) makes custom wizards trivial. Project already chose this direction. |
| Client-only form validation | Server + client validation (Zod schemas) | Standard practice | Quality gates MUST be server-enforced. Zod already used throughout the project. |
| Multi-page wizards with URL-per-step | Single-page wizard with React state | Current | Simpler, no routing complexity, works within existing page structure. Acceptable for 3-5 step wizards. |

**Deprecated/outdated:**
- `react-use-wizard`: Functional but unnecessary for this project. Explicitly excluded per out-of-scope decision.
- Modal-based wizards: Poor mobile UX, accessibility issues. Full-page or inline wizard is preferred.

## Open Questions

1. **GSD Mandatory Questions Definition**
   - What we know: The existing workflow definitions (`server/src/workflow/definitions.ts`) define 8 phases of questions (idea, feasibility, effort_estimate, roi_kpi_initial, risks_dependencies, decision_point, implementation, review_extraction). Each phase has 3-5 steps with `required: true/false`.
   - What's unclear: Which specific questions constitute the "mandatory GSD deep questions" for GATE-01/GATE-02? Is it the full set of `required: true` steps from phases 1-5 (pre-decision-point)? Or a subset specifically designed for the idea-to-project conversion?
   - Recommendation: Define a new `MANDATORY_GSD_QUESTIONS` constant that references a curated subset of the most important questions from the idea/feasibility/effort phases. These are the minimum questions needed before a project can be created. The full workflow steps continue to exist within the project lifecycle after creation.

2. **Idea-to-Project Flow Integration**
   - What we know: Currently, ideas graduate to projects via the `IdeaGraduation` component (propose -> vote -> auto-create project). The project creation happens server-side when all votes approve. Direct project creation uses `POST /api/projects` with name + description only.
   - What's unclear: Should the GSD questioning wizard be injected into the existing graduation flow (between "ready" and "graduated" status), or should it be a separate flow triggered from the idea detail view?
   - Recommendation: Inject the wizard between "propose graduation" and actual project creation. When a user proposes graduation, they must first complete the GSD questions. The vote then happens on a fully defined idea (with GSD answers attached). This provides the quality gate naturally.

3. **Onboarding Wizard Trigger Timing**
   - What we know: The app already detects first launch via `/api/system/status` (checks `setupComplete` and `hasUsers`) and redirects to `/setup` for the initial Setup wizard (account + team + system).
   - What's unclear: Should the onboarding wizard (WIZ-01: explaining Idea -> Project -> Execution flow) trigger after the existing Setup wizard completes, or on the first visit to the Dashboard after setup?
   - Recommendation: Trigger on the first Dashboard visit after setup completion. Use localStorage + server-side flag to track completion. This separates system setup (technical) from user onboarding (conceptual).

4. **Voice Input in Idea Creation Wizard**
   - What we know: `VoiceRecorder` component exists and works in the IdeaPool page. It handles transcription and routing suggestions.
   - What's unclear: Should the VoiceRecorder be embedded directly in the wizard's "provide input" step, or should the wizard link to the existing IdeaPool voice flow?
   - Recommendation: Embed `VoiceRecorder` directly in the wizard step for a seamless experience. The component is already self-contained and accepts an `onTranscription` callback.

## Existing Codebase Inventory (Phase 17-Relevant)

### Components to Reuse Directly
| Component | Location | Reuse Strategy |
|-----------|----------|---------------|
| Setup.tsx step indicator | `client/src/pages/Setup.tsx` lines 47-81, 101-154 | Extract into `WizardStepIndicator.tsx` |
| StepProgress dots | `client/src/components/workflow/StepProgress.tsx` | Use for GSD question progress display |
| StepButton | `client/src/components/workflow/StepButton.tsx` | Use for choice-based wizard steps |
| StepTextInput | `client/src/components/workflow/StepTextInput.tsx` | Use for text input wizard steps |
| StepInfoDisplay | `client/src/components/workflow/StepInfoDisplay.tsx` | Use for informational wizard steps |
| VoiceRecorder | `client/src/components/VoiceRecorder.tsx` | Embed in idea creation wizard |
| GitHubFork | `client/src/components/GitHubFork.tsx` | Embed in idea creation wizard (GitHub input type) |
| ModeToggle / useMode | `client/src/hooks/useMode.ts` | Mode-aware rendering in all wizards |

### Server-Side Components to Extend
| Component | Location | Extension Needed |
|-----------|----------|-----------------|
| Project creation route | `server/src/routes/projects.ts` | Add quality gate middleware |
| Workflow definitions | `server/src/workflow/definitions.ts` | Reference for GSD question definitions |
| Idea graduation flow | Server-side idea routes | Add quality gate check before graduation |
| Zod validation middleware | `server/src/middleware/validate.ts` | Pattern for quality gate middleware |

### i18n Files to Update
| File | Location | Changes |
|------|----------|---------|
| English translations | `client/src/i18n/locales/en.json` | Add `wizard.*` namespace (~80-100 keys) |
| German translations | `client/src/i18n/locales/de.json` | Add `wizard.*` namespace (~80-100 keys) |

## Sources

### Primary (HIGH confidence)
- Existing codebase: `client/src/pages/Setup.tsx` -- Working 3-step wizard with step indicator (line 1-155)
- Existing codebase: `client/src/components/workflow/WorkflowEngine.tsx` -- Server-driven step orchestration (line 1-216)
- Existing codebase: `shared/types/workflow.ts` -- WorkflowStepDef, WorkflowState, StepType definitions (line 1-125)
- Existing codebase: `server/src/workflow/definitions.ts` -- 8 phases of GSD step definitions (line 1-568)
- Existing codebase: `server/src/workflow/engine.ts` -- Step completion, phase advancement, quality checking (line 1-448)
- Existing codebase: `client/src/hooks/useMode.ts` -- Mode context provider (line 1-78)
- Existing codebase: `client/src/components/workflow/StepProgress.tsx` -- Dot-based step progress (line 1-103)
- Existing codebase: `client/src/pages/IdeaPool.tsx` -- Current idea creation flow (line 1-573)
- Existing codebase: `client/src/components/IdeaGraduation.tsx` -- Current idea graduation flow (line 1-314)
- Existing codebase: `server/src/routes/projects.ts` -- Current project creation endpoint (line 33-135)
- Existing codebase: `client/src/App.tsx` -- Route structure, AppLayout, mode-aware nav (line 1-433)

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` -- System architecture overview, component boundaries
- `.planning/research/FEATURES.md` -- Feature landscape including wizard recommendations
- `.planning/research/PITFALLS.md` -- Pitfall 6: Simple/Expert mode creating dual-UI burden

### Tertiary (LOW confidence)
- Wizard UX best practices (general industry knowledge): Cap at 5 steps, always show cancel, progress indicator, one action per screen

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new libraries needed. All building blocks exist in the codebase.
- Architecture: HIGH -- Pattern extracted directly from existing Setup.tsx and WorkflowEngine. Well-understood component boundaries.
- Pitfalls: HIGH -- Quality gate race conditions and i18n explosion are well-documented patterns. Mode duplication pitfall already researched in PITFALLS.md.
- GSD question definition: MEDIUM -- Exact question set needs design decision (which questions are mandatory for project creation vs. which are full lifecycle questions).
- Onboarding trigger: MEDIUM -- localStorage + server flag dual approach is sound but integration with existing Setup flow needs careful sequencing.

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable domain, no external dependencies to change)
