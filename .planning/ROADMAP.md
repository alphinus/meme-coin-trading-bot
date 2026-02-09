# Roadmap: Collaborative Project Intelligence

## Milestones

- ✅ **v1.0 MVP** — Phases 1-8 (shipped 2026-02-09)
- ✅ **v1.1 i18n Quality** — Phases 9-11 (shipped 2026-02-09)
- 🚧 **v1.2 Guided UX** — Phases 12-17 (in progress)

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

### 🚧 v1.2 Guided UX (In Progress)

**Milestone Goal:** Transform Eluma from an expert-only tool into a guided platform with Simple/Expert toggle, wizard-driven flows, GitHub URL auto-analysis, and Claude Code as backend execution engine with dynamic GSD buttons.

- [x] **Phase 12: Infrastructure & Safety** — Agent SDK installation, PM2 tuning, SSE compression fix, graceful shutdown (completed 2026-02-10)
- [ ] **Phase 13: Agent Session Manager & SSE Streaming** — Server-side session lifecycle and real-time browser output
- [ ] **Phase 14: GitHub Analysis** — Read-only repo analysis via Octokit with auto-idea creation
- [ ] **Phase 15: Simple/Expert Mode** — Mode toggle, persistence, and conditional UI rendering
- [ ] **Phase 16: GSD Command Registry** — Dynamic command discovery, context-dependent buttons, pause/resume
- [ ] **Phase 17: Guided Wizards** — Onboarding, idea creation, idea-to-project, and GSD step wizards with i18n

## Phase Details

### Phase 12: Infrastructure & Safety
**Goal**: Server can run Claude Agent SDK sessions safely without crashes, memory limits, or SSE buffering
**Depends on**: Phase 11 (v1.1 complete)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05
**Success Criteria** (what must be TRUE):
  1. Server starts with @anthropic-ai/claude-agent-sdk installed and can instantiate an Agent SDK session that calls query()
  2. PM2 does not restart the server during an agent session due to memory limits
  3. SSE responses stream to the browser incrementally without compression middleware buffering (flush-on-write verified)
  4. Agent sessions only have access to explicitly allowlisted tools (canUseTool handler rejects unlisted tools)
  5. Stopping the server with SIGTERM cleans up any active agent sessions before exit
**Plans**: 3 plans

Plans:
- [x] 12-01-PLAN.md — Agent SDK install, types, tool permissions, PM2 config
- [x] 12-02-PLAN.md — SSE writer, session manager, graceful shutdown, test endpoint
- [x] 12-03-PLAN.md — Gap closure: emit SSE 'status' event during graceful shutdown cleanup

### Phase 13: Agent Session Manager & SSE Streaming
**Goal**: Users see real-time Claude Code output streaming in their browser and can control (abort) running sessions
**Depends on**: Phase 12
**Requirements**: AGENT-01, AGENT-02, AGENT-03, AGENT-04, AGENT-05
**Success Criteria** (what must be TRUE):
  1. User clicks a GSD action button and sees streaming text output appear token-by-token in the browser
  2. Server tracks active agent sessions in memory and enforces one session per project at a time
  3. User can click an abort button during streaming and the agent session stops within seconds, freeing resources
  4. If the SSE connection drops (network blip), the client automatically reconnects and resumes from the last received event
  5. Agent output renders with proper markdown formatting including code blocks, headers, and lists
**Plans**: 3 plans

Plans:
- [ ] 13-01-PLAN.md — Server hardening: per-project session enforcement, SSE event IDs, reconnection replay, buffer increase
- [ ] 13-02-PLAN.md — Client hardening: EventSource reconnection fix, reconnecting status, syntax highlighting
- [ ] 13-03-PLAN.md — GSD action button integration in ProjectDetail, i18n keys, human verification

### Phase 14: GitHub Analysis
**Goal**: Users can paste a GitHub URL and get instant AI-powered repository analysis with an auto-generated idea in the pool
**Depends on**: Phase 12 (uses Agent SDK for AI analysis), existing Octokit integration from Phase 8
**Requirements**: GH-01, GH-02, GH-03, GH-04
**Success Criteria** (what must be TRUE):
  1. User pastes a GitHub repo URL in the web UI and sees README summary, tech stack, and file structure within seconds
  2. AI automatically generates a project idea from the analysis and it appears in the Idea Pool
  3. User pastes a GitHub URL in Telegram and receives the same analysis results plus idea auto-creation
  4. No write operations occur against GitHub -- all API calls are read-only (no forks, no commits, no PRs)
