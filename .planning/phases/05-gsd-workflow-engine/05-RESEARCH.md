# Phase 5: GSD Workflow Engine - Research

**Researched:** 2026-02-08
**Domain:** Web-based guided workflow engine, button-driven UI for structured project execution pipeline, state machine for phase progression
**Confidence:** HIGH

## Summary

Phase 5 transforms the existing 8-phase project lifecycle (already built in Phase 2) from a simple "fill form + click advance" flow into a structured, guided workflow engine. The key trigger is the "decision_point" phase (Phase 6 of the lifecycle): when a project receives a "Go" decision there, it automatically enters the GSD execution pipeline -- the implementation and review_extraction phases -- with rich, step-by-step guidance. The entire experience must be navigable through buttons, with freeform text fields appearing only when the workflow explicitly requires text input, and all internal state management (context resets, phase bookkeeping) happening invisibly.

The existing codebase already has all the foundational pieces: the `PROJECT_PHASES` array with strict sequential progression, the `project.phase_completed` / `project.phase_advanced` event pair with shared `correlationId`, the PhaseContent component with per-phase form fields, and the AI trigger engine that fires on phase transitions. What Phase 5 adds is a **workflow step definition layer** on top of the existing phase model -- each lifecycle phase gets broken down into guided steps, each step declares its input type (button choices, text input, or informational), and a workflow engine manages the progression through steps within a phase.

**Primary recommendation:** Build a workflow step definition system as a server-side configuration (no new npm dependencies needed) that defines sub-steps within each lifecycle phase. Each step specifies its interaction type (`button_choice`, `text_input`, `info_display`, `ai_prompt`). The client renders the appropriate UI component per step type. Phase transitions continue to use the existing `POST /api/projects/:id/advance` endpoint, while step progression within a phase uses a new lightweight endpoint. The decision_point phase's "Go" action triggers an automatic advance into implementation, which is the entry to the GSD pipeline.

## Standard Stack

### Core (No New Dependencies Needed)

Phase 5 requires **zero new npm packages**. The entire workflow engine is built on the existing stack:

| Existing Library | Version | Purpose in Phase 5 | Why Sufficient |
|---------|---------|---------|--------------|
| React | ^19.0.0 | Workflow step rendering, button components, conditional form display | Component composition handles all UI patterns needed |
| Express | ^4.21.0 | Workflow step API endpoints, step configuration serving | REST endpoints for step definitions and progression |
| Zod | ^3.24.0 | Validate step inputs, workflow configuration schemas | Already used for all API validation |
| react-router-dom | ^7.1.0 | No new routes needed, workflow renders within existing ProjectDetail | Existing routing is sufficient |

### Supporting (Already Installed, New Usage)

| Library | Version | Purpose in Phase 5 | When to Use |
|---------|---------|---------|-------------|
| `ai` (Vercel AI SDK) | ^6.0.77 | AI-guided steps within workflow (e.g., AI feasibility questions, risk analysis prompts) | Steps with `ai_prompt` type call existing `generateAiResponse` |
| `i18next` / `react-i18next` | installed | All step labels, button text, guidance text must be i18n-ready | Every workflow string |
| `react-markdown` | ^10.1.0 | Render AI-generated guidance within workflow steps | AI response display in workflow context |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom step definitions (JSON config) | XState state machine library | XState adds 15kb+ bundle, learning curve; our use case is a linear pipeline with optional branching, not a complex state graph |
| Server-side step config | Client-side step definitions | Server-side keeps the source of truth centralized, enables AI to query step context, and prevents UI manipulation |
| REST endpoints for step progression | WebSocket for real-time step updates | REST is simpler, aligns with existing architecture; polling or SSE (existing event feed pattern) handles real-time if needed |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure (New Files)

