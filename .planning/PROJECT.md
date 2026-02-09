# Collaborative Project Intelligence

## What This Is

A web application for structured, distance-spanning collaboration between two or more people across multiple parallel projects. It combines individual Soul Documents (persistent records of each person's thinking patterns), a team-level Meta Soul Document, event-driven append-only documentation, a rule-bound proactive AI team member, and a GSD-powered execution engine — all wrapped in a clean web UI with full German/English i18n and a fully mirrored Telegram bot with language-aware notifications. Built by and for Eluma GmbH (eluma.ch), a Swiss software consultancy run by Elvis and Mario.

## Core Value

No project dies without a documented decision, and every thought trail is fully reconstructable.

## Requirements

### Validated

- ✓ Soul Documents — persistent, append-only markdown per person, fed from voice, text, decisions, AI reflections — v1.0
- ✓ Meta Soul Document — auto-generated team-level pattern recognition — v1.0
- ✓ Event-driven documentation — every decision, assumption, status change, KPI, AI intervention triggers immediate write — v1.0
- ✓ Append-only logic with soft-delete for GDPR compliance — v1.0
- ✓ Mandatory 8-phase project lifecycle — v1.0
- ✓ ROI/KPI tracking per decision, per phase, aggregated globally — v1.0
- ✓ Rule-bound proactive AI team member with configurable name and character — v1.0
- ✓ AI triggers on milestones, pattern recognition, catch logic — v1.0
- ✓ AI face emoji on dashboard — v1.0
- ✓ AI voice output (text-to-speech) — v1.0
- ✓ Multi-provider AI orchestration (Anthropic, OpenAI) — v1.0
- ✓ AI cost dashboard widget (per project, per model, per month) — v1.0
- ✓ Override mechanism for AI decisions — v1.0
- ✓ AI conflict mediation — v1.0
- ✓ GSD workflow engine for every approved project — v1.0
- ✓ GSD terminal prompts as UI buttons — v1.0
- ✓ Dashboard: clean, calm, not playful UI — v1.0
- ✓ Soul Document views per person + AI perspective + Meta Soul Document — v1.0
- ✓ Browser-tab-like project navigation — v1.0
- ✓ Global overview dashboard with pie charts, status distribution, aggregated ROI/KPI — v1.0
- ✓ i18n: German and English — v1.0
- ✓ AI communicates in project language (DE/EN) — v1.0
- ✓ Telegram bot as full mirror of web app — v1.0
- ✓ Telegram slash commands with button-based mini GUI — v1.0
- ✓ Telegram voice message input with AI transcription and auto-routing — v1.0
- ✓ Idea Pool — pre-project staging area with voice-first input — v1.0
- ✓ AI deep-questions initial input until GSD-ready — v1.0
- ✓ Ideas graduate to projects when team members agree — v1.0
- ✓ In-app audio recording + file upload with AI transcription — v1.0
- ✓ Gmail integration: email forwarding, AI routes to correct project — v1.0
- ✓ Google Calendar sync (meetings linked to projects, post-meeting prompts) — v1.0
- ✓ AI email drafts (prepared by AI, confirmed and sent by team) — v1.0
- ✓ GitHub integration: commits and PRs linked to projects — v1.0
- ✓ GitHub fork flow: URL input, auto fork, AI code analysis, idea pool — v1.0
- ✓ AI-steered search and navigation — v1.0
- ✓ Fully configurable notifications per user, per channel, per priority level — v1.0
- ✓ Project archival to dedicated archive tab — v1.0
- ✓ Correct Unicode umlauts in all German translations (ä/ö/ü/ß, no ASCII approximations) — v1.1
- ✓ 100% i18n coverage for web UI — all components use translation keys — v1.1
- ✓ Telegram bot fully i18n-enabled with per-user language preference — v1.1
- ✓ Per-recipient language resolution in notifications — v1.1

### Active

(None — define with `/gsd:new-milestone`)

### Out of Scope

- Gamification — contradicts the serious, focused nature of the tool
- Chat toy / casual messaging — this is a project intelligence tool, not a messenger
- Daily summary logic — event-driven, not time-driven
- Blackbox AI — every AI action must be transparent and auditable
- Auto-deletion or compression of thoughts — append-only philosophy
- Native mobile app — Telegram handles all mobile workflows
- Role-based permissions — v1 has open visibility, expand later
- External workflow tools (n8n etc.) — self-contained system
- 50k token consolidation rule — deferred, not needed at current scale
- LLM temperature tuning per context/task type — deferred, presets sufficient
- Auto model selection — deferred, manual override covers use cases
- Real-time collaboration (WebSockets) — deferred, polling sufficient for 2-person team
- Google Login for authentication — deferred, passkey/password auth works
- Context management (/clear) invisible handling — deferred, not applicable to web UI
- Additional languages beyond DE/EN — two languages sufficient for Eluma team
- Automated i18n testing/linting — deferred to future milestone

## Context

Shipped v1.0 MVP with 39,396 LOC TypeScript across 235 files.
Shipped v1.1 i18n Quality with 210+ client translation keys, 140-key Fluent files for Telegram bot, 9 plans over ~45 minutes.
Tech stack: Express + Vite + React monorepo, JSONL event store, AI SDK v6, grammY Telegram bot with @grammyjs/i18n + Fluent.
11 phases, 52 plans total across v1.0 + v1.1.

**Team:** Elvis and Mario at Eluma GmbH (eluma.ch), a Swiss software consultancy based in Winterthur and Schaffhausen.

**Pain:** Multiple parallel client projects, context lost between sessions, projects drifting without documented decisions.

**Vision:** Start as internal tool for Eluma, designed to scale as a product for other teams.

## Constraints

- **Append-Only**: All documents are append-only with soft-delete for GDPR.
- **8-Phase Lifecycle**: Every project follows the mandatory 8-phase structure.
- **AI Boundaries**: AI is rule-bound. Acts only on defined triggers.
- **Event-Driven**: Documentation is event-triggered, never time-scheduled.
- **Multi-Provider**: AI layer supports multiple providers.
- **i18n**: German and English with proper Unicode. No ASCII approximations.
- **Hardware-Agnostic**: Runs on limited hardware. No Docker dependency.
- **Local Filesystem Access**: Markdown memory system independent of database.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Soft-delete for GDPR | Balances append-only with legal right to deletion | ✓ Good — works well |
| Multi-provider AI from start | Avoid vendor lock-in, cost optimization | ✓ Good — Anthropic + OpenAI supported |
| Telegram as full mirror | Mobile-first when on the go | ✓ Good — grammY bot with full workflow |
| Open visibility for v1 | Sufficient for 2-person team | ✓ Good — simple and effective |
| JSONL event store (not PostgreSQL) | Simpler, file-based, crash-recoverable | ✓ Good — atomic writes, fast reads |
| ViteExpress monorepo | Single process serves React SPA from Express | ✓ Good — simple dev/prod parity |
| AI SDK v6 for tool-calling | Unified interface for multi-provider AI | ✓ Good — search, routing, drafting all use it |
| grammY for Telegram bot | TypeScript-native, good session/menu support | ✓ Good — menus, voice, webhooks all work |
| Event-sourced reducers | Derive state from events, consistent pattern | ✓ Good — used across all domains |
| Fire-and-forget pattern | Async processing without blocking requests | ✓ Good — docs, triggers, notifications all async |
| Self-hosted on local hardware | No cloud dependency, 24/7 operation | — Pending validation |
| Hybrid storage (DB + filesystem) | Structured data + Markdown memory | ✓ Good — JSONL + filesystem memory |
| GSD as execution engine | Proven workflow for non-techies | ✓ Good — button-driven UI works |
| Unicode umlauts mandatory | ASCII approximations unacceptable in German UI | ✓ Good — v1.1 fixed all 129 instances |
| CLAUDE.md encoding rules | Prevent future umlaut/i18n regressions | ✓ Good — added to CLAUDE.md |
| Manual umlaut review over regex | Avoid false positives (Dauer, Neue, Aktuelle) | ✓ Good — zero false positives |
| useTranslation over useLanguage | CLAUDE.md convention, react-i18next directly | ✓ Good — consistent across all components |
| Fluent .ftl for Telegram i18n | grammY i18n plugin standard, variable interpolation | ✓ Good — 140 keys, clean separation |
| TranslateFunc parameter pattern | Formatter functions accept t for i18n labels | ✓ Good — clean separation of concerns |
| Per-recipient language in emitter | loadUser().language with "de" fallback | ✓ Good — each user gets their language |

---
*Last updated: 2026-02-09 after v1.1 milestone completion*
