# Phase 21: Stabilization - Research

**Researched:** 2026-02-11
**Domain:** End-to-end verification, UX polish, bug fixing across wizards, modes, navigation, and agent streaming
**Confidence:** HIGH

## Summary

Phase 21 is a stabilization and quality assurance pass, not a feature-building phase. The primary objective is executing 23 pending human verification tests from v1.2 (Phases 13, 15, 16, 17), fixing any failures discovered, and polishing UX rough edges across guided wizards, Simple/Expert mode, navigation, and the Cmd+K command palette. Phase 20 added 8 additional human verification tests (stop reasons, session recovery, deterministic IDs, auth health check) bringing the total actionable test count to 31.

The codebase is a monorepo (shared/server/client) using Express + Vite + React with TypeScript, JSONL event store, Claude Agent SDK v0.2.38, grammY Telegram bot, and i18n via react-i18next (client) and @grammyjs/i18n (server). Client TypeScript compiles cleanly with zero errors. Server TypeScript has 18 pre-existing errors (Google Calendar/Gmail type issues, Telegram TranslateFunction type mismatch, one missing module import path in gsd.ts, one notification emitter type issue) -- all pre-existing and unrelated to Phase 21 scope.

Research identified several concrete UX issues that will need fixing: hardcoded English strings in App.tsx navigation labels, hardcoded English strings in IdeaPool.tsx, hardcoded English tool labels in AgentOutput.tsx, an incorrect import path in server/src/routes/gsd.ts, and inconsistent use of `useLanguage` vs `useTranslation` hooks across components.

**Primary recommendation:** Execute all 31 human verification tests in the browser systematically, document pass/fail results, fix all failures, then scan for and fix remaining UX rough edges (hardcoded strings, navigation dead-ends, wizard transition issues).

## Standard Stack

### Core (already installed -- no new packages)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | ^19.0.0 | UI framework | Core framework |
| react-router-dom | ^7.1.0 | Client-side routing | All navigation flows |
| react-i18next | ^16.5.4 | Client i18n | All user-facing text |
| i18next | ^25.8.4 | i18n core | Translation framework |
| cmdk | ^1.1.1 | Command palette | Cmd+K Expert mode |
| rehype-highlight | ^7.0.2 | Syntax highlighting | Agent output code blocks |
| highlight.js | ^11.11.1 | Language grammars | Code highlighting |
| @anthropic-ai/claude-agent-sdk | ^0.2.38 | Agent sessions | Claude Code integration |
| chokidar | ^5.0.0 | File watcher | GSD command registry auto-reload |

### Supporting

No new libraries needed. Phase 21 works entirely within the existing stack.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual browser testing | Playwright/Cypress | Overkill for 31 tests on a 2-person team; manual is faster for one-time pass |
| Individual file fixes | Automated linting rules for hardcoded strings | Would require ESLint plugin setup; manual scan is sufficient for the known set |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure

No structural changes needed. Phase 21 works within the existing layout:

```
eluma/
├── client/src/
│   ├── App.tsx                    # Navigation, routing, mode guards
│   ├── components/
│   │   ├── AgentOutput.tsx        # Streaming output display
│   │   ├── AgentPanel.tsx         # Agent session UI
│   │   ├── GsdCommandMenu.tsx     # GSD button bar
│   │   ├── GsdCommandPalette.tsx  # Cmd+K palette
│   │   ├── ModeToggle.tsx         # Simple/Expert switch
│   │   ├── ExpertRoute.tsx        # Route guard
│   │   ├── QualityGateIndicator.tsx
│   │   └── wizards/              # All wizard components
│   ├── hooks/
│   │   ├── useAgentStream.ts     # SSE streaming hook
│   │   ├── useMode.tsx           # Simple/Expert mode state
│   │   ├── useOnboarding.ts      # First-time user detection
│   │   ├── useQualityGate.ts     # GSD question tracking
│   │   └── useGsdCommands.ts     # Command registry client
│   ├── pages/
│   │   ├── Dashboard.tsx          # Onboarding wizard host
│   │   ├── IdeaPool.tsx           # Idea creation wizard host
│   │   └── ProjectDetail.tsx      # Agent, GSD, palette host
│   └── i18n/locales/
│       ├── en.json               # 960 lines
│       └── de.json               # 960 lines
├── server/src/
│   ├── agent/                    # Session manager, SSE, recovery
│   ├── gsd/                      # Command registry, state filter
│   ├── routes/                   # API endpoints
│   └── telegram/                 # Bot with menus/handlers
└── shared/types/                 # Shared TypeScript interfaces
```

