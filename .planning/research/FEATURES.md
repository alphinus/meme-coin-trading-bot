# Feature Research

**Domain:** Collaborative Project Intelligence with AI Integration (2-5 person teams)
**Researched:** 2026-02-07
**Confidence:** MEDIUM — based on ecosystem analysis of 10+ competing products, AI agent trends, and market research. Some differentiator feasibility is LOW confidence due to novelty.

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete. These are drawn from what Linear, Notion, Basecamp, ClickUp, and Monday.com all provide as baseline.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Project CRUD with status tracking** | Every PM tool has it. Users need to create projects, set statuses, and see progress. | LOW | Must support multiple parallel projects. Linear's project model (backlog, active, done) is the gold standard for simplicity. |
| **Task/issue management** | Core unit of work. Without tasks, there is no project management. | LOW | Assignees, due dates, labels, priority. Linear-style lightweight issues, not Jira-weight tickets. |
| **Real-time collaboration** | Notion, ClickUp, Google Docs have trained users to expect simultaneous editing and live presence indicators. | MEDIUM | At minimum: live cursors in docs, real-time task updates. WebSocket infrastructure required. |
| **Document/notes workspace** | Notion and Basecamp both center docs alongside tasks. Separation of docs from tasks feels broken in 2026. | MEDIUM | Rich text editor with embeds, links to tasks/projects. Block-based editing is expected. |
| **Comments and @mentions** | Basic team communication on work items. Every tool from Basecamp to Linear has threaded comments. | LOW | On tasks, docs, and projects. Must support @person notifications. |
| **Notifications system** | Users expect to know when things change without polling. Push/email/in-app are baseline. | MEDIUM | Multi-channel (in-app + email minimum). Must be filterable — notification fatigue is a known churn driver. |
| **Search across workspace** | Notion's "Ask Notion" and ClickUp's universal search have made full-workspace search expected. | MEDIUM | Must search tasks, docs, comments, projects. AI-powered search is rapidly becoming baseline. |
| **User authentication and roles** | Non-negotiable for any multi-user app. | LOW | OAuth/email auth. For 2-5 people, simple roles (admin/member) suffice. Avoid enterprise RBAC. |
| **Integrations (GitHub minimum)** | Dev teams expect GitHub connection. ClickUp and Linear both have native GitHub integration. | MEDIUM | PR/commit linking to tasks. Two-way sync is ideal but one-way (GitHub -> app) is minimum viable. |
| **Mobile access** | Basecamp and Notion both have full mobile apps. Teams expect to check status on the go. | HIGH | Progressive web app is acceptable for MVP. Native apps are v2+. |
| **Activity feed / audit trail** | Users want to see what changed, who changed it, and when. Monday.com and ClickUp both have this. | LOW | Chronological feed per project. Foundation for the event-driven documentation differentiator. |
| **Basic AI assistance** | In 2026, AI content generation and summarization are table stakes — "beyond the table stakes of generating and summarizing content" (Zapier, 2026). | MEDIUM | Summarize tasks, generate drafts, answer questions about project state. Uses existing LLM APIs. |

### Differentiators (Competitive Advantage)

