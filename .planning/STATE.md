# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-07)

**Core value:** No project dies without a documented decision, and every thought trail is fully reconstructable.
**Current focus:** Phase 8 complete — All phases finished

## Current Position

Phase: 8 of 8 (External Integrations & AI Search)
Plan: 8 of 8 in current phase
Status: Complete
Last activity: 2026-02-09 - Phase 8 complete. CalendarWidget wired into Integrations page (gap fix). All 8 phases done.

Progress: [████████████████████████████████████████████████] 100% (all plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 37
- Average duration: 7min
- Total execution time: ~4.0 hours

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
| 8. Integrations & AI Search | 7/8 | ~26min | ~4min |

**Recent Trend:**
- Last 5 plans: 4min, 3min, 3min, 3min, 4min
- Trend: consistent, fast execution times

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
- [08-04]: Kept existing integration.email_sent emitter entry (better body text than plan specified)
- [08-04]: Calendar routes at /api/calendar (separate from /api/integrations) for cleaner URL structure
- [08-04]: Module-level _processedEndTimes set for post-meeting prompt dedup (no persistence needed)
- [08-05]: AI SDK v6.0.77 uses inputSchema (not parameters) for tool() and stopWhen: stepCountIs(N) for multi-step
- [08-05]: Search engine uses 5-step limit for tool-calling depth
- [08-05]: Search queries logged to 'search' aggregateType with search.query_executed events
- [08-05]: Route resolves teamId from session via getTeamForUser (no client-side teamId needed)
- [08-02]: Email router uses per-field args (subject, body, sender) not EmailMessage object -- matches voice routing pattern more closely
- [08-02]: Gmail polling uses fire-and-forget AI routing per message (not awaited) to avoid blocking the poll loop
- [08-02]: OAuth callback redirects to /integrations page rather than returning JSON
- [08-02]: Disconnect route deletes stored tokens file for clean disconnection
- [08-02]: Draft lifecycle uses event-sourced state: created -> updated -> sent/rejected
- [08-06]: Used inline React.CSSProperties styles (not Tailwind) matching existing component convention
- [08-06]: forkRepo stub aligned to actual /api/github/fork-analyze endpoint with (sourceUrl, teamId) signature
- [08-06]: fetchEmails endpoint updated to /api/integrations/emails/recent matching server route structure
- [08-07]: useSearch calls POST /api/search/query (server resolves teamId from session, no client teamId needed)
- [08-07]: SearchBar uses explicit submit only (Enter key or button), no auto-search on typing
- [08-07]: GitHubFork uses forkRepo from useIntegrations which calls /api/github/fork-analyze (202 fire-and-forget)
- [08-07]: Fork status uses simple timeout-based transition since fork-analyze is fire-and-forget

### Pending Todos

None.

### Blockers/Concerns

- Research flags Phase 4 (AI), Phase 6 (Voice), Phase 7 (Telegram), Phase 8 (Integrations) as needing deeper research during planning
- Research suggests starting with simplified 3-4 GSD phases instead of full 8 -- user decision needed during Phase 5 planning
- npm strict-ssl disabled in dev environment due to SSL cert issue (development-only concern)
- gh CLI not available on current dev machine (GitHub integration untested but code complete)

## Session Continuity

Last session: 2026-02-09
Stopped at: Phase 8 Plan 7 complete. useSearch hook, SearchBar component, and GitHubFork component created. All client components for GitHub fork workflow and AI search ready. Ready for Plan 08-08.
Resume file: .planning/phases/08-integrations/08-08-PLAN.md
