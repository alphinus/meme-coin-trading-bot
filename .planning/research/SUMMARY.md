# Project Research Summary

**Project:** Collaborative Project Intelligence Platform
**Domain:** AI-integrated project management for 2-5 person teams with multi-channel access (web, Telegram)
**Researched:** 2026-02-07
**Confidence:** HIGH

## Executive Summary

This is a collaborative project management platform that combines event-driven architecture with AI-powered intelligence and multi-channel access. Expert implementations in this domain (Linear, Notion, Basecamp) succeed through opinionated workflows and calm collaboration principles, not feature sprawl. The research identifies a clear technical approach: Next.js 16.1 monorepo with event sourcing, PostgreSQL append-only storage, Socket.IO for real-time updates, grammY for Telegram integration, and Vercel AI SDK for multi-provider orchestration. Deploy self-hosted on Hetzner+Coolify for EU data residency and cost control.

The platform's differentiators—Soul Documents (persistent per-person memory), rule-bound AI team member, voice-first input, and full-mirror Telegram bot—are technically feasible but architecturally demanding. The event-driven foundation is essential from day one: trying to retrofit event sourcing later causes full rewrites. Key risk: scope creep kills 2-person projects faster than technical complexity. Start with a simplified GSD workflow (3-4 phases, not 8), prove the collaboration loop with web-only, then add Telegram as a thin adapter over proven core services.

Critical pitfalls center on data architecture decisions that cannot be undone: PII in append-only storage creates GDPR liabilities requiring full event stream migration, uncontrolled AI costs can spike 10x faster than user growth, and treating Telegram as a "full mirror" rather than a "Telegram-native subset" creates unmaintainable parallel UI codebases. All three are preventable with architecture-phase decisions, but expensive to fix post-launch.

## Key Findings

### Recommended Stack

The research converged on a modern TypeScript monorepo stack optimized for self-hosting and EU data residency. Next.js 16.1 with App Router provides unified frontend/backend with React Server Components and Server Actions, eliminating separate API boilerplate. Drizzle ORM outperforms Prisma on cold starts and gives direct SQL control essential for event sourcing queries. PostgreSQL 16+ handles both event store (append-only with JSONB payloads) and read store (materialized views), with LISTEN/NOTIFY for real-time triggers. Redis powers BullMQ job queues for background AI processing and Socket.IO pub/sub for WebSocket scaling.

**Core technologies:**
- **Next.js 16.1**: Full-stack framework with App Router and Server Actions—unified web app and API layer, no separate Express needed
- **PostgreSQL 16+**: Primary database and event store—ACID compliance, JSONB for flexible event payloads, LISTEN/NOTIFY for real-time
- **Drizzle ORM**: TypeScript-first ORM with zero runtime overhead—schema-as-code, excellent serverless performance, native identity column support
- **Redis 7+**: Caching, BullMQ job queues, Socket.IO pub/sub—required for background workers and real-time scaling
- **Vercel AI SDK 6.x**: Multi-provider orchestration—unified API across Anthropic, OpenAI, Google with built-in streaming and tool calling
- **grammY 1.38+**: Telegram bot framework—TypeScript-first, superior DX over Telegraf, rich plugin ecosystem for conversations and menus
- **Socket.IO 4.x**: WebSocket server—self-hosted, no vendor lock-in, built-in rooms and reconnection, Redis adapter for scaling
- **Auth.js v5**: Authentication—Next.js-native, Google OAuth, Drizzle adapter (fallback: Better Auth if v5 instability emerges)
- **BullMQ 5.x**: Background job queue—AI inference, consolidation, email, integration sync with retries and rate limiting
- **Hetzner + Coolify**: Self-hosted deployment—EU data residency, fixed costs (~10-20 EUR/month), Docker-based, no Vercel lock-in

**Critical version notes:** Next.js 16.1 requires React 19.2. All 13.x-16.x versions have CVE-2025-66478 (CVSS 10.0 RCE) history—always run latest patched version. Auth.js v5 is beta but production-stable per Dec 2025 community consensus. Tailwind CSS 4.x is required for shadcn/ui compatibility.

