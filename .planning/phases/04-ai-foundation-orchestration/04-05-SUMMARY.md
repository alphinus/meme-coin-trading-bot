---
phase: 04-ai-foundation-orchestration
plan: 05
subsystem: ui
tags: [react, hooks, tts, easy-speech, ai-dashboard, react-markdown, inline-styles]

# Dependency graph
requires:
  - phase: 04-02
    provides: "AI member entity, config/status endpoints"
  - phase: 04-03
    provides: "Trigger engine, face emoji notifications"
  - phase: 04-04
    provides: "Cost dashboard API, model/decision override endpoints, mediation endpoint"
provides:
  - "useAiMember hook (config fetch, 30s status polling, update, markMessageRead)"
  - "useAiCost hook (cost summary fetch, per-project fetch)"
  - "useTextToSpeech hook (EasySpeech init, DE/EN voice selection, speak/stop)"
  - "AiTeamMember component (avatar with face emoji, pulsing dot, inline config form)"
  - "AiCostDashboard component (total cost, by-model, by-month tables)"
  - "AiModelOverride component (task type list with model dropdown selectors)"
  - "AiOverrideMenu component (slide-on panel with reason/decision textareas)"
  - "AiMediationView component (side-by-side positions, Markdown compromise, TTS)"
  - "TextToSpeech component (speaker icon, hidden when TTS unavailable)"
  - "AiDashboard page (2/3 + 1/3 grid, full-width override section)"
affects: [05-voice-interface, 06-integrations, 07-notifications]

# Tech tracking
tech-stack:
  added: [easy-speech]
  patterns: [30s-status-polling, face-emoji-mapping, slide-on-menu, provider-tier-model-selector]

key-files:
  created:
    - client/src/hooks/useAiMember.ts
    - client/src/hooks/useAiCost.ts
    - client/src/hooks/useTextToSpeech.ts
    - client/src/components/AiTeamMember.tsx
    - client/src/components/AiCostDashboard.tsx
    - client/src/components/AiModelOverride.tsx
    - client/src/components/AiOverrideMenu.tsx
    - client/src/components/AiMediationView.tsx
    - client/src/components/TextToSpeech.tsx
    - client/src/pages/AiDashboard.tsx
  modified:
    - client/package.json
    - client/src/App.tsx

key-decisions:
  - "Face emoji uses Unicode characters directly (no emoji library) with idle->neutral, thinking->thinking face, suggestion->lightbulb, warning->warning sign, mediation->handshake"
  - "AiOverrideMenu uses CSS translateX slide-on from right with semi-transparent backdrop"
  - "AiMediationView uses react-markdown v10 (Markdown default export) with remark-gfm for compromise rendering"
  - "useTextToSpeech uses EasySpeech.detect() guard before init to avoid errors in non-TTS browsers"
  - "AiCostDashboard formats costs in EUR with 4 decimal places using Intl.NumberFormat"
  - "AiModelOverride uses hardcoded TASK_TYPES list with provider:tier aliases for model selection"

patterns-established:
  - "Slide-on menu pattern: fixed panel (400px), backdrop overlay, CSS transform transition"
  - "Status polling pattern: useRef for interval, 30s poll, silent fail on status checks"
  - "TTS integration pattern: detect > init > findVoice > speak, hidden when unavailable"
  - "Model override pattern: client-side TASK_MODEL_MAP with dropdown, POST on change"

# Metrics
duration: 5min
completed: 2026-02-08
---

# Phase 4 Plan 5: AI Client UI Summary

