---
phase: 08-integrations
plan: 02
subsystem: integrations
tags: [gmail-api, googleapis, email-routing, email-drafting, ai-generate, historyId-polling, rest-api]

# Dependency graph
requires:
  - phase: 08-integrations
    plan: 01
    provides: Google OAuth2 auth module, shared integration types, AI task types (email_routing, email_drafting)
  - phase: 04-ai-foundation
    provides: AI provider registry, generateAiResponse wrapper
  - phase: 06-voice
    provides: Voice routing pattern (analyzeVoiceRouting) mirrored for email routing
provides:
  - Gmail polling with historyId-based incremental sync
  - AI-powered email-to-project routing (mirrors voice routing pattern)
  - AI email draft generation with pending review workflow
  - Email parser for Gmail API message payloads
  - Full integration REST API (OAuth, polling, emails, drafts)
affects: [08-07-ui, 08-08-gap-closure]

# Tech tracking
tech-stack:
  added: []
  patterns: [historyId-polling, fire-and-forget-ai-routing, draft-lifecycle-events, recursive-gmail-parts-walker]

key-files:
  created:
    - server/src/integrations/email/parser.ts
    - server/src/integrations/email/router.ts
    - server/src/integrations/email/drafter.ts
  modified:
    - server/src/integrations/google/gmail.ts
    - server/src/routes/integrations.ts

key-decisions:
  - "Email router uses per-field args (subject, body, sender) not EmailMessage object -- matches voice routing pattern more closely"
  - "Gmail polling uses fire-and-forget AI routing per message (not awaited) to avoid blocking the poll loop"
  - "OAuth callback redirects to /integrations page rather than returning JSON"
  - "Disconnect route deletes stored tokens file for clean disconnection"
  - "Draft lifecycle uses event-sourced state: created -> updated -> sent/rejected"

patterns-established:
  - "Gmail historyId checkpoint: store latest historyId in integration.gmail_synced event, poll only changes since last checkpoint"
  - "Email draft lifecycle: AI generates pending draft -> user reviews -> approve (send) or reject, all tracked via integration events"
  - "Email router mirrors voice router: generateAiResponse with task type, JSON parse, validate, clamp confidence, keyword fallback"

# Metrics
duration: 6min
completed: 2026-02-08
---

# Phase 8 Plan 02: Gmail Polling, AI Email Routing, and Draft Management Summary

**Gmail historyId-based inbox polling with fire-and-forget AI email routing, draft generation via email_drafting task type, and comprehensive integration REST API**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-08T22:52:58Z
- **Completed:** 2026-02-08T22:59:06Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created email parser with recursive Gmail parts walker (extractGmailParts) and header extraction for Gmail API payloads
- Built Gmail historyId-based inbox polling with 60-second interval, automatic email_received event emission, and fire-and-forget AI routing per new message
- Implemented AI email router mirroring voice routing pattern (generateAiResponse with email_routing, JSON parse, validate, confidence clamp, keyword fallback)
- Created AI email drafter generating draft replies via email_drafting task type with full draft lifecycle (pending/sent/rejected)
- Built comprehensive integration REST API with OAuth flow, polling control, email management, and draft CRUD routes

## Task Commits

Each task was committed atomically:

1. **Task 1: Email parser and Gmail polling with AI routing wiring** - `279c3c7` (feat)
2. **Task 2: AI email router, AI email drafter, and integration REST routes** - `16ef018` (feat)

## Files Created/Modified
- `server/src/integrations/email/parser.ts` - Email parser with extractGmailParts recursive walker and extractHeaders (162 lines)
- `server/src/integrations/email/router.ts` - AI email-to-project routing mirroring voice routing pattern (147 lines)
- `server/src/integrations/email/drafter.ts` - AI email draft generation, Gmail send, draft lifecycle management (365 lines)
- `server/src/integrations/google/gmail.ts` - Extended with pollGmailInbox, getGmailSyncState, startGmailPolling, stopGmailPolling (523 lines)
- `server/src/routes/integrations.ts` - Full REST API: OAuth, status, polling, emails, drafts, legacy routes (987 lines)

## Decisions Made
- Email router uses per-field args (subject, body, sender, teamId, language) rather than EmailMessage object -- matches voice routing pattern more closely and allows the polling code to pass parsed fields directly
- Gmail polling uses fire-and-forget AI routing per message (wrapped in async IIFE that is not awaited) to avoid blocking the poll loop
- OAuth callback redirects to `/integrations` page rather than returning JSON response
- Disconnect route now deletes the stored tokens file for a clean disconnection (not just event emission)
- Draft lifecycle is fully event-sourced: email_draft_created -> email_draft_updated (rejected) or email_sent

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created email/router.ts in Task 1 to unblock gmail.ts compilation**
- **Found during:** Task 1 (Gmail polling with AI routing wiring)
- **Issue:** gmail.ts imports analyzeEmailRouting from ../email/router.js but router.ts is specified as a Task 2 file. TypeScript would not compile without it.
- **Fix:** Created the email router as part of Task 1 to satisfy the import dependency. The router was fully implemented (not a stub).
- **Files modified:** server/src/integrations/email/router.ts
- **Verification:** npx tsc --noEmit passes
- **Committed in:** 279c3c7 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking dependency)
**Impact on plan:** Router creation was moved from Task 2 to Task 1 to satisfy import dependency. No scope change -- the file was implemented exactly as planned, just in an earlier task.

## Issues Encountered
None

## Next Phase Readiness
- Gmail polling module ready for UI integration (08-07)
- Email routing and draft APIs ready for frontend consumption
- Draft lifecycle events ready for notification wiring
- All email functionality accessible via REST API at /api/integrations/

## Self-Check: PASSED

All 5 files verified present. Both task commits (279c3c7, 16ef018) verified in git log. SUMMARY.md created.

---
*Phase: 08-integrations*
*Completed: 2026-02-08*