### Expected Features

Research identified a clear split between table stakes (what users expect from any PM tool in 2026) and true differentiators. Table stakes include project/task CRUD, real-time collaboration, document workspace, comments with @mentions, notifications, search, GitHub integration, and basic AI assistance (summarization and generation are "beyond table stakes" now). Missing any of these makes the product feel incomplete relative to Linear, Notion, or ClickUp.

**Must have (table stakes):**
- Project CRUD with status tracking (Linear-style lightweight, not Jira-heavy)
- Task/issue management with assignees, due dates, labels, priority
- Real-time collaboration with live updates (WebSocket-based, not polling)
- Document/notes workspace with rich text and embeds (Notion-influenced)
- Comments and @mentions with threaded discussions
- Notifications (in-app + email minimum, Telegram as bonus channel)
- Search across workspace (AI-powered search is rapidly becoming baseline)
- User authentication with OAuth and simple roles (admin/member for 2-5 people)
- GitHub integration (PR/commit linking to tasks minimum)
- Basic AI assistance (summarize tasks, generate drafts, answer questions about state)

**Should have (competitive differentiators):**
- Soul Documents (per-person persistent memory capturing decision patterns and thinking style—no competitor does this)
- GSD 8-phase workflow engine (structured lifecycle with phase gates—reduces project drift)
- Rule-bound AI team member (visible presence, acts on triggers, not a chatbot—more Devin-like autonomous agent)
- Voice-first idea capture with AI auto-routing (Otter-like capture but routes to projects automatically)
- Event-driven append-only documentation (auto-captures decisions without manual entry)
- Full-mirror Telegram bot (every web workflow available via Telegram—goes beyond notification-only bots)
- AI conflict mediation using Soul Documents (detects tension, suggests resolution)
- Multi-provider AI orchestration with cost tracking (LiteLLM-style routing exposed to users as first-class feature)
- GitHub fork flow (URL → fork → AI analysis → idea pool—bridges open-source discovery with planning)
- Idea pool with multi-input ingestion (voice, GitHub, email)

**Defer (v2+):**
- Meta Soul Document (team-level pattern synthesis—requires significant Soul Document data first)
- Native mobile apps (PWA sufficient for MVP, native after product-market fit)
- Advanced AI rules engine (start simple, expand based on feedback)
- Full 8-phase GSD workflow (start with 3-4 simplified phases, expand after validation)

### Architecture Approach

Event sourcing with CQRS is the foundational pattern—all state changes are append-only events in PostgreSQL, with materialized views for optimized reads. This enables the event-driven documentation feature and perfect audit trail, but requires careful snapshot/consolidation strategy to prevent unbounded growth. When a document stream exceeds 50k tokens, a background worker creates an AI-generated consolidation snapshot and archives older events to warm storage.

The architecture uses a shared core with interface adapters (not BFF). Web app and Telegram bot are thin adapters that translate their protocols (HTTP/WebSocket vs Telegram Bot API) into identical domain commands. All business logic lives in core services, ensuring the "full mirror" guarantee—both interfaces call the same project.addUpdate() function, just with different UX. This pattern only works if the core is truly interface-agnostic from day one.

**Major components:**
1. **Event Store (PostgreSQL)** — append-only source of truth for all domain events with JSONB payloads and correlation IDs
2. **Event Bus (Redis Streams initially, NATS at scale)** — decouples services, broadcasts events to subscribers (WebSocket manager, workers, notification service)
3. **AI Orchestrator** — routes AI tasks to optimal provider/model based on task type, handles fallback chains, tracks costs per project
4. **Project Service** — core domain logic for projects, tasks, membership, emits events to Event Store and Bus
5. **Document Service** — manages append-only document events, triggers consolidation workers when >50k tokens
6. **Voice Pipeline** — transcription (Whisper/Deepgram) → AI classification → routing to appropriate service
7. **Workflow Engine (GSD)** — executes phase-based project lifecycle, triggers milestone events
8. **WebSocket Manager** — subscribes to Event Bus, pushes real-time updates to connected clients via Socket.IO rooms
9. **Telegram Bot (grammY)** — interface adapter with conversation flows, calls same core services as web app
10. **Integration Hub** — OAuth management and adapters for Gmail, Calendar, GitHub APIs
11. **Notification Service** — multi-channel fan-out from Event Bus to WebSocket/Telegram/email based on user preferences
12. **Background Workers (BullMQ)** — consolidation, AI triggers, integration sync, email dispatch

