# Roadmap: Collaborative Project Intelligence

## Milestones

- ✅ **v1.0 MVP** — Phases 1-8 (shipped 2026-02-09)
- ✅ **v1.1 i18n Quality** — Phases 9-11 (shipped 2026-02-09)
- ✅ **v1.2 Guided UX** — Phases 12-17 (shipped 2026-02-10)
- 🚧 **v1.3 SDK Migration & Stabilization** — Phases 18-21 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-8) — SHIPPED 2026-02-09</summary>

- [x] Phase 1: Foundation & Authentication (7/7 plans) — completed 2026-02-08
- [x] Phase 2: Project Lifecycle & Dashboard (5/5 plans) — completed 2026-02-08
- [x] Phase 3: Documentation Engine (4/4 plans) — completed 2026-02-08
- [x] Phase 4: AI Foundation & Orchestration (6/6 plans) — completed 2026-02-08
- [x] Phase 5: GSD Workflow Engine (3/3 plans) — completed 2026-02-08
- [x] Phase 6: Voice & Idea Pool (4/4 plans) — completed 2026-02-08
- [x] Phase 7: Telegram Bot & Notifications (6/6 plans) — completed 2026-02-08
- [x] Phase 8: External Integrations & AI Search (8/8 plans) — completed 2026-02-09

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 i18n Quality (Phases 9-11) — SHIPPED 2026-02-09</summary>

- [x] Phase 9: Fix Umlauts (1/1 plan) — completed 2026-02-09
- [x] Phase 10: Client i18n Coverage (4/4 plans) — completed 2026-02-09
- [x] Phase 11: Telegram Bot i18n (4/4 plans) — completed 2026-02-09

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v1.2 Guided UX (Phases 12-17) — SHIPPED 2026-02-10</summary>

- [x] Phase 12: Infrastructure & Safety (3/3 plans) — completed 2026-02-10
- [x] Phase 13: Agent Session Manager & SSE Streaming (3/3 plans) — completed 2026-02-10
- [x] Phase 14: GitHub Analysis (2/2 plans) — completed 2026-02-10
- [x] Phase 15: Simple/Expert Mode (2/2 plans) — completed 2026-02-10
- [x] Phase 16: GSD Command Registry (4/4 plans) — completed 2026-02-10
- [x] Phase 17: Guided Wizards (5/5 plans) — completed 2026-02-10

Full details: `.planning/milestones/v1.2-ROADMAP.md`

</details>

### 🚧 v1.3 SDK Migration & Stabilization (In Progress)

**Milestone Goal:** Migrate all AI calls from API-key-based AI SDK v6 to subscription-based Agent SDK, replace cloud transcription with local whisper.cpp, adopt new SDK features for better session UX, and stabilize all v1.2 features through systematic verification and polish. End state: zero API keys, zero per-token costs, everything runs on Claude Max subscription.

#### Phase 18: SDK Auth & Cleanup
**Goal**: Agent sessions run on Claude subscription auth with a clean, up-to-date SDK and no deprecated options
**Depends on**: Phase 17 (v1.2 complete)
**Requirements**: SDKA-01, SDKA-02, SDKA-03, SDKA-04, SDKA-05
**Success Criteria** (what must be TRUE):
  1. User can start an agent session with CLAUDE_CODE_OAUTH_TOKEN set and no ANTHROPIC_API_KEY -- session completes successfully using subscription quota
  2. Server startup logs display which auth method is active (subscription vs API key) so the operator knows what billing path is in use
  3. Server emits a visible warning at startup when both ANTHROPIC_API_KEY and CLAUDE_CODE_OAUTH_TOKEN are set, preventing silent billing surprises
  4. SDK version is 0.2.38 and `npm run build` completes with zero TypeScript errors
  5. The persistSession option is gone from session-manager.ts -- sessions start and resume without passing deprecated options
**Plans**: 2 plans

Plans:
- [x] 18-01-PLAN.md -- Remove persistSession from resume() and bump SDK to v0.2.38
- [x] 18-02-PLAN.md -- Add startup auth detection/logging, capture apiKeySource, update .env.example

#### Phase 19: AI Function Migration
**Goal**: Every AI-powered feature in the application uses the Agent SDK warm session pattern instead of AI SDK v6 direct API calls -- no API keys remain in the codebase, no per-token billing occurs
**Depends on**: Phase 18 (subscription auth validated)
**Requirements**: AIMIG-01, AIMIG-02, AIMIG-03, AIMIG-04, AIMIG-05
**Success Criteria** (what must be TRUE):
  1. A warm Agent SDK session stays open and handles lightweight AI calls (search routing, email drafting, soul reflections, etc.) without a ~12s cold start per call -- response latency for simple AI tasks is under 3 seconds
  2. All 15 generateText/streamText call sites across 17 server files are replaced -- `grep -r "generateText\|streamText" server/src/` returns zero matches, and `grep -r "@ai-sdk/anthropic\|@ai-sdk/openai" server/src/` returns zero matches
  3. Voice transcription (web upload and Telegram voice messages) produces text output using local whisper.cpp -- no network call to OpenAI Whisper API occurs, and OPENAI_API_KEY is not required
  4. The .env file and codebase contain zero references to ANTHROPIC_API_KEY or OPENAI_API_KEY -- `grep -r "ANTHROPIC_API_KEY\|OPENAI_API_KEY" server/` returns only documentation/comments explaining the removal
  5. The AI cost dashboard reflects the subscription model -- it no longer displays per-token cost breakdowns and instead shows session count, duration, and subscription status