```
server/src/
  workflow/
    types.ts              # WorkflowStep, StepType, StepConfig, WorkflowState types
    definitions.ts        # Per-phase step definitions (the workflow "script")
    engine.ts             # Workflow progression logic, step completion, auto-advance
    context.ts            # Context management (invisible /clear equivalent, state cleanup)
  routes/
    workflow.ts           # API: GET steps, POST complete-step, GET current-step

client/src/
  components/
    workflow/
      WorkflowEngine.tsx  # Main workflow container: renders current step, manages progression
      StepButton.tsx      # Button choice step (Yes/No/Continue/option selections)
      StepTextInput.tsx   # Freeform text input step (only when workflow needs it)
      StepInfoDisplay.tsx # Informational step (guidance text, read-only, Continue button)
      StepAiPrompt.tsx    # AI-interactive step (shows AI question, captures response)
      StepProgress.tsx    # Visual progress indicator within current phase steps
  hooks/
    useWorkflow.ts        # Workflow state, current step, step completion, auto-advance

shared/types/
  workflow.ts             # Shared workflow types (StepType, WorkflowStepDef, etc.)
```

### Pattern 1: Workflow Step Definition System

**What:** Each lifecycle phase is decomposed into a sequence of guided steps. Each step has a type that determines how the UI renders it. Step definitions are a server-side configuration array that acts as the "script" for the workflow.

**When to use:** Every phase in the project lifecycle has a step definition. The decision_point phase has special handling (the "Go" button triggers automatic pipeline entry).

**Example:**
```typescript
// shared/types/workflow.ts
export type StepType =
  | "button_choice"   // Renders as clickable buttons (Yes/No, Go/No-Go, option list)
  | "text_input"      // Renders a text area (only when workflow needs freeform input)
  | "info_display"    // Renders guidance text with a Continue button
  | "ai_prompt"       // Renders AI-generated question, captures user response
  | "auto_advance";   // Invisible step: auto-advances to next phase

export interface WorkflowStepDef {
  id: string;                           // Unique step ID within the phase
  phase: ProjectPhase;                  // Which lifecycle phase this belongs to
  order: number;                        // Sequence within the phase (0-indexed)
  type: StepType;                       // How the UI renders this step
  titleKey: string;                     // i18n key for step title
  descriptionKey?: string;              // i18n key for step description/guidance
  options?: WorkflowOption[];           // For button_choice: the available options
  textConfig?: {                        // For text_input: field configuration
    placeholderKey: string;
    minLength?: number;
    maxLength?: number;
    fieldKey: string;                   // Where to store the response in phaseData
  };
  aiConfig?: {                          // For ai_prompt: AI generation configuration
    taskType: AiTaskType;
    promptTemplate: string;             // Template with {project_name}, {phase_data} placeholders
  };
  required: boolean;                    // Whether this step must be completed to advance
  nextStepCondition?: {                 // Conditional branching based on response
    field: string;                      // Which response field to check
    routes: Record<string, string>;     // value -> next stepId mapping
  };
}

export interface WorkflowOption {
  value: string;                        // The option value stored in step data
  labelKey: string;                     // i18n key for button label
  variant?: "primary" | "secondary" | "danger";  // Button styling hint
  description?: string;                 // Tooltip or sub-text
}

export interface WorkflowState {
  projectId: string;
  currentPhase: ProjectPhase;
  currentStepId: string;
  completedSteps: Record<string, WorkflowStepResult>;  // stepId -> result
  enteredPipeline: boolean;             // Whether project passed Decision Point with "Go"
  pipelineEnteredAt?: string;           // ISO timestamp
}

export interface WorkflowStepResult {
  stepId: string;
  type: StepType;
  response: Record<string, unknown>;    // The user's input/choice
  completedAt: string;
  completedBy: string;                  // userId
}
```

### Pattern 2: Decision Point as GSD Pipeline Gateway

**What:** The decision_point phase (lifecycle Phase 6) is the critical gateway. Its step definition includes a Go/No-Go button choice. Selecting "Go" triggers: (1) phase_completed event for decision_point, (2) phase_advanced event to implementation, (3) workflow state marked as `enteredPipeline: true`, and (4) the implementation phase's step sequence begins automatically.

