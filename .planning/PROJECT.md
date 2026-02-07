# Collaborative Project Intelligence

## What This Is

A web application for structured, distance-spanning collaboration between two or more people across multiple parallel projects. It combines individual Soul Documents (persistent records of each person's thinking patterns), a team-level Meta Soul Document, event-driven append-only documentation, a rule-bound proactive AI team member, and a GSD-powered execution engine — all wrapped in a clean web UI and fully mirrored Telegram bot. Built by and for Eluma GmbH (eluma.ch), a Swiss software consultancy run by Elvis and Mario.

## Core Value

No project dies without a documented decision, and every thought trail is fully reconstructable.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Soul Documents — persistent, append-only markdown per person, fed from voice, text, decisions, AI reflections
- [ ] Meta Soul Document — auto-generated team-level pattern recognition (thinking errors, biases, abort patterns, over/under-engineering)
- [ ] Event-driven documentation — every decision, assumption, status change, KPI, AI intervention, override, pattern match triggers immediate write
- [ ] Append-only logic with soft-delete for GDPR compliance
- [ ] 50k token consolidation rule (structural consolidation, no content compression)
- [ ] Mandatory 8-phase project lifecycle (Idea, Feasibility, Effort Estimate, ROI/KPI, Risks & Dependencies, Decision Point, Implementation, Review & Pattern Extraction)
- [ ] ROI/KPI tracking per decision, per phase, aggregated globally
- [ ] Rule-bound proactive AI team member with configurable name and character
- [ ] AI triggers on milestones, pattern recognition, catch logic — never free-improvising
- [ ] AI face emoji on dashboard when it has something to say
- [ ] AI voice output (text-to-speech)
- [ ] LLM temperature tuning per context/task type
- [ ] Multi-provider AI orchestration (Anthropic, OpenAI, etc.)
- [ ] Auto model selection: lightweight models for simple tasks, powerful models for critical analysis
- [ ] Manual model override per AI node, visible in UI, documented
- [ ] AI cost dashboard widget (per project, per model, per month)
- [ ] Override mechanism for AI decisions (hidden in slide-on menu, fully documented and audited)
- [ ] AI conflict mediation when team members disagree
- [ ] GSD workflow engine running in background for every approved project (full pipeline)
- [ ] GSD terminal prompts translated into UI buttons (Yes/No/Continue/option selection)
- [ ] Freeform text input shown only when GSD needs it
- [ ] Context management (/clear etc.) handled invisibly behind the scenes
- [ ] Non-techie-friendly: full GSD pipeline navigable via buttons without terminal knowledge
- [ ] Dashboard: clean, calm, not playful UI
- [ ] Soul Document views per person + AI perspective + Meta Soul Document
- [ ] Browser-tab-like project navigation
- [ ] Global overview dashboard with pie charts, status distribution, aggregated ROI/KPI
- [ ] Real-time collaboration (see changes as they happen)
- [ ] i18n: German and English from start
- [ ] AI communicates in project language (DE/EN)
- [ ] Telegram bot as full mirror of web app
- [ ] Telegram slash commands with button-based mini GUI
- [ ] Telegram voice message input with AI transcription, analysis, and auto-routing to correct project
- [ ] AI recognizes project from voice context or guides via Telegram buttons
- [ ] Status updates and next-step prompts within Telegram
- [ ] Queue & sync for offline voice messages (Telegram handles queuing)
- [ ] Idea Pool — pre-project staging area with voice-first input
- [ ] AI deep-questions initial input until markdown quality is GSD-ready before project creation
- [ ] Ideas graduate to projects when team members agree
- [ ] In-app audio recording + file upload with AI transcription
- [ ] Gmail integration: email forwarding, AI routes to correct project
- [ ] Google Calendar sync (meetings linked to projects, post-meeting prompts)
- [ ] AI email drafts (prepared by AI, confirmed and sent by team)
- [ ] Google Login for authentication
- [ ] GitHub integration: commits and PRs linked to projects
- [ ] GitHub fork flow: URL input, auto fork, AI code analysis, idea pool, project with GSD workflow
- [ ] AI-steered search and navigation ("show me all open decisions in Project X")
- [ ] Fully configurable notifications per user, per channel, per priority level
- [ ] Project archival to dedicated archive tab after Phase 8

### Out of Scope

- Gamification — contradicts the serious, focused nature of the tool
- Chat toy / casual messaging — this is a project intelligence tool, not a messenger
- Daily summary logic — event-driven, not time-driven
- Blackbox AI — every AI action must be transparent and auditable
- Auto-deletion or compression of thoughts — append-only philosophy
- Native mobile app — Telegram handles all mobile workflows
- Role-based permissions — v1 has open visibility (all members see all projects), expand later
- External workflow tools (n8n etc.) — self-contained system

## Context

**Team:** Elvis and Mario at Eluma GmbH (eluma.ch), a Swiss software consultancy based in Winterthur and Schaffhausen. Two-person team building web shops, dashboards, automation, and custom software for Swiss SMEs and international clients. They work directly with clients — no middlemen.

**Pain:** Multiple parallel client projects, context lost between sessions, projects drifting without documented decisions, blind spots becoming expensive, non-technical stakeholders unable to follow technical execution.

**Vision:** Start as internal tool for Eluma, designed from the beginning to scale as a product for other teams.

**GSD Integration:** The Get Shit Done (GSD) workflow engine runs under the hood. Every project that receives a "Go" at Phase 6 (Decision Point) enters the full GSD pipeline: discuss, plan, execute, verify. The web UI and Telegram bot present GSD's terminal-based workflow as a button-driven graphical interface that non-techies can navigate without knowing what GSD is.

**Soul Document Philosophy:** A Soul Document is not a profile or settings page. It is a persistent, growing markdown document that captures a person's thinking patterns, assumptions, biases, and blind spots — fed from voice messages, text inputs, decisions, and AI reflections. It is never overwritten, only extended. The Meta Soul Document aggregates team-level patterns across all projects.

**Documentation Philosophy:** Event-driven, not snapshot-based. Every significant event (decision, assumption, status change, KPI evaluation, AI intervention, override, pattern match) triggers an immediate append. No time-based rhythms, no manual triggers. Everything is historically reconstructable.

**GitHub Structure:** Private GitHub account as base. The app itself lives in one main repository. Each project created in the app can optionally get its own separate GitHub repository, auto-created and linked. The app manages this relationship intelligently.

**Hosting & Hardware:** Self-hosted on local hardware (Mac Mini or Linux box, potentially limited: older processor, 16GB RAM). Docker may not be viable — services run natively (Node.js processes via pm2/systemd, PostgreSQL and Redis installed directly). Architecture must be hardware-agnostic: deployable via system image to new hardware. Designed for 24/7 operation.

**Hybrid Storage / Local Memory System:** The app has autonomous write access to the local filesystem. It creates and maintains its own directory structure as a persistent memory system:
- Per-project folders with named, versioned Markdown files
- Per-team-member Soul Documents as Markdown on disk
- Synthesis documents merging perspectives across team members
- Git-backed for full version history
- Protected by a filesystem blacklist (system-critical paths cannot be touched)
- PostgreSQL handles structured data (events, users, project state); the filesystem handles the Markdown memory layer
- Zero context loss: everything persists on local disk, independently of database

## Constraints

- **Append-Only**: All documents are append-only with soft-delete for GDPR. No silent overwrites, no compression of content. Every change is historically reconstructable.
- **8-Phase Lifecycle**: Every project follows the mandatory 8-phase structure. No phase skipping.
- **AI Boundaries**: AI is rule-bound. It acts only on defined triggers (milestones, patterns, catch logic). It never freely improvises or changes the project path unasked.
- **Event-Driven**: Documentation is event-triggered, never time-scheduled. No daily summaries, no periodic snapshots.
- **50k Token Rule**: When a context area reaches ~50k tokens, structural consolidation happens automatically — but no content is compressed or lost.
- **Multi-Provider**: AI layer must support multiple providers (Anthropic, OpenAI, etc.) from the start.
- **i18n**: German and English from day one.
- **Hardware-Agnostic**: Must run on limited hardware (older Mac Mini or 2016 Linux box with 16GB RAM). No Docker dependency. Native process deployment.
- **Local Filesystem Access**: App has autonomous write access to local disk. Blacklist protects system-critical paths. Markdown memory system is independent of database.
- **Portable**: Deployable to new hardware via system image. No hardware-specific configuration.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Soft-delete for GDPR | Balances append-only philosophy with legal right to deletion. Data marked as deleted but kept in audit log. | — Pending |
| Multi-provider AI from start | Avoid vendor lock-in, enable cost optimization across providers | — Pending |
| Telegram as full mirror | Team members are mobile-first when on the go. Telegram handles all mobile workflows. | — Pending |
| Desktop web app, mobile via Telegram | No native app or PWA needed. Telegram covers mobile use cases. | — Pending |
| Open visibility for v1 | All team members see all projects. Sufficient for Elvis & Mario. Expand to project-based access later. | — Pending |
| AI personality configurable per team | Teams choose name, tone, character for their AI team member | — Pending |
| GitHub integration with fork flow | Dev consultancy needs seamless GitHub workflow. Fork → AI analysis → idea pool → project. | — Pending |
| AI mediates team conflicts | When team members disagree, AI analyzes both positions and proposes compromise. Documented in project history. | — Pending |
| Self-hosted on local hardware | Mac Mini or Linux box, 24/7. No cloud dependency. Services run natively, not in Docker. Hardware-agnostic via system image. | — Pending |
| Hybrid storage (DB + filesystem) | PostgreSQL for structured data, local filesystem for Markdown memory. Git-backed versioning. Zero context loss. | — Pending |
| Private GitHub account | Main repo for app, optional per-project repos auto-created. Scale to org later if needed. | — Pending |
| Filesystem blacklist | System-critical paths protected. AI has autonomous write access within designated project directories only. | — Pending |
| GSD as execution engine | Proven workflow methodology runs under the hood, presented through clean UI for non-techies | — Pending |

---
*Last updated: 2026-02-07 after roadmap review (added hosting, GitHub, filesystem memory decisions)*
