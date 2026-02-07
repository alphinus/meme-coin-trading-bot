# Pitfalls Research

**Domain:** Collaborative project intelligence platform with AI integration
**Researched:** 2026-02-07
**Confidence:** HIGH (multiple verified sources across all domains)

## Critical Pitfalls

### Pitfall 1: Append-Only Storage Becomes an Unbounded Liability

**What goes wrong:**
The append-only log grows indefinitely. With a 50k token consolidation threshold, every project accumulates events that never get pruned. Within months of active use across multiple parallel projects, the event store becomes a performance and cost bottleneck. Reads scale linearly with event count per entity -- approximately 5x more reads than writes -- and rebuilding state from raw events becomes computationally expensive. Consolidation (snapshotting) at 50k tokens sounds reasonable, but 50k tokens of context per project times multiple projects per team means the storage layer and AI context costs compound faster than expected.

**Why it happens:**
Append-only feels clean in theory. Developers assume "storage is cheap" and defer compaction strategy. The 50k consolidation threshold is set once and never tuned. Nobody models the growth rate: if a 3-person team generates 200 events/day across 4 projects, that is 800 events/day, ~24k events/month. Each consolidation cycle produces a snapshot but the underlying events remain, and snapshot-to-snapshot drift accumulates.

**How to avoid:**
- Design the retention and compaction strategy in the same phase as the storage layer, not later.
- Implement tiered storage from day one: hot (recent events + latest snapshot), warm (older snapshots), cold (archived raw events).
- Set consolidation thresholds per-project based on activity level, not a single global number.
- Build a "storage budget" metric per project and surface it in monitoring before it becomes a crisis.
- Plan for event stream truncation after snapshot verification -- keep snapshots as the source of truth for older state, with raw events archived (not inline).

**Warning signs:**
- Query latency for project state reconstruction increases week over week.
- AI context preparation time grows noticeably.
- Storage costs rise faster than user count.
- Consolidation operations start taking longer than 30 seconds.

**Phase to address:**
Foundation/Data layer phase. The storage schema, compaction strategy, and tiered archival must be designed before any events are written. Retrofitting compaction onto an existing append-only store requires migration.

---

### Pitfall 2: GDPR "Right to Erasure" vs. Append-Only Immutability

**What goes wrong:**
GDPR Article 17 requires deletion of personal data within 30 days of request. Append-only event stores are architecturally opposed to deletion. Soft-delete (marking records as deleted) does not satisfy GDPR -- the data is still there. Crypto-shredding (encrypting PII with per-user keys and destroying the key) has a critical legal weakness: under GDPR, encrypted personal data is still personal data, whether or not anyone has the key. A data breach exposing encrypted-but-"deleted" data still constitutes a GDPR violation. Swiss data protection law (nDSG, effective since September 2023) adds further requirements for a Swiss-based company.

**Why it happens:**
Teams adopt append-only architecture for its elegance and auditability, then discover GDPR compliance 6 months later. Crypto-shredding appears in blog posts as "the solution" but its legal standing is contested. The tension between "never delete for auditability" and "must delete for compliance" is a fundamental architectural contradiction that cannot be patched after the fact.

**How to avoid:**
- Use the "Forgettable Payloads" pattern from day one: store only reference IDs in the event stream, keep actual PII in a separate mutable store that can be truly deleted.
- Accept that pure event sourcing with PII in payloads is incompatible with GDPR. Design the separation of concerns before writing the first event.
- Implement data classification at the schema level: every field is tagged as PII or non-PII. PII fields are references to the mutable PII store.
- Build the erasure pipeline as part of the data layer, not as an afterthought. Test it: can you actually erase a user and still have a functioning event stream?
- Consult Swiss data protection requirements (nDSG) alongside GDPR -- they are similar but not identical.

**Warning signs:**
- PII appears directly in event payloads (names, emails, phone numbers as literal strings).
- No separate PII store exists.
- "We'll handle GDPR later" appears in planning documents.
- Soft-delete is the only deletion mechanism.

**Phase to address:**
Foundation/Data layer phase. This is a schema-level decision. If PII lands in the append-only store, the only remediation is a full event stream migration -- extract events, strip PII, rewrite to a new store.

---

### Pitfall 3: Multi-Provider AI Cost Explosion

