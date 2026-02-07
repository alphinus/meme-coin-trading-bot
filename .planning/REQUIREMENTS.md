# Requirements: Collaborative Project Intelligence

**Defined:** 2026-02-07
**Core Value:** No project dies without a documented decision, and every thought trail is fully reconstructable.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication & Teams

- [ ] **AUTH-01**: User can sign in with Google OAuth
- [ ] **AUTH-02**: User can create a team and invite members by email
- [ ] **AUTH-03**: User session persists across browser refresh
- [ ] **AUTH-04**: All team members see all projects (open visibility)

### Project Management

- [ ] **PROJ-01**: User can create a project with name, description, and assigned team members
- [ ] **PROJ-02**: Projects display in browser-tab-like navigation
- [ ] **PROJ-03**: Every project follows the mandatory 8-phase lifecycle (Idea, Feasibility, Effort Estimate, ROI/KPI Initial Assessment, Risks & Dependencies, Decision Point, Implementation, Review & Pattern Extraction)
- [ ] **PROJ-04**: No project phase can be skipped
- [ ] **PROJ-05**: User can view ROI/KPI per decision, per phase, and aggregated across all projects
- [ ] **PROJ-06**: Completed projects move to a dedicated archive tab
- [ ] **PROJ-07**: User can view a global overview dashboard with status distribution, pie charts, and aggregated ROI/KPI

### Documentation & Soul Documents

- [ ] **DOCS-01**: Each team member has a persistent, append-only Soul Document capturing thinking patterns
- [ ] **DOCS-02**: Soul Documents are fed from voice messages, text inputs, decisions, and AI reflections
- [ ] **DOCS-03**: A Meta Soul Document is auto-generated at team level, detecting thinking errors, biases, abort patterns, and over/under-engineering
- [ ] **DOCS-04**: Every decision, assumption, status change, KPI evaluation, AI intervention, override, and pattern match triggers an immediate append-only write
- [ ] **DOCS-05**: Every document entry includes timestamp and source type (audio, text, decision, AI reflection)
- [ ] **DOCS-06**: Soft-delete mechanism for GDPR compliance (marked as deleted, kept in audit log)

### AI Team Member

- [ ] **AI-01**: AI acts as a visible team member with configurable name and character per team
- [ ] **AI-02**: AI displays a face emoji on the dashboard when it has something to say
- [ ] **AI-03**: AI can speak responses via text-to-speech
- [ ] **AI-04**: AI communicates in the project's language (German or English)
- [ ] **AI-05**: AI acts only on defined triggers (milestones, pattern recognition, catch logic) — never free-improvising
- [ ] **AI-06**: Multi-provider AI orchestration (Anthropic, OpenAI, etc.) with auto model selection by task type
- [ ] **AI-07**: LLM temperature tuning per context/task type
- [ ] **AI-08**: Manual model override per AI node, visible in UI, documented
- [ ] **AI-09**: AI cost dashboard widget showing costs per project, per model, per month
- [ ] **AI-10**: Override mechanism for AI decisions (hidden in slide-on menu), fully documented and audited
- [ ] **AI-11**: AI mediates team conflicts by analyzing both positions and proposing compromise

### GSD Workflow Engine

- [ ] **GSD-01**: Every project that receives a "Go" at Phase 6 enters the full GSD pipeline
- [ ] **GSD-02**: GSD terminal prompts are translated into UI buttons (Yes/No/Continue/option selections)
- [ ] **GSD-03**: Freeform text input appears only when GSD needs it
- [ ] **GSD-04**: Context management (/clear etc.) is handled invisibly behind the scenes
- [ ] **GSD-05**: Non-techies can navigate the full GSD pipeline via buttons without terminal knowledge

### Telegram Bot