### Pattern 1: Test-Then-Fix Workflow

**What:** Execute all human verification tests first, document all failures, then batch-fix related issues together.
**When to use:** When stabilizing a feature-complete codebase before release.
**Example:** Run all 6 Phase 13 tests, record results (3 pass, 3 fail), then fix the 3 failures as a batch.

### Pattern 2: i18n Fix Pattern

**What:** For every hardcoded string found, add i18n key to both en.json and de.json, then replace the hardcoded string with `t("key")`.
**When to use:** Every time a hardcoded user-facing string is discovered during testing.
**Example:**
```typescript
// Before (hardcoded):
<button>Dashboard</button>

// After (i18n):
<button>{t("nav.dashboard")}</button>
```

Both locale files must be updated in the same commit.

### Pattern 3: Wizard Transition Fix Pattern

**What:** When a wizard step transition fails or feels broken, check: (1) state propagation between steps via wizardData, (2) goNext/goBack callbacks, (3) conditional rendering boundaries, (4) key-based remount in WizardShell.
**When to use:** When testing wizard flows reveals broken or confusing transitions.

### Anti-Patterns to Avoid

- **Fixing pre-existing TypeScript errors in unrelated subsystems:** The 18 server TS errors (Google Calendar, Gmail, Telegram menus, notification emitter) are out of scope. Fixing them risks regressions in untested subsystems.
- **Adding new features during stabilization:** Phase 21 is strictly polish and fix. No new functionality.
- **Fixing without re-testing:** Every fix must be re-verified against the original test case.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Translation coverage scanning | Custom script to find hardcoded strings | Manual grep + known list from research | One-time pass, 10-15 known locations identified below |
| Automated browser testing | Playwright test suite | Manual browser testing | 31 tests, one-time execution, not recurring |
| i18n key generation | Custom key generator | Manual addition to en.json + de.json | Small, known set of missing keys |

**Key insight:** Phase 21 is a one-time quality pass, not an ongoing testing infrastructure investment. Manual testing is the correct approach for a 2-person team with 31 discrete tests.

## Common Pitfalls

### Pitfall 1: Confusing v1.2 Tests (23) with Total Tests (31)

**What goes wrong:** Phase 20 added 8 more human verification tests (stop reasons, session recovery, deterministic IDs, auth health check). If the planner only plans for 23 tests, 8 get missed.
**Why it happens:** STAB-01 requirement says "23 pending v1.2 verification tests" but Phase 20 (post-v1.2) added 8 more.
**How to avoid:** Execute all 31 tests across Phases 13, 15, 16, 17, and 20. The Phase 20 tests should be included in the test execution plan even though they are not in the original "23 pending" count.
**Warning signs:** Verification document only lists 23 results.

### Pitfall 2: Fixing Server TypeScript Errors That Are Out of Scope

**What goes wrong:** Developer sees 18 TypeScript errors in server compilation and starts fixing them, burning time on Google Calendar, Gmail, and Telegram menu type issues.
**Why it happens:** "Stabilization" suggests fixing all errors, but these 18 errors are pre-existing in subsystems unrelated to the 5 STAB requirements.
**How to avoid:** Explicitly exclude from scope: Google Calendar/Gmail type errors (5 errors), Telegram TranslateFunction type mismatch (10 errors in 4 files), notification emitter type error (1), workflow/definitions.js import (1). Only the gsd.ts import path error is in scope (it directly affects GSD command filtering).
**Warning signs:** Commits touching server/src/integrations/google/ or server/src/telegram/menus/.

### Pitfall 3: Testing in Wrong Mode

**What goes wrong:** Tester runs all tests in Expert mode but misses bugs that only appear in Simple mode (or vice versa).
**Why it happens:** Some features are mode-conditional (Cmd+K, ExpertRoute, CollapsibleSection defaults).
**How to avoid:** Phase 15 tests explicitly test mode toggling. Phase 16 tests include mode-specific Cmd+K tests. Run these tests in both modes.
**Warning signs:** Phase 15 test 1 skipped, Phase 16 test 3 not toggling modes.