**When to use:** Every project must pass through decision_point. The "Go" action is the ONLY way to enter the GSD execution pipeline.

**Example:**
```typescript
// server/src/workflow/definitions.ts (partial - decision_point phase)
const DECISION_POINT_STEPS: WorkflowStepDef[] = [
  {
    id: "dp_summary",
    phase: "decision_point",
    order: 0,
    type: "info_display",
    titleKey: "workflow.dp.summary_title",
    descriptionKey: "workflow.dp.summary_desc",
    required: true,
  },
  {
    id: "dp_go_nogo",
    phase: "decision_point",
    order: 1,
    type: "button_choice",
    titleKey: "workflow.dp.go_nogo_title",
    descriptionKey: "workflow.dp.go_nogo_desc",
    options: [
      { value: "go", labelKey: "workflow.dp.go", variant: "primary" },
      { value: "nogo", labelKey: "workflow.dp.nogo", variant: "danger" },
      { value: "defer", labelKey: "workflow.dp.defer", variant: "secondary" },
    ],
    required: true,
    nextStepCondition: {
      field: "decision",
      routes: {
        go: "dp_go_confirm",
        nogo: "dp_nogo_rationale",
        defer: "dp_defer_reason",
      },
    },
  },
  {
    id: "dp_go_confirm",
    phase: "decision_point",
    order: 2,
    type: "button_choice",
    titleKey: "workflow.dp.go_confirm_title",
    descriptionKey: "workflow.dp.go_confirm_desc",
    options: [
      { value: "confirm", labelKey: "workflow.dp.confirm_go", variant: "primary" },
      { value: "back", labelKey: "workflow.dp.go_back", variant: "secondary" },
    ],
    required: true,
  },
  {
    id: "dp_nogo_rationale",
    phase: "decision_point",
    order: 3,
    type: "text_input",
    titleKey: "workflow.dp.nogo_rationale_title",
    textConfig: {
      placeholderKey: "workflow.dp.nogo_rationale_placeholder",
      minLength: 10,
      fieldKey: "nogo_rationale",
    },
    required: true,
  },
];
```

### Pattern 3: Automatic Context Management

**What:** "Context management" in this domain means the system automatically handles housekeeping between workflow steps and phases. When a phase completes, the workflow engine: (1) aggregates all step responses into the phase's `phaseData`, (2) emits the phase events via the existing advance mechanism, (3) resets the step state for the new phase, and (4) loads the new phase's step definitions. The user sees only the workflow progression -- all bookkeeping is invisible.

**When to use:** Every phase transition and every step that modifies workflow state.

**Example:**
```typescript
// server/src/workflow/engine.ts
import { getProjectById, getNextPhase } from "../events/reducers/project.js";
import { appendEvent } from "../events/store.js";

/**
 * Complete a workflow step and determine what happens next.
 * This is the core engine logic.
 */
export async function completeWorkflowStep(
  projectId: string,
  stepId: string,
  response: Record<string, unknown>,
  userId: string
): Promise<WorkflowAdvanceResult> {
  const stepDef = getStepDefinition(stepId);
  const workflowState = await getWorkflowState(projectId);

  // Record the step completion
  workflowState.completedSteps[stepId] = {
    stepId,
    type: stepDef.type,
    response,
    completedAt: new Date().toISOString(),
    completedBy: userId,
  };

  // Determine next step
  const nextStepId = resolveNextStep(stepDef, response, workflowState);

  if (nextStepId === "__phase_complete__") {
    // All steps in this phase are done -- aggregate and advance
    const phaseData = aggregateStepResponses(workflowState);
    // This triggers the existing advance mechanism (invisible to user)
    await advancePhaseWithData(projectId, phaseData, userId);

    // Load next phase steps
    const nextPhase = getNextPhase(workflowState.currentPhase);
    if (nextPhase) {
      const nextSteps = getStepsForPhase(nextPhase);
      return { type: "phase_advanced", nextPhase, firstStep: nextSteps[0] };
    }
    return { type: "lifecycle_complete" };
  }

  return { type: "next_step", stepId: nextStepId };
}
```

