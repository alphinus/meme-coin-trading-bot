# Roadmap: Collaborative Project Intelligence

## Overview

This roadmap delivers a web application for structured collaboration between Elvis and Mario at Eluma GmbH, combining event-driven documentation, Soul Documents, a rule-bound AI team member, and a GSD execution engine -- all accessible through a web UI and fully mirrored Telegram bot. The 8 phases progress from foundational data architecture through core project management, documentation, AI intelligence, workflow automation, voice input, Telegram access, and external integrations. Each phase delivers a coherent, verifiable capability that builds on what came before.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Authentication** - Event-sourced data layer, passkey/password auth, team management, i18n framework, local filesystem memory, native deployment *(Completed 2026-02-08)*
- [ ] **Phase 2: Project Lifecycle & Dashboard** - Project CRUD, 8-phase lifecycle, ROI/KPI tracking, global dashboard
- [ ] **Phase 3: Documentation Engine** - Soul Documents, event-driven appends, Meta Soul Document, GDPR soft-delete
- [ ] **Phase 4: AI Foundation & Orchestration** - Multi-provider AI team member with cost controls, triggers, and conflict mediation
- [ ] **Phase 5: GSD Workflow Engine** - Button-driven GSD pipeline integrated into project lifecycle
- [ ] **Phase 6: Voice & Idea Pool** - In-app audio recording, AI transcription, idea staging area, graduation flow
- [ ] **Phase 7: Telegram Bot & Notifications** - Full-mirror Telegram bot with voice support and configurable multi-channel notifications
- [ ] **Phase 8: External Integrations & AI Search** - Gmail, Google Calendar, GitHub integrations, and AI-steered navigation

## Phase Details

### Phase 1: Foundation & Authentication
**Goal**: Users can sign in, create teams, and operate within a real-time event-sourced platform with German/English support, running natively on local hardware with a filesystem-based memory system
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, I18N-01, INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06
**Success Criteria** (what must be TRUE):
  1. User can sign in with passkey/password and remain signed in across browser refreshes
  2. User can create a team and invite another person by email
  3. All team members can see all projects within their team (open visibility)
  4. User can switch the UI between German and English, and the choice persists
  5. Every state change in the system is stored as an append-only event with a correlation ID (verifiable in dev tools or filesystem)
  6. App runs natively on local hardware via pm2/systemd without Docker, and is portable via system image
  7. Local filesystem memory system is active with per-project folders, per-member Markdown files, Git-backed versioning, and filesystem allowlist protection
  8. Per-project GitHub repositories can be auto-created and linked from within the app
**Plans**: 7 plans

Plans:
- [x] 01-01-PLAN.md -- Project foundation: monorepo scaffolding + JSONL event store
- [x] 01-02-PLAN.md -- Authentication: passkey/password with filesystem credential storage
- [x] 01-03-PLAN.md -- i18n (DE/EN) + deployment config (pm2, install scripts)
- [x] 01-04-PLAN.md -- Team management + dashboard with activity feed
- [x] 01-05-PLAN.md -- Filesystem memory system with Git versioning + path security
- [x] 01-06-PLAN.md -- GitHub repo auto-creation + setup wizard with system discovery
- [x] 01-07-PLAN.md -- End-to-end verification checkpoint

### Phase 2: Project Lifecycle & Dashboard
**Goal**: Users can create and manage projects through the mandatory 8-phase lifecycle with full ROI/KPI visibility
**Depends on**: Phase 1
**Requirements**: PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05, PROJ-06, PROJ-07
**Success Criteria** (what must be TRUE):
  1. User can create a project with name, description, and assigned team members, and it appears in browser-tab-like navigation
  2. Every project progresses through all 8 lifecycle phases in order with no phase skippable
  3. User can view ROI/KPI metrics per decision, per phase, and aggregated across all projects
  4. Completed projects (post Phase 8) automatically move to a dedicated archive tab
  5. User can view a global overview dashboard showing status distribution via pie charts and aggregated ROI/KPI across all projects
**Plans**: 4 plans

Plans:
- [ ] 02-01-PLAN.md -- Backend: shared types, project reducer, and all API routes
- [ ] 02-02-PLAN.md -- Client hooks, project list page, and browser-tab navigation
- [ ] 02-03-PLAN.md -- Project detail page with lifecycle phases and ROI/KPI UI
- [ ] 02-04-PLAN.md -- Dashboard overview with pie chart, archive tab, and e2e verification

### Phase 3: Documentation Engine
**Goal**: Every significant event is automatically captured in append-only documents, and each team member has a living Soul Document
**Depends on**: Phase 2
**Requirements**: DOCS-01, DOCS-02, DOCS-03, DOCS-04, DOCS-05, DOCS-06
**Success Criteria** (what must be TRUE):
  1. Each team member has a persistent, append-only Soul Document that grows from their voice messages, text inputs, decisions, and AI reflections
  2. Every decision, assumption, status change, KPI evaluation, AI intervention, override, and pattern match triggers an immediate append-only write with timestamp and source type
  3. A Meta Soul Document is auto-generated at team level, surfacing thinking errors, biases, abort patterns, and over/under-engineering tendencies
  4. User can soft-delete any document entry for GDPR compliance, and the entry is marked as deleted but preserved in the audit log
  5. User can view their Soul Document, the AI perspective on their patterns, and the Meta Soul Document from dedicated views
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD
- [ ] 03-03: TBD

