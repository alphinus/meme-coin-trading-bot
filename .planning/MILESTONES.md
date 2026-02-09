# Milestones

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
