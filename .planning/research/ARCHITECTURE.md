# Architecture Research

**Domain:** Collaborative project intelligence platform with AI integration
**Researched:** 2026-02-07
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Interface Layer                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                 │
│  │   Web App    │   │ Telegram Bot │   │ Email Ingest │                 │
│  │  (Next.js)   │   │  (Bot API)   │   │  (Gmail API) │                 │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘                 │
│         │                  │                   │                         │
├─────────┴──────────────────┴───────────────────┴────────────────────────┤
│                         Gateway Layer                                    │
│  ┌────────────────────────────────────────────────────────────────┐      │
│  │                    API Gateway / BFF                            │      │
│  │  WebSocket Manager  │  REST API  │  Webhook Handler            │      │
│  └───────────┬─────────┴─────┬──────┴──────────┬─────────────────┘      │
│              │               │                 │                         │
├──────────────┴───────────────┴─────────────────┴────────────────────────┤
│                       Core Services Layer                                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │  Project    │  │    AI      │  │  Workflow   │  │   Voice    │        │
│  │  Service    │  │ Orchestra- │  │  Engine     │  │  Pipeline  │        │
│  │            │  │  tor       │  │  (GSD)      │  │            │        │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘        │
│        │               │               │               │                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │  Document   │  │ Integration│  │  Idea Pool │  │  Notifica- │        │
│  │  Service    │  │  Hub       │  │  Service   │  │  tion Svc  │        │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘        │
│        │               │               │               │                │
├────────┴───────────────┴───────────────┴───────────────┴────────────────┤
│                        Event Bus (Redis Streams / NATS)                  │
├─────────────────────────────────────────────────────────────────────────┤
│                        Data Layer                                        │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                 │
│  │  Event Store │   │  Read Store  │   │  File/Blob   │                 │
│  │  (Postgres)  │   │ (Materialized│   │  Storage     │                 │
│  │  append-only │   │   Views)     │   │  (S3/R2)     │                 │
│  └──────────────┘   └──────────────┘   └──────────────┘                 │
├─────────────────────────────────────────────────────────────────────────┤
│                     External Services                                    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│  │Anthropic│  │ OpenAI  │  │  Gmail   │  │ GitHub  │  │ Google  │      │
│  │  API    │  │  API    │  │  API     │  │  API    │  │Calendar │      │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Web App** | Full dashboard, real-time collaboration, rich UI | Next.js with WebSocket client |
| **Telegram Bot** | Full mirror of web app via button-based UI, voice messages | Telegram Bot API with webhook handler |
| **Email Ingest** | Forward emails to projects, parse attachments | Gmail API watch + webhook push |
| **API Gateway / BFF** | Unified entry point, WebSocket management, auth, rate limiting | Node.js (Express/Fastify) with socket.io or ws |
| **Project Service** | CRUD for projects, membership, permissions, project state machine | Domain service with event emission |
| **AI Orchestrator** | Route AI requests to correct provider/model, manage context | Custom gateway with provider adapters |
| **Workflow Engine (GSD)** | Execute project workflows, background task scheduling, milestone tracking | Event-driven state machine with job queue |
| **Voice Pipeline** | Transcribe audio, analyze content, route to project context | Streaming STT + LLM analysis pipeline |
| **Document Service** | Append-only event storage, 50k token consolidation, snapshot creation | Event sourcing with CQRS read projections |
| **Integration Hub** | Manage connections to Gmail, Calendar, GitHub | Adapter pattern with OAuth token management |
| **Idea Pool Service** | Capture ideas, manage graduation workflow to full projects | State machine: idea -> validated -> project |
| **Notification Service** | Multi-channel notifications (web push, Telegram, email) | Fan-out from event bus to channel adapters |
| **Event Bus** | Decouple services, broadcast domain events | Redis Streams (start), NATS (scale) |
| **Event Store** | Append-only source of truth for all domain events | PostgreSQL with immutable event tables |
| **Read Store** | Optimized materialized views for queries | PostgreSQL views or denormalized tables |
| **File Storage** | Voice recordings, attachments, exports | S3-compatible (Cloudflare R2 / AWS S3) |

## Recommended Project Structure