**What goes wrong:**
With automatic model selection across multiple providers, costs compound in ways that are invisible until the monthly bill arrives. Output tokens cost 3-10x more than input tokens, and a bug in routing logic can accidentally send everything to the most expensive model. At the project level: every consolidation cycle, every voice transcription summary, every proactive AI suggestion, every auto-routing decision is an API call. For a team of 3 people across 4 projects with voice-first input, the call volume is not "a few per day" -- it is potentially hundreds. Over 40% of agentic AI projects are projected to be cancelled by 2027 due to unanticipated costs.

**Why it happens:**
Developers test with small volumes and cheap models. The "automatic model selection" feature sounds smart but without explicit cost budgets, the system optimizes for quality and routes to expensive models. Cost tracking is implemented as reporting (after the fact) rather than as a budget constraint (preventing overspend). Voice transcription is especially deceptive: a 5-minute voice note produces a transcription call, then a summarization call, then a routing/classification call, then potentially a response generation call -- 4+ API calls from a single user action.

**How to avoid:**
- Implement hard per-project and per-user daily/monthly cost ceilings that halt AI operations when exceeded, not just alerts.
- Use a tiered model strategy from day one: small/cheap models for classification and routing, mid-tier for summarization, frontier models only for complex reasoning. The Plan-and-Execute pattern can reduce costs by up to 90%.
- Build cost-per-action tracking, not just cost-per-API-call. Track "cost of processing one voice note end-to-end" as a composite metric.
- Cache aggressively: if the same context produces the same consolidation, cache the result.
- Set a "cost circuit breaker" -- if a single user action triggers more than N API calls or exceeds $X, halt and require confirmation.

**Warning signs:**
- No per-action cost visibility in development/staging.
- Model selection logic has no cost weighting.
- Voice input processing chains more than 3 API calls per note.
- Monthly AI costs exceed 2x the previous month without proportional user growth.
- No cost cap mechanism exists.

**Phase to address:**
AI integration phase. Cost controls must ship with the AI features, not after. The model routing logic, cost tracking, and circuit breakers are as important as the AI features themselves.

---

### Pitfall 4: Telegram Bot Becomes an Unmaintainable Second Frontend

**What goes wrong:**
The requirement to "mirror the full web app" in Telegram creates a parallel UI layer with fundamentally different interaction paradigms. Web apps use forms, modals, drag-and-drop, and rich state. Telegram bots use sequential messages, inline keyboards (max 8 buttons per row), callback queries (64-byte data limit), and linear conversation flows. Attempting feature parity means every web feature needs a separate Telegram interaction design. The bot accumulates state management complexity, conversation handler spaghetti, and becomes the part of the system that is always behind the web app by 2-3 features.

**Why it happens:**
"Full mirror" is specified without accounting for the interaction model mismatch. Rate limits compound the problem: bots can send only 1 message/second in private chats, 20 messages/minute in groups. Complex workflows that take 1 click on web require 3-5 bot interactions. Long-running operations in handlers block the bot's event loop. The team builds the web app first, then tries to "port" features to Telegram, discovering each time that the interaction pattern doesn't translate.

**How to avoid:**
- Do not mirror the web app. Define a "Telegram-native subset": the 20% of features that cover 80% of mobile/on-the-go usage (quick capture, status updates, notifications, voice input, simple approvals).
- Use Telegram Mini Apps (WebApps) for complex interactions that genuinely need rich UI -- these open a web view inside Telegram.
- Build a shared command/action layer that both web and Telegram consume, but let each frontend implement its own interaction patterns.
- Implement an async job queue for bot operations: handlers should enqueue work and return immediately, with results delivered via follow-up message.
- Track "feature parity gap" as a metric and accept that 70% parity with Telegram-native UX is better than 100% parity with poor UX.

**Warning signs:**
- Telegram conversation handlers exceed 200 lines of state management code.
- Users report the bot feels "slow" or "confusing" for multi-step workflows.
- Every web feature request generates a "and also in Telegram" ticket.
- Bot callback data hits the 64-byte limit, requiring workarounds.
- The team spends more time on Telegram UX compromises than on core features.

