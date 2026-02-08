---
phase: 06-voice-idea-pool
plan: 03
subsystem: ui
tags: [react, voice-recording, mediarecorder, formdata, idea-pool, refinement, graduation]

# Dependency graph
requires:
  - phase: 06-01
    provides: IdeaState types, idea CRUD API, voice transcription endpoint
  - phase: 06-02
    provides: Voice routing analysis, AI refinement, graduation voting API
provides:
  - apiUpload helper for multipart FormData uploads
  - useVoiceRecorder hook wrapping MediaRecorder API
  - useIdeaPool hook wrapping all idea API calls
  - VoiceRecorder component with record/transcribe/text fallback
  - IdeaCard, IdeaRefinement, IdeaGraduation UI components
  - IdeaPool page composing voice-first idea management experience
affects: [06-voice-idea-pool, integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [apiUpload for FormData, MediaRecorder hook pattern, voice-first page layout]

key-files:
  created:
    - client/src/hooks/useVoiceRecorder.ts
    - client/src/hooks/useIdeaPool.ts
    - client/src/components/VoiceRecorder.tsx
    - client/src/components/IdeaCard.tsx
    - client/src/components/IdeaRefinement.tsx
    - client/src/components/IdeaGraduation.tsx
    - client/src/pages/IdeaPool.tsx
  modified:
    - client/src/api/client.ts

key-decisions:
  - "apiUpload omits Content-Type header so browser auto-sets multipart boundary"
  - "useVoiceRecorder detects best MIME type from webm/opus, webm, mp4 candidates"
  - "IdeaPool page uses two-column layout with sticky detail panel"

patterns-established:
  - "apiUpload pattern for FormData alongside apiCall for JSON"
  - "Voice recording hook encapsulates MediaRecorder lifecycle and error handling"
  - "Routing suggestions panel pattern for voice-to-destination routing"

# Metrics
duration: 7min
completed: 2026-02-08
---

# Phase 6 Plan 3: Idea Pool Client Components Summary

**Voice recorder with MediaRecorder API, idea management hooks, AI refinement chat UI, graduation voting, and IdeaPool page composing voice-first experience**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-08T16:32:57Z
- **Completed:** 2026-02-08T16:39:41Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- apiUpload helper handles multipart FormData uploads without manual Content-Type
- useVoiceRecorder hook wraps MediaRecorder with auto-stop at 5 minutes, MIME detection, and error handling
- useIdeaPool hook provides full idea lifecycle management (CRUD, refine, answer, override, propose, vote, archive, route)
- VoiceRecorder component provides record/stop/transcribe flow with text fallback textarea
- IdeaCard shows title, colored status badge, readiness score, refinement rounds
- IdeaRefinement renders readiness score bar, AI question bubble, answer input, missing items checklist
- IdeaGraduation handles propose/vote/graduated states with per-member vote tracking
- IdeaPool page composes everything into voice-first two-column layout with routing suggestions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add apiUpload, useVoiceRecorder, VoiceRecorder** - `782173d` (feat)
2. **Task 2: Build useIdeaPool, IdeaCard, IdeaRefinement, IdeaGraduation** - `cf71109` (feat)
3. **Task 3: Build IdeaPool page** - `9f5aaf4` (feat)

## Files Created/Modified
- `client/src/api/client.ts` - Added apiUpload for FormData uploads
- `client/src/hooks/useVoiceRecorder.ts` - MediaRecorder wrapper with duration tracking
- `client/src/hooks/useIdeaPool.ts` - Full idea lifecycle state management hook
- `client/src/components/VoiceRecorder.tsx` - Record/transcribe UI with text fallback
- `client/src/components/IdeaCard.tsx` - Idea list card with status badge and metadata
- `client/src/components/IdeaRefinement.tsx` - AI Q&A loop with readiness scoring
- `client/src/components/IdeaGraduation.tsx` - Graduation propose/vote/success views
- `client/src/pages/IdeaPool.tsx` - Main page composing all components

## Decisions Made
- apiUpload omits Content-Type header so the browser auto-sets the multipart boundary correctly
- useVoiceRecorder tries audio/webm;codecs=opus first, then audio/webm, then audio/mp4 for browser compatibility
- IdeaPool page uses two-column layout (idea list left, detail panel right) with sticky positioning
- Routing suggestions appear inline after transcription, allowing user to pick existing project or create new idea
- IdeaRefinement always shown for ready/voting/graduated ideas alongside IdeaGraduation (for context)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Stale shared types build caused TS6305 errors for idea.ts imports; resolved by running `npx tsc --build shared` before client check.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All client components compile and are ready for integration
- IdeaPool page needs route registration in the app router (Plan 04)
- Voice and idea API routes need registration in app.ts (Plan 04)

## Self-Check: PASSED

All 8 files verified present. All 3 task commits verified (782173d, cf71109, 9f5aaf4). Summary file exists.

---
*Phase: 06-voice-idea-pool*
*Completed: 2026-02-08*
