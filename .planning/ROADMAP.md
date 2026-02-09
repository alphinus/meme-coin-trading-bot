# Roadmap: Collaborative Project Intelligence

## Milestones

- ✅ **v1.0 MVP** — Phases 1-8 (shipped 2026-02-09)
- 🚧 **v1.1 i18n Quality** — Phases 9-11 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-8) — SHIPPED 2026-02-09</summary>

- [x] Phase 1: Foundation & Authentication (7/7 plans) — completed 2026-02-08
- [x] Phase 2: Project Lifecycle & Dashboard (5/5 plans) — completed 2026-02-08
- [x] Phase 3: Documentation Engine (4/4 plans) — completed 2026-02-08
- [x] Phase 4: AI Foundation & Orchestration (6/6 plans) — completed 2026-02-08
- [x] Phase 5: GSD Workflow Engine (3/3 plans) — completed 2026-02-08
- [x] Phase 6: Voice & Idea Pool (4/4 plans) — completed 2026-02-08
- [x] Phase 7: Telegram Bot & Notifications (6/6 plans) — completed 2026-02-08
- [x] Phase 8: External Integrations & AI Search (8/8 plans) — completed 2026-02-09

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.1 i18n Quality (In Progress)

**Milestone Goal:** Ensure 100% correct German/English i18n coverage with proper Unicode characters — no ASCII approximations, no hardcoded strings, no mixed languages.

#### Phase 9: Fix Umlauts

**Goal:** All German text uses correct Unicode umlauts (ä, ö, ü, Ä, Ö, Ü, ß) instead of ASCII approximations.

**Depends on:** Nothing (quality fix)

**Requirements:** UMLAUT-01, UMLAUT-02

**Success Criteria** (what must be TRUE):
1. User sees "Geschäftsvorfälle" not "Geschaeftsvorfaelle" in German UI
2. User sees "Ändern" not "Aendern" for all edit buttons in German UI
3. User sees "Für" not "Fuer" in all German navigation and labels
4. Server-side i18n messages (errors, logs, Telegram) display correct umlauts in German

**Plans:** TBD

Plans:
- [ ] 09-01: TBD

#### Phase 10: Client i18n Coverage

**Goal:** Every user-facing string in the web UI is translatable — language switcher covers 100% of interface in both DE and EN.

**Depends on:** Phase 9

**Requirements:** I18N-01, I18N-02, I18N-03, I18N-04, I18N-05, I18N-06, I18N-07, I18N-08

**Success Criteria** (what must be TRUE):
1. User switches to German and sees Soul Document page fully in German (title, descriptions, buttons, placeholders)
2. User switches to German and sees Integrations page fully in German (Gmail, Calendar, GitHub status and labels)
3. User switches to German and sees SearchBar, EmailDraftReview, GitHubFork components fully in German
4. User switches to German and sees AI components (AiTeamMember, override menus) fully in German
5. User switches to German and sees authentication components (PasskeyPrompt, Login) fully in German
6. User switches to German and sees VoiceRecorder and IdeaRefinement components fully in German
7. User switches language and no hardcoded English strings remain visible in UI

**Plans:** TBD

Plans:
- [ ] 10-01: TBD

#### Phase 11: Telegram Bot i18n

**Goal:** Telegram bot messages respect user language preference — all bot output available in both German and English.

**Depends on:** Phase 10

**Requirements:** I18N-09

**Success Criteria** (what must be TRUE):
1. User with German preference receives all Telegram bot messages in German
2. User with English preference receives all Telegram bot messages in English
3. User switches language in web UI and subsequent Telegram messages reflect new preference
4. Telegram bot buttons, menus, and status messages all respect user's chosen language

**Plans:** TBD

Plans:
- [ ] 11-01: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Authentication | v1.0 | 7/7 | Complete | 2026-02-08 |
| 2. Project Lifecycle & Dashboard | v1.0 | 5/5 | Complete | 2026-02-08 |
| 3. Documentation Engine | v1.0 | 4/4 | Complete | 2026-02-08 |
| 4. AI Foundation & Orchestration | v1.0 | 6/6 | Complete | 2026-02-08 |
| 5. GSD Workflow Engine | v1.0 | 3/3 | Complete | 2026-02-08 |
| 6. Voice & Idea Pool | v1.0 | 4/4 | Complete | 2026-02-08 |
| 7. Telegram Bot & Notifications | v1.0 | 6/6 | Complete | 2026-02-08 |
| 8. External Integrations & AI Search | v1.0 | 8/8 | Complete | 2026-02-09 |
| 9. Fix Umlauts | v1.1 | 0/0 | Not started | - |
| 10. Client i18n Coverage | v1.1 | 0/0 | Not started | - |
| 11. Telegram Bot i18n | v1.1 | 0/0 | Not started | - |
