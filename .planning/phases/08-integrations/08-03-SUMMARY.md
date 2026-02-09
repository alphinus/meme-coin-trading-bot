---
phase: 08-integrations
plan: 03
subsystem: integrations
tags: [octokit, github, fork, ai-analysis, code-analysis, webhooks, event-sourcing]

# Dependency graph
requires:
  - phase: 08-integrations
    provides: Octokit client, integration event types, integration reducer, code_analysis AI task type
  - phase: 04-ai-foundation
    provides: generateAiResponse with code_analysis task type
  - phase: 06-voice-idea-pool
    provides: Idea events and reducer for idea.created from fork analysis
provides:
  - GitHub repo operations module (link, list commits, list PRs with event persistence)
  - Fork + AI code analysis workflow (fork -> poll -> fetch context -> AI analyze -> idea creation)
  - handleGitHubWebhook export alias for webhook processing
  - REST routes for fork-analyze, fork status polling, and linked repos
affects: [08-07-ui, 08-08-gap-closure]

# Tech tracking
tech-stack:
  added: []
  patterns: [fork-poll-analyze-workflow, fire-and-forget-background-analysis, sha-dedup-event-emission]

key-files:
  created:
    - server/src/integrations/github/repos.ts
    - server/src/integrations/github/fork.ts
  modified:
    - server/src/integrations/github/webhooks.ts
    - server/src/routes/github.ts

key-decisions:
  - "repos.ts combines Octokit API calls with event-store persistence (fetch + emit pattern)"
  - "Fork polling uses 10 retries with 3s delay; falls back to source repo analysis if fork not ready"
  - "AI code analysis input capped at 8000 chars to prevent excessive token usage"
  - "Fork-analyze returns 202 with fire-and-forget pattern; client polls /fork/status/:ideaId"
  - "Routes added to existing github.ts rather than creating redundant github-integration.ts"

patterns-established:
  - "Fork-poll-analyze: async workflow that creates domain events at each stage for full traceability"
  - "SHA dedup: listRepoCommits checks existing events before emitting to prevent duplicate commit events"

# Metrics
duration: 4min
completed: 2026-02-08
---

# Phase 8 Plan 03: GitHub Integration Summary

**GitHub repo linking with event persistence, fork+AI code analysis creating idea pool entries, and webhook/commit/PR event-sourced tracking**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-08T22:12:35Z
- **Completed:** 2026-02-08T22:16:24Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created repos.ts module with linkRepoToProject, getLinkedRepos, listRepoCommits, listRepoPullRequests -- all combining Octokit API calls with event-store event emission
- Built full forkAndAnalyze workflow in fork.ts: parse URL -> fork repo -> poll readiness (10x3s) -> fetch README + file tree + package.json -> AI code_analysis -> create idea.created event -> emit integration.github_code_analyzed
- Added REST routes: POST /fork-analyze (202 fire-and-forget), GET /fork/status/:ideaId (polling), GET /repos/linked (query linked repos)
- Added handleGitHubWebhook export alias in webhooks.ts for plan artifact compliance

## Task Commits

Each task was committed atomically:

1. **Task 1: GitHub repo operations and webhook handler** - `6b193f9` (feat)
2. **Task 2: Fork workflow with AI code analysis and GitHub integration routes** - `ad69c45` (feat)

## Files Created/Modified
- `server/src/integrations/github/repos.ts` - Repo operations: link, list commits/PRs with event persistence and SHA dedup
- `server/src/integrations/github/fork.ts` - Fork + AI code analysis workflow producing idea pool entries
- `server/src/integrations/github/webhooks.ts` - Added handleGitHubWebhook export alias
- `server/src/routes/github.ts` - Added fork-analyze, fork status, and linked repos routes

## Decisions Made
- repos.ts follows fetch+emit pattern: each API call also persists results as integration events for event-sourced state
- Fork-analyze uses fire-and-forget (202 response) since fork+poll+analyze can take 30+ seconds
- AI code context fetches README, file tree (first 50 files), and package.json from the original repo (always available, even if fork is slow)
- Routes integrated into existing github.ts (already has all other GitHub routes) rather than creating a separate github-integration.ts file as plan suggested -- avoids redundant router and duplicate route registration
- SHA deduplication in listRepoCommits prevents double-emitting events for already-linked commits

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Existing files from prior plans covered most planned artifacts**
- **Found during:** Task 1 and Task 2
- **Issue:** Plans 08-02 and 08-04 had already created api.ts (GitHub API functions), webhooks.ts (webhook handler), and github.ts routes (connection, repos, commits, PRs, fork, activity, webhook). The plan expected these to be new files.
- **Fix:** Created the new repos.ts and fork.ts as planned artifacts with their specific APIs (event-persisting operations and AI analysis workflow). Added routes to existing github.ts instead of creating redundant github-integration.ts. Added handleGitHubWebhook alias to existing webhooks.ts.
- **Files modified:** All 4 files listed above
- **Verification:** TypeScript compiles with zero errors, all planned exports exist
- **Committed in:** 6b193f9 and ad69c45

**2. [Rule 1 - Bug] Fixed teamId resolution in fork-analyze route**
- **Found during:** Task 2
- **Issue:** Original plan suggested using req.session.teamId but SessionData type does not include teamId field
- **Fix:** Added teamId as a required field in the forkAnalyzeSchema validation, matching the pattern used by voice routing and email routing routes
- **Files modified:** server/src/routes/github.ts
- **Verification:** TypeScript compiles, schema validates teamId as UUID
- **Committed in:** ad69c45

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both deviations were necessary for correctness. The prior-plan overlap was resolved by creating the specific planned modules while leveraging existing infrastructure. No scope creep.

## Issues Encountered
None

## User Setup Required

None beyond what was already documented in 08-01-SUMMARY.md:
- GITHUB_TOKEN in .env for authenticated API access
- GITHUB_WEBHOOK_SECRET in .env for webhook verification

## Next Phase Readiness
- INTG-03 complete: commits and PRs fetched and stored as integration events with repo linking
- INTG-04 complete: fork + AI code analysis creates idea pool entries
- GitHub webhooks verified and processed for push/PR/fork events
- All routes accessible via REST API under /api/github/*
- Ready for 08-04 (Calendar sync) and subsequent plans

## Self-Check: PASSED

---
*Phase: 08-integrations*
*Completed: 2026-02-08*
