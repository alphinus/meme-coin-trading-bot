# Phase 1: Foundation & Authentication - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Local-first, filesystem-native platform foundation for a 2-person team (Elvis & Mario at Eluma GmbH). Users can sign in, create their team, and operate within a real-time event-sourced platform with German/English support, running natively on local hardware with a filesystem-based memory system. The app is accessible from anywhere via browser. System capability discovery happens during first install.

</domain>

<decisions>
## Implementation Decisions

### Storage architecture
- Pure filesystem storage — no database (no SQLite, no Supabase, no external DB)
- Everything is files: Markdown, JSON, YAML
- Human-readable, Git-friendly, no database process needed
- Filesystem is the single source of truth for all application state

### Authentication
- Simple passkey/password authentication — no Google OAuth
- Two users, locally managed credentials
- No external auth provider dependency

### Remote access
- Claude's Discretion: choose the best approach for exposing the local app to the internet (reverse tunnel, VPN, or SSH-based — optimize for simplicity and security for a 2-user setup)

### Event store
- Claude's Discretion: choose the best file-based event format (JSON-lines per entity, individual files, or hybrid — optimize for filesystem-first approach, grep-friendliness, and Git-diffability)
- Events must surface as a visible activity feed in the UI — a timeline showing who did what, when (team awareness for 2-person team)
- Every state change recorded as append-only event with correlation ID

### Filesystem memory system
- Per-project folders with per-member Markdown files, Git-backed
- Memory files are human-editable — users can open and modify Markdown files directly in any editor
- App watches for external changes to memory files
- Claude's Discretion: Git commit granularity (auto-commit per change vs periodic batching)
- Claude's Discretion: filesystem security boundary (blacklist vs whitelist approach)

### GitHub integration
- Per-project repos auto-created using the host machine's configured GitHub account
- No separate GitHub org required — uses whatever `gh` / `git` credentials are on the machine

### System capability discovery
- During first install, app scans the host OS and discovers available programs/capabilities
- Presented as a setup wizard in the browser on first launch
- Wizard shows discovered capabilities with toggle switches for permissions
- Triggers OS-level permission prompts where needed (mic, camera, calendar, etc.)
- Claude API is the sole AI provider in Phase 1 (local AI model discovery deferred to Phase 4)

### Deployment
- Must support both macOS and Linux (Ubuntu/Debian) equally
- Native deployment via pm2/systemd, no Docker
- Portable via system image

### Language & i18n
- German and English supported
- Default language auto-detected from browser settings, fallback to German
- Per-user language preference saved and persists
- User can override at any time

### Frontend & setup
- Claude's Discretion: frontend framework choice (optimize for local-first, 2-user collaborative app)
- Claude's Discretion: setup wizard depth (balance between quick essentials and guided walkthrough)

</decisions>

<specifics>
## Specific Ideas

- "Die Grundarchitektur sollte vollkommen ausreichend sein, wenn ein ganzes Dateisystem zur Verfügung steht" — the filesystem IS the database, lean into it fully
- System scan at install should discover everything available: browsers, editors, calendar apps, note apps, mic/camera access, installed CLI tools
- The app should feel like a private AI assistant tuned specifically to this team's situation — proactive support but strictly bound to GSD backbone rules
- AI powered by Claude Opus (minimum current version)
- No external storage dependencies (Supabase, Notion, etc.) — local filesystem covers everything, external services can be added later if needed
- SSH access enables Telegram channel to work through local storage — no backup copy needed via external services

</specifics>

<deferred>
## Deferred Ideas

- OS-level integrations (camera, microphone, calendar, notes apps) — discovered in Phase 1 setup wizard, but deep integration belongs in Phase 6 (Voice) and Phase 8 (Integrations)
- Playwright/browser automation via plugin or Chrome Extension — future capability
- Proactive AI assistant behavior — Phase 4 (AI Foundation & Orchestration)
- Full system analysis for AI learning ("app learns what's possible on this filesystem") — Phase 4+ when AI foundation exists
- Local AI model discovery (Ollama, LM Studio) — Phase 4 when AI orchestration is built
- "Absolute dateiuebergreifende Analyse" (cross-file analysis for AI context) — Phase 4

</deferred>

---

*Phase: 01-foundation-authentication*
*Context gathered: 2026-02-07*