### Pattern 4: Conditional Rendering by Step Type

**What:** The WorkflowEngine component reads the current step definition and renders the appropriate UI component based on `step.type`. This is a simple switch/map pattern -- no complex rendering logic needed. Button choices render as a grid of styled buttons. Text input renders only when the step type is `text_input`. Info display renders markdown guidance with a single Continue button.

**When to use:** The WorkflowEngine component is the single entry point for all workflow UI rendering.

**Example:**
```typescript
// client/src/components/workflow/WorkflowEngine.tsx
import { StepButton } from "./StepButton.js";
import { StepTextInput } from "./StepTextInput.js";
import { StepInfoDisplay } from "./StepInfoDisplay.js";
import { StepAiPrompt } from "./StepAiPrompt.js";

function renderStep(step: WorkflowStepDef, onComplete: StepCompleteHandler) {
  switch (step.type) {
    case "button_choice":
      return <StepButton step={step} onSelect={onComplete} />;
    case "text_input":
      return <StepTextInput step={step} onSubmit={onComplete} />;
    case "info_display":
      return <StepInfoDisplay step={step} onContinue={onComplete} />;
    case "ai_prompt":
      return <StepAiPrompt step={step} onRespond={onComplete} />;
    case "auto_advance":
      // Auto-advances happen server-side; client never renders these
      return null;
    default:
      return <StepInfoDisplay step={step} onContinue={onComplete} />;
  }
}
```

### Pattern 5: Event-Sourced Workflow State

**What:** Workflow state (current step, completed steps, pipeline entry flag) is stored as domain events in the existing JSONL event store. New event types track step completions and pipeline entry. The workflow state is derived by reducing these events, following the exact same pattern as `reduceProjectState`.

**When to use:** All workflow state changes emit events. The workflow state is always computed from events, never stored as mutable state.

**Example of new event types needed:**
```typescript
// Add to shared/types/events.ts
| "workflow.step_completed"      // User completed a workflow step
| "workflow.pipeline_entered"    // Project passed Decision Point with "Go"
| "workflow.context_reset"       // Invisible context reset between phases
```

### Anti-Patterns to Avoid

- **Storing workflow state in component state only:** Workflow progress must survive page refreshes and be consistent across team members. Use the event store, not React state, as the source of truth.
- **Showing freeform text inputs by default:** Text inputs MUST be hidden unless the current step's type is explicitly `text_input`. Default to buttons for everything.
- **Exposing internal operations to the user:** Context resets, phase bookkeeping events, and state cleanup must happen with zero visible UI. No loading spinners for internal operations, no "context cleared" messages.
- **Breaking the existing PhaseManagement flow:** The workflow engine augments the existing phase progression; it does not replace the underlying event model. The `project.phase_completed` + `project.phase_advanced` event pair must still fire exactly as before. Workflow steps are an additional layer on top.
- **Making the workflow engine mandatory:** Projects that are already past the decision point (legacy data) must still work. The workflow engine should be opt-in or gracefully handle projects that predate it.
- **Putting step definitions in the client:** Step definitions are server-authoritative. The client fetches them via API. This prevents manipulation and allows AI-aware step generation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Workflow state persistence | In-memory state or localStorage | JSONL event store (existing) | Must survive restarts, be consistent across users, and maintain audit trail |
| Button/form rendering | Custom form engine | React component composition (existing) | 5 step types with a switch statement is simpler than a form schema engine |
| Phase transition logic | New phase advancement system | Existing `POST /api/projects/:id/advance` | Phase transitions are already correct; workflow adds steps within phases, not new transitions |
| i18n for step labels | Hardcoded strings | Existing i18next setup (DE/EN) | All text must be internationalized; the system already supports this |
| AI-guided steps | New AI call infrastructure | Existing `generateAiResponse` from Phase 4 | AI generation, cost tracking, and event logging are already implemented |