### Pitfall 4: Not Resetting localStorage Between Tests

**What goes wrong:** Onboarding wizard test fails because `eluma-onboarding-completed` is already set from a previous session.
**Why it happens:** localStorage persists across browser sessions by design.
**How to avoid:** Before running Phase 17 test 1 (onboarding wizard), clear localStorage key `eluma-onboarding-completed`. Before Phase 15 test 2, clear `eluma-mode`.
**Warning signs:** Onboarding wizard doesn't appear, mode defaults don't match expectations.

### Pitfall 5: Agent Session Tests Require Running Server + Valid Auth Token

**What goes wrong:** Agent streaming tests (Phase 13 tests 1-5, Phase 20 tests 1-5) cannot run because server is not started or CLAUDE_CODE_OAUTH_TOKEN is expired.
**Why it happens:** Agent tests require a live server with valid auth. OAuth tokens expire.
**How to avoid:** Before testing: (1) verify CLAUDE_CODE_OAUTH_TOKEN is valid, (2) start server with `npm run dev`, (3) verify auth health check passes in server logs.
**Warning signs:** Agent sessions fail immediately with auth errors.

### Pitfall 6: Not Testing German Translations

**What goes wrong:** All tests pass in English but German translations are missing, broken, or show key names instead of text.
**Why it happens:** Testing only in default language (whatever is in localStorage).
**How to avoid:** Phase 17 test 5 explicitly tests language switching in wizards. Run at least one full wizard flow in German.
**Warning signs:** `wizard.onboarding.welcome_title` appearing as literal text instead of translated German string.

## Code Examples

### Known Hardcoded Strings to Fix

#### App.tsx Navigation Labels (lines 49-142)

```typescript
// Current (hardcoded English):
<span style={styles.logo}>Eluma</span>
// ...
<button>Dashboard</button>
<button>Projects</button>
<button>Idea Pool</button>
<button>Soul Docs</button>
<button>AI</button>
<button>Integrations</button>
<button>Settings</button>
<button>Sign out</button>

// Fix: Add i18n keys and use t()
// 1. Add to en.json: "nav": { "dashboard": "Dashboard", "projects": "Projects", ... }
// 2. Add to de.json: "nav": { "dashboard": "Dashboard", "projects": "Projekte", ... }
// 3. Replace: <button>{t("nav.dashboard")}</button>
```

Location: `/Users/developer/eluma/client/src/App.tsx` lines 49, 60, 70, 80, 91, 103, 115, 133, 142

#### IdeaPool.tsx Hardcoded Strings (lines 165-319)

```typescript
// Hardcoded strings found:
"Please log in to access the Idea Pool."  // line 165
"Where should this go?"                   // line 207
"Dismiss"                                 // line 213
"Analyzing your input..."                 // line 218
"Your input:"                             // line 223
"Loading ideas..."                        // line 268
"Ideas"                                   // line 264
"No ideas yet..."                         // line 274
"Archived"                                // line 294
"Close"                                   // line 319
"Archive Idea"                            // line 363
"This idea has been archived."            // line 374

// Most of these already have i18n keys in en.json/de.json (idea_pool namespace)
// Fix: Replace hardcoded strings with t() calls using existing keys
```

Location: `/Users/developer/eluma/client/src/pages/IdeaPool.tsx`

#### AgentOutput.tsx Tool Labels (lines 36-47)

```typescript
// Current (hardcoded English):
const TOOL_LABELS: Record<string, string> = {
  Read: "Reading file...",
  Glob: "Finding files...",
  // ...
};

// Fix: Replace with i18n keys
// Add agent.tool_label.read, agent.tool_label.glob, etc. to both locale files
```

Location: `/Users/developer/eluma/client/src/components/AgentOutput.tsx` lines 36-47

#### IdeaPool.tsx Description (line 185)

```typescript
// Hardcoded:
<p style={styles.description}>
  Capture ideas by voice or text, refine them with AI, and graduate the
  best ones into full projects.
</p>

// i18n key exists: idea_pool.subtitle
// Fix: <p style={styles.description}>{t("idea_pool.subtitle")}</p>
```

### Known Bug: Incorrect Import Path in gsd.ts

