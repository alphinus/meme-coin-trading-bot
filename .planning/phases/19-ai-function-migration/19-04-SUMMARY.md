---
phase: 19-ai-function-migration
plan: 04
subsystem: voice
tags: [whisper.cpp, child_process, transcription, local-binary, audio]

# Dependency graph
requires:
  - phase: none
    provides: "standalone - no prior phase dependency"
provides:
  - "transcribeAudio() using local whisper-cli binary via child_process.execFile"
  - "Environment variable overrides: WHISPER_CLI_PATH, WHISPER_MODEL_PATH"
  - "Mock fallback on whisper.cpp failure for reliability"
affects: [19-05-api-key-removal, voice-routes, telegram-voice-handler]

# Tech tracking
tech-stack:
  added: ["whisper.cpp local binary (already built)"]
  patterns: ["Local binary invocation via child_process.execFile for audio transcription", "Temp file write/cleanup in finally block"]

key-files:
  created: []
  modified: ["server/src/voice/transcribe.ts"]

key-decisions:
  - "Local whisper.cpp replaces OpenAI Whisper API for zero cloud cost and no API key dependency"
  - "Mock fallback preserved on whisper.cpp failure to keep voice flow testable"
  - "ggml-small.bin model chosen for quality/speed balance"

patterns-established:
  - "Local binary invocation: write buffer to temp file, execFile with timeout, cleanup in finally"
  - "Environment variable overrides for binary and model paths"

# Metrics
duration: 2min
completed: 2026-02-10
---

# Phase 19 Plan 04: Voice Transcription Migration Summary

**Local whisper.cpp transcription via child_process.execFile replacing OpenAI Whisper API with zero cloud dependency**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-10T20:09:22Z
- **Completed:** 2026-02-10T20:11:07Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Replaced OpenAI Whisper API (AI SDK experimental_transcribe + @ai-sdk/openai) with local whisper.cpp binary
- Audio buffer written to temp file, transcribed by whisper-cli, temp file cleaned up in finally block
- Same function signature and export shape preserved -- zero changes needed in callers (routes/voice.ts, telegram/handlers/voice.ts)
- Mock fallback on failure preserved for reliability and testing without whisper.cpp
- Environment variable overrides (WHISPER_CLI_PATH, WHISPER_MODEL_PATH) for deployment flexibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite transcribeAudio() to use local whisper-cli** - `613197c` (feat)

**Plan metadata:** `9710123` (docs: complete plan)

## Files Created/Modified
- `server/src/voice/transcribe.ts` - Rewritten from OpenAI Whisper API to local whisper.cpp binary invocation

## Decisions Made
- Used ggml-small.bin model (487MB) for good quality/speed balance over ggml-base.bin (148MB) or ggml-tiny.en.bin (78MB)
- 60-second timeout for whisper-cli execution to handle long audio files
- 4 threads for whisper-cli to balance CPU usage with transcription speed
- No audio format conversion added (whisper-cli natively supports ogg, wav, mp3, flac which covers the upload types)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - whisper.cpp binary and models are already built and available at `/Users/developer/whisper.cpp/`.

## Next Phase Readiness
- Voice transcription fully migrated to local whisper.cpp
- Plan 19-05 (API Key Removal) can now safely remove OPENAI_API_KEY since voice transcription no longer depends on it
- Both callers (web voice upload route and Telegram voice handler) work unchanged with the new implementation

## Self-Check: PASSED

- FOUND: server/src/voice/transcribe.ts
- FOUND: commit 613197c
- FOUND: 19-04-SUMMARY.md

---
*Phase: 19-ai-function-migration*
*Completed: 2026-02-10*