**Key insight:** Phase 5 is fundamentally a UI and orchestration layer. The data model (events, phases, projections), AI infrastructure (triggers, generation, cost tracking), and API patterns (REST, Zod validation, ApiResponse wrapper) are all in place from Phases 1-4. The new work is defining the step sequences and building the step-type-specific UI components.

## Common Pitfalls

### Pitfall 1: Workflow State Divergence from Project State
**What goes wrong:** The workflow engine tracks its own notion of "current step" which gets out of sync with the project's `currentPhase` in the event store. A user advances via the old PhaseManagement panel, but the workflow engine still shows the previous phase's steps.
**Why it happens:** Two sources of truth for phase progression -- the existing advance endpoint and the new workflow engine.
**How to avoid:** The workflow engine's phase tracking MUST derive from the project's `currentPhase` (from the event-sourced projection), not from its own independent state. When the workflow engine completes all steps in a phase, it calls the existing `POST /api/projects/:id/advance` endpoint. The project reducer remains the single source of truth for phase progression.
**Warning signs:** Workflow shows steps for "idea" phase but project header shows "feasibility", or workflow allows completing steps in a phase the project has already passed.

### Pitfall 2: Button Click Race Conditions
**What goes wrong:** User double-clicks a button or clicks two options rapidly, causing duplicate step completions or out-of-order state updates.
**Why it happens:** No client-side or server-side debouncing on step completion.
**How to avoid:** (1) Client-side: disable buttons immediately on click with optimistic UI state. (2) Server-side: the `completeWorkflowStep` endpoint should be idempotent -- if a step is already completed, return the existing result rather than creating a duplicate event. Use the step ID + project ID as a natural idempotency key.
**Warning signs:** Duplicate `workflow.step_completed` events in the JSONL log, workflow skipping steps.

### Pitfall 3: Decision Point "Go" Without Complete Prior Phases
**What goes wrong:** The workflow reaches the decision_point phase but prior phases have incomplete or missing data. The "Go" decision is based on insufficient information.
**Why it happens:** Earlier phases allowed skipping steps (all marked as `required: false`) or the workflow was not enforced.
**How to avoid:** Define certain steps in pre-decision phases as `required: true`. The workflow engine prevents advancing to the next phase until all required steps are completed. The decision_point phase's step definition includes a summary step that displays aggregated data from all prior phases so the decision-maker can review.
**Warning signs:** Projects entering the GSD pipeline with empty feasibility or ROI data.

### Pitfall 4: Invisible Operations Causing Perceived Latency
**What goes wrong:** Context management operations (aggregating step data, emitting phase events, resetting step state) take noticeable time, making the UI feel sluggish between phases.
**Why it happens:** Multiple synchronous event appends during phase transitions.
**How to avoid:** The existing `appendFileSync` is fast for small writes (well under PIPE_BUF). Chain the phase transition events (phase_completed + phase_advanced + workflow context reset) in a single synchronous operation. On the client, show a brief transition animation (0.3s fade) to mask any latency while the next phase's step definitions load.
**Warning signs:** Visible blank screen or spinner during phase transitions.

### Pitfall 5: Legacy Projects Without Workflow State
**What goes wrong:** Projects created before Phase 5 have no `workflow.step_completed` events. The workflow engine crashes or shows an empty state for these projects.
**Why it happens:** No migration path for existing projects.
**How to avoid:** When the workflow engine encounters a project with no workflow events, it initializes the workflow at the project's current phase's first step. Completed phases (those with `completedAt` in the PhaseData) are treated as having all steps completed. The workflow engine is forward-looking, not retroactive.
**Warning signs:** Errors when viewing existing projects after Phase 5 deployment, "step not found" errors in the console.