### Phase 4: AI Foundation & Orchestration
**Goal**: A visible, rule-bound AI team member operates across multiple providers with cost transparency, acting only on defined triggers
**Depends on**: Phase 3
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07, AI-08, AI-09, AI-10, AI-11, I18N-02
**Success Criteria** (what must be TRUE):
  1. AI appears as a named team member on the dashboard and displays a face emoji when it has something to communicate
  2. AI acts only on defined triggers (milestones, pattern recognition, catch logic) and never initiates unprompted free-form actions
  3. AI responses are delivered via text and optionally via text-to-speech, in the project's configured language (German or English)
  4. User can view an AI cost dashboard widget showing costs per project, per model, and per month, and can manually override the model for any AI node
  5. When team members disagree, AI can mediate by analyzing both positions and proposing a documented compromise
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD
- [ ] 04-03: TBD
- [ ] 04-04: TBD

### Phase 5: GSD Workflow Engine
**Goal**: Every approved project runs the full GSD pipeline through a button-driven interface that non-techies can navigate
**Depends on**: Phase 2, Phase 4
**Requirements**: GSD-01, GSD-02, GSD-03, GSD-04, GSD-05
**Success Criteria** (what must be TRUE):
  1. Every project that receives a "Go" at Decision Point (Phase 6 of the project lifecycle) automatically enters the GSD pipeline
  2. All GSD terminal prompts appear as clickable UI buttons (Yes/No/Continue/option selections) with no terminal knowledge required
  3. Freeform text input fields appear only when GSD explicitly needs text input, and are hidden otherwise
  4. Context management operations (like /clear) happen invisibly behind the scenes without user intervention
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

### Phase 6: Voice & Idea Pool
**Goal**: Users can capture ideas by voice, and raw ideas flow through AI-guided refinement into GSD-ready projects
**Depends on**: Phase 4
**Requirements**: VOIC-01, VOIC-02, VOIC-03, VOIC-04, VOIC-05
**Success Criteria** (what must be TRUE):
  1. User can record audio directly in the web app and AI transcribes it accurately
  2. AI analyzes transcribed voice input and routes it to the correct project (with user confirmation)
  3. Idea Pool serves as a visible pre-project staging area where voice-first input is the primary capture method
  4. AI deep-questions each idea's initial input iteratively until the markdown quality meets GSD-readiness standards before allowing project creation
  5. Ideas graduate to full projects when team members explicitly agree
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD
- [ ] 06-03: TBD

### Phase 7: Telegram Bot & Notifications
**Goal**: Users can perform all core workflows from Telegram with voice support, and receive configurable notifications across all channels
**Depends on**: Phase 5, Phase 6
**Requirements**: TELE-01, TELE-02, TELE-03, TELE-04, TELE-05, TELE-06, NOTF-01
**Success Criteria** (what must be TRUE):
  1. Telegram bot mirrors full web app workflow capability including project navigation, status updates, and GSD interactions
  2. User can navigate projects and trigger actions via slash commands and button-based mini GUI in Telegram
  3. User can send a voice message via Telegram, AI transcribes it, recognizes the project from context (or guides via buttons), and routes it correctly
  4. Offline voice messages are queued by Telegram and processed when connectivity returns
  5. User can configure notifications per user, per channel (web, Telegram, email), and per priority level
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD
- [ ] 07-03: TBD

### Phase 8: External Integrations & AI Search
**Goal**: The platform connects to Gmail, Google Calendar, and GitHub, and users can navigate all data with natural-language AI queries
**Depends on**: Phase 4, Phase 2
**Requirements**: INTG-01, INTG-02, INTG-03, INTG-04, INTG-05, SRCH-01
**Success Criteria** (what must be TRUE):
  1. Emails forwarded to the app are analyzed by AI and automatically routed to the correct project
  2. Google Calendar meetings are linked to projects, and post-meeting prompts appear automatically
  3. GitHub commits and PRs are linked to projects, and a user can input a GitHub URL to fork a repo with AI code analysis feeding into the idea pool
  4. AI prepares email drafts that team members review, confirm, and send from within the app
  5. User can ask natural-language questions like "show me all open decisions in Project X" and receive accurate, AI-powered results
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD
- [ ] 08-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Authentication | 7/7 | Complete | 2026-02-08 |
| 2. Project Lifecycle & Dashboard | 0/4 | Not started | - |
| 3. Documentation Engine | 0/TBD | Not started | - |
| 4. AI Foundation & Orchestration | 0/TBD | Not started | - |
| 5. GSD Workflow Engine | 0/TBD | Not started | - |
| 6. Voice & Idea Pool | 0/TBD | Not started | - |
| 7. Telegram Bot & Notifications | 0/TBD | Not started | - |
| 8. External Integrations & AI Search | 0/TBD | Not started | - |