**Phase to address:**
UI/Integration phase. Define the Telegram feature subset before building. Implement the shared action layer first, then build both frontends against it. Do not attempt Telegram parity until the web app is stable.

---

### Pitfall 5: AI "Rule-Bound but Proactive" Creates Unpredictable Behavior

**What goes wrong:**
Making AI a "proactive team member" with trigger-based actions means the AI takes autonomous actions based on event patterns. LLMs are non-deterministic -- the same prompt can yield different outputs on every run. When an agent can create tasks, send notifications, update project state, or escalate issues, hallucinated classifications or misinterpreted triggers cause real workflow disruption. A misclassified voice note routed to the wrong project, an overeager deadline reminder, or a false "blocker detected" alert erodes trust faster than the AI builds it. Users disable the proactive features within weeks.

**Why it happens:**
The boundary between "helpful suggestion" and "autonomous action" is blurry. Developers test with clean data and predictable scenarios. Production data is messy: incomplete voice transcriptions, ambiguous messages, context from multiple projects bleeding together. The trigger rules are written for the happy path. Edge cases -- a user joking about deadlines, a voice note that is half-personal/half-work, a message that references two projects -- cause the AI to take wrong actions with high confidence.

**How to avoid:**
- Implement a strict action taxonomy: Level 0 (observe/log), Level 1 (suggest, require human confirmation), Level 2 (act autonomously on low-stakes operations), Level 3 (act autonomously on high-stakes operations, only after extended trust-building period).
- Start everything at Level 1 (suggest). Promote to Level 2 only after a specific action type has a >95% user-acceptance rate over 100+ instances.
- Make every AI action reversible by default. If the AI routes a voice note to the wrong project, one-tap undo.
- Build a "confidence threshold" into every trigger: below threshold, suggest; above threshold, act. Log both for calibration.
- Never let the AI take actions that are hard to reverse (deleting, archiving, sending external communications) without explicit human confirmation.
- Treat the AI agent like a junior team member: it proposes, humans dispose, until it earns trust through demonstrated accuracy.

**Warning signs:**
- Users start ignoring AI suggestions (notification fatigue).
- AI actions have an error rate above 5% on any action type.
- No "undo" mechanism exists for AI-initiated actions.
- The AI takes the same wrong action repeatedly because there is no feedback loop.
- Users disable proactive features.

**Phase to address:**
AI integration phase, but the action taxonomy and confidence framework must be designed in the architecture phase. The proactive behavior should be the last AI feature enabled, after classification, summarization, and suggestion are proven accurate.

---

### Pitfall 6: Event-Driven Architecture Without Observability Is a Black Box

**What goes wrong:**
Event-driven systems are inherently harder to debug than request/response systems. When a voice note comes in and triggers transcription, classification, routing, task creation, notification, and AI analysis as a chain of events, a failure anywhere in the chain is invisible without distributed tracing. The event that caused a wrong task to appear in the wrong project 3 hours ago is buried in a stream of thousands of events. Developers cannot statically trace code paths (unlike REST endpoints), and production incidents take hours to diagnose instead of minutes.

**Why it happens:**
Event-driven architecture is chosen for its flexibility and decoupling, but observability is treated as a "nice to have." Events are fire-and-forget without correlation IDs. Error handling in event consumers silently swallows failures (the event is "processed" even if the processing was wrong). There is no replay mechanism for debugging -- you cannot re-run a single event chain to reproduce an issue.

**How to avoid:**
- Every event must carry a correlation ID that traces back to the originating user action.
- Implement a "event chain visualizer" in development: for any user action, show the complete chain of events it triggered and their outcomes.
- Use dead-letter queues for failed event processing, not silent swallowing.
- Build event replay capability from day one: the ability to replay a single event chain in isolation for debugging.
- Propagate user request context (user ID, session, originating action) through every event in the chain.
- Monitor event processing latency per-handler, not just per-queue.

**Warning signs:**
- Debugging production issues requires reading raw event logs.
- "I don't know why this happened" appears in incident reviews.
- No correlation ID exists on events.
- Failed event processing is only discovered when users report symptoms.
- Event consumer error rates are unknown.

**Phase to address:**
Foundation/Architecture phase. Correlation IDs, dead-letter queues, and tracing must be part of the event infrastructure, not bolted on after the first production incident.

---