Features that set the product apart. These align with the project's core vision and have no direct equivalent in mainstream tools.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Soul Documents (per-person persistent memory)** | No tool captures *how* a person thinks across projects. Notion stores what you write; Soul Docs capture your decision patterns, communication style, and thinking tendencies. AI uses these to anticipate needs and mediate conflicts. | HIGH | Append-only, growing over time. Requires pattern extraction from user behavior (decisions, writing style, conflict patterns). Closest analog: Claude's project-scoped memory, but per-person and cross-project. Novel — no competitor does this. |
| **Meta Soul Document (team-level pattern recognition)** | Synthesizes individual Soul Docs into team dynamics understanding. Identifies team strengths, blind spots, recurring friction patterns. No PM tool tracks team cognition. | HIGH | Depends on: Soul Documents. Requires cross-referencing patterns across people and projects. Computational cost is significant — batch processing recommended over real-time. |
| **Rule-bound AI team member (not a chatbot)** | ClickUp and Notion offer AI assistants you invoke. This is an AI that has visible presence, acts on triggers, and operates by explicit rules — more like Devin's autonomous agent model applied to project management. Users don't prompt it; it acts when conditions are met. | HIGH | Requires: event system, rule engine, visible presence (emoji/avatar in team list, activity feed entries). Key distinction: rule-bound (transparent, predictable) vs. autonomous (opaque, surprising). |
| **GSD 8-phase workflow engine** | Linear has cycles. Basecamp has Shape Up. No tool enforces a structured lifecycle that guides projects from ideation through completion with phase gates. Reduces "project drift" — the #1 killer of small-team projects. | MEDIUM | Phase definitions, transition rules, phase-specific tooling. Must feel like guardrails, not bureaucracy. Basecamp's calm philosophy is the UX benchmark here. |
| **Full-mirror Telegram bot** | Existing Telegram PM bots (Kaban, Corcava) are notification-only or command-limited. A full mirror means every workflow action available in the web app is also available in Telegram. For teams where Telegram IS the communication hub, this eliminates context switching entirely. | HIGH | Requires: complete API parity, conversational UI design, inline keyboards for complex actions. Telegram Bot API limitations (message size, callback data size) create real constraints. |
| **Voice-first idea capture with AI auto-routing** | Otter.ai and Plaud capture voice, but dump it into transcripts. This captures voice ideas and auto-routes them to the right project, the right phase, or the idea pool. Reduces friction from "I had an idea" to "it's already tracked." | MEDIUM | Depends on: projects existing, AI classification. Uses Whisper/Deepgram for transcription + LLM for intent classification and project routing. Mobile-first feature. |
| **Event-driven append-only documentation** | Decision logs exist (Loqbooq, Monday.com templates) but require manual entry. This auto-captures every decision, status change, and discussion outcome as immutable events. Creates perfect project history without human discipline. | MEDIUM | Depends on: activity feed (table stakes). Extension of audit trail into structured, queryable documentation. Event sourcing pattern from distributed systems applied to project management. |
| **AI conflict mediation** | Personos and AptiveIndex analyze communication for conflict signals, but they are standalone HR tools. Embedding conflict detection into the collaboration surface where conflicts actually happen is novel. Works with Soul Docs to understand each person's patterns. | HIGH | Depends on: Soul Documents, comments/communication system. Must be subtle — surfacing "tension detected" with suggestions, not inserting itself into conversations uninvited. Hybrid AI-human approach resolves disputes 23% more effectively than either alone. |
| **Multi-provider AI orchestration with cost tracking** | LiteLLM and Bifrost solve this at infrastructure level. Exposing cost tracking to users as a first-class feature (not just ops concern) is differentiated. Teams see what AI costs them per project. | MEDIUM | Use LiteLLM or similar gateway. Route by task complexity (cheap models for summaries, expensive for analysis). Dashboard showing cost per project/feature. |
| **GitHub fork flow (URL -> fork -> AI analysis -> idea pool)** | No PM tool treats "I found an interesting repo" as a first-class input. CodeRabbit and Cursor Bugbot analyze PRs but don't connect back to project ideation. This bridges open-source discovery with project planning. | MEDIUM | Depends on: idea pool, GitHub integration. GitHub API for forking + AI code analysis + routing to idea pool. Unique workflow not found in any competitor. |
| **Idea pool with multi-input ingestion** | Notion has databases. Linear has triage. Neither has a dedicated space for unstructured ideas that AI helps shape, categorize, and connect to active projects over time. | LOW | Foundation for voice-first input and GitHub fork flow. Simple initially — just a list with AI tagging. Grows more valuable with routing intelligence. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems, especially for 2-5 person teams.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Granular permissions / enterprise RBAC** | "We need role-based access control" | For 2-5 people, permissions add friction without value. Every permission check is a collaboration tax. Basecamp succeeds with flat access. | Simple admin/member distinction. Trust the team. Add permissions only if/when team size exceeds 10. |
| **Real-time everything (live cursors everywhere)** | "Notion and Google Docs have it" | Massive infrastructure cost (WebSocket connections, CRDT/OT). For 2-5 people, async-first is healthier. Real-time presence on docs is sufficient. | Real-time on docs and activity feed. Async-first for everything else, following Basecamp's calm philosophy. |
| **Gantt charts / resource leveling** | "We need to see dependencies visually" | Gantt charts are enterprise theater for small teams. They require constant maintenance and create false precision. Monday.com and ClickUp offer them but small teams rarely use them. | Phase-based progress views (GSD workflow). Hill Charts (Basecamp-style) for intuition-level progress. |
| **Time tracking** | "We need to know where time goes" | Time tracking changes behavior — people optimize for tracked metrics, not outcomes. Creates surveillance feeling in small teams. | Activity-based insights from event log (passive). "Time in phase" metrics from GSD workflow. No manual timers. |
| **Custom fields / custom everything** | "We need to customize every field" | ClickUp's flexibility is also its complexity curse. Custom fields create schema drift — everyone's project looks different. For 2-5 people, opinionated structure beats flexibility. | Opinionated schemas per GSD phase. Labels and tags for lightweight categorization. Fixed fields that work for 90% of cases. |
| **AI chatbot / general-purpose assistant** | "Add a chatbot like ChatGPT" | Chatbots are undirected — users don't know what to ask. Rule-bound AI with visible presence is more valuable because it acts without being prompted. A chatbot feels like another tool to learn; a team member feels like help arriving. | Rule-bound AI team member that acts on triggers. Focused AI actions (summarize this, route this idea) over open-ended chat. |
| **Video/audio calls** | "We need built-in video calls" | Zoom, Google Meet, and Telegram calls already exist. Building video infrastructure is enormous cost for zero differentiation. | Integrate with external call tools. Capture call outcomes via voice-first input. AI meeting notes from transcript upload. |
| **Marketplace / plugin ecosystem** | "We need extensibility" | Premature abstraction. Plugin systems require stable APIs, documentation, review processes. For a 2-5 person tool, this is years away from relevant. | Webhook-based integrations. API for power users. Revisit plugins at 10K+ users. |
| **Kanban board as primary view** | "Every PM tool has Kanban" | Kanban optimizes for flow of individual tasks but obscures project-level progress and phase structure. The GSD workflow IS the primary organizing principle, not task flow. | GSD phase view as primary. List view for tasks within a phase. Kanban as optional secondary view if demand is clear. |