```
src/
├── interfaces/              # Interface adapters (one per client type)
│   ├── web/                 # Next.js web application
│   │   ├── app/             # App router pages and layouts
│   │   ├── components/      # React components
│   │   ├── hooks/           # WebSocket, data fetching hooks
│   │   └── stores/          # Client-side state (Zustand)
│   ├── telegram/            # Telegram bot interface
│   │   ├── handlers/        # Message/callback handlers
│   │   ├── keyboards/       # Inline keyboard builders
│   │   ├── scenes/          # Conversation flows (FSM)
│   │   └── formatters/      # Markdown formatters for Telegram
│   └── email/               # Email ingestion interface
│       ├── parsers/          # Email body/attachment parsing
│       └── router/           # Route parsed email to project
├── core/                    # Domain logic (shared across all interfaces)
│   ├── project/             # Project aggregate, commands, events
│   ├── document/            # Document aggregate, append/consolidate
│   ├── idea/                # Idea pool aggregate, graduation logic
│   ├── workflow/            # GSD workflow engine, state machines
│   ├── ai/                  # AI orchestrator, provider adapters
│   └── voice/               # Voice pipeline, transcription routing
├── infrastructure/          # Technical implementations
│   ├── event-store/         # Append-only event persistence
│   ├── event-bus/           # Redis Streams / NATS adapter
│   ├── projections/         # Materialized view builders
│   ├── integrations/        # Gmail, Calendar, GitHub adapters
│   ├── websocket/           # WebSocket server, room management
│   └── storage/             # File/blob storage adapter
├── shared/                  # Cross-cutting concerns
│   ├── auth/                # Authentication, session management
│   ├── types/               # Shared TypeScript types
│   ├── events/              # Event type definitions
│   └── utils/               # Common utilities
└── workers/                 # Background job processors
    ├── consolidation/       # Document consolidation worker (50k token)
    ├── ai-triggers/         # Proactive AI pattern recognition
    ├── integrations/        # Integration sync workers
    └── notifications/       # Notification dispatch worker
```

### Structure Rationale

- **interfaces/:** Strict separation between client adapters and core logic. The Telegram bot and web app share zero UI code but call identical core service methods. This is the "shared backend, different frontend" architecture.
- **core/:** Pure domain logic with no infrastructure dependencies. Each aggregate (project, document, idea) owns its events, commands, and invariants. This is what makes the "full mirror" possible -- both interfaces speak the same domain language.
- **infrastructure/:** Technical implementations that core services depend on via interfaces (dependency inversion). Swapping Redis for NATS means changing one adapter, not rewriting services.
- **workers/:** Long-running background processes separated from request-response cycle. The consolidation worker, AI trigger scanner, and integration sync all run independently.

## Architectural Patterns

### Pattern 1: Shared Core with Interface Adapters (Not BFF)

**What:** A single core service layer consumed by thin interface adapters (web, Telegram, email) rather than separate backends-for-frontends. Each interface adapter translates its protocol (HTTP/WebSocket, Telegram Bot API, Gmail webhook) into domain commands and queries.

**When to use:** When the domain logic is identical across all interfaces and the team is small (2-5 people). BFF adds operational overhead that a 2-person team cannot sustain. The interfaces differ in presentation, not in business rules.

**Trade-offs:** Simpler to maintain than BFF. Risk of interface-specific logic leaking into core (mitigate with strict adapter boundaries). Works well at the 2-person team scale; reconsider at 10+ developers.

**Example:**
```typescript
// core/project/commands.ts -- shared domain logic
export async function addUpdate(projectId: string, content: string, userId: string) {
  const event = createEvent('ProjectUpdateAdded', { projectId, content, userId });
  await eventStore.append(projectId, event);
  await eventBus.publish(event);
  return event;
}

// interfaces/web/api/projects/[id]/updates.ts -- web adapter
export async function POST(req: Request) {
  const { content } = await req.json();
  const event = await addUpdate(params.id, content, session.userId);
  return Response.json(event);
}

// interfaces/telegram/handlers/update.ts -- telegram adapter
bot.action(/^add_update:(.+)$/, async (ctx) => {
  const projectId = ctx.match[1];
  ctx.scene.enter('collect_update', { projectId });
});
// Scene collects text, then calls:
// await addUpdate(projectId, collectedText, telegramUserId);
```