### Pitfall 7: Voice-First Input Quality Destroys Downstream AI Accuracy

**What goes wrong:**
Voice transcription accuracy degrades 2.8-5.7x from benchmark to production conditions. Swiss German, French, and Italian accents, background noise (cafe, commute, construction site), multi-speaker input, code-switching between languages in a single message -- all of these are normal for a Swiss user base and all of them tank transcription accuracy below 80%. When a 20% error rate feeds into AI classification, routing, and task extraction, errors compound: a misheard project name routes to the wrong project, a garbled action item creates a nonsensical task, a transcription error in a deadline becomes the wrong date.

**Why it happens:**
Developers test with clean, quiet, English voice input. Production users record voice notes while walking, in meetings, in Swiss German. The transcription → AI pipeline has no error correction checkpoint: the raw transcription feeds directly into classification and routing. Nobody measures transcription accuracy in production, only whether a transcription was produced.

**How to avoid:**
- Add a mandatory human-review step for voice input in the initial release. Show the transcription to the user for confirmation before it enters the AI pipeline.
- Implement a "transcription confidence score" -- if below threshold, flag for manual review rather than auto-processing.
- Test with Swiss-accented audio from day one. Build a test corpus of real multilingual voice notes, not just English samples.
- Design the voice pipeline to be language-aware: detect language first, then route to the best model for that language.
- Build a feedback loop: when users correct transcriptions, feed corrections back to improve future classification (not model fine-tuning, but prompt/context improvement).
- Never auto-create tasks or route to projects from voice input without user confirmation until accuracy exceeds 95% in production.