## Feature Dependencies

```
[User Auth] (table stakes)
    |
    v
[Project CRUD] (table stakes)
    |
    +---> [Task Management] (table stakes)
    |         |
    |         +---> [Comments & @mentions] (table stakes)
    |         |         |
    |         |         +---> [AI Conflict Mediation] (differentiator)
    |         |
    |         +---> [Activity Feed] (table stakes)
    |                   |
    |                   +---> [Event-Driven Documentation] (differentiator)
    |                   |
    |                   +---> [Notifications] (table stakes)
    |
    +---> [GSD Workflow Engine] (differentiator)
    |         |
    |         +---> [Rule-Bound AI Team Member] (differentiator)
    |
    +---> [Document Workspace] (table stakes)
    |         |
    |         +---> [Search] (table stakes)
    |
    +---> [Idea Pool] (differentiator)
              |
              +---> [Voice-First Idea Capture] (differentiator)
              |
              +---> [GitHub Fork Flow] (differentiator)

[Soul Documents] (differentiator) — parallel track, independent of project CRUD
    |
    +---> [Meta Soul Document] (differentiator)
    |
    +---> [AI Conflict Mediation] (differentiator) — also requires Comments

[Basic AI Assistance] (table stakes)
    |
    +---> [Multi-Provider AI Orchestration] (differentiator)
              |
              +---> [Rule-Bound AI Team Member] (differentiator)
              |
              +---> [Voice-First Idea Capture] (differentiator)
              |
              +---> [AI Conflict Mediation] (differentiator)

[GitHub Integration] (table stakes)
    |
    +---> [GitHub Fork Flow] (differentiator)

[Telegram Bot — Notifications] (table stakes tier)
    |
    +---> [Full-Mirror Telegram Bot] (differentiator)
```

### Dependency Notes

- **Soul Documents are a parallel track:** They don't depend on project CRUD — they grow from all user activity across the system. Start collecting data from day one, even before the UI to view them exists.
- **Event-Driven Documentation requires Activity Feed:** The activity feed is the raw event stream. Event-driven docs are the structured, queryable layer on top.
- **Rule-Bound AI requires both GSD Workflow and AI Orchestration:** The rules are defined by GSD phases (triggers), and the AI actions require multi-provider orchestration (execution).
- **AI Conflict Mediation requires Soul Documents AND Comments:** It needs to understand each person's patterns (Soul Docs) and monitor where conflicts manifest (comments, discussions).
- **GitHub Fork Flow requires both GitHub Integration AND Idea Pool:** Forks land in the idea pool, which must exist first.
- **Full-Mirror Telegram Bot requires complete API:** Every feature must have an API endpoint before the Telegram bot can mirror it. Build API-first from day one.
- **Voice-First Idea Capture conflicts with building native mobile early:** Voice capture needs mobile, but a PWA with voice recording is sufficient for v1. Native mobile app is a separate, deferred effort.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate that structured small-team collaboration with an AI team member is compelling.