- [ ] **TELE-01**: Telegram bot mirrors full web app workflow capability
- [ ] **TELE-02**: Slash commands with button-based mini GUI for project navigation
- [ ] **TELE-03**: User can send voice messages via Telegram, AI transcribes and routes to correct project
- [ ] **TELE-04**: AI recognizes project from voice context or guides via Telegram buttons
- [ ] **TELE-05**: Status updates and next-step prompts delivered within Telegram
- [ ] **TELE-06**: Offline voice messages are queued and synced when connection returns

### Voice & Idea Pool

- [ ] **VOIC-01**: User can record audio directly in the web app
- [ ] **VOIC-02**: AI transcribes voice input and routes to the correct project
- [ ] **VOIC-03**: Idea Pool serves as a pre-project staging area with voice-first input
- [ ] **VOIC-04**: AI deep-questions initial input until markdown quality is GSD-ready before project creation
- [ ] **VOIC-05**: Ideas graduate to projects when team members agree

### Integrations

- [ ] **INTG-01**: Emails forwarded to the app are analyzed by AI and routed to the correct project
- [ ] **INTG-02**: Google Calendar meetings are linked to projects with post-meeting prompts
- [ ] **INTG-03**: GitHub commits and PRs are linked to projects
- [ ] **INTG-04**: User can input a GitHub URL to fork a repo, AI analyzes the code, and it enters the idea pool
- [ ] **INTG-05**: AI prepares email drafts that team members confirm and send

### Search & Navigation

- [ ] **SRCH-01**: AI-steered navigation ("Show me all open decisions in Project X")

### Notifications

- [ ] **NOTF-01**: Fully configurable notifications per user, per channel (web, Telegram, email), per priority level

### Infrastructure & Hosting

- [ ] **INFRA-01**: App runs natively on local hardware without Docker (pm2/systemd managed processes)
- [ ] **INFRA-02**: Hardware-agnostic deployment via system image (portable to new machines)
- [ ] **INFRA-03**: Local filesystem memory system with per-project folders and per-member named Markdown files
- [ ] **INFRA-04**: Filesystem blacklist protecting system-critical paths from autonomous AI writes
- [ ] **INFRA-05**: Git-backed versioning of all Markdown memory files on local disk
- [ ] **INFRA-06**: Per-project GitHub repositories auto-created and linked from within the app

### Internationalization

- [ ] **I18N-01**: UI available in German and English
- [ ] **I18N-02**: AI communicates in project language

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Storage Optimization

- **STOR-01**: Automatic structural consolidation at 50k token threshold (no content compression)
- **STOR-02**: Consolidation references original source logs

### Authentication Expansion

- **AUTH-05**: User can sign up/log in with email and password
- **AUTH-06**: Role-based permissions (admin, member, viewer) per project

### Voice Expansion

