# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-07)

**Core value:** No project dies without a documented decision, and every thought trail is fully reconstructable.
**Current focus:** v1.2 Guided UX — Phase 15 executing, Plan 01 complete

## Current Position

Milestone: v1.2 Guided UX
Phase: 15 of 17 (Simple/Expert Mode) — IN PROGRESS
Plan: 1/2 complete
Status: Plan 01 complete, Plan 02 next
Last activity: 2026-02-10 — Completed 15-01-PLAN.md (mode infrastructure)

Progress: [█████████░] 90%

## Performance Metrics

**Velocity:**
- Total plans completed: 44
- Average duration: 7min
- Total execution time: ~4.3 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation & Auth | 7/7 | 100min | 14min |
| 2. Project Lifecycle | 5/5 | 7min | 7min |
| 3. Documentation Engine | 4/4 | 24min | 6min |
| 4. AI Foundation | 6/6 | ~20min | ~3min |
| 5. GSD Workflow Engine | 1/3 | 6min | 6min |
| 6. Voice & Idea Pool | 3/4 | 17min | 6min |
| 7. Telegram Bot & Notifications | 6/6 | ~31min | ~5min |
| 8. Integrations & AI Search | 8/8 | ~58min | ~7min |
| 9. Fix Umlauts | 1/1 | ~3min | ~3min |
| 10. Client i18n Coverage | 4/4 | ~20min | ~5min |
| 11. Telegram Bot i18n | 4/4 | ~20min | ~5min |
| 12. Infrastructure & Safety | 2/N | ~20min | ~10min |
| 14. GitHub Analysis | 2/2 | 8min | 4min |
| 15. Simple/Expert Mode | 1/2 | 3min | 3min |

