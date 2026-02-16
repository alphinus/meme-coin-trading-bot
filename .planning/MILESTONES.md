# Milestones

## v1.3 SDK Migration & Stabilization (Shipped: 2026-02-11)

**Phases:** 18-21 (4 phases, 14 plans)
**Timeline:** 2026-02-10 → 2026-02-11 (~2 days)
**Commits:** 43 | **Codebase:** 64,847 LOC TypeScript
**Git range:** Phase 18-01 → Phase 21-03

**Key accomplishments:**
- Migrated all AI calls from API-key-based AI SDK v6 to subscription-based Agent SDK with warm session pattern (zero cold starts)
- Replaced cloud OpenAI Whisper with local whisper.cpp for voice transcription (zero API costs)
- Removed all ANTHROPIC_API_KEY and OPENAI_API_KEY references — runs entirely on Claude Max subscription
- Added stop reason display, deterministic session IDs, session recovery after server restart, and auth health checks
- Rewrote AI cost dashboard to subscription usage model (session count/duration instead of per-token billing)
- Ran 31 verification tests across 5 phases with 17 PASS, 14 SKIP (auth infra), 0 FAIL — zero code defects found
- Fixed gsd.ts import bug, internationalized navigation, tool labels, and IdeaPool strings

**Delivered:** Complete SDK migration from per-token API billing to flat-rate Claude Max subscription, local voice transcription, richer session UX (stop reasons, recovery, health checks), and full v1.2 stabilization with zero code defects.

See `.planning/milestones/v1.3-ROADMAP.md` for full details.

---

## v1.2 Guided UX (Shipped: 2026-02-10)

**Phases:** 12-17 (6 phases, 19 plans)
**Timeline:** 2026-02-09 → 2026-02-10 (~17 hours)
**Commits:** 59 | **Files:** 93 changed (+11,430 -599)
**Codebase:** 46,922 LOC TypeScript
**Git range:** 0feee67 → f94da15

**Key accomplishments:**
- Built full SSE streaming pipeline from Agent SDK to browser with real-time markdown rendering and syntax highlighting
- Added per-project session enforcement, SSE reconnection replay, and abort controls for agent sessions
- Created read-only GitHub repo analyzer with auto-idea creation in web UI and Telegram bot
- Implemented Simple/Expert mode toggle with conditional UI rendering and localStorage persistence
- Built dynamic GSD command registry with context-dependent buttons, Cmd+K palette, and pause/resume sessions
- Delivered four-wizard guided system (onboarding, idea creation, idea-to-project, GSD workflow) with quality gates and full DE/EN i18n

**Delivered:** Complete guided UX transformation — non-technical users get step-by-step wizards with quality gates, while power users retain full access via Expert mode. All workflows i18n-enabled in German and English.

See `.planning/milestones/v1.2-ROADMAP.md` for full details.

---

## v1.1 i18n Quality (Shipped: 2026-02-09)

**Phases:** 9-11 (3 phases, 9 plans, 19 tasks)
**Timeline:** 2026-02-09 (14:37 - 21:10)
**Commits:** 16 | **Files:** 46 changed (+9,138 -33)
**Git range:** 099a26d → 0001fd6

**Key accomplishments:**
- Fixed 129 ASCII umlaut approximations to correct Unicode (ä/ö/ü/ß) across all German translations
- Added 210+ translation keys to client locale files covering 15+ React components (Soul Documents, Integrations, AI, Voice, Login)
- Built grammY i18n infrastructure with 140-key Fluent translation files (de.ftl + en.ftl) and custom locale negotiator
- i18n-enabled all Telegram bot modules: commands, formatters, 4 menus, 3 handlers with ctx.t()/i18n.t() patterns
- Implemented per-recipient language resolution in notification emitter via loadUser().language

**Delivered:** Complete German/English i18n coverage across web UI and Telegram bot with proper Unicode characters, no hardcoded strings, and language-aware notifications.

---

## v1.0 MVP (Shipped: 2026-02-09)

See `.planning/milestones/v1.0-ROADMAP.md` for full details.

---