- **VOIC-06**: User can upload audio files for transcription

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Gamification | Contradicts the serious, focused nature of the tool |
| Chat messaging | This is a project intelligence tool, not a messenger |
| Daily summary logic | Event-driven, not time-driven |
| Blackbox AI | Every AI action must be transparent and auditable |
| Auto-deletion or compression of thoughts | Append-only philosophy |
| Native mobile app | Telegram handles all mobile workflows |
| External workflow tools (n8n etc.) | Self-contained system |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1: Foundation & Authentication | Pending |
| AUTH-02 | Phase 1: Foundation & Authentication | Pending |
| AUTH-03 | Phase 1: Foundation & Authentication | Pending |
| AUTH-04 | Phase 1: Foundation & Authentication | Pending |
| I18N-01 | Phase 1: Foundation & Authentication | Pending |
| INFRA-01 | Phase 1: Foundation & Authentication | Pending |
| INFRA-02 | Phase 1: Foundation & Authentication | Pending |
| INFRA-03 | Phase 1: Foundation & Authentication | Pending |
| INFRA-04 | Phase 1: Foundation & Authentication | Pending |
| INFRA-05 | Phase 1: Foundation & Authentication | Pending |
| INFRA-06 | Phase 1: Foundation & Authentication | Pending |
| PROJ-01 | Phase 2: Project Lifecycle & Dashboard | Pending |
| PROJ-02 | Phase 2: Project Lifecycle & Dashboard | Pending |
| PROJ-03 | Phase 2: Project Lifecycle & Dashboard | Pending |
| PROJ-04 | Phase 2: Project Lifecycle & Dashboard | Pending |
| PROJ-05 | Phase 2: Project Lifecycle & Dashboard | Pending |
| PROJ-06 | Phase 2: Project Lifecycle & Dashboard | Pending |
| PROJ-07 | Phase 2: Project Lifecycle & Dashboard | Pending |
| DOCS-01 | Phase 3: Documentation Engine | Pending |
| DOCS-02 | Phase 3: Documentation Engine | Pending |
| DOCS-03 | Phase 3: Documentation Engine | Pending |
| DOCS-04 | Phase 3: Documentation Engine | Pending |
| DOCS-05 | Phase 3: Documentation Engine | Pending |
| DOCS-06 | Phase 3: Documentation Engine | Pending |
| AI-01 | Phase 4: AI Foundation & Orchestration | Pending |
| AI-02 | Phase 4: AI Foundation & Orchestration | Pending |
| AI-03 | Phase 4: AI Foundation & Orchestration | Pending |
| AI-04 | Phase 4: AI Foundation & Orchestration | Pending |
| AI-05 | Phase 4: AI Foundation & Orchestration | Pending |
| AI-06 | Phase 4: AI Foundation & Orchestration | Pending |
| AI-07 | Phase 4: AI Foundation & Orchestration | Pending |
| AI-08 | Phase 4: AI Foundation & Orchestration | Pending |
| AI-09 | Phase 4: AI Foundation & Orchestration | Pending |
| AI-10 | Phase 4: AI Foundation & Orchestration | Pending |
| AI-11 | Phase 4: AI Foundation & Orchestration | Pending |
| I18N-02 | Phase 4: AI Foundation & Orchestration | Pending |
| GSD-01 | Phase 5: GSD Workflow Engine | Pending |
| GSD-02 | Phase 5: GSD Workflow Engine | Pending |
| GSD-03 | Phase 5: GSD Workflow Engine | Pending |
| GSD-04 | Phase 5: GSD Workflow Engine | Pending |
| GSD-05 | Phase 5: GSD Workflow Engine | Pending |
| VOIC-01 | Phase 6: Voice & Idea Pool | Pending |
| VOIC-02 | Phase 6: Voice & Idea Pool | Pending |
| VOIC-03 | Phase 6: Voice & Idea Pool | Pending |
| VOIC-04 | Phase 6: Voice & Idea Pool | Pending |
| VOIC-05 | Phase 6: Voice & Idea Pool | Pending |
| TELE-01 | Phase 7: Telegram Bot & Notifications | Pending |
| TELE-02 | Phase 7: Telegram Bot & Notifications | Pending |
| TELE-03 | Phase 7: Telegram Bot & Notifications | Pending |
| TELE-04 | Phase 7: Telegram Bot & Notifications | Pending |
| TELE-05 | Phase 7: Telegram Bot & Notifications | Pending |
| TELE-06 | Phase 7: Telegram Bot & Notifications | Pending |
| NOTF-01 | Phase 7: Telegram Bot & Notifications | Pending |
| INTG-01 | Phase 8: External Integrations & AI Search | Pending |
| INTG-02 | Phase 8: External Integrations & AI Search | Pending |
| INTG-03 | Phase 8: External Integrations & AI Search | Pending |
| INTG-04 | Phase 8: External Integrations & AI Search | Pending |
| INTG-05 | Phase 8: External Integrations & AI Search | Pending |
| SRCH-01 | Phase 8: External Integrations & AI Search | Pending |

**Coverage:**
- v1 requirements: 59 total
- Mapped to phases: 59
- Unmapped: 0

---
*Requirements defined: 2026-02-07*
*Last updated: 2026-02-07 after roadmap review (added INFRA requirements)*
