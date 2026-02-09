# Requirements: Eluma

**Defined:** 2026-02-09
**Core Value:** No project dies without a documented decision, and every thought trail is fully reconstructable.

## v1.1 Requirements

Requirements for i18n quality release. Each maps to roadmap phases.

### Umlaute

- [ ] **UMLAUT-01**: Alle deutschen Übersetzungen in `de.json` verwenden korrekte Unicode-Umlaute (ä, ö, ü, Ä, Ö, Ü, ß) — keine ASCII-Approximationen
- [ ] **UMLAUT-02**: Alle deutschen Strings in `server/src/i18n/server.ts` verwenden korrekte Unicode-Umlaute

### i18n Abdeckung

- [ ] **I18N-01**: Soul Document Seite verwendet i18n für alle Texte (Titel, Beschreibungen, Buttons, Platzhalter)
- [ ] **I18N-02**: Integrations Seite verwendet i18n für alle Texte (Status, Buttons, Gmail/Calendar Labels)
- [ ] **I18N-03**: SearchBar Komponente verwendet i18n für alle Texte (Platzhalter, Ergebnisse, Labels)
- [ ] **I18N-04**: EmailDraftReview Komponente verwendet i18n für alle Texte (Status, Buttons, Labels)
- [ ] **I18N-05**: GitHubFork Komponente verwendet i18n für alle Texte (Fehlermeldungen, Status, Platzhalter)
- [ ] **I18N-06**: IdeaRefinement Komponente verwendet i18n für alle Texte
- [ ] **I18N-07**: AI Komponenten (AiTeamMember, AiOverrideMenu, AiModelOverride) verwenden i18n
- [ ] **I18N-08**: Weitere Komponenten (PasskeyPrompt, VoiceRecorder, Login-Details) verwenden i18n
- [ ] **I18N-09**: Telegram Bot verwendet i18n — alle Nachrichten in DE und EN verfügbar, Sprache basierend auf User-Preference

## Out of Scope

| Feature | Reason |
|---------|--------|
| New features or UI changes | v1.1 is quality-only — fix what exists |
| Additional languages beyond DE/EN | Two languages sufficient for Eluma team |
| Automated i18n testing/linting | Deferred to future milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UMLAUT-01 | Phase 9 | Pending |
| UMLAUT-02 | Phase 9 | Pending |
| I18N-01 | Phase 10 | Pending |
| I18N-02 | Phase 10 | Pending |
| I18N-03 | Phase 10 | Pending |
| I18N-04 | Phase 10 | Pending |
| I18N-05 | Phase 10 | Pending |
| I18N-06 | Phase 10 | Pending |
| I18N-07 | Phase 10 | Pending |
| I18N-08 | Phase 10 | Pending |
| I18N-09 | Phase 11 | Pending |

**Coverage:**
- v1.1 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-09*
*Last updated: 2026-02-09 after roadmap creation*