**Plans**: TBD

Plans:
- [ ] 14-01: TBD
- [ ] 14-02: TBD

### Phase 15: Simple/Expert Mode
**Goal**: Non-technical users see a clean, reduced interface while power users retain full feature access
**Depends on**: Nothing (standalone UI concern, can parallelize with Phase 14)
**Requirements**: MODE-01, MODE-02, MODE-03, MODE-04, MODE-05
**Success Criteria** (what must be TRUE):
  1. User can toggle between Simple and Expert mode via a switch in the app header
  2. Mode preference survives page reload and new browser sessions (persisted in localStorage)
  3. Simple mode shows only Ideas, Projects, and current GSD action -- Soul Documents, KPI dashboard, AI config, and notification settings are hidden
  4. In Simple mode, detail sections (project metadata, event history) are collapsed by default but can be expanded by clicking
  5. Expert mode displays every feature exactly as it works today with zero behavior changes
**Plans**: TBD

Plans:
- [ ] 15-01: TBD
- [ ] 15-02: TBD

### Phase 16: GSD Command Registry
**Goal**: GSD action buttons auto-discover available commands and adapt to project state, with pause/resume for multi-project workflows
**Depends on**: Phase 13 (buttons trigger agent sessions)
**Requirements**: GSD-01, GSD-02, GSD-03, GSD-04, GSD-05, GSD-06, GSD-07
**Success Criteria** (what must be TRUE):
  1. Server reads GSD commands from the plugin directory and serves a registry API that lists all available commands with labels and descriptions
  2. UI shows only GSD buttons relevant to the current project's state (e.g., no "plan phase" if phase is already planned)
  3. Each GSD button displays a label and a brief description underneath explaining what it does
  4. In Expert mode, Cmd+K opens a command palette where user can search and execute any GSD command with fuzzy matching
  5. User can pause active GSD work on one project and resume it later, independently of other projects' GSD sessions
**Plans**: TBD

Plans:
- [ ] 16-01: TBD
- [ ] 16-02: TBD
- [ ] 16-03: TBD

### Phase 17: Guided Wizards
**Goal**: New and non-technical users are guided through every major workflow with step-by-step wizards in both languages
**Depends on**: Phase 13 (streaming output display), Phase 14 (GitHub analysis), Phase 15 (mode context), Phase 16 (GSD command buttons)
**Requirements**: WIZ-01, WIZ-02, WIZ-03, WIZ-04, WIZ-05, GATE-01, GATE-02, GATE-03, GATE-04
**Success Criteria** (what must be TRUE):
  1. First-time user sees an onboarding wizard that explains the Idea-to-Project-to-Execution flow with clear visual steps
  2. Idea creation wizard walks user through choosing input type (text, voice, or GitHub link), providing input, and seeing the idea land in the pool
  3. Idea-to-project wizard presents GSD deep questions one per screen with clear action buttons, guiding the user through the full questioning phase
  4. GSD workflow steps display as guided cards with a single action button, explanation text, and a progress indicator
  5. All wizard text uses i18n keys and renders correctly in both German and English
  6. User cannot convert an idea to a project or create a project without completing all mandatory GSD questions — blocked in both Simple and Expert mode
  7. Clear progress indicator shows which questions are answered and which remain before project creation unlocks
**Plans**: TBD

Plans:
- [ ] 17-01: TBD
- [ ] 17-02: TBD
- [ ] 17-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 12 -> 13 -> 14 -> 15 -> 16 -> 17
Note: Phase 14 and Phase 15 have no mutual dependency and could be parallelized.

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
| 13. Agent Session Manager & SSE Streaming | v1.2 | 0/3 | Planned | - |
| 14. GitHub Analysis | v1.2 | 0/TBD | Not started | - |
| 15. Simple/Expert Mode | v1.2 | 0/TBD | Not started | - |
| 16. GSD Command Registry | v1.2 | 0/TBD | Not started | - |
| 17. Guided Wizards | v1.2 | 0/TBD | Not started | - |
