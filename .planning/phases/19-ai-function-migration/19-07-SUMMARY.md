---
phase: 19-ai-function-migration
plan: 07
subsystem: infra
tags: [credential-hygiene, env, gitignore, dead-code-removal, subscription-auth]

# Dependency graph
requires:
  - phase: 19-05
    provides: API key removal and subscription-only auth model
provides:
  - Clean .env with zero real credentials (placeholders only)
  - Documented .env.example with AI key removal explanation
  - .env.local for local credential storage (gitignored)
  - Zero claudeApiKey references in entire codebase
  - Setup wizard without API key input field
affects: [20-testing-verification, 21-launch-readiness]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Node v22 --env-file multi-file loading (.env + .env.local)"
    - ".env.local pattern for local-only credentials"

key-files:
  created:
    - .env.local
  modified:
    - .env
    - .env.example
    - .gitignore
    - server/package.json
    - server/src/system/config.ts
    - server/src/routes/system.ts
    - client/src/components/SetupWizard/Step3System.tsx
    - client/src/hooks/useSystemCapabilities.ts
    - client/src/i18n/locales/en.json
    - client/src/i18n/locales/de.json

key-decisions:
  - ".env.local pattern for credential separation instead of vault or secrets manager"
  - "Node v22 --env-file multi-file loading instead of dotenv library"

patterns-established:
  - ".env.local for real credentials, .env for safe defaults and documentation"
  - "Integration keys (Telegram, GitHub, Google) stored separately from app config"

# Metrics
duration: 5min
completed: 2026-02-10
---

# Phase 19 Plan 07: Gap Closure Summary

**Credential hygiene via .env.local separation, API key documentation in .env.example, and complete claudeApiKey dead code removal from server config, routes, wizard, hook, and i18n**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-10T21:36:59Z
- **Completed:** 2026-02-10T21:42:23Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- Moved 4 real integration credentials (Telegram, GitHub, Google) from .env to .env.local (gitignored)
- Documented AI generation key removal (ANTHROPIC_API_KEY, OPENAI_API_KEY) in .env.example with clear distinction from kept integration keys
- Removed all claudeApiKey dead code from 6 files: SystemConfig interface, Zod schema, POST handler, setup wizard input/styles, hook parameter/body, and EN/DE i18n keys
- Updated dev script to load both .env and .env.local via Node v22 --env-file flags

## Task Commits

Each task was committed atomically:

1. **Task 1: Move real credentials to .env.local and clean .env** - `e897883` (chore)
2. **Task 2: Update .env.example with API key removal documentation** - `e0cba18` (docs)
3. **Task 3: Remove claudeApiKey dead code from wizard, hook, config, and route** - `e80aaba` (fix)

## Files Created/Modified
- `.env` - Rewritten with safe defaults and placeholder values only (gitignored)
- `.env.local` - Created with real integration credentials (gitignored)
- `.env.example` - Documented API key removal with AI/integration key distinction
- `.gitignore` - Added .env.local entry
- `server/package.json` - Dev script loads both .env and .env.local
- `server/src/system/config.ts` - Removed claudeApiKey from SystemConfig interface
- `server/src/routes/system.ts` - Removed claudeApiKey from Zod schema and POST handler
- `client/src/components/SetupWizard/Step3System.tsx` - Removed API key input field, state, and styles
- `client/src/hooks/useSystemCapabilities.ts` - Removed claudeApiKey parameter from saveCapabilities
- `client/src/i18n/locales/en.json` - Removed claude_api_key and claude_api_key_hint keys
- `client/src/i18n/locales/de.json` - Removed claude_api_key and claude_api_key_hint keys

## Decisions Made
- Used .env.local pattern for credential separation (simple, no external tooling, Node v22 native support)
- Used Node v22 --env-file multi-file loading instead of dotenv (already the project pattern, second file overrides first)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Existing credentials were moved from .env to .env.local automatically.

## Next Phase Readiness
- Phase 19 gap closure complete - all 5/5 verification truths now pass
- .env contains zero real credentials, .env.example documents the change
- Setup wizard presents subscription-only auth path (no API key field)
- Ready for Phase 20 or next milestone work

## Self-Check: PASSED

- All 4 created/modified files verified on disk
- All 3 task commits (e897883, e0cba18, e80aaba) found in git history
- 9/9 plan verification checks pass

---
*Phase: 19-ai-function-migration*
*Completed: 2026-02-10*