### Pattern 2: Event Sourcing with Consolidation Snapshots

**What:** All document changes are stored as append-only events. When the accumulated events for a document stream exceed a token threshold (50k tokens), a consolidation worker creates a snapshot -- a condensed summary of all prior events produced by an AI model -- and marks the older events as consolidated. New queries start from the latest snapshot plus unconsolidated events.

**When to use:** When you need full audit history, real-time collaboration, and AI context windows are the constraint on document size.

**Trade-offs:** More complex than mutable documents. Requires careful snapshot management. The consolidation step introduces AI cost per consolidation. Huge advantage: every change is traceable and the AI always works within its context window.

**Example:**
```typescript
// Document event stream
interface DocumentEvent {
  id: string;
  streamId: string;        // document ID
  type: 'ContentAppended' | 'CommentAdded' | 'DecisionRecorded' | 'Consolidated';
  payload: Record<string, unknown>;
  timestamp: Date;
  userId: string;
  tokenCount: number;       // pre-computed for consolidation tracking
}

// Consolidation logic
async function consolidateIfNeeded(streamId: string) {
  const unconsolidated = await eventStore.getUnconsolidated(streamId);
  const totalTokens = unconsolidated.reduce((sum, e) => sum + e.tokenCount, 0);

  if (totalTokens > 50_000) {
    const summary = await aiOrchestrator.consolidate(unconsolidated);
    await eventStore.append(streamId, {
      type: 'Consolidated',
      payload: { summary, consolidatedEventIds: unconsolidated.map(e => e.id) },
      tokenCount: countTokens(summary),
    });
  }
}

// Reading current state: snapshot + unconsolidated events
async function getCurrentDocument(streamId: string) {
  const lastSnapshot = await eventStore.getLatestConsolidation(streamId);
  const recentEvents = await eventStore.getEventsSince(streamId, lastSnapshot?.id);
  return { snapshot: lastSnapshot?.payload.summary, events: recentEvents };
}
```

### Pattern 3: AI Orchestrator with Provider Routing

**What:** A central AI orchestrator that accepts task-typed requests and routes them to the optimal provider/model based on task complexity, cost, and latency requirements. The orchestrator maintains a routing table mapping task types to model selections and handles fallback chains.

**When to use:** When you use multiple AI providers (Anthropic Haiku/Sonnet/Opus, OpenAI GPT models) and want automatic model selection without hard-coding provider logic into every feature.

**Trade-offs:** Adds an abstraction layer that could become a bottleneck. Mitigate by keeping the routing logic simple (config-driven, not ML-driven). The huge advantage is that upgrading models or switching providers is a config change, not a code change.

**Example:**
```typescript
// AI Orchestrator routing configuration
const routingTable: Record<TaskType, ModelConfig> = {
  'quick-classify':    { provider: 'anthropic', model: 'claude-haiku',   maxTokens: 500 },
  'summarize':         { provider: 'anthropic', model: 'claude-sonnet',  maxTokens: 2000 },
  'deep-analysis':     { provider: 'anthropic', model: 'claude-opus',    maxTokens: 4000 },
  'code-review':       { provider: 'anthropic', model: 'claude-sonnet',  maxTokens: 3000 },
  'consolidate':       { provider: 'anthropic', model: 'claude-sonnet',  maxTokens: 4000 },
  'voice-analysis':    { provider: 'openai',    model: 'gpt-4o',         maxTokens: 2000 },
  'proactive-trigger': { provider: 'anthropic', model: 'claude-haiku',   maxTokens: 1000 },
};

// Fallback chain
const fallbackChains: Record<string, string[]> = {
  'anthropic': ['openai'],
  'openai':    ['anthropic'],
};

async function routeAIRequest(task: TaskType, input: AIInput): Promise<AIResponse> {
  const config = routingTable[task];
  try {
    return await providers[config.provider].complete(config.model, input);
  } catch (err) {
    for (const fallback of fallbackChains[config.provider]) {
      try { return await providers[fallback].complete(config.model, input); }
      catch { continue; }
    }
    throw new AIUnavailableError(task);
  }
}
```

