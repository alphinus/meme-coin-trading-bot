---
phase: 01-foundation-authentication
plan: 01
subsystem: infra, api, events
tags: [express, vite, react, typescript, monorepo, jsonl, event-sourcing, event-store]

# Dependency graph
requires:
  - phase: none
    provides: "First plan, no prior dependencies"
provides:
  - Express + ViteExpress server serving React SPA at localhost:3000
  - Shared TypeScript types (DomainEvent, User, Team, Project, ApiResponse)
  - JSONL event store with append, read, and crash recovery
  - Event projector with generic reducer replay and disk caching
  - Activity feed API at GET /api/events
  - Zod validation middleware factory
  - Typed fetch wrapper for client-server communication
affects: [01-02, 01-03, 01-04, 01-05, 01-06, 01-07, phase-2]

# Tech tracking
tech-stack:
  added: [express, vite, vite-express, react, react-dom, react-router-dom, helmet, compression, cors, zod, uuid, express-session, session-file-store, tsx, concurrently, typescript]
  patterns: [npm-workspaces-monorepo, jsonl-event-store, vite-express-spa-serving, api-response-wrapper]

key-files:
  created:
    - package.json (root monorepo config)
    - shared/types/events.ts (DomainEvent interface, EventType union)
    - shared/types/models.ts (User, Team, Project, SystemCapability)
    - shared/types/api.ts (ApiResponse, ApiError)
    - server/src/app.ts (Express app with middleware and routes)
    - server/src/index.ts (ViteExpress startup)
    - server/src/events/store.ts (JSONL event store core)
    - server/src/events/types.ts (CreateEventInput, EventFilter)
    - server/src/events/projector.ts (Event replay projector)
    - server/src/events/feed.ts (Activity feed)
    - server/src/routes/events.ts (Events API routes)
    - server/src/middleware/validate.ts (Zod validation middleware)
    - client/src/App.tsx (React Router with placeholder routes)
    - client/src/api/client.ts (Typed fetch wrapper)
  modified: []

key-decisions:
  - "ViteExpress serves React SPA from Express via inlineViteConfig pointing to client/ directory"
  - "One JSONL file per aggregate type (user.jsonl, team.jsonl, etc.) for locality"
  - "appendFileSync for event writes (atomic under PIPE_BUF), async fs/promises for reads"
  - "Crash recovery via validateLastLine on startup truncates partial JSON lines"
  - "npm strict-ssl disabled for development environment (SSL cert issue)"

patterns-established:
  - "Pattern: ApiResponse<T> wrapper for all API endpoints"
  - "Pattern: JSONL append-only event store with aggregate-type file partitioning"
  - "Pattern: Event projector replays events through reducer to derive current state"
  - "Pattern: Zod schema validation middleware factory for Express routes"
  - "Pattern: Shared types package referenced by both server and client via workspace"

# Metrics
duration: 51min
completed: 2026-02-08
---

# Phase 1 Plan 1: Project Foundation Summary

**Express+Vite+React monorepo with npm workspaces, shared TypeScript types, and JSONL event store with crash recovery and activity feed API**

## Performance

- **Duration:** 51 min
- **Started:** 2026-02-08T00:03:12Z
- **Completed:** 2026-02-08T00:54:42Z
- **Tasks:** 2
- **Files modified:** 28

## Accomplishments
- Full monorepo scaffold with server (Express+ViteExpress), client (React+Vite), and shared (types) packages all compiling cleanly
- JSONL event store supporting atomic append, filtered reads, and cross-aggregate queries sorted by timestamp
- Crash recovery that detects and truncates corrupted partial JSON lines on startup
- Event projector for replaying events through reducers with optional disk-cached projections
- Activity feed API filtering out system-internal events, ready for UI timeline consumption

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold monorepo with Express + Vite + React + shared types** - `92aa114` (feat)
2. **Task 2: Implement filesystem-based JSONL event store with projector and feed** - `b2ce8e6` (feat)