**React hooks and components for AI team member display, cost dashboard, model/decision override, mediation view, and TTS using easy-speech**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-08T11:59:06Z
- **Completed:** 2026-02-08T12:04:09Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- AI team member visible on dashboard with face emoji indicator (idle/thinking/suggestion/warning/mediation) and 30-second status polling
- Cost dashboard widget showing total cost in EUR, breakdowns by model and by month with sorted tables
- Model override UI with dropdown selectors for all 6 task types using provider:tier aliases
- Decision override slide-on menu (400px, right-side) with mandatory reason and new decision fields
- Mediation view with side-by-side position cards, VS indicator, and Markdown compromise with TTS button
- Text-to-speech component using easy-speech with DE/EN voice selection, auto-hidden when unavailable
- AiDashboard page with 2/3 + 1/3 grid layout and /ai route wired into App.tsx navigation

## Task Commits

Each task was committed atomically:

1. **Task 1: Install easy-speech and create AI hooks** - `9de7388` (feat)
2. **Task 2: Create AI components and AiDashboard page** - `53c24fa` (feat)

## Files Created/Modified
- `client/src/hooks/useAiMember.ts` - AI member config fetch, 30s status polling, updateConfig, markMessageRead
- `client/src/hooks/useAiCost.ts` - Cost summary fetch from /api/ai/cost, per-project fetch method
- `client/src/hooks/useTextToSpeech.ts` - EasySpeech init with detect guard, language-aware voice selection
- `client/src/components/AiTeamMember.tsx` - Avatar with face emoji, pulsing notification dot, inline config form
- `client/src/components/AiCostDashboard.tsx` - Total cost card, by-model and by-month tables with EUR formatting
- `client/src/components/AiModelOverride.tsx` - Task type list with model dropdown, POST /api/ai/override-model on change
- `client/src/components/AiOverrideMenu.tsx` - Slide-on panel (400px), backdrop, reason/decision textareas, POST /api/ai/override-decision
- `client/src/components/AiMediationView.tsx` - Side-by-side positions with VS indicator, Markdown compromise, TTS button
- `client/src/components/TextToSpeech.tsx` - Speaker icon button, toggle speak/stop, hidden when TTS unavailable
- `client/src/pages/AiDashboard.tsx` - Grid layout: AiTeamMember (2/3), AiCostDashboard (1/3), AiModelOverride (full width)
- `client/package.json` - Added easy-speech ^2.4.0 dependency
- `client/src/App.tsx` - Added /ai route and "AI" nav link

## Decisions Made
- Face emoji uses Unicode characters directly (no emoji library): idle -> neutral face, thinking -> thinking face, suggestion -> lightbulb, warning -> warning sign, mediation -> handshake
- AiOverrideMenu slides in from right (CSS translateX) with semi-transparent backdrop overlay
- AiMediationView renders compromise as Markdown using react-markdown v10 default export
- useTextToSpeech uses EasySpeech.detect() guard before init() to gracefully handle non-TTS browsers
- AiCostDashboard formats costs in EUR with 4 decimal places via Intl.NumberFormat
- AiModelOverride uses hardcoded TASK_TYPES array with provider:tier aliases (anthropic:fast, openai:balanced, etc.)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Wired /ai route and nav link into App.tsx**
- **Found during:** Task 2 (component creation)
- **Issue:** Plan specified creating AiDashboard page but did not include wiring it into App.tsx routes
- **Fix:** Added AiDashboard import, /ai Route entry, and "AI" navigation button to App.tsx
- **Files modified:** client/src/App.tsx
- **Verification:** Page accessible via /ai route in navigation
- **Committed in:** 53c24fa (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for the page to be reachable. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All Phase 4 client UI components are complete
- AI team member is visible on the dashboard with configurable persona
- Cost tracking, model override, and decision override UIs are functional
- TTS integration ready for voice interface expansion in future phases
- Mediation view ready to display conflict resolution results
- Phase 4 plan 06 (if exists) or Phase 5 can proceed

## Self-Check: PASSED

All 10 artifact files verified present. Both task commits verified (9de7388, 53c24fa). Client TypeScript compiles cleanly (only pre-existing TS6310 shared project emit config issue). easy-speech in client/package.json confirmed.

---
*Phase: 04-ai-foundation-orchestration*
*Completed: 2026-02-08*