### Pattern 4: Multi-Channel Notification Fan-Out

**What:** Domain events published to the event bus are consumed by a notification service that fans out to multiple delivery channels (WebSocket push, Telegram message, email digest) based on user preferences and the event type. Each user configures which channels receive which event types.

**When to use:** When the same event (e.g., "new project update") must reach users across web, Telegram, and email simultaneously.

**Trade-offs:** Adds a preferences layer to manage. Keeps notification logic out of domain services (clean separation). Essential for the "full mirror" requirement -- the Telegram user gets the same information as the web user, just formatted differently.

## Data Flow

### Request Flow: Web App User Adds a Project Update

```
[Web App: User types update]
    ↓ WebSocket message
[WebSocket Manager] → authenticates, validates
    ↓ domain command
[Project Service: addUpdate()] → validates business rules
    ↓ creates event
[Event Store] ← append 'ProjectUpdateAdded'
    ↓ publishes event
[Event Bus] → broadcasts to subscribers
    ├──→ [Projection Builder] → updates Read Store (materialized view)
    ├──→ [WebSocket Manager] → pushes to all connected web clients in project room
    ├──→ [Notification Service] → sends Telegram message to offline members
    ├──→ [AI Trigger Worker] → evaluates if proactive AI response needed
    └──→ [Consolidation Worker] → checks if document needs consolidation
```

### Request Flow: Telegram Voice Message

```
[Telegram: User sends voice message]
    ↓ Telegram Bot API webhook
[Telegram Handler] → receives voice file reference
    ↓ downloads audio
[Voice Pipeline: Stage 1] → transcription (Whisper API / Deepgram)
    ↓ text transcript
[Voice Pipeline: Stage 2] → AI analysis (classify intent, extract entities)
    ↓ structured result { intent, project, content, action }
[Voice Pipeline: Stage 3] → route to appropriate service
    ├── intent: "update" → [Project Service: addUpdate()]
    ├── intent: "idea"   → [Idea Pool Service: captureIdea()]
    ├── intent: "task"   → [Workflow Engine: createTask()]
    └── intent: "question" → [AI Orchestrator: answer()] → reply to Telegram
    ↓ confirmation
[Telegram Handler] → sends formatted response to user
```

### Request Flow: AI Proactive Trigger

```
[AI Trigger Worker] ← subscribes to event stream (runs continuously)
    ↓ accumulates recent events per project
[Pattern Buffer] → maintains sliding window of project events
    ↓ on threshold (time-based or event-count-based)
[AI Orchestrator: 'proactive-trigger' task]
    ↓ AI evaluates: "Given these recent events, should I suggest anything?"
    ├── NO → continue monitoring
    └── YES → generates suggestion
         ↓ creates event
    [Event Store] ← append 'AIProactiveSuggestion'
         ↓ publishes event
    [Event Bus] → broadcasts
         ├──→ [WebSocket Manager] → pushes to web clients
         └──→ [Notification Service] → sends to Telegram/email
```

### Request Flow: Idea Graduation to Project

```
[Idea Pool: idea in 'validated' state]
    ↓ user triggers graduation (web or Telegram)
[Idea Pool Service: graduateToProject()]
    ↓ validates: has enough detail, approved by collaborators
[Project Service: createFromIdea()]
    ↓ creates new project with idea content as seed document
    ↓ initializes GSD workflow for new project
[Workflow Engine: initializeProject()]
    ↓ creates default phases, milestones, empty document streams
[Event Store] ← append 'ProjectCreatedFromIdea', 'WorkflowInitialized'
    ↓ publishes events
[Event Bus] → broadcasts
    ├──→ [Notification Service] → "Idea X graduated to Project Y"
    └──→ [Integration Hub] → creates GitHub repo, calendar milestones
```

### Key Data Flows

