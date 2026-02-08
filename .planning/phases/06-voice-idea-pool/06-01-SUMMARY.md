---
phase: 06-voice-idea-pool
plan: 01
subsystem: api, voice, types
tags: [whisper, multer, event-sourcing, transcription, ai-sdk, idea-pool]

# Dependency graph
requires:
  - phase: 01-foundation-authentication
    provides: Express server, event store, JSONL reducers
  - phase: 04-ai-foundation-orchestration
    provides: AI SDK integration, provider registry, trigger engine
provides:
  - IdeaState and IdeaStatus shared types
  - 9 idea.* event types in EventType union
  - 3 new AI task types (idea_refinement, idea_readiness, voice_routing)
  - Voice transcription pipeline (Whisper via AI SDK)
  - Idea event-sourced reducer with full lifecycle
  - Idea CRUD API routes
affects: [06-voice-idea-pool plans 02-04, client idea components]

# Tech tracking
tech-stack:
  added: [multer@2.0.2, @types/multer@2.0.0]
  patterns: [voice transcription via AI SDK experimental_transcribe, idea aggregate reducer]

key-files:
  created:
    - shared/types/idea.ts
    - server/src/voice/transcribe.ts
    - server/src/routes/voice.ts
    - server/src/events/reducers/idea.ts
    - server/src/routes/ideas.ts
  modified:
    - shared/types/events.ts
    - shared/types/ai.ts
    - server/src/ai/config.ts
    - server/package.json

key-decisions:
  - "Idea aggregate uses 'idea' aggregateType with per-idea aggregateId (same pattern as project)"
  - "Transcription result wraps AI SDK with nullable-to-undefined conversion for clean API"
  - "Archive route prevents archiving graduated ideas (business rule)"

patterns-established:
  - "Voice transcription: multer memoryStorage -> Buffer -> experimental_transcribe -> TranscriptionResult"
  - "Idea reducer: 9 event types with status state machine (capturing -> refining -> ready -> voting -> graduated)"

# Metrics
duration: 5min
completed: 2026-02-08
---

# Phase 6 Plan 1: Idea Pool Foundation Summary

**Shared idea types with 9 event types, Whisper voice transcription via AI SDK experimental_transcribe with multer upload, and event-sourced idea reducer with CRUD API**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-08T16:15:04Z
- **Completed:** 2026-02-08T16:20:47Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Defined IdeaState, IdeaStatus types with READINESS_THRESHOLD (70) and MAX_REFINEMENT_ROUNDS (7) constants
- Extended EventType union with 9 idea.* event types and AiTaskType with 3 new task types plus config presets
- Built voice transcription pipeline: multer handles multipart upload, AI SDK experimental_transcribe wraps Whisper
- Created full idea event-sourced reducer processing all 9 event types through refinement lifecycle
- Built CRUD API routes for ideas (create, list, get by ID, archive) with Zod validation and team ownership checks

## Task Commits

Each task was committed atomically:

1. **Task 1: Define shared types for Idea Pool and extend event/AI types** - `74b4509` (feat)
2. **Task 2: Install multer and build voice transcription pipeline** - `c78d600` (feat)
3. **Task 3: Build idea event-sourced reducer and CRUD API routes** - `a3aa9f4` (feat)

## Files Created/Modified
- `shared/types/idea.ts` - IdeaState, IdeaStatus, READINESS_THRESHOLD, MAX_REFINEMENT_ROUNDS
- `shared/types/events.ts` - Added 9 idea.* event types to union and const array
- `shared/types/ai.ts` - Added idea_refinement, idea_readiness, voice_routing to AiTaskType
- `server/src/ai/config.ts` - Temperature and maxTokens presets for 3 new task types
- `server/package.json` - Added multer and @types/multer dependencies
- `server/src/voice/transcribe.ts` - transcribeAudio wrapper around AI SDK experimental_transcribe
- `server/src/routes/voice.ts` - POST /transcribe endpoint with multer file upload handling
- `server/src/events/reducers/idea.ts` - reduceIdeaState, getIdeaById, getAllIdeas, getIdeasForTeam
- `server/src/routes/ideas.ts` - Idea CRUD routes (POST /, GET /, GET /:id, POST /:id/archive)

## Decisions Made
- Idea aggregate uses "idea" aggregateType with per-idea aggregateId, following the exact project reducer pattern
- TranscriptionResult wraps AI SDK result with nullable-to-undefined conversion for cleaner API surface
- Archive route enforces business rules: cannot archive graduated ideas, cannot double-archive
- Transcription appends to rawInput (not replaces) to support multi-segment voice capture
- multer configured with 25MB limit matching Whisper API constraint

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. OPENAI_API_KEY is already expected from Phase 4 AI Foundation.

## Next Phase Readiness
- Shared types ready for import by client components (Plan 02)
- Voice and idea routes ready for registration in app.ts (Plan 04)
- Idea reducer ready for refinement AI pipeline (Plan 03)
- All 9 event types registered for trigger evaluation

## Self-Check: PASSED

All 9 created/modified files verified present. All 3 task commits (74b4509, c78d600, a3aa9f4) verified in git log.

---
*Phase: 06-voice-idea-pool*
*Completed: 2026-02-08*
