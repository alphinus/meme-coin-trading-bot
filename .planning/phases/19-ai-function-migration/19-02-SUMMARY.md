---
phase: 19-ai-function-migration
plan: 02
subsystem: ai
tags: [agent-sdk, warm-session, gateway-migration, tool-orchestration, prompt-based-tools]

# Dependency graph
requires:
  - phase: 19-01
    provides: "WarmAgentSession singleton with generate() method"
provides:
  - "generateAiResponse() delegating to warm Agent SDK session"
  - "runAiTools() with prompt-based tool orchestration via warm session"
  - "PlainTool interface replacing AI SDK tool() wrappers"
  - "All 16 call sites (9 + 7) migrated without touching caller files"
affects: [19-03-search-tools, 19-05-cleanup, 19-06-cost-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: ["prompt-based tool orchestration (tool descriptions in system prompt, JSON tool calls parsed from response)", "PlainTool interface for AI tool definitions without SDK dependency"]

key-files:
  created: []
  modified:
    - server/src/ai/generate.ts
    - server/src/ai/tools/definitions.ts
    - server/src/ai/tools/runner.ts

key-decisions:
  - "Zero-token usage tracking preserves audit trail shape under subscription model"
  - "Prompt-based tool orchestration over MCP tools for simplicity with internal data queries"
  - "PlainTool interface with execute(args: Record<string, unknown>) for maximum flexibility"
  - "JSON tool call parsing with markdown code block stripping for robust response handling"

patterns-established:
  - "Gateway migration pattern: rewrite 3 functions, 16 callers automatically migrated"
  - "Prompt-based tool calling: describe tools in system prompt, parse JSON response, execute server-side, feed results back"

# Metrics
duration: 6min
completed: 2026-02-10
---

# Phase 19 Plan 02: Gateway Function Migration Summary

**generateAiResponse() and runAiTools() rewritten to use warm Agent SDK session with prompt-based tool orchestration, migrating all 16 call sites without touching caller files**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-10T20:16:13Z
- **Completed:** 2026-02-10T20:22:14Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- generateAiResponse() now delegates to warmSession.generate() instead of AI SDK generateText()
- AI tool definitions converted from AI SDK tool() wrappers to plain TypeScript PlainTool objects
- runAiTools() rewritten with prompt-based tool orchestration: tools described in system prompt, JSON tool calls parsed from response, executed server-side, results fed back for synthesis
- All 9 generateAiResponse callers and 7 runAiTools callers continue working without any modification
- Zero new TypeScript errors (baseline 0, still 0)

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite generateAiResponse() to use warm session** - `f0a75f7` (feat)
2. **Task 2: Convert tool definitions to plain functions and rewrite runAiTools()** - `bac70e7` (feat)

## Files Created/Modified
- `server/src/ai/generate.ts` - Removed AI SDK generateText/providers imports, delegates to warmSession.generate(), keeps same function signature and return shape
- `server/src/ai/tools/definitions.ts` - Removed AI SDK tool() import and Zod schemas, introduced PlainTool interface, all 4 tools converted to plain objects with execute functions
- `server/src/ai/tools/runner.ts` - Removed AI SDK generateText/stepCountIs imports, added prompt-based tool orchestration with parseToolCall(), buildToolDescriptions(), and multi-step tool-calling loop

## Decisions Made
- Used zero-token usage tracking (subscription model) but preserved the `{ inputTokens, outputTokens }` shape for backward compatibility with all callers and the cost dashboard
- Chose prompt-based tool orchestration over MCP tools -- simpler for internal data queries, avoids MCP server complexity
- Added robust JSON parsing with markdown code block stripping in parseToolCall() -- models sometimes wrap JSON in code fences
- Removed unused imports (zod, TEMPERATURE_PRESETS, MAX_TOKENS_PRESETS, ProjectState, summarizeProjects) during migration cleanup

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused imports after migration**
- **Found during:** Task 1 and Task 2
- **Issue:** After removing AI SDK calls, several imports became unused (TEMPERATURE_PRESETS, MAX_TOKENS_PRESETS, AiTaskType in generate.ts; z from zod, ProjectState, summarizeProjects in definitions.ts)
- **Fix:** Removed all unused imports to keep code clean
- **Files modified:** server/src/ai/generate.ts, server/src/ai/tools/definitions.ts
- **Verification:** TypeScript compiles with 0 errors
- **Committed in:** f0a75f7 (Task 1), bac70e7 (Task 2)

---

**Total deviations:** 1 auto-fixed (1 cleanup)
**Impact on plan:** Minimal -- removed dead imports that were no longer needed after migration. No scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- generateAiResponse() and runAiTools() fully migrated to Agent SDK warm session
- Search tools (Plan 19-03) can follow same PlainTool pattern for search/tools.ts
- API key cleanup (Plan 19-05) can proceed: generate.ts and runner.ts no longer reference AI SDK or providers
- Cost dashboard update (Plan 19-06) can proceed: recordAiCost() still called with zero tokens
- AI SDK imports remain in search/engine.ts (Plan 19-03) and voice/transcribe.ts (Plan 19-04)

## Self-Check: PASSED

- FOUND: server/src/ai/generate.ts
- FOUND: server/src/ai/tools/definitions.ts
- FOUND: server/src/ai/tools/runner.ts
- FOUND: 19-02-SUMMARY.md
- FOUND: commit f0a75f7 (Task 1)
- FOUND: commit bac70e7 (Task 2)

---
*Phase: 19-ai-function-migration*
*Completed: 2026-02-10*
