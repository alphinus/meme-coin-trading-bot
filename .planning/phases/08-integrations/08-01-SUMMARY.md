---
phase: 08-integrations
plan: 01
subsystem: integrations
tags: [googleapis, octokit, google-oauth, github, mailparser, ai-sdk, event-sourcing]

# Dependency graph
requires:
  - phase: 04-ai-foundation
    provides: AI provider registry, TASK_MODEL_MAP, AiTaskType union
  - phase: 01-foundation
    provides: Event store, domain event types, reducer pattern
provides:
  - Shared integration domain types (Google, GitHub, Email, Calendar, Search)
  - 18 new integration/search event types in EventType union
  - Google OAuth2 auth module (auth URL, code exchange, token persistence)
  - Octokit lazy singleton client for GitHub API
  - Integration state reducer (event-sourced connection tracking)
  - 4 new AI task types in provider map (email_routing, email_drafting, code_analysis, search)
affects: [08-02-gmail, 08-03-calendar, 08-04-github, 08-05-ai-tools, 08-06-search, 08-07-ui, 08-08-gap-closure]

# Tech tracking
tech-stack:
  added: [googleapis, google-auth-library, "@octokit/rest", "@octokit/webhooks", mailparser]
  patterns: [lazy-singleton-client, token-persistence-in-data-dir, integration-reducer]

key-files:
  created:
    - shared/types/integration.ts
    - server/src/integrations/google/auth.ts
    - server/src/integrations/github/client.ts
    - server/src/events/reducers/integration.ts
  modified:
    - shared/types/events.ts
    - shared/types/ai.ts
    - server/src/ai/providers.ts
    - server/package.json

key-decisions:
  - "Google tokens stored in DATA_DIR/credentials/ filesystem (not event store) -- sensitive credentials, not domain events"
  - "Octokit creates unauthenticated client when GITHUB_TOKEN missing (graceful degradation)"
  - "Integration reducer follows same event-sourcing pattern as project.ts reducer"
  - "AI SDK v6.0.77 and Zod confirmed already present -- no additional install needed for Plan 08-05"

patterns-established:
  - "Token persistence pattern: sensitive credentials in DATA_DIR/credentials/, connection state in event store"
  - "Integration client pattern: lazy singleton with env var check and graceful degradation"
  - "Integration reducer pattern: reduce connection/disconnection events to boolean state"

# Metrics
duration: 5min
completed: 2026-02-08
---

# Phase 8 Plan 01: Integration Foundation Summary

**Integration dependency layer with googleapis/Octokit clients, 15 shared domain types, 18 event types, and event-sourced connection reducer**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-08T21:39:33Z
- **Completed:** 2026-02-08T21:45:10Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Installed googleapis, google-auth-library, @octokit/rest, @octokit/webhooks, mailparser with type definitions
- Created 15 shared integration domain types covering Google OAuth, Gmail, Calendar, GitHub, and Search
- Added 18 new event types to the EventType union and EVENT_TYPES array (17 integration + 1 search)
- Built Google OAuth2 module with auth URL generation, code exchange, and automatic token refresh persistence
- Built Octokit lazy singleton client with graceful unauthenticated fallback
- Created integration state reducer following the established event-sourcing pattern
- Registered 4 new AI task types in TASK_MODEL_MAP (email_routing, email_drafting, code_analysis, search)
- Confirmed AI SDK v6.0.77 and Zod already present for Plan 08-05 tool-calling

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies, verify AI SDK, and define shared integration types** - `ffe1bc4` (feat)
2. **Task 2: Create Google OAuth module, Octokit client, integration reducer, and update AI provider map** - `614bff4` (feat)

## Files Created/Modified
- `shared/types/integration.ts` - 15 domain types for integrations and search (164 lines)
- `shared/types/events.ts` - 18 new event type strings added to union and const array
- `shared/types/ai.ts` - 4 new AI task types added to AiTaskType union
- `server/src/integrations/google/auth.ts` - Google OAuth2 flow (auth URL, code exchange, token persistence)
- `server/src/integrations/github/client.ts` - Octokit lazy singleton client
- `server/src/events/reducers/integration.ts` - Event-sourced integration connection state reducer
- `server/src/ai/providers.ts` - 4 new entries in TASK_MODEL_MAP
- `server/package.json` - New npm dependencies added

## Decisions Made
- Google tokens stored in DATA_DIR/credentials/ (not event store) -- tokens are sensitive credentials, not domain events
- Octokit creates an unauthenticated client when GITHUB_TOKEN is missing rather than returning null (graceful degradation, allows some public API calls)
- Integration reducer follows exact same pattern as project.ts (readEvents -> sort chronologically -> reduce)
- AI SDK and Zod confirmed already installed -- no additional packages needed for Plan 08-05 tool-calling

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

External services require manual configuration before integration features will work:

**Google OAuth (Gmail + Calendar):**
- Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in .env
- Source: Google Cloud Console -> APIs & Services -> Credentials -> OAuth 2.0 Client ID
- Enable Gmail API and Google Calendar API in Google Cloud Console
- Add redirect URI: `http://localhost:3000/api/integrations/google/callback`

**GitHub:**
- Set `GITHUB_TOKEN` in .env
- Source: GitHub -> Settings -> Developer settings -> Personal access tokens
- Set `GITHUB_WEBHOOK_SECRET` in .env (generate with `openssl rand -hex 32`)

## Issues Encountered
None

## Next Phase Readiness
- All shared types ready for Plans 08-02 through 08-08
- Google OAuth module ready for Gmail sync (08-02) and Calendar sync (08-03)
- Octokit client ready for GitHub integration (08-04)
- Integration reducer ready for UI state display (08-07)
- AI task types registered for email routing, drafting, code analysis, search (08-05, 08-06)
- AI SDK v6.0.77 confirmed for tool-calling in Plan 08-05

## Self-Check: PASSED

All 7 files verified present. Both task commits (ffe1bc4, 614bff4) verified in git log. SUMMARY.md created.

---
*Phase: 08-integrations*
*Completed: 2026-02-08*