1. **Event sourcing write path:** Command -> validate -> create event -> append to Event Store -> publish to Event Bus -> update projections. All state changes flow through this single path regardless of which interface initiated them.
2. **Real-time read path:** Event Bus -> WebSocket Manager -> push to connected clients. Telegram users receive the same events via Notification Service -> Telegram API.
3. **AI context path:** Read Store (current state) + Event Store (recent events since last consolidation) -> AI Orchestrator. The AI always receives a bounded context: snapshot + recent events, never the unbounded full history.
4. **Voice path:** Audio -> Transcription -> AI Classification -> Domain Command. Voice input enters the same command pipeline as typed input after transcription and classification.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 2-10 users (launch) | Single Node.js process. PostgreSQL for both event store and read store. Redis for event bus and WebSocket pub/sub. All workers run in-process as async jobs. This is a monolith and that is correct for this scale. |
| 10-100 users | Separate worker processes for consolidation and AI triggers (they are CPU/network-bound and should not block the request path). Add connection pooling. Consider read replicas for PostgreSQL if query load grows. |
| 100-1k users | Extract WebSocket management to a dedicated process with Redis pub/sub for horizontal scaling. Add proper job queue (BullMQ) for background workers. Cache hot projections in Redis. |
| 1k+ users | Consider splitting into actual microservices if team grows. Add NATS for event bus (higher throughput than Redis Streams). Database sharding by project/organization. This scale is unlikely for an internal tool first, but the architecture supports it because event sourcing naturally decouples services. |

### Scaling Priorities

1. **First bottleneck: WebSocket connections.** A single Node.js process handles ~10k concurrent WebSocket connections comfortably. At the 2-10 user scale with real-time collaboration, this is a non-issue. When it matters: add Redis pub/sub so multiple Node.js processes share the WebSocket room state.
2. **Second bottleneck: AI API latency and cost.** Consolidation and proactive triggers call AI APIs. These are slow (seconds) and expensive. Mitigate with: background workers (never block the request path), aggressive caching of consolidation results, and the routing table (use Haiku for cheap tasks, Opus only when necessary).
3. **Third bottleneck: Event Store query performance.** As event streams grow, reading all events for a document becomes slow. This is exactly why the consolidation/snapshot pattern exists -- queries start from the last snapshot, not from the beginning of time.

## Anti-Patterns

### Anti-Pattern 1: Fat Interface Adapters

**What people do:** Put business logic in the Telegram bot handler or the Next.js API route, creating divergent behavior between web and Telegram.
**Why it's wrong:** The "full mirror" guarantee breaks. The same action taken via web and Telegram produces different results. Bug fixes must be applied in two places.
**Do this instead:** Interface adapters are thin translators. They parse input (HTTP body, Telegram callback data, email body), call a shared core service function, and format the response for their channel. All business logic lives in `core/`.

### Anti-Pattern 2: Mutable Document State

**What people do:** Store documents as mutable rows that get updated in place, then try to bolt on history/audit later.
**Why it's wrong:** Loses the audit trail. Makes real-time collaboration conflict-prone (last-write-wins). Makes AI consolidation impossible because there is no event stream to consolidate.
**Do this instead:** Event sourcing from day one. Every change is an appended event. Current state is derived from events (via projections or snapshot + replay). This is more work upfront but eliminates an entire class of problems.

### Anti-Pattern 3: Direct AI Provider Calls

**What people do:** Call `anthropic.messages.create()` or `openai.chat.completions.create()` directly from feature code scattered across the codebase.
**Why it's wrong:** Provider lock-in. No fallback. No cost tracking. No ability to change models without modifying every call site. Prompt management becomes chaotic.
**Do this instead:** All AI calls go through the AI Orchestrator. Feature code calls `aiOrchestrator.execute(taskType, input)`. The orchestrator owns the routing table, fallback chains, prompt templates, and usage tracking.

### Anti-Pattern 4: Synchronous AI in the Request Path

**What people do:** User sends a message, the server calls an AI API synchronously, waits 3-8 seconds, then returns the response.
**Why it's wrong:** Blocks the user experience. WebSocket connections tie up server resources. Timeout risk with slow AI providers.
**Do this instead:** Acknowledge the user action immediately ("Processing..."), dispatch the AI task to a background worker via the event bus, and push the AI response back to the client via WebSocket/Telegram when ready. The user sees instant acknowledgment and an async result.

### Anti-Pattern 5: Polling for Real-Time Updates