- [ ] **User auth + team creation** — foundation for everything
- [ ] **Project CRUD with GSD phase structure** — the core workflow differentiator must be present from day one, even if simplified (3-4 phases instead of 8)
- [ ] **Task management within projects** — lightweight Linear-style issues with assignee, status, priority
- [ ] **Document workspace** — rich text notes per project, per phase
- [ ] **Comments and @mentions** — basic collaboration on tasks and docs
- [ ] **Activity feed (event stream)** — every action logged. Foundation for event-driven docs and Soul Documents
- [ ] **Basic AI assistance** — summarize project status, generate task descriptions, answer questions about project state
- [ ] **Idea pool** — simple list with manual input. AI tagging deferred but data model supports it
- [ ] **Notifications** — in-app + email for mentions and assignments
- [ ] **Telegram bot (notifications only)** — push notifications to Telegram. Not full mirror yet, but establishes the channel

### Add After Validation (v1.x)

Features to add once core loop is working and 5-10 teams are using the product.

- [ ] **GSD workflow full 8-phase lifecycle** — expand from simplified phases once teams confirm the structured approach works
- [ ] **Soul Documents v1** — begin extracting patterns from accumulated activity data. Show users their own thinking patterns
- [ ] **Voice-first idea capture** — add voice recording + Whisper transcription + AI routing to idea pool/projects
- [ ] **Event-driven documentation** — layer structured decision records on top of the activity feed
- [ ] **GitHub integration** — PR/commit linking to tasks
- [ ] **Rule-bound AI v1** — first triggers: phase transition reminders, stale project alerts, daily summaries. Visible in activity feed with distinct avatar
- [ ] **Full-text search** — across all workspace content
- [ ] **Multi-provider AI orchestration** — route AI tasks to appropriate models, expose cost per project

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Full-mirror Telegram bot** — requires complete, stable API surface. Build after API is proven
- [ ] **Meta Soul Document** — requires significant Soul Document data accumulation across projects
- [ ] **AI conflict mediation** — requires mature Soul Documents and sufficient communication data
- [ ] **GitHub fork flow** — requires both GitHub integration and idea pool to be mature
- [ ] **Native mobile apps** — PWA is sufficient until user demand proves otherwise
- [ ] **Advanced AI rules engine** — complex conditional triggers. Start with simple rules, expand based on team feedback

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Project CRUD + GSD phases | HIGH | LOW | P1 |
| Task management | HIGH | LOW | P1 |
| Document workspace | HIGH | MEDIUM | P1 |
| User auth + teams | HIGH | LOW | P1 |
| Comments + @mentions | HIGH | LOW | P1 |
| Activity feed / event stream | HIGH | LOW | P1 |
| Basic AI assistance | MEDIUM | MEDIUM | P1 |
| Notifications (in-app + email) | MEDIUM | MEDIUM | P1 |
| Idea pool | MEDIUM | LOW | P1 |
| Telegram bot (notifications) | MEDIUM | LOW | P1 |
| GSD full 8-phase workflow | HIGH | MEDIUM | P2 |
| Soul Documents v1 | HIGH | HIGH | P2 |
| Voice-first idea capture | MEDIUM | MEDIUM | P2 |
| Event-driven documentation | MEDIUM | MEDIUM | P2 |
| GitHub integration | MEDIUM | MEDIUM | P2 |
| Rule-bound AI v1 | HIGH | HIGH | P2 |
| Search | MEDIUM | MEDIUM | P2 |
| Multi-provider AI orchestration | MEDIUM | MEDIUM | P2 |
| Full-mirror Telegram bot | HIGH | HIGH | P3 |
| Meta Soul Document | HIGH | HIGH | P3 |
| AI conflict mediation | MEDIUM | HIGH | P3 |
| GitHub fork flow | LOW | MEDIUM | P3 |
| Native mobile apps | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch — validates the core thesis
- P2: Should have, add once core is validated with real teams
- P3: Nice to have, requires P1+P2 maturity and accumulated data

## Competitor Feature Analysis