**Plans**: 7 plans (6 original + 1 gap closure)

Plans:
- [x] 19-01-PLAN.md -- Warm Agent Session Singleton (create warm-session.ts, integrate into app.ts startup)
- [x] 19-02-PLAN.md -- Gateway Function Migration (rewrite generateAiResponse, runAiTools, tool definitions)
- [x] 19-03-PLAN.md -- Search Tool Reimplementation (rewrite aiSearch, search tools as plain functions)
- [x] 19-04-PLAN.md -- Voice Transcription Migration (rewrite transcribeAudio to use local whisper.cpp)
- [x] 19-05-PLAN.md -- API Key Removal & Package Cleanup (delete providers.ts, uninstall AI SDK packages, remove API keys)
- [x] 19-06-PLAN.md -- Cost Dashboard Update (rewrite tracker/dashboard for subscription usage model)
- [x] 19-07-PLAN.md -- Gap Closure: API Key Documentation & Credential Hygiene (gap_closure)

#### Phase 20: SDK Feature Adoption
**Goal**: Agent sessions surface richer information -- users see why sessions ended, sessions survive server restarts, and session IDs are predictable
**Depends on**: Phase 19 (all AI calls on Agent SDK)
**Requirements**: SDKF-01, SDKF-02, SDKF-03, SDKF-04
**Success Criteria** (what must be TRUE):
  1. When an agent session ends, the UI displays the stop reason (task complete, budget exceeded, or max turns) so the user knows what happened without guessing
  2. After a server restart, previously active sessions are discovered via listSessions() and surfaced in the UI as resumable -- not silently lost
  3. Agent sessions use deterministic IDs based on project ID, so pause/resume targets the correct session without fragile in-memory lookups
  4. At server startup, auth health check calls accountInfo() or equivalent and logs whether the configured token is valid -- invalid tokens are caught before any user triggers a session
**Plans**: 2 plans

Plans:
- [ ] 20-01-PLAN.md -- Stop reason surfacing in UI + deterministic session IDs from project ID
- [ ] 20-02-PLAN.md -- Session recovery after server restart + auth health check via accountInfo()

#### Phase 21: Stabilization
**Goal**: All v1.2 features are verified working end-to-end, bugs are fixed, and UX rough edges are polished across wizards, modes, and navigation
**Depends on**: Phase 20 (SDK features adopted)
**Requirements**: STAB-01, STAB-02, STAB-03, STAB-04, STAB-05
**Success Criteria** (what must be TRUE):
  1. All 23 pending v1.2 verification tests have been executed and results documented -- every test has a pass/fail outcome recorded
  2. All failures identified in the verification pass are fixed -- re-running those tests produces passing results
  3. Guided wizards (onboarding, idea creation, idea-to-project) work smoothly without confusing transitions, broken steps, or missing translations
  4. Simple/Expert mode toggle works correctly -- switching modes updates the UI immediately without page reload, and mode-specific elements appear/disappear as expected
  5. Navigation and command palette (Cmd+K) work reliably -- commands execute, search filters correctly, and no dead-end states exist
**Plans**: TBD

Plans:
- [ ] 21-01: TBD
- [ ] 21-02: TBD
- [ ] 21-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 18 → 19 → 20 → 21

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Authentication | v1.0 | 7/7 | Complete | 2026-02-08 |
| 2. Project Lifecycle & Dashboard | v1.0 | 5/5 | Complete | 2026-02-08 |
| 3. Documentation Engine | v1.0 | 4/4 | Complete | 2026-02-08 |
| 4. AI Foundation & Orchestration | v1.0 | 6/6 | Complete | 2026-02-08 |
| 5. GSD Workflow Engine | v1.0 | 3/3 | Complete | 2026-02-08 |
| 6. Voice & Idea Pool | v1.0 | 4/4 | Complete | 2026-02-08 |
| 7. Telegram Bot & Notifications | v1.0 | 6/6 | Complete | 2026-02-08 |
| 8. External Integrations & AI Search | v1.0 | 8/8 | Complete | 2026-02-09 |
| 9. Fix Umlauts | v1.1 | 1/1 | Complete | 2026-02-09 |
| 10. Client i18n Coverage | v1.1 | 4/4 | Complete | 2026-02-09 |
| 11. Telegram Bot i18n | v1.1 | 4/4 | Complete | 2026-02-09 |
| 12. Infrastructure & Safety | v1.2 | 3/3 | Complete | 2026-02-10 |
| 13. Agent Session Manager & SSE Streaming | v1.2 | 3/3 | Complete | 2026-02-10 |
| 14. GitHub Analysis | v1.2 | 2/2 | Complete | 2026-02-10 |
| 15. Simple/Expert Mode | v1.2 | 2/2 | Complete | 2026-02-10 |
| 16. GSD Command Registry | v1.2 | 4/4 | Complete | 2026-02-10 |
| 17. Guided Wizards | v1.2 | 5/5 | Complete | 2026-02-10 |
| 18. SDK Auth & Cleanup | v1.3 | 2/2 | Complete | 2026-02-10 |
| 19. AI Function Migration | v1.3 | 7/7 | Complete | 2026-02-10 |
| 20. SDK Feature Adoption | v1.3 | 0/2 | Planned | - |
| 21. Stabilization | v1.3 | 0/TBD | Not started | - |