```typescript
// Current (line 24 of server/src/routes/gsd.ts):
import { getStepsForPhase } from "../../workflow/definitions.js";

// Fix: Correct relative path from server/src/routes/ to server/src/workflow/
import { getStepsForPhase } from "../workflow/definitions.js";
```

Location: `/Users/developer/eluma/server/src/routes/gsd.ts` line 24

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| All 35 requirements "code verified" only | 31 tests need human browser verification | Phase 21 | Tests must be manually executed |
| Pre-existing TS errors tolerated | Still tolerated (out of scope) | v1.2 | 18 server errors remain as tech debt |

**Deprecated/outdated:**
- None relevant. All libraries are current versions.

## Inventory of All Human Verification Tests

### Phase 13: Agent Session Manager (6 tests)

| # | Test | Category |
|---|------|----------|
| 1 | Start agent session with simple prompt | Agent streaming |
| 2 | Start concurrent session on same project (rejection) | Session management |
| 3 | Click Cancel during streaming | Abort flow |
| 4 | Simulate network disconnect during streaming | Reconnection |
| 5 | Send prompt with code generation request (syntax highlighting) | Output rendering |
| 6 | Verify archived projects do NOT show AI Agent section | Conditional rendering |

### Phase 15: Simple/Expert Mode (5 tests)

| # | Test | Category |
|---|------|----------|
| 1 | Visual toggle interaction (sections appear/disappear) | Mode switching |
| 2 | LocalStorage persistence across sessions | Persistence |
| 3 | Route guard redirect in Simple mode | Navigation |
| 4 | CollapsibleSection chevron and auto-expand | UI interaction |
| 5 | Expert mode zero regression check | Regression |

### Phase 16: GSD Command Registry (6 tests)

| # | Test | Category |
|---|------|----------|
| 1 | Visual appearance and layout of GSD command buttons | UI layout |
| 2 | Phase-based command filtering | State filtering |
| 3 | Expert mode command visibility and Cmd+K palette | Mode + keyboard |
| 4 | Pause button during active session and session recovery | Session lifecycle |
| 5 | Per-project independence of pause state | Multi-project |
| 6 | Command palette keyboard navigation | Accessibility |

### Phase 17: Guided Wizards (6 tests)

| # | Test | Category |
|---|------|----------|
| 1 | Onboarding wizard first-time user flow | Wizard flow |
| 2 | Idea creation wizard multi-input types | Wizard input |
| 3 | Idea-to-project wizard quality gate enforcement | Quality gate |
| 4 | Project creation wizard GSD integration | Wizard + API |
| 5 | Language switching in wizards | i18n |
| 6 | Quality gate progress indicator visual states | Visual states |

### Phase 20: SDK Feature Adoption (8 tests)

| # | Test | Category |
|---|------|----------|
| 1 | Stop reason display -- visual verification | UI display |
| 2 | Stop reason display -- error cases | Error handling |
| 3 | Stop reason display -- German translation | i18n |
| 4 | Session recovery after restart | Server restart |
| 5 | Deterministic session IDs | Session management |
| 6 | Auth health check at startup | Server startup |
| 7 | Auth health check -- invalid token | Error handling |
| 8 | Session persistence during graceful shutdown | Server shutdown |

**Total: 31 human verification tests**
- 23 from v1.2 (Phases 13, 15, 16, 17)
- 8 from Phase 20 (post-v1.2 but pre-Phase 21)

## Known UX Issues (Pre-Discovered)

### Issue 1: App.tsx Navigation Not Internationalized

**Severity:** Medium
**Scope:** STAB-05 (navigation polish)
**Files:** `client/src/App.tsx` lines 49-142
**Details:** 9 hardcoded English strings in navigation: "Eluma" (brand, may keep), "Dashboard", "Projects", "Idea Pool", "Soul Docs", "AI", "Integrations", "Settings", "Sign out"
**Impact:** German users see English navigation labels

### Issue 2: IdeaPool.tsx Hardcoded English Strings

**Severity:** Medium
**Scope:** STAB-03 (wizard polish)
**Files:** `client/src/pages/IdeaPool.tsx` ~12 hardcoded strings
**Details:** Routing panel, loading states, section headers, action buttons all use English. Most i18n keys already exist in en.json/de.json but are not being used.
**Impact:** Mixed language UI when German is active

