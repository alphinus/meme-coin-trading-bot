---
phase: 19-ai-function-migration
plan: 03
subsystem: search
tags: [agent-sdk, warm-session, search-engine, plain-functions, tool-orchestration, prompt-based-search]

# Dependency graph
requires:
  - phase: 19-ai-function-migration
    plan: 01
    provides: "WarmAgentSession singleton with generate() method"
provides:
  - "aiSearch() using warm session with prompt-based tool orchestration"
  - "Search tools as plain TypeScript functions (no AI SDK dependency)"
  - "searchToolDescriptions() helper for system prompt generation"
  - "parseToolCall() for robust JSON tool call extraction from model responses"
affects: [19-05-cleanup, 19-06-cost-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: ["prompt-based tool orchestration via JSON tool call responses", "plain function search tools without AI SDK wrappers"]

key-files:
  created: []
  modified:
    - server/src/search/engine.ts
    - server/src/search/tools.ts

key-decisions:
  - "Prompt-based tool orchestration: model responds with JSON tool calls, engine executes plain functions and feeds results back"
  - "Tool descriptions embedded in system prompt with parameter documentation for model guidance"
  - "MAX_TOOL_ROUNDS=5 matching previous stepCountIs(5) for consistent behavior"
  - "Robust JSON extraction via regex + brace counting to handle model responses with surrounding text"

patterns-established:
  - "Prompt-based tool calling: instruct model to respond with {tool, args} JSON, parse and execute server-side"
  - "Plain function tool interface: SearchTool with description + execute, no framework dependency"

# Metrics
duration: 2min
completed: 2026-02-10
---

# Phase 19 Plan 03: Search Engine Migration Summary

**aiSearch() migrated to warm Agent SDK session with prompt-based tool orchestration over plain TypeScript search functions**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-10T20:16:09Z
- **Completed:** 2026-02-10T20:18:59Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Removed all AI SDK imports (tool, generateText, stepCountIs, Zod) from the search subsystem
- Converted 4 search tools (projects, decisions, events, ideas) from AI SDK tool() wrappers to plain TypeScript functions
- Rewrote aiSearch() to use warm session with prompt-based tool orchestration (JSON tool calls parsed and executed server-side)
- Added searchToolDescriptions() helper and parseToolCall() utility for the prompt-based flow
- Zero changes to routes/search.ts -- caller is completely unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert search tools to plain functions** - `43e6614` (feat)
2. **Task 2: Rewrite aiSearch() to use warm session** - `23e5544` (feat)

## Files Created/Modified
- `server/src/search/tools.ts` - 4 search tools as plain functions with SearchTool interface, searchToolDescriptions() helper
- `server/src/search/engine.ts` - aiSearch() using warm session, prompt-based tool orchestration with parseToolCall(), MAX_TOOL_ROUNDS=5

## Decisions Made
- Prompt-based tool orchestration instead of SDK-native tool calling: model responds with `{"tool": "name", "args": {...}}` JSON, engine parses and executes. Simpler than MCP for internal data queries.
- Tool descriptions include parameter documentation inline (name, type, optional, description) so the model knows what arguments to provide without Zod schemas.
- Robust JSON extraction: regex finds `{"tool": "..."}` pattern, then brace-counting extracts the full object even when embedded in surrounding text.
- Cost recording uses zero tokens since warm session operates under subscription model (no per-token billing).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All AI SDK imports eliminated from server/src/search/ directory
- Search route (routes/search.ts) works unchanged with migrated engine
- TypeScript compiles with zero errors (baseline 0, still 0)
- Ready for Plan 19-05 (API key removal and package cleanup) -- search subsystem has no AI SDK dependencies

## Self-Check: PASSED

- FOUND: server/src/search/tools.ts
- FOUND: server/src/search/engine.ts
- FOUND: 19-03-SUMMARY.md
- FOUND: commit 43e6614 (Task 1)
- FOUND: commit 23e5544 (Task 2)

---
*Phase: 19-ai-function-migration*
*Completed: 2026-02-10*