| Feature | Linear | Notion | Basecamp | ClickUp | Monday.com | Our Approach |
|---------|--------|--------|----------|---------|------------|--------------|
| Task management | Lightweight, fast, opinionated | Database-based, flexible | Simple to-do lists | Feature-rich, customizable | Visual, template-driven | Linear-weight with GSD phase context |
| Documents | Separate (docs + issues) | Core strength — wiki/docs/databases | Message board + docs & files | Docs embedded in workspace | Workdocs | Block-based docs tied to project phases |
| AI assistance | AI-generated updates, triage suggestions | Multi-model AI (GPT-5, Claude, o3), agents, autofill | None (deliberate) | ClickUp Brain — agents, summaries, workflow automation | AI assistant for content and automation | Rule-bound AI team member (acts, doesn't wait to be asked) |
| Project lifecycle | Cycles (sprints) + projects + initiatives | Flexible (user-defined) | Shape Up (6-week cycles) | Spaces/folders/lists hierarchy | Boards with custom workflows | GSD 8-phase structured lifecycle with phase gates |
| Team memory | None | Wiki for team knowledge | Automatic check-ins | Docs + knowledge base | None | Soul Documents — persistent per-person pattern recognition |
| Voice input | None | AI note transcription (2026) | None | AI Notetaker (meeting transcription) | None | Voice-first idea capture with AI auto-routing |
| Telegram | None | None | None (email-first) | None natively | None natively | Full-mirror bot — complete workflow from Telegram |
| Decision tracking | None (manual) | Manual databases | None (message board history) | None (manual) | Decision log templates | Automatic event-driven append-only decision capture |
| Conflict resolution | None | None | None | None | None | AI conflict mediation using Soul Documents |
| GitHub integration | Deep (native) | Limited (third-party) | None | Deep (native) | Native | Fork flow: URL -> fork -> analysis -> idea pool |
| Target team size | 5-500 (engineering teams) | 1-10000 (any team) | 2-50 (small companies) | 5-5000 (any team) | 5-10000 (any team) | 2-5 (intimate collaboration) |
| Philosophy | Speed and craft | Flexibility and knowledge | Calm and async | Everything in one place | Visual and accessible | Structured intelligence with AI teammate |

## Sources

- [Zapier: 6 Best AI Project Management Tools 2026](https://zapier.com/blog/best-ai-project-management-tools/) — AI summarization and content generation are table stakes
- [Epicflow: AI Agents for Project Management 2026](https://www.epicflow.com/blog/ai-agents-for-project-management/) — AI agents as autonomous teammates trend
- [Forecast: 10 Best AI PM Tools 2026](https://www.forecast.app/blog/10-best-ai-project-management-software) — Automated planning capabilities overview
- [Linear Features](https://linear.app/features) — Cycles, projects, initiatives, project graphs
- [Notion 3.2 Release Notes 2026](https://www.notion.com/releases/2026-01-20) — Multi-model AI, mobile AI, agents
- [ClickUp Brain](https://clickup.com/brain) — AI agents, workflow automation, multi-model support
- [Basecamp](https://basecamp.com/) — Calm philosophy, 6 essential tools, Hill Charts
- [Monday.com Blog: Linear Alternatives](https://monday.com/blog/rnd/linear-alternatives/) — Feature comparison across PM tools
- [The New Stack: Memory for AI Agents](https://thenewstack.io/memory-for-ai-agents-a-new-paradigm-of-context-engineering/) — 2026 as "Year of Context"
- [Dust.tt: Agent Memory](https://blog.dust.tt/agent-memory-building-persistence-into-ai-collaboration/) — Persistent memory in AI collaboration
- [DEV Community: Multi-provider LLM Orchestration 2026](https://dev.to/ash_dubai/multi-provider-llm-orchestration-in-production-a-2026-guide-1g10) — 37% of enterprises use 5+ models
- [Swfte AI: Intelligent LLM Routing](https://www.swfte.com/blog/intelligent-llm-routing-multi-model-ai) — Cost-aware routing cuts costs 85%
- [Cognition: Devin 2025 Performance Review](https://cognition.ai/blog/devin-annual-performance-review-2025) — AI agent as autonomous team member, 67% PR merge rate
- [Personos: AI Conflict Resolution](https://www.personos.ai/post/ai-tools-conflict-resolution) — Communication pattern analysis, 89% conflict type detection accuracy
- [Pollack Peacebuilding: AI Mediation](https://www.pollackpeacebuilding.com/blog/ai-driven-mediation/) — Hybrid AI-human systems 23% more effective
- [CIO: Taming AI Agents 2026](https://www.cio.com/article/4064998/taming-ai-agents-the-autonomous-workforce-of-2026.html) — Hybrid human-AI workforce emergence
- [Loqbooq](https://loqbooq.app/) — Decision log tool with Slack integration
- [Corcava: Telegram Bot PM](https://corcava.com/blog/run-projects-from-chat-telegram-bot-tasks-time-alerts) — Telegram task/time/alert capabilities
- [Speechify: Voice AI Productivity 2026](https://speechify.com/blog/best-voice-ai-productivity-tools-2026/) — Voice AI tools landscape
- [Otter.ai](https://otter.ai/) — Meeting transcription with action items

---
*Feature research for: Collaborative Project Intelligence with AI Integration*
*Researched: 2026-02-07*
