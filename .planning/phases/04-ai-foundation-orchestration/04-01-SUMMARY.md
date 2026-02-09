---
phase: 04-ai-foundation-orchestration
plan: 01
subsystem: ai
tags: [ai-sdk, anthropic, openai, provider-registry, cost-tracking, llm]

# Dependency graph
requires:
  - phase: 01-foundation-auth
    provides: "Event store (appendEvent, readEvents) and JSONL persistence"
provides:
  - "Shared AI types (AiTaskType, AiMemberConfig, CostRecord, ModelOverride, AiGenerateOptions)"
  - "Multi-provider AI registry (Anthropic + OpenAI) with task-type routing"
  - "generateAiResponse wrapper with temperature presets, language instruction, cost tracking"
  - "Cost tracker recording token usage to JSONL events"
  - "Cost dashboard aggregation by project, model, and month"
  - "Model pricing table with provider:tier aliases"
affects: [04-02, 04-03, 04-04, 04-05, 04-06, ai-notifications, ai-reflection, ai-mediation, cost-dashboard]

# Tech tracking
tech-stack:
  added: [ai, "@ai-sdk/anthropic", "@ai-sdk/openai"]
  patterns: [provider-registry, task-type-routing, lazy-initialization, cost-per-call-tracking]

key-files:
  created:
    - shared/types/ai.ts
    - server/src/ai/config.ts
    - server/src/ai/providers.ts
    - server/src/ai/generate.ts
    - server/src/ai/cost/pricing.ts
    - server/src/ai/cost/tracker.ts
    - server/src/ai/cost/dashboard.ts
  modified:
    - server/package.json
    - package-lock.json

key-decisions:
  - "Lazy provider registry initialization to allow server startup without API keys"
  - "Provider:tier alias pattern (anthropic:fast, openai:balanced) for model addressing"
  - "AI SDK LanguageModelUsage uses inputTokens/outputTokens (not promptTokens/completionTokens)"
  - "maxOutputTokens parameter name in AI SDK v4 (not maxTokens)"

patterns-established:
  - "Task-type routing: TASK_MODEL_MAP maps AiTaskType to provider:tier strings"
  - "Cost-per-call: every generateAiResponse call records cost via appendEvent"
  - "Language instruction appended to system prompt based on language option"
  - "Preset resolution chain: explicit override > task-type preset > default"

# Metrics
duration: 7min
completed: 2026-02-08
---

# Phase 4 Plan 1: AI Infrastructure Summary

**Multi-provider AI registry (Anthropic+OpenAI) with task-type routing, generateText wrapper with temperature presets and language instructions, and per-call cost tracking to JSONL events**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-08T11:37:04Z
- **Completed:** 2026-02-08T11:43:35Z
- **Tasks:** 2
- **Files created:** 7

## Accomplishments
- Shared AI types defined for all Phase 4 plans (AiTaskType, AiMemberConfig, CostRecord, ModelOverride, AiDecisionOverride, TriggerRuleType, AiGenerateOptions)
- Multi-provider registry with Anthropic (haiku/sonnet/opus) and OpenAI (gpt-4o-mini/gpt-4o/o3) via AI SDK createProviderRegistry
- generateAiResponse wrapper enforcing temperature presets, max token limits, and language instruction per task type
- Cost tracker computing per-call costs from MODEL_PRICING and writing ai.cost_recorded events
- Cost dashboard aggregation queries for project, model, and month breakdowns

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared AI types and provider registry** - `528fb06` (feat)
2. **Task 2: Create generate wrapper with cost tracking and dashboard** - `e99cbaf` (feat)

**Plan metadata:** [pending] (docs: complete ai-infrastructure plan)

## Files Created/Modified
- `shared/types/ai.ts` - All Phase 4 shared types (AiTaskType, AiMemberConfig, CostRecord, ModelOverride, etc.)
- `server/src/ai/config.ts` - Temperature presets, max token presets, AI_SYSTEM_USER_ID constant
- `server/src/ai/providers.ts` - Provider registry with Anthropic+OpenAI, TASK_MODEL_MAP, getModelForTask
- `server/src/ai/generate.ts` - generateAiResponse wrapper with cost tracking and event logging
- `server/src/ai/cost/pricing.ts` - MODEL_PRICING table with per-model and provider:tier alias pricing
- `server/src/ai/cost/tracker.ts` - recordAiCost function appending ai.cost_recorded events
- `server/src/ai/cost/dashboard.ts` - getCostSummary/getCostSummaryForProject aggregation

## Decisions Made
- **Lazy registry initialization:** Provider registry built on first access (not at import time) so server starts even without API keys configured. Missing keys log a warning but do not crash.
- **Provider:tier addressing:** Models addressed as "provider:tier" strings (e.g., "anthropic:fast" resolves to claude-haiku-4-5). Pricing table includes both direct model names and aliases.
- **AI SDK v4 API compatibility:** Used `inputTokens`/`outputTokens` (not `promptTokens`/`completionTokens`) and `maxOutputTokens` (not `maxTokens`) matching the current AI SDK LanguageModelUsage type.
- **Preset resolution chain:** Temperature and max tokens resolve via: explicit override > task-type preset > hardcoded default (0.4 and 500 respectively).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed AI SDK API property names**
- **Found during:** Task 2 (generate wrapper implementation)
- **Issue:** Initial code used `usage.promptTokens`/`usage.completionTokens` and `maxTokens` parameter, but AI SDK v4 uses `usage.inputTokens`/`usage.outputTokens` and `maxOutputTokens`
- **Fix:** Updated all property references to match AI SDK LanguageModelUsage type
- **Files modified:** server/src/ai/generate.ts
- **Verification:** TypeScript compilation passes with zero errors for all AI files
- **Committed in:** e99cbaf (Task 2 commit)

**2. [Rule 1 - Bug] Fixed provider registry type assertion for dynamic model IDs**
- **Found during:** Task 1 (provider registry creation)
- **Issue:** `aiRegistry.languageModel(modelId)` expects typed literal strings but task routing passes dynamic strings at runtime
- **Fix:** Added type assertion in aiRegistry wrapper using `Parameters<ReturnType<typeof buildRegistry>["languageModel"]>[0]`
- **Files modified:** server/src/ai/providers.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** 528fb06 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for TypeScript compilation. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required

AI providers require API keys to function at runtime:
- `ANTHROPIC_API_KEY` - Get from console.anthropic.com -> API Keys -> Create Key
- `OPENAI_API_KEY` - Get from platform.openai.com -> API Keys -> Create new secret key

Without these keys, the server starts normally but AI generation calls will fail at runtime.

## Next Phase Readiness
- AI infrastructure complete, ready for Plans 04-03 through 04-06 to build on
- generateAiResponse, provider registry, and cost tracker are the building blocks for notification engine, reflection engine, mediation, pattern matching, and trigger rules
- Cost dashboard aggregation ready for UI integration

## Self-Check: PASSED

All 7 created files verified present. Both task commits (528fb06, e99cbaf) verified in git log.

---
*Phase: 04-ai-foundation-orchestration*
*Completed: 2026-02-08*
