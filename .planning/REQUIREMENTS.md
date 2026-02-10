# Requirements: Collaborative Project Intelligence

**Defined:** 2026-02-10
**Core Value:** No project dies without a documented decision, and every thought trail is fully reconstructable.

## v1.3 Requirements

Requirements for v1.3 SDK Migration & Stabilization. Each maps to roadmap phases.

### SDK Auth & Cleanup

- [ ] **SDKA-01**: User can run agent sessions using Claude subscription instead of API key
- [ ] **SDKA-02**: Server logs which authentication method is active at startup
- [ ] **SDKA-03**: Server warns if both ANTHROPIC_API_KEY and CLAUDE_CODE_OAUTH_TOKEN are set simultaneously
- [ ] **SDKA-04**: Agent SDK bumped to v0.2.38 with clean TypeScript compilation
- [ ] **SDKA-05**: Deprecated `persistSession` option removed from session lifecycle

### SDK Feature Adoption

- [ ] **SDKF-01**: User can see stop reason (task complete / budget exceeded / max turns) in agent session UI
- [ ] **SDKF-02**: Server recovers resumable sessions from filesystem after restart via `listSessions()`
- [ ] **SDKF-03**: Agent sessions use deterministic session IDs based on project ID
- [ ] **SDKF-04**: Auth health check verifies token validity at server startup

### Stabilization

- [ ] **STAB-01**: All 23 pending v1.2 verification tests executed and failures documented
- [ ] **STAB-02**: All test failures from STAB-01 fixed
- [ ] **STAB-03**: UX rough edges in guided wizards identified and polished
- [ ] **STAB-04**: UX rough edges in Simple/Expert mode identified and polished
- [ ] **STAB-05**: UX rough edges in navigation and command palette identified and polished

## Future Requirements

Deferred to future releases. Tracked but not in current roadmap.

### Advanced SDK Features

- **ADVSDK-01**: Custom subagents for specialized GSD commands (research, plan, execute)
- **ADVSDK-02**: SDK hooks for audit trail (log all tool uses to JSONL event store)
- **ADVSDK-03**: Per-command system prompts providing project-specific context
- **ADVSDK-04**: V2 SDK session API adoption (when marked stable)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Package migration to @anthropic-ai/claude-code | Package is CLI-only, SDK entry point broken since v2.0.5. Already using correct package. |
| V2 SDK session API | Marked "unstable preview", missing features, APIs will change |
| Direct claude.ai OAuth login flow in UI | Anthropic policy prohibits third-party OAuth login UX |
| WebSocket replacement for SSE | SSE is correct for unidirectional streaming, already working |
| Multi-user concurrent sessions | Not needed for 2-person team, adds significant complexity |
| SDK sandbox/container mode | Overkill for controlled self-hosted environment |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SDKA-01 | — | Pending |
| SDKA-02 | — | Pending |
| SDKA-03 | — | Pending |
| SDKA-04 | — | Pending |
| SDKA-05 | — | Pending |
| SDKF-01 | — | Pending |
| SDKF-02 | — | Pending |
| SDKF-03 | — | Pending |
| SDKF-04 | — | Pending |
| STAB-01 | — | Pending |
| STAB-02 | — | Pending |
| STAB-03 | — | Pending |
| STAB-04 | — | Pending |
| STAB-05 | — | Pending |

**Coverage:**
- v1.3 requirements: 14 total
- Mapped to phases: 0
- Unmapped: 14 (pending roadmap creation)

---
*Requirements defined: 2026-02-10*
*Last updated: 2026-02-10 after initial definition*
