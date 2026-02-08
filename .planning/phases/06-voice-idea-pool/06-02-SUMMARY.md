---
phase: 06-voice-idea-pool
plan: 02
subsystem: api, ai
tags: [voice-routing, idea-refinement, readiness-scoring, graduation, ai-sdk, event-sourcing]

# Dependency graph
requires:
  - phase: 06-01
    provides: Idea types, event types, idea reducer, voice transcription, CRUD routes
  - phase: 04-01
    provides: generateAiResponse wrapper, provider registry, AI config presets
provides:
  - Voice routing analysis (AI determines target project or Idea Pool)
  - Idea refinement loop (question generation + readiness scoring)
  - Graduation workflow (propose -> vote -> execute with project creation)
affects: [06-03, 06-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [AI JSON-structured output with fallback parsing, unanimous voting with AI-member exclusion]

key-files:
  created:
    - server/src/voice/router-analysis.ts
    - server/src/idea-pool/refinement.ts
    - server/src/idea-pool/graduation.ts
  modified:
    - server/src/routes/voice.ts
    - server/src/routes/ideas.ts

key-decisions:
  - "Voice routing falls back to idea_pool on AI parse failure (safe default)"
  - "Readiness scoring uses 4 GSD dimensions at 25 points each (problem/audience/feasibility/effort)"
  - "AI role members excluded from graduation voting requirements (only human members vote)"
  - "Auto-graduation executes immediately when final vote makes it unanimous"

patterns-established:
  - "AI JSON output pattern: system prompt enforces JSON-only, response parsed with try/catch fallback"
  - "Graduation voting: unanimous human approval required, AI members excluded from quorum"

# Metrics
duration: 5min
completed: 2026-02-08
---

# Phase 6 Plan 2: AI Voice Routing, Refinement Loop, and Graduation Summary

**AI-powered voice routing with confidence scoring, iterative idea refinement via 4-dimension readiness assessment, and unanimous-vote graduation to project creation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-08T16:24:02Z
- **Completed:** 2026-02-08T16:29:20Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Voice routing analyzes transcribed text against team projects, returns up to 3 ranked suggestions with confidence scores
- Refinement loop generates focused questions targeting weakest GSD dimension, then auto-assesses readiness across 4 dimensions (0-25 each)
- Graduation workflow with propose/vote/execute flow, auto-graduation on unanimous human approval, and project creation from idea data

## Task Commits

Each task was committed atomically:

1. **Task 1: Build voice routing analysis** - `7501938` (feat)
2. **Task 2: Build AI refinement loop with readiness scoring** - `52cf324` (feat)
3. **Task 3: Build graduation voting and idea-to-project promotion** - `c5fbc1b` (feat)

## Files Created/Modified
- `server/src/voice/router-analysis.ts` - AI voice routing: analyzes text against projects, returns RoutingSuggestion[]
- `server/src/idea-pool/refinement.ts` - Refinement question generation and 4-dimension readiness scoring
- `server/src/idea-pool/graduation.ts` - Graduation proposal, voting, and project creation logic
- `server/src/routes/voice.ts` - Added POST /route endpoint with Zod validation
- `server/src/routes/ideas.ts` - Added 6 endpoints: refine, answer, override-ready, propose-graduation, vote, graduate

## Decisions Made
- Voice routing falls back to idea_pool suggestion (confidence 50) when AI parsing fails -- safe default prevents user confusion
- Readiness scoring uses 4 GSD dimensions at 25 points each: problem clarity, target audience, feasibility, effort/scope
- AI role team members excluded from graduation voting requirements -- only human members need to approve
- Auto-graduation triggers immediately when the final vote creates unanimous approval (no separate trigger needed)
- Override-ready allows both 'capturing' and 'refining' status ideas to be force-readied (flexibility for fast-tracking)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Voice routing, refinement loop, and graduation are complete
- Ready for Plan 03 (client UI for Idea Pool) and Plan 04 (integration into app.ts)
- All 9 idea event types are now covered by routes and business logic

## Self-Check: PASSED

- All 5 files verified (3 created, 2 modified)
- All 3 task commits confirmed (7501938, 52cf324, c5fbc1b)
- TypeScript compilation clean (npx tsc --noEmit)

---
*Phase: 06-voice-idea-pool*
*Completed: 2026-02-08*