**Data flow:** User action → interface adapter → core service validates → create event → append to Event Store → publish to Event Bus → projections update + WebSocket push + notifications sent + workers react. This single write path ensures consistency regardless of which interface (web or Telegram) initiated the action.

### Critical Pitfalls

Research identified 7 critical pitfalls with HIGH recovery costs if not addressed in the foundation phase.

1. **Append-Only Storage Becomes Unbounded Liability** — Without tiered storage and per-project consolidation thresholds, event stores grow linearly and query performance degrades within months. Solution: Design retention strategy in data layer phase, implement hot/warm/cold tiers, set per-project thresholds, archive raw events after snapshot verification.

2. **GDPR "Right to Erasure" vs. Append-Only Immutability** — Storing PII directly in event payloads creates legal liability. Crypto-shredding is legally insufficient (encrypted PII is still PII under GDPR). Solution: Forgettable Payloads pattern from day one—store only reference IDs in events, keep PII in separate mutable store with true deletion capability.

3. **Multi-Provider AI Cost Explosion** — Automatic model routing without cost constraints can spike bills 10x. Voice input is deceptive: one 5-minute note triggers 4+ API calls (transcription, summarization, routing, response). Solution: Hard per-project/user cost ceilings, tiered model strategy (Haiku for classification, Sonnet for summarization, Opus only for deep reasoning), cache aggressively, implement cost circuit breakers.

4. **Telegram Bot Becomes Unmaintainable Second Frontend** — Attempting "full mirror" creates parallel UI codebases. Telegram has fundamentally different constraints (1 msg/sec limit, 64-byte callback data, sequential flows vs. rich forms). Solution: Define "Telegram-native subset" (20% of features for 80% of mobile use cases), use Telegram Mini Apps for complex flows, build shared action layer both interfaces consume.

5. **AI "Rule-Bound but Proactive" Creates Unpredictable Behavior** — LLM non-determinism means autonomous actions can misfire. Misclassified voice note routes to wrong project, false blocker alert erodes trust. Solution: Action taxonomy (observe → suggest → act), start everything at Level 1 (suggest), promote only after >95% accuracy over 100+ instances, make every AI action reversible, never auto-act on high-stakes operations.

6. **Event-Driven Architecture Without Observability Is Black Box** — Event chains are impossible to debug without correlation IDs and tracing. Failed events get silently swallowed. Solution: Correlation IDs on every event from day one, event chain visualizer in dev tools, dead-letter queues for failed processing, event replay capability for debugging.

7. **Voice-First Input Quality Destroys Downstream Accuracy** — Transcription degrades 2.8-5.7x from benchmark to production (Swiss accents, background noise, code-switching). 20% error rate compounds through AI classification and routing. Solution: Mandatory human review in initial release, transcription confidence scores, test with Swiss-accented audio, language-aware pipeline, never auto-route from voice without confirmation until >95% production accuracy.

## Implications for Roadmap

Based on dependency analysis from architecture research and pitfall prevention timing, the roadmap should follow this phase structure:

### Phase 1: Foundation & Data Layer
**Rationale:** Event sourcing is non-negotiable and cannot be retrofitted. The event store, event bus, auth, and core domain types are prerequisites for everything else. GDPR-compliant data architecture (Forgettable Payloads) must be designed before first event is written.