**Warning signs:**
- No transcription accuracy measurement exists in production.
- Voice input testing uses only English in quiet environments.
- Users re-type information that they already voice-recorded (they don't trust the transcription).
- AI-created tasks from voice input have a high edit/delete rate.
- No confidence score is surfaced to users.

**Phase to address:**
Voice/AI integration phase. The transcription → confirmation → processing pipeline must be designed before any auto-routing or auto-task-creation features. Voice input without confirmation is a Phase 3+ feature after accuracy is proven.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| PII directly in event payloads | Simpler event schema, faster initial development | Full event stream migration required for GDPR compliance, potential legal liability | Never. The migration cost exceeds the initial savings by 10x or more. |
| Single AI provider (no abstraction) | Faster integration, fewer moving parts | Vendor lock-in, no fallback when provider has outages, no cost optimization via model routing | MVP only, with explicit tech debt ticket and provider abstraction planned for next phase. |
| Telegram bot with inline business logic | Faster bot development | Every feature change requires updating two codebases, divergent behavior between web and Telegram | Never. Shared action/command layer is table stakes. |
| Global consolidation threshold (50k tokens for all projects) | Simpler configuration | High-activity projects consolidate too late (context bloat), low-activity projects consolidate too early (lost nuance) | MVP only. Per-project thresholds must ship within 2 sprints of launch. |
| No event correlation IDs | Faster event infrastructure setup | Every production debugging session becomes archaeological excavation | Never. Adding correlation IDs retroactively requires reprocessing all existing events. |
| Synchronous event processing | Simpler to reason about, easier debugging | Bot becomes unresponsive under load, cascading failures when one handler is slow | Development/testing only. Async with dead-letter queues for production. |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Gmail API | Polling for new emails at fixed intervals, hitting rate limits with multiple users | Use Gmail push notifications (pub/sub) for real-time email detection. Implement exponential backoff. Budget for the 250 quota units/user/second limit. |
| Google Calendar API | Assuming "queries per minute" is the only limit. A 403 "Calendar limits exceeded" error is different from rate limiting and occurs even under published quotas. | Implement per-user request queuing. Use Calendar push notifications instead of polling. Handle both rate-limit and calendar-limit errors with distinct retry strategies. |
| GitHub API | Using personal access tokens for all users, hitting per-token rate limits (5,000 requests/hour) with team usage | Use GitHub App installation tokens (much higher limits). Implement webhook-based event ingestion instead of polling. Cache repository state locally. |
| Telegram Bot API | Sending messages synchronously, hitting 1 msg/sec (private) and 20 msg/min (group) limits | Implement a message queue with rate-limiting. Use bulk operations where available. Never block the event loop with API calls. |
| Voice Transcription API | Sending raw audio without preprocessing, getting poor results on noisy input | Implement client-side audio preprocessing (noise reduction, silence trimming, VAD). Detect language before sending. Choose provider/model per-language. |
| Multi-provider AI | Hardcoding provider-specific prompt formats, making switching providers require prompt rewrites | Use a prompt abstraction layer with provider-specific adapters. Test prompts across providers in CI. Track per-provider accuracy, not just cost. |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Rebuilding project state from all events on every request | Page load latency grows linearly with project age | Materialize current state in a read-optimized view, update incrementally on new events | >1,000 events per project (roughly 1-2 months of active use) |
| Loading full conversation context for every AI call | AI response latency >10s, token costs spike | Implement rolling context windows with summarized history, not full event replay | >50k tokens of history (the stated consolidation threshold -- this is already the danger zone) |
| Real-time sync with no debouncing | WebSocket message storms when multiple users edit simultaneously | Debounce client-side changes (200-500ms), batch server-side broadcasts | >3 concurrent editors on the same entity |
| Telegram bot polling with getUpdates | Increasing latency as update queue grows, missed updates during downtime | Use webhooks instead of long polling. Webhooks are push-based and more reliable. | >100 active bot conversations |
| Unindexed event store queries | Dashboard and reporting queries slow to a crawl | Add read-optimized projections/views for common queries. Never query the raw event store for UI. | >100k total events (a few months of team use) |
| Voice transcription without streaming | User waits for entire audio upload + processing before seeing any result | Use streaming transcription APIs that return partial results | Audio files >30 seconds |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing AI API keys in event payloads or client-side config | API key exposure leads to unbounded cost liability (attackers run up your AI bill) | Store API keys server-side only, use environment variables, rotate regularly, set provider-side spending limits |
| Telegram bot token in source code or client bundle | Full bot takeover -- attacker can read all messages, impersonate the bot | Store in secrets manager, never commit to git, use separate tokens for dev/staging/production |
| OAuth tokens for Gmail/Calendar stored in the append-only event store | Tokens persist indefinitely in immutable storage, even after revocation | Store OAuth tokens in a mutable, encrypted credential store separate from the event stream. Implement token rotation. |
| No rate limiting on AI-triggered actions | A malicious or buggy event loop could trigger thousands of AI calls in minutes | Per-user, per-project, and global rate limits on AI invocations. Circuit breaker pattern. |
| Voice notes stored without encryption at rest | Audio recordings contain sensitive business discussions, PII, potentially privileged information | Encrypt audio at rest, delete after transcription (keep only text), implement retention policies |
| Broad OAuth scopes for Gmail/Calendar integration | Compromise of one integration exposes all user email/calendar data | Request minimum required scopes. Use incremental authorization. Audit scope usage quarterly. |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing raw AI transcriptions without confidence indicators | Users trust inaccurate transcriptions, create incorrect tasks, lose trust in the system | Show transcription with confidence highlighting (uncertain words marked), require confirmation for auto-actions |
| AI proactive suggestions that cannot be dismissed permanently | Notification fatigue, users disable all notifications, miss important ones | Allow per-suggestion-type muting. "Don't suggest this again" option. Respect user preferences immediately. |
| Telegram bot that sends walls of text for project updates | Users stop reading bot messages, miss critical updates | Use progressive disclosure: headline first, "Show more" for details. Use formatting (bold, bullets) aggressively. |
| Same notification on both web and Telegram simultaneously | Duplicate alerts, user irritation, perceived spam | Intelligent notification routing: detect where user is active, send there. Allow per-channel notification preferences. |
| Complex multi-step workflows in Telegram requiring exact sequence | Users get "stuck" in conversation states, have to /cancel and restart | Allow users to break out of any conversation flow at any point. Support "natural language" commands alongside structured flows. |
| Voice input with no visual feedback during processing | Users re-record or abandon, thinking the app is broken | Show processing stages: "Transcribing..." → "Analyzing..." → "Routing to project..." with timing estimates |

## "Looks Done But Isn't" Checklist

- [ ] **Append-only storage:** Often missing compaction/archival strategy -- verify that old events can be archived without breaking state reconstruction
- [ ] **GDPR compliance:** Often missing actual erasure pipeline -- verify that a user deletion request results in PII being unrecoverable, not just flagged
- [ ] **AI cost tracking:** Often missing per-action cost attribution -- verify you can answer "how much did processing this voice note cost?"
- [ ] **Telegram bot:** Often missing error recovery in conversation flows -- verify that every conversation state has a graceful exit path
- [ ] **Voice transcription:** Often missing production-condition accuracy testing -- verify accuracy with real Swiss-accented, noisy audio, not benchmark datasets
- [ ] **Event-driven pipeline:** Often missing dead-letter queue handling -- verify that failed events are captured, alerted on, and replayable
- [ ] **Real-time collaboration:** Often missing conflict resolution for offline/reconnect scenarios -- verify that two users editing offline then reconnecting produces correct state
- [ ] **AI proactive actions:** Often missing the undo/revert mechanism -- verify every AI-initiated action can be reversed in one click
- [ ] **OAuth integrations:** Often missing token refresh handling -- verify the app handles expired tokens gracefully (re-auth prompt, not silent failure)
- [ ] **Multi-provider AI:** Often missing provider fallback -- verify that if Provider A is down, the system falls back to Provider B without user-visible disruption

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| PII in event store (GDPR violation) | HIGH | Full event stream migration: extract all events, strip PII into separate store, rewrite event stream. Estimated effort: 2-4 weeks for a 2-person team. |
| AI cost overrun | MEDIUM | Implement emergency cost caps immediately. Audit routing logic. Switch high-frequency operations to cheapest adequate model. Renegotiate or switch providers. Estimated recovery: 1-2 days for caps, 1 week for routing optimization. |
| Telegram bot state management spaghetti | HIGH | Refactor to shared action layer. Rewrite bot handlers as thin wrappers around shared commands. Estimated effort: 1-3 weeks depending on feature count. |
| Event store without correlation IDs | MEDIUM | Add correlation IDs to event schema. Backfill existing events where possible (may require event stream replay). New events get IDs immediately. 1-2 weeks. |
| Voice pipeline producing garbage downstream | LOW | Add human-confirmation checkpoint between transcription and AI processing. Can be implemented in 1-2 days as a UI change. |
| AI taking wrong autonomous actions | LOW | Demote all autonomous actions to "suggest" mode. Add confirmation step. Can be flipped in configuration same-day. Design the taxonomy properly before re-enabling. |
| Real-time sync data corruption | HIGH | Depends on severity. May require rebuilding state from event store (if event store is correct). If event store has bad data, recovery requires point-in-time reconstruction from snapshots. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Append-only storage growth | Phase 1: Foundation/Data Layer | Storage growth metrics visible in monitoring dashboard; compaction runs automatically; query latency stays flat as events accumulate |
| GDPR vs. append-only | Phase 1: Foundation/Data Layer | PII stored in separate mutable store; erasure pipeline tested end-to-end; no PII in raw event payloads (automated scan) |
| AI cost explosion | Phase 2: AI Integration | Per-action cost tracking live; cost ceiling enforced; model routing includes cost weighting; monthly cost projectable from daily metrics |
| Telegram bot complexity | Phase 2: UI/Integration (after web core) | Shared action layer exists; Telegram handlers are <50 lines each; Telegram feature set is explicitly scoped (not "full mirror") |
| AI proactive unpredictability | Phase 3: AI Proactive Features (after core AI proven) | Action taxonomy documented; all actions start at Level 1 (suggest); promotion criteria defined; undo mechanism exists for every action type |
| Event-driven observability | Phase 1: Foundation/Architecture | Correlation IDs on every event; dead-letter queues configured; event chain visualization available in dev tools |
| Voice transcription accuracy | Phase 2: Voice Integration | Production accuracy measured weekly; Swiss-accent test corpus exists; confirmation step in pipeline; confidence scores visible to users |
| Integration rate limits | Phase 2: External Integrations | Push/webhook-based for Gmail and Calendar (not polling); per-user request queuing; retry strategies with exponential backoff tested |
| Scope creep (2-person team) | All phases: Planning discipline | Each phase has a defined scope ceiling; "Telegram-native subset" formally defined; "not in this phase" decisions documented and respected |
| Real-time collaboration conflicts | Phase 2: Collaboration Features | Offline/reconnect scenario tested; conflict resolution strategy documented; no data loss in concurrent edit tests |

## Sources

- [Event Sourcing 101: When to Use and How to Avoid Pitfalls](https://innovecs.com/blog/event-sourcing-101-when-to-use-and-how-to-avoid-pitfalls/) -- Event sourcing storage growth patterns
- [Things I wish I knew when I started with Event Sourcing (storage)](https://softwaremill.com/things-i-wish-i-knew-when-i-started-with-event-sourcing-part-3-storage/) -- I/O complexity, snapshot strategies
- [Event Sourcing with Event Stores and Versioning in 2026](https://www.johal.in/event-sourcing-with-event-stores-and-versioning-in-2026/) -- 2026 versioning and replay challenges
- [Multi-provider LLM orchestration in production: A 2026 Guide](https://dev.to/ash_dubai/multi-provider-llm-orchestration-in-production-a-2026-guide-1g10) -- Provider routing pitfalls
- [LLM Cost Optimization Guide](https://www.getmaxim.ai/articles/llm-cost-optimization-a-guide-to-cutting-ai-spending-without-sacrificing-quality/) -- Output token cost multipliers, Plan-and-Execute pattern
- [Complete LLM Pricing Comparison 2026](https://www.cloudidr.com/blog/llm-pricing-comparison-2026) -- Per-provider cost analysis
- [How to deal with privacy and GDPR in Event-Driven systems](https://event-driven.io/en/gdpr_in_event_driven_architecture/) -- GDPR strategies for event-driven systems
- [GDPR Compliance - EventSourcingDB](https://docs.eventsourcingdb.io/best-practices/gdpr-compliance/) -- Crypto-shredding and forgettable payloads
- [Challenges of Building GDPR Compliant Event-Sourced System](https://world.hey.com/otar/challenges-of-building-gdpr-compliant-event-sourced-system-0db251d4) -- Crypto-shredding legal limitations, forgettable payloads pattern
- [Event-Driven Architecture: 5 Pitfalls to Avoid (Wix Engineering)](https://medium.com/wix-engineering/event-driven-architecture-5-pitfalls-to-avoid-b3ebf885bdb1) -- Production EDA incidents
- [Agentic AI in Production: Designing Autonomous Multi-Agent Systems with Guardrails (2026)](https://medium.com/@dewasheesh.rana/agentic-ai-in-production-designing-autonomous-multi-agent-systems-with-guardrails-2026-guide-a5a1c8461772) -- Agent guardrail frameworks
- [Agent Guardrails: Shift From Chatbots to Agents (Galileo)](https://galileo.ai/blog/agent-guardrails-for-autonomous-agents) -- Proactive constraints for autonomous agents
- [How Accurate Is AI Transcription in 2026? (GoTranscript)](https://gotranscript.com/blog/ai-transcription-accuracy-benchmarks-2026) -- Production transcription accuracy degradation (2.8-5.7x)
- [Even as AI Transcription Leaps Forward, Pitfalls Remain](https://www.nojitter.com/ai-voice/even-as-ai-transcription-leaps-forward-pitfalls-remain) -- Accent and noise accuracy impact
- [Best Speech-to-Text APIs in 2026 (Deepgram)](https://deepgram.com/learn/best-speech-to-text-apis-2026) -- Provider-specific accuracy benchmarks
- [Building Robust Telegram Bots](https://henrywithu.com/building-robust-telegram-bots/) -- State management and rate limit strategies
- [Telegram Bot API Rate Limits (GramIO)](https://gramio.dev/rate-limits) -- Specific rate limit numbers
- [Google Calendar API Quota Management](https://developers.google.com/workspace/calendar/api/guides/quota) -- Calendar API limits and distinct error types
- [Gmail API Usage Limits](https://developers.google.com/workspace/gmail/api/reference/quota) -- Gmail quota structure
- [CRDTs vs OT: A Practical Guide (HackerNoon)](https://hackernoon.com/crdts-vs-operational-transformation-a-practical-guide-to-real-time-collaboration) -- Real-time collaboration tradeoffs

---
*Pitfalls research for: Collaborative project intelligence platform with AI integration*
*Researched: 2026-02-07*
