---
phase: 05-gsd-workflow-engine
plan: 01
subsystem: workflow, api
tags: [workflow-engine, event-sourcing, step-definitions, express, zod, decision-point]

# Dependency graph
requires:
  - phase: 02-project-lifecycle
    provides: PROJECT_PHASES, phase advancement events, ProjectState reducer
  - phase: 03-documentation-engine
    provides: processEventForDocumentation fire-and-forget pattern
  - phase: 04-ai-foundation
    provides: evaluateTriggersForEvent, AiTaskType, trigger engine
provides:
  - WorkflowStepDef type system with StepType union (button_choice, text_input, info_display, ai_prompt, auto_advance)
  - Step definitions for all 8 lifecycle phases (3-5 steps each)
  - Event-sourced workflow state reducer (workflow.step_completed, workflow.pipeline_entered, workflow.context_reset)
  - Workflow engine with step completion, phase advancement, and decision_point Go/No-Go/Defer branching
  - REST API endpoints GET /api/workflow/:projectId and POST /api/workflow/:projectId/step
  - Context aggregation (step responses -> phaseData)
affects: [05-02 (client workflow components), 05-03 (workflow integration)]

# Tech tracking
tech-stack:
  added: []
  patterns: [workflow-step-definitions, event-sourced-workflow-state, decision-point-branching, conditional-step-routing]

key-files:
  created:
    - shared/types/workflow.ts
    - server/src/workflow/types.ts
    - server/src/workflow/definitions.ts
    - server/src/workflow/engine.ts
    - server/src/workflow/context.ts
    - server/src/events/reducers/workflow.ts
    - server/src/routes/workflow.ts
  modified:
    - shared/types/events.ts
    - shared/types/ai.ts
    - server/src/app.ts

key-decisions:
  - "Workflow events use 'workflow' aggregate type with projectId as aggregateId, separate from project events"
  - "Legacy projects get default initial state at first step of current phase (no migration needed)"
  - "Decision point handles Go/No-Go/Defer: Go enters pipeline via phase advancement, No-Go archives with rationale, Defer leaves project at decision_point"
  - "Step completion is idempotent: duplicate completions skip event emission"

patterns-established:
  - "Workflow step definition pattern: server-authoritative step arrays per phase with type-driven UI rendering"
  - "Conditional step routing via nextStepCondition with field-to-stepId route mapping"
  - "Phase advancement bridge: workflow engine emits project.phase_completed + project.phase_advanced via existing mechanism"
  - "Context aggregation: step responses collected into phaseData on phase transition"

# Metrics
duration: 6min
completed: 2026-02-08
---

# Phase 5 Plan 1: Workflow Types and Server Engine Summary

**Event-sourced workflow engine with step definitions for all 8 lifecycle phases, decision_point Go/No-Go/Defer branching, and REST API serving workflow state and step completions**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-08T12:57:11Z
- **Completed:** 2026-02-08T13:03:12Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Complete shared type system for workflow steps (StepType, WorkflowStepDef, WorkflowOption, WorkflowState, WorkflowStepResult, WorkflowAdvanceResult)
- Step definitions for all 8 lifecycle phases with button_choice, text_input, info_display, and ai_prompt step types
- Event-sourced workflow reducer that derives state from JSONL events (same pattern as project reducer)
- Core workflow engine with step completion, conditional branching, idempotent step completion, and decision_point Go/No-Go/Defer handling
- REST API with GET /:projectId (workflow state + step defs) and POST /:projectId/step (complete step)
- Seamless bridge to existing phase advancement mechanism (project.phase_completed + project.phase_advanced event pair)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared workflow types and extend event types** - `f6b42cd` (feat)
2. **Task 2: Build server workflow module (definitions, engine, reducer, routes)** - `456efb4` (feat)

## Files Created/Modified
- `shared/types/workflow.ts` - StepType, WorkflowStepDef, WorkflowOption, WorkflowState, WorkflowStepResult, WorkflowAdvanceResult types
- `shared/types/events.ts` - Added workflow.step_completed, workflow.pipeline_entered, workflow.context_reset event types
- `shared/types/ai.ts` - Added workflow_guidance to AiTaskType union
- `server/src/workflow/types.ts` - Server-side re-exports of shared workflow types
- `server/src/workflow/definitions.ts` - Step definitions for all 8 phases (33 total steps)
- `server/src/workflow/engine.ts` - Core workflow progression logic with decision_point branching
- `server/src/workflow/context.ts` - Step response aggregation into phaseData
- `server/src/events/reducers/workflow.ts` - Event-sourced workflow state reducer
- `server/src/routes/workflow.ts` - GET /:projectId and POST /:projectId/step API endpoints
- `server/src/app.ts` - Registered workflow router at /api/workflow

## Decisions Made
- Workflow events stored in "workflow" aggregate type (separate JSONL file from project events) with projectId as aggregateId for clean separation
- Legacy projects without workflow events get a default initial state pointing to the first step of their current phase -- no data migration required
- Decision point Go enters pipeline (phase advancement + workflow.pipeline_entered event), No-Go archives project with rationale text, Defer leaves project at decision_point phase
- Step completion is idempotent: if a step is already completed, the engine skips event emission and proceeds to next-step resolution
- Workflow engine bridges to existing phase advancement by emitting the same project.phase_completed + project.phase_advanced event pair with shared correlationId

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Registered workflow router in app.ts**
- **Found during:** Task 2 (route creation)
- **Issue:** Plan specified creating the route file but did not explicitly list app.ts registration as a subtask
- **Fix:** Added `import workflowRouter` and `app.use("/api/workflow", requireAuth, workflowRouter)` to app.ts
- **Files modified:** server/src/app.ts
- **Verification:** TypeScript compiles, router is registered with requireAuth middleware
- **Committed in:** 456efb4 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for the API endpoints to be reachable. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Server-side workflow engine is complete and ready for client integration (Plan 05-02)
- All step definitions serve as the data contract for the WorkflowEngine UI component
- The workflow API endpoints are ready for the useWorkflow hook to consume
- No blockers for Plan 05-02 (client workflow components) or Plan 05-03 (workflow integration)

## Self-Check: PASSED

All 10 files verified present. Both task commits (f6b42cd, 456efb4) verified in git log. TypeScript compiles with zero errors.

---
*Phase: 05-gsd-workflow-engine*
*Completed: 2026-02-08*