**Delivers:**
- PostgreSQL event store with correlation IDs and tiered storage strategy
- Redis event bus with pub/sub
- Auth.js with Google OAuth and session management
- Core domain types (Project, Document, Event schemas)
- GDPR-compliant PII separation (reference IDs in events, PII in mutable store)
- Monitoring foundation (storage growth, event processing latency)

**Addresses:** Pitfall #1 (unbounded storage), Pitfall #2 (GDPR), Pitfall #6 (observability)

**Research needs:** SKIP—well-documented patterns in research

### Phase 2: Core Domain & Web UI (MVP)
**Rationale:** Prove the collaboration loop with a rich UI before building Telegram adapter. Simplified GSD workflow (3-4 phases instead of 8) validates the structured approach without overbuilding.

**Delivers:**
- Project Service (CRUD, membership, simplified GSD phases)
- Document Service (append-only, no consolidation yet)
- Task management (Linear-style lightweight)
- Read Store with materialized views
- Web app (Next.js) with basic CRUD UI
- Comments and @mentions
- Activity feed (foundation for event-driven docs)
- In-app notifications

**Uses:** Next.js 16.1, Drizzle ORM, PostgreSQL, Zod validation, next-safe-action

**Addresses:** Table stakes features from FEATURES.md, establishes core domain model

**Research needs:** SKIP—standard patterns

### Phase 3: Real-Time Collaboration
**Rationale:** WebSocket infrastructure enables live updates and proves event bus subscription pattern before Telegram depends on it.

**Delivers:**
- WebSocket Manager with Socket.IO rooms
- Real-time project/task updates pushed to connected clients
- Live presence indicators
- Event Bus → WebSocket subscription pipeline
- Offline/reconnect conflict resolution

**Uses:** Socket.IO 4.x, Redis pub/sub adapter

**Addresses:** Table stakes (real-time collaboration), Pitfall #6 (event-driven observability in production)

**Research needs:** SKIP—well-documented pattern

### Phase 4: AI Foundation & Cost Controls
**Rationale:** AI layer must be built with cost constraints from day one. Consolidation worker prevents document bloat before it becomes a problem.

**Delivers:**
- AI Orchestrator with provider routing and fallback chains
- Cost tracking per project and per action
- Hard cost ceilings with circuit breakers
- Basic AI assistance (summarize, generate drafts, answer questions)
- Document consolidation worker (>50k tokens → snapshot)
- Multi-provider setup (Anthropic Haiku/Sonnet, OpenAI fallback)

**Uses:** Vercel AI SDK 6.x, BullMQ for background workers

**Addresses:** Pitfall #3 (AI cost explosion), table stakes (basic AI assistance)

**Research needs:** RESEARCH-PHASE for cost optimization patterns and LiteLLM integration details

### Phase 5: Telegram Bot (Simplified Mirror)
**Rationale:** With core services proven and real-time infrastructure working, Telegram bot validates that core is truly interface-agnostic. Define Telegram-native subset (not full mirror) to avoid Pitfall #4.

**Delivers:**
- grammY bot with webhook handler
- Telegram-native subset: quick capture, status updates, notifications, simple approvals
- Conversation flows for multi-step inputs (project creation, task creation)
- Shared action layer between web and Telegram
- Notification fan-out to Telegram channel

**Uses:** grammY 1.38+, @grammyjs/conversations, @grammyjs/menu

**Implements:** Interface adapter pattern from ARCHITECTURE.md

**Addresses:** Pitfall #4 (avoid unmaintainable second frontend by scoping features)