**What people do:** Web client polls the API every N seconds to check for changes.
**Why it's wrong:** Wasteful, high latency, and does not scale. With 5 users and 10 projects, the polling traffic is already significant.
**Do this instead:** WebSocket connections with room-based pub/sub. The event bus naturally pushes changes to connected clients. Telegram users get push notifications via the Bot API (already push-based).

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Anthropic API | AI Orchestrator adapter, streaming responses | Use streaming for long responses; handle rate limits with exponential backoff; track token usage per project for cost attribution |
| OpenAI API | AI Orchestrator adapter (fallback + Whisper STT) | Primary for voice transcription (Whisper); secondary for text generation (fallback from Anthropic) |
| Gmail API | Watch + webhook push notifications, IMAP for initial sync | Use `users.watch()` for push notifications on new emails; parse with `mailparser`; map sender to user, subject to project |
| Google Calendar API | Two-way sync of milestones and deadlines | Create calendar events from workflow milestones; sync back manual calendar changes as events |
| GitHub API | Webhooks for repo events, API for issue/PR creation | Map GitHub webhook events to project events; create issues from project tasks; link PRs to project updates |
| Telegram Bot API | Webhook mode (not polling) for production | Register webhook URL; handle updates in interface adapter; use inline keyboards for navigation; handle voice messages via file download |
| Deepgram / Whisper | Voice Pipeline transcription stage | Deepgram for real-time streaming transcription; Whisper API for batch/high-accuracy; choose based on latency vs accuracy needs |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Interface adapters <-> Core services | Direct function calls (in-process) | At monolith scale, these are just function imports. No HTTP between them. Keeps latency near zero. |
| Core services <-> Event Store | Direct database calls via repository pattern | Event Store is accessed through a repository abstraction. This allows swapping PostgreSQL for EventStoreDB later without changing domain code. |
| Core services <-> Event Bus | Publish via event bus client | Services publish events after persisting them. The event bus is fire-and-forget from the publisher's perspective; subscribers handle their own errors. |
| Event Bus <-> Workers | Subscribe/consume pattern | Workers are long-running subscribers to specific event types. They process events asynchronously and at their own pace. |
| AI Orchestrator <-> AI Providers | HTTP API calls via provider adapters | Each provider has an adapter that normalizes the request/response format. The orchestrator never speaks a provider-specific protocol directly. |
| Integration Hub <-> External APIs | HTTP API calls via integration adapters + OAuth token management | Each integration (Gmail, GitHub, Calendar) has its own adapter with its own OAuth token refresh logic. The hub manages connection lifecycle. |

## Build Order (Dependency Analysis)

The architecture has clear dependency layers that dictate build order. Components higher in the list are prerequisites for components lower in the list.

### Phase 1: Foundation (must exist before anything else)

| Component | Why First |
|-----------|-----------|
| Event Store (PostgreSQL) | Every other component writes events. This is the foundation. |
| Event Bus (Redis Streams) | Every service publishes and subscribes. Nothing is reactive without this. |
| Auth (sessions, user identity) | Every interface and service needs to know who the user is. |
| Core domain types & event definitions | Shared vocabulary. Everything depends on knowing what a Project, Document, or Event looks like. |

### Phase 2: Core Domain (builds on foundation)

| Component | Depends On |
|-----------|------------|
| Project Service | Event Store, Event Bus, Auth |
| Document Service (append-only, no consolidation yet) | Event Store, Event Bus |
| Read Store / Projections | Event Store, Event Bus (subscribes to events, builds materialized views) |

### Phase 3: First Interface (makes it usable)

| Component | Depends On |
|-----------|------------|
| Web App (basic CRUD, no real-time yet) | Core domain services, Read Store, Auth |
| WebSocket Manager | Event Bus (subscribes to events, pushes to clients) |
| Web App real-time updates | WebSocket Manager |

### Phase 4: AI Layer (unlocks intelligence)

| Component | Depends On |
|-----------|------------|
| AI Orchestrator (routing, provider adapters) | Core domain types (for task type definitions) |
| Document consolidation worker | Document Service, AI Orchestrator, Event Store |
| AI-assisted features in web app | AI Orchestrator, web app |

### Phase 5: Second Interface (Telegram mirror)

