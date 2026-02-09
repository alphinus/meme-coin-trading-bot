---
phase: 07-telegram-bot-notifications
plan: 04
subsystem: telegram, workflow, voice
tags: [grammy, telegram-bot, voice-transcription, workflow-interaction, inline-keyboard, fire-and-forget]

# Dependency graph
requires:
  - phase: 07-telegram-bot-notifications
    plan: 01
    provides: "grammY bot instance, BotContext type, Telegram-Eluma user linking, auth module"
  - phase: 05-gsd-workflow-engine
    provides: "Workflow engine (getWorkflowState, completeWorkflowStep), step definitions"
  - phase: 06-voice-idea-pool
    provides: "Voice transcription (transcribeAudio), routing analysis (analyzeVoiceRouting), idea aggregate"
provides:
  - "GSD workflow step rendering as Telegram menus (button_choice, text_input, info_display, ai_prompt, auto_advance)"
  - "Workflow callback handler for inline keyboard button presses (wf: prefix)"
  - "Voice message handler with fire-and-forget transcription and routing suggestions"
  - "Voice routing callback handler for project routing and idea creation (vr: prefix)"
  - "Free text handler routing to pending workflow text_input steps"
affects: [07-telegram-bot-notifications]

# Tech tracking
tech-stack:
  added: []
  patterns: ["fire-and-forget voice processing (immediate ack, background transcription)", "session-based pending input for text_input workflow steps", "callback data prefix routing (wf: for workflow, vr: for voice routing)"]

key-files:
  created:
    - server/src/telegram/menus/workflow-menu.ts
    - server/src/telegram/handlers/callback.ts
    - server/src/telegram/handlers/voice.ts
    - server/src/telegram/handlers/text.ts
  modified: []

key-decisions:
  - "Workflow steps use i18n titleKey/descriptionKey as readable fallback text (strip prefix, replace underscores with spaces)"
  - "Callback data format 'wf:{stepId}:{value}' with step IDs truncated to 20 chars for Telegram 64-byte limit"
  - "Voice routing creates idea with generic title since transcription text is not available in callback context"
  - "Text handler clears pendingWorkflowInput after successful step completion to prevent duplicate submissions"

patterns-established:
  - "Callback prefix routing: wf: for workflow buttons, vr: for voice routing buttons"
  - "Session pendingWorkflowInput: text_input and ai_prompt steps set session state, text handler reads and clears"
  - "Fire-and-forget voice: immediate reply, background task for download/transcribe/route, edit original message with results"

# Metrics
duration: 4min
completed: 2026-02-08
---

# Phase 7 Plan 4: GSD Workflow & Voice Interaction Summary

**Telegram workflow step rendering as inline keyboards with voice transcription/routing and session-based free text capture for text_input steps**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-08T18:12:35Z
- **Completed:** 2026-02-08T18:17:05Z
- **Tasks:** 2
- **Files created:** 4

## Accomplishments
- GSD workflow steps render as appropriate Telegram UI: inline keyboard buttons for choices, text prompts for input, auto-advance for automated steps
- Voice messages acknowledged immediately via fire-and-forget, transcribed in background using existing Whisper pipeline, routing suggestions presented as inline buttons
- Free text messages route to pending workflow text_input/ai_prompt steps via session state, or show help message
- Existing workflow engine, voice transcription, and routing analysis reused directly (no HTTP self-calls)

## Task Commits

Each task was committed atomically:

1. **Task 1: Build workflow menu and callback handler** - `6600005` (feat)
2. **Task 2: Build voice message and free text handlers** - `6868e9a` (feat)

## Files Created/Modified
- `server/src/telegram/menus/workflow-menu.ts` - Renders workflow steps as Telegram messages with inline keyboards; handles auto_advance, phase transitions, lifecycle completion
- `server/src/telegram/handlers/callback.ts` - Handles "wf:" callback queries from workflow step button presses, completes steps via engine
- `server/src/telegram/handlers/voice.ts` - Downloads voice from Telegram, transcribes via Whisper, analyzes routing, shows suggestion buttons; handles "vr:" routing callbacks
- `server/src/telegram/handlers/text.ts` - Routes free text to pending workflow text_input steps or shows help

## Decisions Made
- Used i18n titleKey/descriptionKey as readable fallback text (strip "workflow.phase." prefix, replace underscores with spaces) since i18n plugin locale files are not yet configured
- Callback data format "wf:{stepId}:{value}" keeps step IDs truncated to 20 chars to stay within Telegram's 64-byte callback data limit
- Voice routing "vr:idea_pool:new" callback creates an idea with generic title since the original transcription text is not available in the callback context (can be enhanced in Plan 05)
- Text handler clears session.pendingWorkflowInput after successful step completion to prevent duplicate step submissions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required beyond what Plan 07-01 already specifies (TELEGRAM_BOT_TOKEN, OPENAI_API_KEY).

## Next Phase Readiness
- Workflow interaction handlers ready for registration on bot instance (Plan 07-03 or 07-05 integration)
- Voice handler ready for registration: bot.on("message:voice", handleVoiceMessage)
- Text handler ready for registration: bot.on("message:text", handleTextMessage) -- must be registered AFTER command handlers
- Callback handlers ready: bot.callbackQuery(/^wf:/, handleWorkflowCallback) and bot.callbackQuery(/^vr:/, handleVoiceRoutingCallback)

## Self-Check: PASSED

All 4 created files verified present. Both task commits (6600005, 6868e9a) verified in git log.

---
*Phase: 07-telegram-bot-notifications*
*Completed: 2026-02-08*