### Pitfall 6: Over-Engineering Step Definitions
**What goes wrong:** Step definitions become so complex (deeply nested conditions, dynamic step generation, runtime step insertion) that the workflow is hard to debug and maintain.
**Why it happens:** Trying to make the step system handle every possible future use case upfront.
**How to avoid:** Start with linear step sequences per phase with ONE level of conditional branching (the `nextStepCondition` field). Most phases need 3-5 simple steps. Only the decision_point phase needs branching (Go/No-Go/Defer). Resist the urge to add dynamic step generation until a real use case demands it.
**Warning signs:** Step definitions exceeding 50 lines per phase, deeply nested condition trees, steps that generate other steps.

## Code Examples

### Workflow Step Completion API Endpoint

```typescript
// server/src/routes/workflow.ts
import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { completeWorkflowStep, getWorkflowState, getStepsForPhase } from "../workflow/engine.js";
import { getProjectById } from "../events/reducers/project.js";
import type { ApiResponse } from "shared/types/api.js";

const router = Router();

const completeStepSchema = z.object({
  stepId: z.string().min(1),
  response: z.record(z.unknown()),
});

/**
 * GET /api/workflow/:projectId
 * Returns the current workflow state and step definitions for the project's current phase.
 */
router.get("/:projectId", async (req, res) => {
  const project = await getProjectById(req.params.projectId);
  if (!project) {
    return res.status(404).json({ success: false, error: "Project not found" });
  }

  const workflowState = await getWorkflowState(project.id);
  const steps = getStepsForPhase(project.currentPhase);

  res.json({
    success: true,
    data: { state: workflowState, steps, currentPhase: project.currentPhase },
  });
});

/**
 * POST /api/workflow/:projectId/step
 * Complete a workflow step. Returns the next step or phase advance result.
 */
router.post("/:projectId/step", validate(completeStepSchema), async (req, res) => {
  const { stepId, response } = req.body;
  const userId = req.user!.id;
  const projectId = req.params.projectId;

  const result = await completeWorkflowStep(projectId, stepId, response, userId);

  res.json({ success: true, data: result });
});

export default router;
```

### Button Choice Step Component

```typescript
// client/src/components/workflow/StepButton.tsx
import { useState } from "react";
import { useLanguage } from "../../hooks/useLanguage.js";
import type { WorkflowStepDef, WorkflowOption } from "shared/types/workflow.js";

interface StepButtonProps {
  step: WorkflowStepDef;
  onSelect: (response: Record<string, unknown>) => Promise<void>;
}

export function StepButton({ step, onSelect }: StepButtonProps) {
  const { t } = useLanguage();
  const [selecting, setSelecting] = useState(false);

  async function handleSelect(option: WorkflowOption) {
    if (selecting) return; // Prevent double-click
    setSelecting(true);
    try {
      await onSelect({ [step.id]: option.value, selectedOption: option.value });
    } finally {
      setSelecting(false);
    }
  }

  return (
    <div>
      <h3>{t(step.titleKey)}</h3>
      {step.descriptionKey && <p>{t(step.descriptionKey)}</p>}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        {step.options?.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option)}
            disabled={selecting}
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              fontWeight: 600,
              borderRadius: "8px",
              cursor: selecting ? "not-allowed" : "pointer",
              border: "none",
              color: "#fff",
              backgroundColor:
                option.variant === "danger" ? "#ef4444" :
                option.variant === "secondary" ? "#6b7280" :
                "#10b981",
              opacity: selecting ? 0.6 : 1,
            }}
          >
            {t(option.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Workflow Hook

```typescript
// client/src/hooks/useWorkflow.ts
import { useState, useEffect, useCallback } from "react";
import { apiCall } from "../api/client.js";
import type { WorkflowState, WorkflowStepDef } from "shared/types/workflow.js";
import type { ProjectPhase } from "shared/types/models.js";

interface WorkflowData {
  state: WorkflowState;
  steps: WorkflowStepDef[];
  currentPhase: ProjectPhase;
}