| Component | Depends On |
|-----------|------------|
| Telegram Bot (webhook handler, keyboard navigation) | Core domain services (same ones the web app uses), Auth |
| Telegram scenes (conversation flows) | Telegram Bot, core services |
| Voice Pipeline | Telegram Bot (voice message source), AI Orchestrator (transcription + analysis) |

### Phase 6: Workflow & Idea Pool

| Component | Depends On |
|-----------|------------|
| Idea Pool Service | Event Store, Event Bus, core domain types |
| Idea graduation workflow | Idea Pool Service, Project Service |
| GSD Workflow Engine | Project Service, Event Store, Event Bus |
| AI proactive triggers | Event Bus (subscribes to all events), AI Orchestrator, Notification Service |

### Phase 7: Integrations

| Component | Depends On |
|-----------|------------|
| Integration Hub (OAuth management) | Auth, core domain types |
| Gmail integration | Integration Hub, Document Service (to route email content into projects) |
| GitHub integration | Integration Hub, Project Service |
| Google Calendar integration | Integration Hub, Workflow Engine (for milestone sync) |
| Email ingestion interface | Integration Hub, Gmail integration, core services |

### Phase 8: Notification & Polish

| Component | Depends On |
|-----------|------------|
| Notification Service (multi-channel fan-out) | Event Bus, Telegram Bot (for Telegram delivery), Web Push, Email |
| User notification preferences | Notification Service, Auth |
| Email digest worker | Notification Service, Read Store |

### Build Order Rationale

- **Foundation first** because event sourcing is a foundational choice that affects every component. Building it wrong or bolting it on later causes rewrites.
- **Web app before Telegram** because it is easier to iterate on domain model with a rich UI. The Telegram bot is a thin adapter over the same services, so building it second validates that the core services are truly interface-agnostic.
- **AI layer before Telegram** because voice messages (a key Telegram feature) require the AI Orchestrator and Voice Pipeline. Also, consolidation must be working before documents grow large.
- **Integrations last** because they are high-effort (OAuth flows, webhook management, data mapping) and low-dependency (they add value but nothing else depends on them).
- **Workflow engine in Phase 6** because it needs the project and document services to exist first, and its value is clearer once the basic collaboration loop is proven.

## Sources

- [Backends for Frontends Pattern - Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends)
- [Event Sourcing Pattern - Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)
- [CQRS Pattern - Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- [Multi-provider LLM Orchestration in Production: A 2026 Guide](https://dev.to/ash_dubai/multi-provider-llm-orchestration-in-production-a-2026-guide-1g10)
- [LLM Orchestration in 2026: Top 12 Frameworks and 10 Gateways](https://research.aimultiple.com/llm-orchestration/)
- [The Voice AI Stack for Building Agents in 2026](https://www.assemblyai.com/blog/the-voice-ai-stack-for-building-agents)
- [Top Techniques to Manage Context Lengths in LLMs](https://agenta.ai/blog/top-6-techniques-to-manage-context-length-in-llms)
- [How We Extended LLM Conversations by 10x with Intelligent Context Compaction](https://dev.to/amitksingh1490/how-we-extended-llm-conversations-by-10x-with-intelligent-context-compaction-4h0a)
- [Event Sourcing with Event Stores and Versioning in 2026](https://www.johal.in/event-sourcing-with-event-stores-and-versioning-in-2026/)
- [Building Scalable Real-Time Applications with WebSockets and Event-Driven Architecture](https://www.matrixnmedia.com/building-scalable-real-time-applications-with-websockets-and-event-driven-architecture/)
- [From Reactive to Proactive: How to Build AI Agents That Take Initiative](https://medium.com/@manuedavakandam/from-reactive-to-proactive-how-to-build-ai-agents-that-take-initiative-10afd7a8e85d)
- [The Future of AI Agents Is Event-Driven - Confluent](https://www.confluent.io/blog/the-future-of-ai-agents-is-event-driven/)
- [Two Design Patterns for Telegram Bots](https://dev.to/madhead/two-design-patterns-for-telegram-bots-59f5)
- [AI Gateways for OpenAI: OpenRouter Alternatives in 2026](https://research.aimultiple.com/ai-gateway/)

---
*Architecture research for: Collaborative project intelligence platform with AI integration*
*Researched: 2026-02-07*