### Issue 3: AgentOutput.tsx Tool Labels Not Internationalized

**Severity:** Low
**Scope:** STAB-05 (navigation/command polish)
**Files:** `client/src/components/AgentOutput.tsx` lines 36-47
**Details:** TOOL_LABELS constant has 10 hardcoded English strings ("Reading file...", "Finding files...", etc.)
**Impact:** Tool progress indicators always show English

### Issue 4: Incorrect Import Path in server/src/routes/gsd.ts

**Severity:** Medium (causes TypeScript error)
**Scope:** STAB-05 (command palette reliability)
**Files:** `server/src/routes/gsd.ts` line 24
**Details:** `import { getStepsForPhase } from "../../workflow/definitions.js"` should be `"../workflow/definitions.js"`. Currently works at runtime (tsx resolves it differently than tsc) but fails TypeScript compilation.
**Impact:** Server TS compilation error; potential runtime issue in production builds

### Issue 5: Dual i18n Hook Pattern (Consistency)

**Severity:** Low (cosmetic, both work)
**Scope:** Out of scope for Phase 21 (no user-facing impact)
**Details:** 48 files use `useLanguage()` (project convention wrapper), 25 files use `useTranslation()` directly. Both return `t()` and work identically. `useLanguage` adds `currentLanguage` and `setLanguage`. This is a codebase consistency issue, not a bug.
**Impact:** No user-facing impact; developer experience only

### Issue 6: Pre-existing Server TypeScript Errors (18 errors)

**Severity:** Low (out of scope)
**Scope:** Not STAB-01 through STAB-05
**Files:** Google Calendar (3 errors), Gmail (3 errors), Telegram menus/commands/handlers (10 errors), notification emitter (1 error), gsd.ts import (1 error -- this one IS in scope)
**Impact:** Server compiles and runs via tsx at dev time; only affects `tsc --build` for production

## Open Questions

1. **Should Phase 20's 8 tests be included in STAB-01 scope?**
   - What we know: STAB-01 says "23 pending v1.2 tests" but Phase 20 added 8 more
   - What's unclear: Whether the user considers Phase 20 tests part of the "stabilization" scope or separate
   - Recommendation: Include all 31 tests. Phase 20's tests cover features that will be exercised during stabilization anyway (stop reasons visible during agent tests, session recovery tested during pause tests). If scope is strictly 23, the Phase 20 tests can be deferred but they WILL overlap with the v1.2 tests naturally.

2. **Should the 18 pre-existing server TypeScript errors be fixed?**
   - What we know: They are documented as pre-existing tech debt, unrelated to active development
   - What's unclear: Whether "stabilization" implies fixing all known errors
   - Recommendation: Fix ONLY the gsd.ts import path error (1 of 18) since it directly affects GSD command filtering (STAB-05 scope). Leave the remaining 17 as documented tech debt.

3. **Should "Eluma" brand name in App.tsx be internationalized?**
   - What we know: "Eluma" is a brand/product name, typically kept in original form
   - What's unclear: Whether user wants it translated
   - Recommendation: Keep "Eluma" as-is (brand names don't translate). Only internationalize navigation labels and action text.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: All files read directly from `/Users/developer/eluma/` and `/Users/developer/.planning/`
- Verification reports: 13-VERIFICATION.md, 15-VERIFICATION.md, 16-VERIFICATION.md, 17-VERIFICATION.md, 20-VERIFICATION.md
- Milestone audit: `.planning/milestones/v1.2-MILESTONE-AUDIT.md`
- Requirements: `.planning/REQUIREMENTS.md` (STAB-01 through STAB-05)
- TypeScript compilation: `npx tsc --noEmit` run against both client and server

### Secondary (MEDIUM confidence)
- None needed -- this is an internal codebase analysis, not library research

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all existing code verified by reading source
- Architecture: HIGH -- all patterns documented from direct codebase inspection
- Pitfalls: HIGH -- derived from actual test cases and known issues found during research
- Test inventory: HIGH -- every test extracted directly from VERIFICATION.md files
- UX issues: HIGH -- all issues verified by reading actual source files

**Research date:** 2026-02-11
**Valid until:** Indefinite (internal codebase analysis, not library version dependent)