export function useWorkflow(projectId: string | undefined) {
  const [data, setData] = useState<WorkflowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflow = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const result = await apiCall<WorkflowData>("GET", `/api/workflow/${projectId}`);
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchWorkflow(); }, [fetchWorkflow]);

  const completeStep = useCallback(async (
    stepId: string,
    response: Record<string, unknown>
  ) => {
    if (!projectId) return null;
    const result = await apiCall<{ type: string; stepId?: string; nextPhase?: string }>(
      "POST",
      `/api/workflow/${projectId}/step`,
      { stepId, response }
    );
    if (result.success) {
      // Refresh workflow state after step completion
      await fetchWorkflow();
      return result.data;
    }
    setError(result.error);
    return null;
  }, [projectId, fetchWorkflow]);

  const currentStep = data?.steps.find((s) => s.id === data.state.currentStepId) ?? null;

  return {
    workflowState: data?.state ?? null,
    steps: data?.steps ?? [],
    currentStep,
    currentPhase: data?.currentPhase ?? null,
    loading,
    error,
    completeStep,
    refresh: fetchWorkflow,
  };
}
```

## Integration Points with Existing Codebase

### Phase 2: Project Lifecycle (Direct Integration)

1. **`PROJECT_PHASES` array** (shared/types/models.ts, line 91-100): The 8-phase lifecycle defines the top-level structure. Workflow steps are sub-divisions of these phases. No changes to `PROJECT_PHASES` needed.

2. **`project.phase_completed` + `project.phase_advanced` events** (shared/types/events.ts): The workflow engine calls the existing `advancePhase` mechanism when all steps in a phase are completed. The dual-event pattern with shared `correlationId` is preserved.

3. **`PhaseContent` component** (client/src/components/PhaseContent.tsx): This component currently renders per-phase form fields. The WorkflowEngine component will replace or augment PhaseContent when the workflow is active, while PhaseContent continues to serve as the fallback/read-only view for completed phases.

4. **`PhaseManagement` component** (client/src/components/PhaseManagement.tsx): The manual "Advance to next phase" button should be hidden when the workflow engine is active (the workflow handles progression). The PhaseManagement panel remains visible for progress tracking and history.

5. **`useProject` hook** (client/src/hooks/useProject.ts): The `advancePhase` function from this hook is called by the workflow engine's phase completion logic. No changes to the hook needed; the workflow engine composes on top of it.

### Phase 4: AI Foundation (AI-Guided Steps)

1. **`generateAiResponse`** (server/src/ai/generate.ts): AI-guided steps (`ai_prompt` type) call this function to generate questions, analysis, or guidance. The workflow engine provides project context as input.

2. **AI trigger engine** (server/src/ai/triggers/engine.ts): Existing triggers fire on `project.phase_completed` events. The workflow engine's phase advancement triggers these same events, so AI reflections and notifications continue working automatically.

3. **`AiTaskType`** (shared/types/ai.ts): May need a new task type (e.g., `"workflow_guidance"`) for AI steps within the workflow, with its own temperature and token presets.

### Existing Route Registration

The new workflow router must be registered in `app.ts`:
```typescript
import workflowRouter from "./routes/workflow.js";
app.use("/api/workflow", requireAuth, workflowRouter);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monolithic form per phase | Guided step-by-step workflow | Phase 5 (this work) | Non-technical users can navigate without understanding the full lifecycle |
| Manual phase advancement button | Automatic progression through steps | Phase 5 (this work) | Reduces errors, enforces data collection before advancement |
| All-or-nothing phase data entry | Incremental step-by-step data collection | Phase 5 (this work) | Lower cognitive load per step |
| Terminal-style prompts | Button-driven UI choices | Phase 5 (this work) | Zero terminal knowledge required |

**No deprecated libraries or APIs involved** -- this phase builds entirely on the existing stack.

## Open Questions

1. **Granularity of Step Definitions Per Phase**
   - What we know: Each of the 8 lifecycle phases needs step definitions. Some phases (idea, feasibility) may need 3-4 steps; others (implementation) may need more.
   - What's unclear: How many steps per phase is appropriate? Too few defeats the purpose of guided workflow; too many feels bureaucratic.
   - Recommendation: Start with 3-5 steps per phase. The idea phase gets 3 (describe idea, identify problem, initial assessment). The implementation phase gets 5-6 (task breakdown, progress check-ins, blocker identification). Iterate based on usage.

