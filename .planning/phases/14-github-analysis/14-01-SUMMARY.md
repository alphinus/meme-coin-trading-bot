---
phase: 14-github-analysis
plan: 01
subsystem: api
tags: [octokit, github, ai, code-analysis, idea-pool, read-only]

# Dependency graph
requires:
  - phase: 08-integrations
    provides: "Octokit client singleton, parseGitHubUrl, code_analysis task type, github.ts routes"
  - phase: 06-voice-idea-pool
    provides: "Idea Pool event pattern (idea.created + idea.transcription_added)"
provides:
  - "analyzeRepo function for read-only GitHub repo analysis with AI summary"
  - "fetchRepoData function for parallel Octokit metadata fetching"
  - "RepoAnalysis shared type for analysis results"
  - "POST /api/github/analyze route (synchronous, returns full analysis)"
  - "integration.github_repo_analyzed event type"
affects: [14-02-github-analysis-ui-telegram, telegram-handlers, idea-pool-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Promise.allSettled for parallel fault-tolerant API calls", "Synchronous analysis route (not fire-and-forget)"]

key-files:
  created:
    - server/src/integrations/github/analyzer.ts
  modified:
    - shared/types/events.ts
    - shared/types/integration.ts
    - server/src/routes/github.ts

key-decisions:
  - "Use source: 'import' for idea creation to avoid schema changes (existing enum supports it)"
  - "Promise.allSettled instead of Promise.all so one failed Octokit call does not abort others"
  - "Synchronous 200 response (not 202 fire-and-forget) since read-only analysis completes in 2-5s"
  - "New event type integration.github_repo_analyzed instead of reusing integration.github_code_analyzed for clarity"

patterns-established:
  - "Read-only repo analysis pattern: parallel Octokit reads + AI summarization + auto-idea creation"
  - "Dual-event idea creation from external sources: idea.created + idea.transcription_added with source 'import'"

# Metrics
duration: 3min
completed: 2026-02-10
---

# Phase 14 Plan 01: GitHub Analysis Backend Summary

**Read-only GitHub repository analyzer with Octokit parallel fetching, AI code_analysis summarization, and auto-idea creation via POST /api/github/analyze**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-10T09:02:23Z
- **Completed:** 2026-02-10T09:05:07Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created analyzer.ts module with analyzeRepo and fetchRepoData functions (read-only, zero write operations against GitHub)
- AI analysis via existing code_analysis task type with JSON response parsing and fallback to raw text
- Auto-creates Idea Pool entry with dual event emission for correct capturing-to-refining status transition
- POST /api/github/analyze route with Zod validation, GitHub connection check, and synchronous response

## Task Commits

Each task was committed atomically:

1. **Task 1: Add event type and RepoAnalysis type, create analyzer.ts module** - `8974b18` (feat)
2. **Task 2: Add POST /api/github/analyze route with validation** - `b7109d5` (feat)

## Files Created/Modified
- `server/src/integrations/github/analyzer.ts` - Read-only repo analyzer: fetchRepoData (parallel Octokit calls) + analyzeRepo (AI summary + idea creation)
- `shared/types/events.ts` - Added integration.github_repo_analyzed to EventType union and EVENT_TYPES array
- `shared/types/integration.ts` - Added RepoAnalysis interface export
- `server/src/routes/github.ts` - Added POST /analyze route with analyzeUrlSchema validation and GitHub connection check

## Decisions Made
- Used `source: "import"` for idea creation events to avoid schema changes -- "import" semantically matches external source ingestion and is already in the Zod enum
- Used `Promise.allSettled` (not `Promise.all`) for parallel Octokit calls so one failure (e.g., no README) does not abort the entire analysis
- Route returns synchronous 200 response (not 202 fire-and-forget) because read-only analysis completes in 2-5 seconds, unlike fork-analyze which requires polling
- Added new `integration.github_repo_analyzed` event type instead of reusing `integration.github_code_analyzed` for clarity between read-only and fork-based analysis flows

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Requires existing GITHUB_TOKEN in .env (already configured for Phase 8).

## Next Phase Readiness
- Backend analysis pipeline complete, ready for Plan 02 (web UI component + Telegram URL detection)
- analyzeRepo function is the single entry point that both web UI and Telegram will consume
- RepoAnalysis type available in shared/types for client-side type safety

## Self-Check: PASSED

- [x] analyzer.ts exists at server/src/integrations/github/analyzer.ts
- [x] events.ts modified with integration.github_repo_analyzed (2 occurrences)
- [x] integration.ts modified with RepoAnalysis interface
- [x] github.ts routes modified with POST /analyze
- [x] Commit 8974b18 exists (Task 1)
- [x] Commit b7109d5 exists (Task 2)
- [x] SUMMARY.md created
- [x] npx tsc --noEmit passes with zero errors

---
*Phase: 14-github-analysis*
*Completed: 2026-02-10*
