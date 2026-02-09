# Requirements: Eluma

**Defined:** 2026-02-09
**Core Value:** No project dies without a documented decision, and every thought trail is fully reconstructable.

## v1.2 Requirements

Requirements for Guided UX milestone. Each maps to roadmap phases.

### Infrastructure

- [ ] **INFRA-01**: Server installs @anthropic-ai/claude-agent-sdk and can create Agent SDK sessions with query() async generator
- [ ] **INFRA-02**: PM2 memory limit increased to support Agent SDK sessions without crash-restart loops
- [ ] **INFRA-03**: SSE streaming endpoint serves text/event-stream responses without compression middleware buffering
- [ ] **INFRA-04**: Agent sessions use canUseTool permission handler with explicit tool allowlist instead of bypassPermissions
- [ ] **INFRA-05**: Server performs graceful shutdown cleanup of active agent sessions on SIGTERM/SIGINT

### Agent Streaming

- [ ] **AGENT-01**: User clicks a GSD action button and sees real-time streaming output from Claude Code in the browser
- [ ] **AGENT-02**: Server manages agent session lifecycle (start, stream, abort, cleanup) with in-memory session tracking
- [ ] **AGENT-03**: User can abort a running agent session via UI button and server cleans up the process
- [ ] **AGENT-04**: SSE connection automatically reconnects on drop and resumes from last received event
- [ ] **AGENT-05**: Agent output component renders streaming text with proper formatting (markdown, code blocks)

### GitHub Analysis

- [ ] **GH-01**: User pastes a GitHub URL in web UI and sees repository analysis (README summary, tech stack, file structure)
- [ ] **GH-02**: AI generates a project idea from the repository analysis and adds it to the Idea Pool automatically
- [ ] **GH-03**: User pastes a GitHub URL in Telegram and receives the same analysis + auto-idea creation
- [ ] **GH-04**: GitHub analysis uses read-only API calls (no fork, no write operations)

### UI Mode

- [ ] **MODE-01**: User can toggle between Simple and Expert mode via switch in the header
- [ ] **MODE-02**: Mode preference persists across sessions (localStorage)
- [ ] **MODE-03**: Simple mode shows only: Ideas, Projects, and current GSD action — hides Soul Documents, KPI dashboard, AI config, notification settings
- [ ] **MODE-04**: Details in Simple mode are collapsed by default but expandable (progressive disclosure)
- [ ] **MODE-05**: Expert mode displays all features as they exist today (no behavior change)

### Guided Wizards

- [ ] **WIZ-01**: First-use onboarding wizard explains the Eluma flow: Idea → Project → Execution with visual steps
- [ ] **WIZ-02**: Idea creation wizard guides user step-by-step: choose input type (text/voice/GitHub link) → provide input → AI processes → idea in pool
- [ ] **WIZ-03**: Idea-to-project wizard guides user through GSD questioning phase with one question per screen and clear action buttons
- [ ] **WIZ-04**: GSD workflow steps display as guided cards with single action button, explanation text, and progress indicator
- [ ] **WIZ-05**: Wizards work in both DE and EN (i18n keys for all wizard text)

### Quality Gates

- [ ] **GATE-01**: User cannot convert an idea to a project until all mandatory GSD deep-questions are answered — system blocks the action with explanation of what's missing
- [ ] **GATE-02**: User cannot create a project directly without completing the GSD questioning phase — the "create project" flow always routes through questioning first
- [ ] **GATE-03**: Quality gates apply identically in Simple mode and Expert mode — no bypass possible in either mode
- [ ] **GATE-04**: System displays clear progress indicator showing which questions are answered and which remain before project creation is unlocked

### GSD Commands

- [ ] **GSD-01**: Server reads available GSD commands from plugin directory and exposes a command registry API
- [ ] **GSD-02**: UI renders context-dependent GSD action buttons showing only commands relevant to current project state
- [ ] **GSD-03**: Each GSD button shows command label and brief description underneath
- [ ] **GSD-04**: Cmd+K command palette (Expert mode) lets user search and execute any GSD command with fuzzy matching
- [ ] **GSD-05**: User can pause active GSD work on a project via Pause button and resume later via Resume button
- [ ] **GSD-06**: Multiple projects can have independent GSD sessions — pausing one does not affect others
- [ ] **GSD-07**: Command registry auto-updates when GSD plugin is updated (no hardcoded command list)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time collaboration (WebSockets) | SSE sufficient for unidirectional streaming; polling for 2-person team |
| xterm.js terminal emulator in browser | Anti-feature for non-technical users — renders raw CLI output |
| Multiple concurrent agent sessions per project | Resource constraints on self-hosted hardware; one session at a time |
| Agent SDK extended thinking with streaming | Mutually exclusive in current SDK; show "thinking..." placeholder |
| Additional i18n languages | DE/EN sufficient for Eluma team |
| Automated i18n testing | Deferred to future milestone |
| Role-based permissions | Open visibility sufficient for 2-person team |
| zustand/jotai state management | Existing React context pattern sufficient |
| ws/socket.io WebSocket library | SSE covers all streaming needs |
| react-use-wizard library | Existing Setup.tsx wizard pattern reusable |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 12 | Pending |
| INFRA-02 | Phase 12 | Pending |
| INFRA-03 | Phase 12 | Pending |
| INFRA-04 | Phase 12 | Pending |
| INFRA-05 | Phase 12 | Pending |
| AGENT-01 | Phase 13 | Pending |
| AGENT-02 | Phase 13 | Pending |
| AGENT-03 | Phase 13 | Pending |
| AGENT-04 | Phase 13 | Pending |
| AGENT-05 | Phase 13 | Pending |
| GH-01 | Phase 14 | Pending |
| GH-02 | Phase 14 | Pending |
| GH-03 | Phase 14 | Pending |
| GH-04 | Phase 14 | Pending |
| MODE-01 | Phase 15 | Pending |
| MODE-02 | Phase 15 | Pending |
| MODE-03 | Phase 15 | Pending |
| MODE-04 | Phase 15 | Pending |
| MODE-05 | Phase 15 | Pending |
| WIZ-01 | Phase 17 | Pending |
| WIZ-02 | Phase 17 | Pending |
| WIZ-03 | Phase 17 | Pending |
| WIZ-04 | Phase 17 | Pending |
| WIZ-05 | Phase 17 | Pending |
| GATE-01 | Phase 17 | Pending |
| GATE-02 | Phase 17 | Pending |
| GATE-03 | Phase 17 | Pending |
| GATE-04 | Phase 17 | Pending |
| GSD-01 | Phase 16 | Pending |
| GSD-02 | Phase 16 | Pending |
| GSD-03 | Phase 16 | Pending |
| GSD-04 | Phase 16 | Pending |
| GSD-05 | Phase 16 | Pending |
| GSD-06 | Phase 16 | Pending |
| GSD-07 | Phase 16 | Pending |

**Coverage:**
- v1.2 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0

---
*Requirements defined: 2026-02-09*
*Last updated: 2026-02-09 after roadmap creation*
