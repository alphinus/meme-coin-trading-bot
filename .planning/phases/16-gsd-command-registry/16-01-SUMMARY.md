---
phase: 16-gsd-command-registry
plan: 01
subsystem: api
tags: [gsd, command-registry, chokidar, express, file-watcher, markdown-parsing]

# Dependency graph
requires:
  - phase: 12-infrastructure-safety
    provides: Agent session manager for hasActiveSession check
  - phase: 05-gsd-workflow-engine
    provides: Workflow state reducers and step definitions for step count context
provides:
  - GsdCommand and GsdCommandRegistry shared types
  - Registry singleton with markdown command file parsing and file watching
  - State-based command filtering (phase, session, mode, archive)
  - GET /api/gsd/commands/:projectId API endpoint
  - 6 GSD command definition files (plan-phase, research-phase, analyze-code, review-progress, advance-phase, generate-docs)
  - hasRunningSession() method on AgentSessionManager
affects: [16-02-PLAN, 16-03-PLAN, client GSD command panel]

# Tech tracking
tech-stack:
  added: [chokidar (file watching, already installed)]
  patterns: [markdown-frontmatter command definitions, plugin directory convention, module-level singleton registry]

key-files:
  created:
    - shared/types/gsd.ts
    - server/src/gsd/types.ts
    - server/src/gsd/registry.ts
    - server/src/gsd/state-filter.ts
    - server/src/routes/gsd.ts
    - gsd-plugin/commands/plan-phase.md
    - gsd-plugin/commands/research-phase.md
    - gsd-plugin/commands/analyze-code.md
    - gsd-plugin/commands/review-progress.md
    - gsd-plugin/commands/advance-phase.md
    - gsd-plugin/commands/generate-docs.md
  modified:
    - server/src/app.ts
    - server/src/agent/session-manager.ts

key-decisions:
  - "Simple frontmatter parser (no YAML library) for flat key-value pairs with nested when/agentOptions objects"
  - "Module-level singleton pattern for registry caching with chokidar file watcher"
  - "hasRunningSession() added to AgentSessionManager (iterates sessions Map) for GSD route session check"
  - "initGsd() called as fire-and-forget in app.ts startup (non-blocking, matches Telegram bot pattern)"

patterns-established:
  - "Plugin directory pattern: gsd-plugin/commands/*.md defines commands via frontmatter + prompt body"
  - "State-based command filtering: commands declare when conditions, server evaluates against project context"

# Metrics
duration: 4min
completed: 2026-02-10
---

# Phase 16 Plan 01: GSD Command Registry Summary

**Server-side GSD command registry with markdown-based plugin definitions, chokidar file watching, and state-filtered REST API**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-10T11:26:02Z
- **Completed:** 2026-02-10T11:30:29Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Shared GsdCommand/GsdCommandRegistry types for client-server contract
- Registry singleton that parses markdown frontmatter from gsd-plugin/commands/ directory
- chokidar file watcher with 500ms debounce for automatic registry reload on file changes
- State filter evaluating phase, session, mode, and archive conditions per command
- GET /api/gsd/commands/:projectId returns filtered commands with workflow step context
- 6 production command definitions covering plan, research, analyze, review, advance, and docs workflows

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared GSD types, plugin command files, and registry singleton** - `c2985be` (feat)
2. **Task 2: Create state filter, API route, and wire into app.ts** - `89be6da` (feat)

## Files Created/Modified
- `shared/types/gsd.ts` - GsdCommand and GsdCommandRegistry shared interfaces
- `server/src/gsd/types.ts` - Server-internal CommandFilterContext type
- `server/src/gsd/registry.ts` - Registry singleton with loadRegistry, getRegistry, watchRegistry exports
- `server/src/gsd/state-filter.ts` - filterCommands() evaluating when conditions against project context
- `server/src/routes/gsd.ts` - GET /commands/:projectId endpoint with initGsd() startup function
- `server/src/app.ts` - Added gsdRouter at /api/gsd with requireAuth, initGsd() in startup
- `server/src/agent/session-manager.ts` - Added hasRunningSession(projectId) method
- `gsd-plugin/commands/plan-phase.md` - Plan Phase command (all phases, both modes)
- `gsd-plugin/commands/research-phase.md` - Research Phase command (all phases, both modes)
- `gsd-plugin/commands/analyze-code.md` - Analyze Code command (implementation/review phases only)
- `gsd-plugin/commands/review-progress.md` - Review Progress command (all phases, both modes)
- `gsd-plugin/commands/advance-phase.md` - Advance Phase command (not review_extraction)
- `gsd-plugin/commands/generate-docs.md` - Generate Docs command (implementation/review, expert only)

## Decisions Made
- Simple frontmatter parser (no YAML library) for flat key-value pairs with nested when/agentOptions objects -- keeps dependencies minimal, frontmatter is simple enough
- Module-level singleton pattern for registry caching -- consistent with agentSessions singleton
- hasRunningSession() added to AgentSessionManager as public method iterating the private sessions Map
- initGsd() called as fire-and-forget in app.ts startup, matching the Telegram bot async initialization pattern
- GSD_PLUGIN_PATH env var for plugin path override, fallback to process.cwd()/gsd-plugin

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Registry API ready for Plan 02 (client-side GSD command panel)
- Command definitions serve as the data layer for Plans 02 and 03
- File watcher enables hot-reload during development of new commands

## Self-Check: PASSED

- All 11 created files verified present on disk
- Both task commits (c2985be, 89be6da) verified in git log
- TypeScript compilation passes with zero errors

---
*Phase: 16-gsd-command-registry*
*Completed: 2026-02-10*