2. **WorkflowEngine vs PhaseContent Rendering**
   - What we know: Currently PhaseContent renders the per-phase form. The WorkflowEngine needs to take over for the guided experience.
   - What's unclear: Should both components coexist (toggle), or should WorkflowEngine fully replace PhaseContent?
   - Recommendation: The WorkflowEngine component replaces PhaseContent for the current phase. PhaseContent continues to render completed phases in read-only mode (its existing behavior). A feature flag or project-level setting could control whether the workflow engine is active, providing backward compatibility.

3. **"No-Go" and "Defer" at Decision Point**
   - What we know: "Go" enters the GSD pipeline. But what happens with "No-Go" or "Defer"?
   - What's unclear: Does "No-Go" archive the project? Does "Defer" leave it at the decision_point phase?
   - Recommendation: "No-Go" should prompt for a rationale (text_input step), then archive the project via the existing `project.archived` event. "Defer" should leave the project at the decision_point phase with a deferred status note, allowing it to be revisited later. Neither enters the pipeline.

4. **Multi-User Step Completion**
   - What we know: Projects have multiple team members. Currently any member can advance phases.
   - What's unclear: Can different team members complete different steps within the same phase? Or must one user complete the entire phase?
   - Recommendation: Any team member can complete any step. Steps record `completedBy` for audit trail. For the decision_point "Go" specifically, consider requiring confirmation from multiple team members (configurable per-team).

5. **Workflow State Storage Aggregate Type**
   - What we know: The event store uses aggregate types to organize JSONL files. Workflow events need an aggregate type.
   - What's unclear: Should workflow events go in the `project.jsonl` file (same aggregate type as project events) or a separate `workflow.jsonl` file?
   - Recommendation: Use `"workflow"` as the aggregate type with the project ID as the aggregate ID. This keeps workflow events separate from project lifecycle events (cleaner separation of concerns) while still being queryable by project ID.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis (all files read directly):
  - `shared/types/models.ts` -- PROJECT_PHASES, PhaseData, ProjectState types
  - `shared/types/events.ts` -- DomainEvent, EventType union
  - `server/src/events/reducers/project.ts` -- reduceProjectState, getNextPhase
  - `server/src/events/store.ts` -- appendEvent, readEvents (JSONL pattern)
  - `server/src/routes/projects.ts` -- Phase advancement endpoint with dual events
  - `client/src/components/PhaseContent.tsx` -- Per-phase form with field definitions
  - `client/src/components/PhaseManagement.tsx` -- Phase advancement UI
  - `client/src/hooks/useProject.ts` -- Client-side project state management
  - `server/src/ai/generate.ts` -- AI generation wrapper
  - `server/src/ai/triggers/engine.ts` -- Trigger evaluation pattern
  - `client/src/App.tsx` -- Route structure
  - `server/src/app.ts` -- Route registration pattern

### Secondary (MEDIUM confidence)
- Phase 4 Research (`04-RESEARCH.md`) -- AI integration patterns, trigger engine design, provider registry

### Tertiary (LOW confidence)
- None. This phase is almost entirely about composing existing patterns into a new feature. No external research sources were needed.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies; all existing libraries are sufficient
- Architecture: HIGH -- Workflow step pattern is a straightforward extension of the existing event-sourced phase model; all integration points verified by reading actual source code
- Step definitions: MEDIUM -- The specific step content per phase (how many steps, what questions to ask) will need iteration during implementation; the framework is solid but content is TBD
- Pitfalls: HIGH -- All identified pitfalls stem from verified patterns in the existing codebase (race conditions, state divergence, legacy data)
- UI components: HIGH -- The rendering pattern (switch on step type) is simple React composition; no complex state management needed

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (architecture is stable; step content may evolve)