**Recent Trend:**
- Last 5 plans: 10min, 10min, 3min, 5min, 3min
- Trend: Phase 15 fast -- mode infrastructure follows established context/provider patterns

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 8 phases derived from 53 v1 requirements at comprehensive depth
- [Roadmap]: Real-time collaboration infrastructure built into Phase 1 foundation (event store + event bus)
- [Roadmap]: NOTF-01 grouped with Telegram (Phase 7) since notifications span web + Telegram + email channels
- [Roadmap]: SRCH-01 grouped with Integrations (Phase 8) since AI search requires all data flowing before it adds value
- [01-01]: ViteExpress with inlineViteConfig serves React SPA from Express (monorepo-compatible approach)
- [01-01]: One JSONL file per aggregate type for file locality and manageable sizes
- [01-01]: appendFileSync for event write atomicity, async fs/promises for reads
- [01-01]: @types/express pinned to ^4.17.21 (^5.0.0 does not exist)
- [01-05]: Path allowlist with lazy init from config file or defaults (DATA_DIR, MEMORY_DIR, tmpdir/eluma)
- [01-05]: Soft-delete via rename (.filename.deleted.timestamp) for recovery
- [01-05]: 5-second debounce for git commit batching
- [01-05]: External edits use userId=system in events
- [01-04]: Team state derived from events via reducer pattern (not flat file storage)
- [01-04]: Immediate member addition when invitee exists; pending invite event when not
- [01-04]: 30-second polling for activity feed auto-refresh
- [01-06]: System routes use per-route auth (GET /status public, rest requireAuth)
- [01-06]: macOS GUI app detection uses open -Ra for .app bundles (Chrome, Firefox)
- [01-06]: Dashboard route moved from / to /home; / is RootRedirect checking system status
- [01-07]: process.cwd() for ViteExpress static path (consistent dev/prod)
- [02-01]: Two events per phase transition (phase_completed + phase_advanced) with same correlationId
- [02-01]: Server auto-populates KPI phase from project currentPhase (client cannot specify)
- [02-01]: Auto-archive on review_extraction completion via project.archived event
- [02-01]: Dashboard overview route registered before /:id to avoid Express route conflict
- [03-01]: Dual-write pattern: every soul document entry writes to both JSONL event store and Markdown file
- [03-01]: Forward-compatible EntrySourceType includes audio (Phase 6) and ai_reflection (Phase 4)
- [03-01]: EVENT_TO_ENTRY_MAP with explicit Phase 4/6 integration comments for future wiring
- [03-01]: Module-level teamId cache in writer.ts (2 users, simple effective cache)
- [03-01]: Meta Soul Document routes are placeholders, full implementation in Plan 02
- [03-02]: Fire-and-forget pattern: processEventForDocumentation never awaited in route handlers
- [03-02]: Memory routes required explicit memory.file_created event emission (module only emits file_updated)
- [03-02]: Display names resolved via loadUser in meta-soul.ts for human-readable Meta Soul Documents
- [03-03]: react-markdown v10 default export is Markdown (not ReactMarkdown from v9)
- [03-03]: Inline confirm/cancel for soft-delete instead of window.confirm for better UX
- [03-03]: Source type badge color mapping shared between SoulDocumentEntry and MetaSoulDocument
- [03-04]: SoulRedirect component reads useAuth and navigates to /soul/{user.id} for /soul base route
- [03-04]: /soul/meta/:teamId registered before /soul/:userId to prevent 'meta' matching as userId
- [03-04]: SoulDocumentNav added inside each page component (option a) rather than wrapper layout
- [04-01]: Lazy provider registry initialization to allow server startup without API keys
- [04-01]: Provider:tier alias pattern (anthropic:fast, openai:balanced) for model addressing
- [04-01]: AI SDK v4 uses inputTokens/outputTokens (not promptTokens/completionTokens) and maxOutputTokens
- [04-01]: Preset resolution chain: explicit override > task-type preset > hardcoded default
- [04-02]: AI member entity uses same event-sourced reducer pattern as teams and projects
- [04-02]: Default AI config returned when no ai.member_configured event exists (graceful first-use)
- [04-02]: Face emoji tracks AI state: idle, thinking, suggestion, warning, mediation
- [04-02]: correlationId set to teamId for AI member events (one AI member per team)
- [04-03]: CorrelationId + ruleId dedup key prevents duplicate triggers from correlated events (5-second TTL)
- [04-03]: Fire-and-forget evaluateTriggersForEvent matches processEventForDocumentation pattern
- [04-03]: Notification maps rule type to face emoji category (milestone/pattern/catch -> suggestion, conflict -> warning)
- [04-04]: Override events use ai_member aggregate type with nodeId/aiEventId as aggregateId for traceability
- [04-04]: Mediate endpoint creates ai.mediation_requested event then delegates to mediateConflict(DomainEvent)
- [04-05]: Face emoji uses Unicode characters directly (no emoji library): idle->neutral, thinking->thinking face, suggestion->lightbulb, warning->warning, mediation->handshake
- [04-05]: AiOverrideMenu slides from right (CSS translateX) with semi-transparent backdrop
- [04-05]: useTextToSpeech uses EasySpeech.detect() guard before init for graceful non-TTS browser handling
- [04-05]: AiCostDashboard formats costs in EUR with 4 decimal places via Intl.NumberFormat
- [04-05]: AiModelOverride uses hardcoded TASK_TYPES with provider:tier aliases for model selection
- [04-06]: Extended "ai" role across all TeamMember type definitions (shared, client hook, server reducer, server routes) for consistency
- [04-06]: AiTeamMember widget placed between welcome header and project overview as a max-400px card on Dashboard
- [05-01]: Workflow events use "workflow" aggregate type with projectId as aggregateId (separate from project events)
- [05-01]: Legacy projects get default initial state at first step of current phase (no migration needed)
- [05-01]: Decision point Go enters pipeline, No-Go archives with rationale, Defer leaves at decision_point
- [05-01]: Step completion is idempotent (duplicate completions skip event emission)
- [06-01]: Idea aggregate uses "idea" aggregateType with per-idea aggregateId (same pattern as project)
- [06-01]: TranscriptionResult wraps AI SDK with nullable-to-undefined conversion for clean API
- [06-01]: Archive route prevents archiving graduated ideas (business rule)
- [06-01]: Transcription appends to rawInput (not replaces) for multi-segment voice capture
- [06-01]: multer 25MB limit matches Whisper API constraint
- [06-02]: Voice routing falls back to idea_pool on AI parse failure (safe default)
- [06-02]: Readiness scoring uses 4 GSD dimensions at 25 points each (problem/audience/feasibility/effort)
- [06-02]: AI role members excluded from graduation voting requirements (only human members vote)
- [06-02]: Auto-graduation executes immediately when final vote creates unanimous approval
- [06-03]: apiUpload omits Content-Type header so browser auto-sets multipart boundary
- [06-03]: useVoiceRecorder detects best MIME type from webm/opus, webm, mp4 candidates
- [06-03]: IdeaPool page uses two-column layout with sticky detail panel
- [07-02]: Telegram channel uses getTelegramLinkByElumaUser (lookup by Eluma user ID) since dispatcher has userId not telegramUserId
- [07-02]: Email transporter created at module load time (null if no SMTP_HOST), disabled warning logged once
- [07-02]: Web notification read tracking uses separate notification.read events cross-referenced during reads
- [07-02]: Multi-channel dispatcher: try/catch each channel independently for fault isolation
- [07-01]: Null-guard bot pattern: bot exports null when TELEGRAM_BOT_TOKEN not set, all consumers check before use
- [07-01]: Webhook route registered BEFORE express.json() in app.ts for grammY raw body access
- [07-01]: Linking codes use separate telegram_linking aggregate with subType for code_generated/code_consumed
- [07-01]: setupBot() runs in async IIFE at app.ts bottom with try/catch for non-blocking initialization
- [07-03]: Menus registered as middleware in bot.ts (b.use(menu)) before registerCommands for proper callback handling
- [07-03]: currentIdeaId added to SessionData for idea menu navigation state
- [07-03]: Idea refinement in Telegram menu emits idea.refinement_question event directly (same pattern as HTTP route)
- [07-03]: Settings menu uses ctx.menu.update() for inline refresh after toggling a preference
- [07-04]: Workflow steps use i18n titleKey as readable fallback text (strip prefix, replace underscores) since locale files not yet configured
- [07-04]: Callback data prefix routing: wf: for workflow buttons, vr: for voice routing buttons
- [07-04]: Fire-and-forget voice: immediate reply, background task for download/transcribe/route, edit original message with results
- [07-04]: Session pendingWorkflowInput set by text_input/ai_prompt steps, consumed and cleared by text handler
- [07-06]: ai.ts routes intentionally skipped for emitter wiring -- mapped AI events fire from trigger engine/mediation module, not route handlers
- [07-06]: Triple fire-and-forget pattern established: processEventForDocumentation + evaluateTriggersForEvent + emitNotificationForEvent
- [08-01]: Google tokens stored in DATA_DIR/credentials/ (not event store) -- sensitive credentials, not domain events
- [08-01]: Octokit creates unauthenticated client when GITHUB_TOKEN missing (graceful degradation)
- [08-01]: Integration reducer follows same event-sourcing pattern as project.ts reducer
- [08-01]: AI SDK v6.0.77 and Zod confirmed already present for Plan 08-05 tool-calling
- [08-03]: repos.ts combines Octokit API calls with event-store persistence (fetch + emit pattern)
- [08-03]: Fork polling uses 10 retries with 3s delay; falls back to source repo analysis if fork not ready
- [08-03]: AI code analysis input capped at 8000 chars to prevent excessive token usage
- [08-03]: Fork-analyze returns 202 with fire-and-forget pattern; client polls /fork/status/:ideaId
- [08-03]: Routes added to existing github.ts rather than creating redundant github-integration.ts
- [08-06]: Keyword search operates independently of AI -- no API keys required for basic search functionality
- [08-06]: AI search falls back to keyword search when AI provider is unavailable (graceful degradation with fallback flag)
- [08-06]: Search history derived from existing search.query_executed events in integration aggregate
- [08-06]: Typeahead suggestions prioritize starts-with matches over contains matches, entity names over past queries
- [08-07]: useIntegrations hook centralizes all integration API calls (status, connect, disconnect, emails, search) in one hook
- [08-07]: Connection cards use a shared ConnectionCard component with connect/disconnect toggle
- [08-07]: Gmail inbox uses click-to-expand pattern for message bodies (reduces initial render load)
- [08-07]: AI search UI provides scope filtering (all/projects/ideas/soul_documents) with inline results display
- [08-08]: AI SDK v6 tool() uses inputSchema instead of parameters for TypeScript type compatibility
- [08-08]: maxSteps replaced with stopWhen: stepCountIs(n) for AI SDK v6 generateText API
- [08-08]: TypedToolCall uses .input (not .args) and TypedToolResult uses .output (not .result) in AI SDK v6
- [08-08]: ViteExpress ViteConfig type does not include cacheDir; removed to match type definition
- [10-02]: Source type labels use dynamic key lookup t(`soulDoc.sourceType_${type}`) instead of formatSourceType() string manipulation
- [10-02]: i18next _one/_other plural suffixes for entry counts instead of ternary operators
- [10-02]: common.retry and common.remove added as reusable translation keys
- [10-02-ai]: Used useTranslation from react-i18next directly per CLAUDE.md convention for AI/Auth/Voice components
- [10-02-ai]: Moved TASK_TYPES/AVAILABLE_MODELS label data inside AiModelOverride component body for t() hook access
- [10-04]: Used useTranslation from react-i18next directly per CLAUDE.md convention
- [10-04]: Simplified connected_detail strings to use t() interpolation with email/since params
- [10-04]: Sub-components in same file each get their own useTranslation() call
- [12-02]: EventEmitter + buffer pattern for SSE: session manager emits live, buffers for replay, SSE route forwards via named events
- [12-02]: permissionMode: 'default' with canUseTool handler instead of bypassPermissions for security-first approach
- [12-02]: 10-minute session timeout, 500-event replay buffer cap as safety limits
- [12-02]: Named SSE events (event: type) for per-type addEventListener on client
- [12-02]: persistSession: false and empty settingSources for ephemeral agent queries
- [13-01]: Event IDs are transport-level (SSE wire format id: N), not domain-level (SSEEvent type unchanged)
- [13-01]: 1-based event IDs (buffer index 0 = event ID 1) following SSE convention
- [13-01]: AgentSession.projectId kept as string | null to avoid cascading interface changes
- [13-02]: Only close EventSource on terminal events (result, server-sent error with data) -- let browser auto-reconnect on transient errors
- [13-02]: highlight.js github.css theme for code blocks -- matches Eluma light UI
- [14-01]: Use source: "import" for GitHub analysis idea creation to avoid schema changes (existing enum supports it)
- [14-01]: Promise.allSettled instead of Promise.all for parallel Octokit calls so one failure does not abort others
- [14-01]: Synchronous 200 response for /analyze route (not 202 fire-and-forget) since read-only analysis completes in 2-5s
- [14-01]: New integration.github_repo_analyzed event type instead of reusing integration.github_code_analyzed for clarity
- [14-02]: GitHubAnalyze component created as standalone with githubAnalyze.* i18n keys, reusing RepoAnalysis display from Plan 01
- [14-02]: GITHUB_URL_REGEX uses negative lookahead to skip non-repo URLs (issues, PRs, blobs, trees, commits) in Telegram
- [14-02]: User language for Telegram analysis derived from user.language profile field (consistent with grammyjs locale negotiator)
- [15-01]: Default mode is "simple" when no localStorage value exists (non-technical user first experience)
- [15-01]: ModeProvider placed inside AuthProvider but outside Routes (all routes and AppLayout have access)
- [15-01]: ModeToggle placed as first element in headerRight (before NotificationBell) for visibility

### Pending Todos

None.

### Blockers/Concerns

- Research flags Phase 4 (AI), Phase 6 (Voice), Phase 7 (Telegram), Phase 8 (Integrations) as needing deeper research during planning
- Research suggests starting with simplified 3-4 GSD phases instead of full 8 -- user decision needed during Phase 5 planning
- npm strict-ssl disabled in dev environment due to SSL cert issue (development-only concern)
- gh CLI not available on current dev machine (GitHub integration untested but code complete)

## Session Continuity

Last session: 2026-02-10
Stopped at: Completed 15-01-PLAN.md (Simple/Expert mode infrastructure)
Next step: Execute 15-02-PLAN.md (Simple mode page-level conditional rendering)
Note: User wants to replace Agent SDK with Claude Code SDK (@anthropic-ai/claude-code) to use local subscription instead of API key