## Files Created/Modified
- `package.json` - Root monorepo config with npm workspaces and dev/build scripts
- `tsconfig.json` - Root TypeScript config with project references
- `.gitignore` - Standard exclusions (node_modules, dist, .env, data/sessions)
- `.env.example` - Environment variable template
- `shared/types/events.ts` - DomainEvent interface, EventType union, EVENT_TYPES array
- `shared/types/models.ts` - User, PasskeyCredential, Team, Project, SystemCapability interfaces
- `shared/types/api.ts` - ApiResponse<T> and ApiError types
- `server/src/app.ts` - Express app with helmet, compression, cors, health endpoint, events router
- `server/src/index.ts` - ViteExpress startup with client directory config
- `server/src/middleware/validate.ts` - Zod validation middleware factory
- `server/src/events/types.ts` - CreateEventInput and EventFilter types
- `server/src/events/store.ts` - JSONL event store (appendEvent, readEvents, readAllEvents, initEventStore)
- `server/src/events/projector.ts` - Event replay projector with projection caching
- `server/src/events/feed.ts` - Activity feed wrapper (getActivityFeed)
- `server/src/routes/events.ts` - GET /api/events and GET /api/events/:aggregateType
- `client/src/App.tsx` - React Router with Dashboard, Login, Setup, Settings placeholders
- `client/src/api/client.ts` - Typed apiCall fetch wrapper
- `client/src/main.tsx` - React entry point
- `client/index.html` - HTML template
- `client/vite.config.ts` - Vite config with React plugin and API proxy

## Decisions Made
- Used ViteExpress with inlineViteConfig to serve client from Express, avoiding separate dev servers
- Chose one JSONL file per aggregate type for file locality and manageable sizes
- Used synchronous appendFileSync for write atomicity (events well under 4KB PIPE_BUF)
- Used async fs/promises for all read operations in route handlers
- Set @types/express to ^4.17.21 (^5.0.0 was specified but that version line doesn't exist)
- Had to disable npm strict-ssl for this development environment due to SSL certificate issue

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ViteExpress could not find client vite.config.ts**
- **Found during:** Task 1 (server startup verification)
- **Issue:** ViteExpress looks for vite.config.ts in cwd by default, but client config is in client/ directory. Express returned an error page instead of the React SPA.
- **Fix:** Added ViteExpress.config() with inlineViteConfig setting root to client directory
- **Files modified:** server/src/index.ts
- **Verification:** curl localhost:3000 returns Vite-processed HTML with React HMR
- **Committed in:** 92aa114 (Task 1 commit)

**2. [Rule 3 - Blocking] @types/express@^5.0.0 does not exist**
- **Found during:** Task 1 (npm install)
- **Issue:** Plan specified @types/express@^5.0.0 but the latest available version is in the 4.x line
- **Fix:** Changed to @types/express@^4.17.21
- **Files modified:** server/package.json
- **Verification:** npm install and tsc --build succeed
- **Committed in:** 92aa114 (Task 1 commit)

**3. [Rule 3 - Blocking] npm SSL certificate issue**
- **Found during:** Task 1 (npm install)
- **Issue:** npm install hung indefinitely due to "UNABLE_TO_GET_ISSUER_CERT_LOCALLY" SSL error
- **Fix:** Set npm config strict-ssl=false for this development environment
- **Verification:** npm install completed successfully
- **Committed in:** N/A (npm config change, not in repo)

---

**Total deviations:** 3 auto-fixed (3 blocking)
**Impact on plan:** All fixes necessary to complete Task 1. No scope creep. ViteExpress config is the correct approach for monorepo setups.

## Issues Encountered
- npm install hung silently for several minutes before discovering it was an SSL certificate issue (UNABLE_TO_GET_ISSUER_CERT_LOCALLY). Diagnosis required testing in an isolated directory with verbose output.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Monorepo foundation is complete and ready for all subsequent plans
- Authentication (Plan 02) can add passkey/password endpoints to the existing Express app
- i18n (Plan 03) can add language middleware and client translations
- Team management (Plan 04) can use the event store for team CRUD
- Event store is the backbone -- all future state changes flow through appendEvent
- Auth middleware TODO comments are in place at GET /api/events routes

## Self-Check: PASSED

All 20 created files verified present. Both task commits (92aa114, b2ce8e6) verified in git log. SUMMARY.md exists at expected path.

---
*Phase: 01-foundation-authentication*
*Completed: 2026-02-08*