**Research needs:** RESEARCH-PHASE for Telegram Mini Apps integration (for complex flows that don't fit sequential bot UX)

### Phase 6: Voice-First Input with Validation
**Rationale:** Voice is a differentiator but high-risk due to transcription accuracy issues (Pitfall #7). Ship with mandatory confirmation, promote to auto-routing only after accuracy validation.

**Delivers:**
- Voice Pipeline (transcription → AI classification → routing)
- Voice recording in web app (Web Audio API / MediaRecorder)
- Voice message handling in Telegram bot
- Transcription with confidence scores (Whisper API)
- Mandatory user confirmation before routing (no auto-routing initially)
- Swiss-accent test corpus and accuracy tracking
- Idea Pool service (target for voice-captured ideas)

**Uses:** OpenAI Whisper/gpt-4o-transcribe, AI Orchestrator

**Addresses:** Differentiator (voice-first idea capture), Pitfall #7 (transcription accuracy)

**Research needs:** RESEARCH-PHASE for Swiss German/French/Italian accent optimization and Deepgram vs OpenAI comparison

### Phase 7: External Integrations
**Rationale:** High-effort OAuth flows, deferred until core value is proven. Uses Integration Hub pattern to isolate complexity.

**Delivers:**
- Integration Hub (OAuth token management, refresh handling)
- GitHub integration (PR/commit linking to tasks)
- Gmail integration (push notifications via pub/sub, not polling)
- Google Calendar integration (milestone sync)
- Email ingestion interface (parse and route to projects)

**Uses:** googleapis, @octokit/rest, Integration Hub adapters

**Addresses:** Table stakes (GitHub integration), differentiator (GitHub fork flow foundation)

**Research needs:** RESEARCH-PHASE for Gmail push notification setup and Calendar API quota management (Pitfall: distinct "Calendar limits exceeded" error vs rate limits)

### Phase 8: Advanced AI Features
**Rationale:** Soul Documents and rule-bound AI require significant accumulated data and proven accuracy. These are v1.x features after core is validated with 5-10 teams.

**Delivers:**
- Soul Documents v1 (pattern extraction from activity data)
- Rule-bound AI team member (Level 1: suggest only, visible in activity feed)
- AI proactive triggers (phase transition reminders, stale project alerts, daily summaries)
- Event-driven documentation (structured decision records from activity feed)
- Full GSD 8-phase workflow (expand from simplified 3-4 phases)

**Uses:** AI Orchestrator, accumulated event data, BullMQ for proactive scanning

**Addresses:** Differentiators (Soul Documents, rule-bound AI), Pitfall #5 (AI unpredictability via action taxonomy)

**Research needs:** RESEARCH-PHASE for pattern extraction algorithms and action taxonomy framework

### Phase Ordering Rationale

- **Foundation first (Phase 1)** because event sourcing and GDPR compliance cannot be retrofitted—full event stream migration is the only remediation, 2-4 weeks effort for 2-person team.
- **Web before Telegram (Phases 2-3 before Phase 5)** because iterating on domain model is faster with rich UI. Telegram validates that core services are interface-agnostic.
- **AI layer before voice (Phase 4 before Phase 6)** because voice pipeline depends on AI Orchestrator for transcription and classification. Also, consolidation must work before documents grow large.
- **Real-time before Telegram (Phase 3 before Phase 5)** because Telegram notifications use the same Event Bus → Notification Service pipeline as WebSocket push.
- **Integrations late (Phase 7)** because they're high-effort (OAuth, webhooks, data mapping) but don't block other features. Nothing depends on them.
- **Advanced AI last (Phase 8)** because Soul Documents need accumulated data, rule-bound AI needs proven accuracy on basic tasks first, and these features are v2+ scope per MVP definition in FEATURES.md.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 4 (AI Foundation):** Cost optimization patterns, LiteLLM vs custom routing, per-action cost tracking implementation
- **Phase 5 (Telegram Bot):** Telegram Mini Apps for complex flows, state management patterns for conversation handlers
- **Phase 6 (Voice):** Swiss accent optimization, Deepgram vs OpenAI Whisper for multilingual accuracy, confidence score calibration
- **Phase 7 (Integrations):** Gmail push notifications setup, Calendar API quota management strategies, GitHub webhook security
- **Phase 8 (Advanced AI):** Pattern extraction algorithms for Soul Documents, action taxonomy frameworks, proactive trigger rule engines

**Phases with standard patterns (skip research):**
- **Phase 1 (Foundation):** Event sourcing, GDPR patterns, PostgreSQL schema design—all covered in research
- **Phase 2 (Core Domain):** CRUD, authentication, basic web UI—standard Next.js patterns
- **Phase 3 (Real-Time):** Socket.IO with Redis pub/sub—well-documented scaling pattern

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations verified against official docs and version compatibility confirmed. Next.js 16.1, Drizzle 0.45+, grammY 1.38+, Vercel AI SDK 6.x all current stable releases with production case studies. |
| Features | MEDIUM | Table stakes features validated across 10+ competitor products. Differentiators (Soul Documents, rule-bound AI, voice-first) are novel—feasibility confirmed by research but no direct implementations to reference. MVP scope risks feature creep. |
| Architecture | HIGH | Event sourcing + CQRS patterns are mature and well-documented. Shared core with interface adapters is proven at small scale (2-5 users). Build order dependencies clearly mapped. Scaling path identified. |
| Pitfalls | HIGH | All 7 critical pitfalls verified with multiple sources. GDPR challenges confirmed by legal analysis (crypto-shredding insufficient). Voice accuracy degradation (2.8-5.7x) from production data. AI cost explosion documented in 2026 enterprise surveys (40% project cancellation rate). |

**Overall confidence:** HIGH

Research quality is strong across all four areas. Stack recommendations are current as of Dec 2025-Jan 2026. Architecture patterns are proven. Pitfalls are documented with recovery strategies. The main uncertainty is execution scope—keeping a 2-person team disciplined to the simplified roadmap (3-4 phase GSD, Telegram-native subset, voice with confirmation) rather than attempting full vision (8-phase GSD, full Telegram mirror, auto-routing voice).

### Gaps to Address

**Gaps identified during research:**

- **Auth.js v5 production stability:** Still technically beta. Community consensus is "production-stable" but official v5 release not yet cut. Mitigation: Better Auth is the fallback if v5 instability emerges during development. Test extensively in staging before production.

- **Consolidation threshold tuning:** 50k tokens is a reasonable starting point but needs per-project tuning based on activity level. Gap: no research found on optimal thresholds for small-team projects. Mitigation: Instrument consolidation timing and costs, adjust thresholds based on production data after 1-2 months.

- **Swiss accent voice accuracy:** Research confirms 2.8-5.7x degradation for accented/noisy audio but specific Swiss German/French/Italian benchmarks not found. Gap: need to test Whisper vs Deepgram on Swiss-specific audio corpus. Mitigation: Build test corpus during Phase 6, measure accuracy before enabling auto-routing.

- **Telegram Mini Apps integration complexity:** Research mentions Mini Apps as solution for complex flows but implementation details sparse. Gap: unclear how to maintain shared core while embedding web views in Telegram. Mitigation: RESEARCH-PHASE during Phase 5 planning to map out Mini App authentication and data sharing.

- **Soul Document pattern extraction:** Novel feature with no reference implementation. Gap: unclear what "patterns" means in practice and how to extract them from event streams. Mitigation: RESEARCH-PHASE during Phase 8 planning to define pattern taxonomy and extraction algorithms.

- **Event Bus scaling threshold:** Research says Redis Streams work to 100-1k users, then switch to NATS. Gap: specific throughput numbers not provided. Mitigation: Load test Event Bus during Phase 3 with simulated multi-user activity to establish baseline, monitor in production.

## Sources

### Primary (HIGH confidence)

**Stack Research:**
- Next.js 16.1 Blog (nextjs.org) — framework features, React 19.2 requirements
- Vercel AI SDK 6 Blog + GitHub releases — AI orchestration, multi-provider, version 6.0.69
- grammY Official Site + npm — Telegram framework features, version 1.38.3, comparison vs Telegraf
- Drizzle ORM Official + npm — SQL-first ORM, version 0.45.1, identity column support
- PostgreSQL 16 documentation — LISTEN/NOTIFY, JSONB, identity columns
- BullMQ Official — job queue features, Redis Streams requirements
- Socket.IO Official — WebSocket server, Redis adapter scaling
- Auth.js Migration Guide — v5 changes, production status (beta but stable)
- shadcn/ui Tailwind v4 docs — component library, OKLCH colors, data-slot attributes
- OpenAI Audio Models blog — gpt-4o-transcribe, TTS models

**Features Research:**
- Zapier: 6 Best AI PM Tools 2026 — AI summarization as table stakes
- Linear Features page — cycles, projects, lightweight issue model
- Notion 3.2 Release Notes 2026 — multi-model AI, agents, mobile AI
- ClickUp Brain — AI agents, workflow automation
- Basecamp — calm philosophy, 6 essential tools, Hill Charts
- Monday.com Blog: Linear Alternatives — PM tool feature comparison
- Devin Annual Performance Review 2025 (Cognition) — AI agent as autonomous team member, 67% PR merge rate
- The New Stack: Memory for AI Agents — 2026 as "Year of Context"
- Dust.tt: Agent Memory — persistent memory in AI collaboration

**Architecture Research:**
- Azure Architecture Center: Event Sourcing Pattern — event store design
- Azure Architecture Center: CQRS Pattern — read/write separation
- Multi-provider LLM Orchestration 2026 (DEV) — routing patterns, 37% of enterprises use 5+ models
- LLM Orchestration 2026 (AIMultiple) — framework comparison
- Event Sourcing with Event Stores 2026 (Johal) — versioning, replay
- WebSockets + Event-Driven Architecture (MatrixNMedia) — scalability patterns
- From Reactive to Proactive AI Agents (Medium) — autonomous agent design
- Confluent: Event-Driven AI Agents — event-driven future

**Pitfalls Research:**
- Event Sourcing 101 (Innovecs) — storage growth patterns
- SoftwareMill: Event Sourcing Part 3 Storage — I/O complexity (5x more reads than writes)
- Event Sourcing 2026 (Johal) — versioning and replay challenges
- GDPR in Event-Driven Systems (Event-Driven.io) — forgettable payloads pattern
- EventSourcingDB: GDPR Compliance — crypto-shredding legal limitations
- Challenges of GDPR Event-Sourced Systems (Hey.com) — legal analysis
- LLM Cost Optimization Guide (Maxim.ai) — output tokens 3-10x input, Plan-and-Execute pattern saves 85%
- Complete LLM Pricing Comparison 2026 (CloudIDR) — provider cost analysis
- Agentic AI in Production 2026 (Medium) — agent guardrails, 40% cancellation rate due to costs
- GoTranscript: AI Transcription Accuracy 2026 — production degradation 2.8-5.7x
- NoJitter: AI Transcription Pitfalls — accent and noise impact

### Secondary (MEDIUM confidence)

- Hetzner Coolify Docs — deployment setup (self-hosting patterns)
- Coolify Official — platform features (open-source Vercel alternative)
- Ably: Socket.IO vs Supabase Realtime — real-time comparison
- Turborepo + pnpm Guide (Medium) — monorepo best practices
- Documenso: tRPC vs Server Actions — API layer decision rationale
- Resend Official — email service features
- Personos: AI Conflict Resolution — 89% conflict detection accuracy
- Pollack Peacebuilding: AI Mediation — hybrid AI-human 23% more effective
- Loqbooq — decision log tool (competitor feature reference)
- Corcava: Telegram Bot PM — Telegram task/time/alert capabilities
- Speechify: Voice AI Productivity 2026 — voice AI tools landscape
- Otter.ai — meeting transcription (competitor voice feature)

### Tertiary (LOW confidence, needs validation)

- CIO: Taming AI Agents 2026 — hybrid human-AI workforce (trend piece, not technical)
- Wix Engineering: Event-Driven 5 Pitfalls (Medium) — production incidents (anecdotal)
- Galileo: Agent Guardrails — proactive constraints (vendor blog)
- Deepgram: Best STT APIs 2026 — provider benchmarks (vendor comparison, bias risk)
- HenryWithU: Building Robust Telegram Bots — state management (personal blog)
- GramIO: Telegram Rate Limits — specific numbers (community docs)

---
*Research completed: 2026-02-07*
*Ready for roadmap: YES*
