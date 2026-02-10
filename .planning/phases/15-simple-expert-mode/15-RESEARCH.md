# Phase 15: Simple/Expert Mode - Research

**Researched:** 2026-02-10
**Domain:** React conditional UI rendering, mode toggle with localStorage persistence, progressive disclosure
**Confidence:** HIGH

## Summary

Phase 15 is a purely frontend feature that adds a Simple/Expert toggle to the Eluma app. The codebase already has all the patterns needed: `useLanguage()` hook with localStorage persistence serves as the exact blueprint for `useMode()`, the `LanguageSwitcher` component serves as the blueprint for a `ModeToggle` component, and the `AuthProvider` Context pattern provides the model for wrapping the app in a `ModeProvider` for global access.

The implementation scope is well-defined by the requirements: Simple mode hides navigation links (Soul Docs, AI, Integrations, Settings), hides KPI dashboard sections, and collapses detail sections in ProjectDetail by default (while still allowing manual expansion). Expert mode shows everything exactly as today. No new libraries are needed. No backend changes are needed. The entire feature is client-side React Context + localStorage + conditional rendering.

**Primary recommendation:** Create a `ModeProvider` context with `useMode()` hook (mirroring `AuthProvider`/`useAuth()` pattern), a `ModeToggle` component (mirroring `LanguageSwitcher` pattern), then apply conditional rendering in `App.tsx` (nav links) and page components (section visibility/collapse state).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Context API | React 19 (already installed) | Global mode state accessible from any component | Already used for auth (`AuthProvider`). Zero new dependencies. |
| localStorage | Browser API | Persist mode preference across sessions | Already used for language (`eluma-language`). Proven pattern. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-i18next | Already installed | Translate mode toggle labels and tooltips | All user-facing strings must go through i18n per CLAUDE.md rules |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Context + localStorage | Zustand v5 | Adds external state management for a single boolean. Inconsistent with codebase patterns. NOT recommended. |
| React Context + localStorage | Jotai | Same issue. The project has zero external state libs. Keep it that way. |
| Custom collapsible `<details>` | react-collapsible | Adds dependency for trivial expand/collapse behavior achievable with useState + conditional rendering. |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended File Structure
```
client/src/
  hooks/
    useMode.ts                # NEW: Mode context + hook (mirrors useAuth.tsx pattern)
  components/
    ModeToggle.tsx            # NEW: Simple/Expert toggle (mirrors LanguageSwitcher.tsx)
  App.tsx                     # MODIFIED: Wrap in ModeProvider, conditional nav links
  pages/
    Dashboard.tsx             # MODIFIED: Hide KPI overview section in Simple mode
    ProjectDetail.tsx         # MODIFIED: Collapse sections by default in Simple mode
  i18n/locales/
    de.json                   # MODIFIED: Add mode.* translation keys
    en.json                   # MODIFIED: Add mode.* translation keys
```

### Pattern 1: Mode Context Provider (mirrors AuthProvider)
**What:** React Context that holds mode state and persists to localStorage. Wraps the app at the top level so any component can read mode via `useMode()`.
**When to use:** Any component that needs to check or toggle mode.
**Example:**
```typescript
// client/src/hooks/useMode.ts
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type UXMode = "simple" | "expert";
const MODE_KEY = "eluma-mode";

interface ModeContextValue {
  mode: UXMode;
  isExpert: boolean;
  isSimple: boolean;
  setMode: (m: UXMode) => void;
  toggleMode: () => void;
}

const ModeContext = createContext<ModeContextValue | null>(null);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<UXMode>(
    () => (localStorage.getItem(MODE_KEY) as UXMode) || "simple"
  );

  const setMode = useCallback((m: UXMode) => {
    localStorage.setItem(MODE_KEY, m);
    setModeState(m);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "simple" ? "expert" : "simple");
  }, [mode, setMode]);

  return (
    <ModeContext.Provider value={{ mode, isExpert: mode === "expert", isSimple: mode === "simple", setMode, toggleMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode(): ModeContextValue {
  const context = useContext(ModeContext);
  if (!context) throw new Error("useMode must be used within a ModeProvider");
  return context;
}
```
**Confidence:** HIGH -- Directly mirrors existing `useAuth.tsx` Context pattern in the codebase.

### Pattern 2: ModeToggle Component (mirrors LanguageSwitcher)
**What:** A small toggle button in the app header that lets users switch between Simple and Expert mode.
**When to use:** Placed in the AppLayout header alongside NotificationBell and Settings.
**Example:**
```typescript
// client/src/components/ModeToggle.tsx
import { useTranslation } from "react-i18next";
import { useMode } from "../hooks/useMode.js";

export function ModeToggle() {
  const { t } = useTranslation();
  const { isExpert, toggleMode } = useMode();

  return (
    <div style={styles.container}>
      <button
        type="button"
        style={styles.button(!isExpert)}
        onClick={() => !isExpert ? undefined : toggleMode()}
        aria-pressed={!isExpert}
      >
        {t("mode.simple")}
      </button>
      <button
        type="button"
        style={styles.button(isExpert)}
        onClick={() => isExpert ? undefined : toggleMode()}
        aria-pressed={isExpert}
      >
        {t("mode.expert")}
      </button>
    </div>
  );
}
// Styles mirror LanguageSwitcher exactly (pill toggle with active/inactive states)
```
**Confidence:** HIGH -- Directly mirrors existing `LanguageSwitcher.tsx` component pattern.

### Pattern 3: Conditional Navigation (in AppLayout)
**What:** Nav links in the header conditionally rendered based on mode. Simple mode shows only Dashboard, Projects, Idea Pool. Expert mode shows all existing links.
**When to use:** `AppLayout` component in `App.tsx`.
**Example:**
```typescript
// Inside AppLayout (App.tsx)
const { isExpert } = useMode();

<nav style={styles.nav}>
  {/* Always visible */}
  <NavButton to="/home" label="Dashboard" />
  <NavButton to="/projects" label="Projects" />
  <NavButton to="/ideas" label="Idea Pool" />

  {/* Expert-only navigation */}
  {isExpert && <NavButton to="/soul" label="Soul Docs" />}
  {isExpert && <NavButton to="/ai" label="AI" />}
  {isExpert && <NavButton to="/integrations" label="Integrations" />}
</nav>

{/* In headerRight area: */}
<ModeToggle />
<NotificationBell />
{isExpert && <SettingsButton />}
```
**Confidence:** HIGH -- Standard React conditional rendering. The existing nav code is simple inline buttons that are trivial to wrap in conditionals.

### Pattern 4: Collapsible Detail Sections (Progressive Disclosure)
**What:** In Simple mode, certain detail sections on ProjectDetail (phase timeline, event history, KPI sidebar) start collapsed with a clickable header to expand. In Expert mode they render expanded as today.
**When to use:** ProjectDetail page sections that contain metadata, phase history, or KPI data.
**Example:**
```typescript
// Collapsible section pattern -- no library needed
function CollapsibleSection({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={sectionStyles.container}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={sectionStyles.header}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span style={sectionStyles.chevron}>{open ? "\u25B2" : "\u25BC"}</span>
      </button>
      {open && <div style={sectionStyles.body}>{children}</div>}
    </div>
  );
}

// Usage in ProjectDetail:
const { isExpert } = useMode();

<CollapsibleSection
  title={t("project_detail.phase_timeline")}
  defaultOpen={isExpert}
>
  <PhaseTimeline ... />
</CollapsibleSection>
```
**Confidence:** HIGH -- Standard React pattern using useState for open/closed state. Progressive disclosure is a well-understood UX pattern.

### Pattern 5: Route Protection for Hidden Pages
**What:** If a user navigates directly to an expert-only URL (e.g., `/ai`, `/soul`) while in Simple mode, redirect them to Dashboard instead of showing a blank/error page.
**When to use:** Route definitions in `App.tsx`.
**Example:**
```typescript
// Wrapper component for expert-only routes
function ExpertRoute({ children }: { children: React.ReactNode }) {
  const { isExpert } = useMode();
  if (!isExpert) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

// Usage:
<Route path="/ai" element={
  <ProtectedRoute>
    <ExpertRoute>
      <AppLayout><AiDashboard /></AppLayout>
    </ExpertRoute>
  </ProtectedRoute>
} />
```
**Confidence:** HIGH -- Mirrors existing `ProtectedRoute` pattern.

### Anti-Patterns to Avoid

- **Separate route trees for each mode:** Do NOT create `/simple/dashboard` and `/expert/dashboard`. Use a single route tree with conditional rendering. The ARCHITECTURE.md research already flagged this as Anti-Pattern 5.
- **Duplicating components for each mode:** Do NOT create `SimpleDashboard` and `ExpertDashboard`. Use one component with `useMode().isExpert` checks.
- **Server-side mode storage:** Mode is a UI presentation concern. It does NOT belong in the event store or user profile. localStorage is sufficient for a self-hosted 1-3 user app.
- **Removing components from the DOM when hidden:** Use conditional rendering (`{isExpert && ...}`) which correctly unmounts expert-only components when in Simple mode. Do NOT use CSS `display: none` which keeps components mounted and running hooks/effects.
- **Breaking existing tests/behavior in Expert mode:** Expert mode MUST be identical to today's behavior. The toggle should only affect Simple mode by hiding things. No feature logic should change.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Global state management | Custom event bus or pub/sub for mode | React Context API (`ModeProvider`) | Already proven in codebase with `AuthProvider`. React Context is purpose-built for this. |
| Toggle persistence | Custom storage abstraction | `localStorage.getItem/setItem` directly | Same pattern used by `useLanguage()`. No abstraction needed for one key. |
| Accessible disclosure widgets | Custom ARIA implementation from scratch | HTML `<details>`/`<summary>` elements OR simple `aria-expanded` + `useState` | Native HTML disclosure elements handle a11y automatically. For styled version, `aria-expanded` on a button is sufficient. |

**Key insight:** This phase requires zero new libraries. Every building block exists in the codebase already. The work is composition and conditional rendering, not new infrastructure.

## Common Pitfalls

### Pitfall 1: Forgetting to Guard Direct URL Access
**What goes wrong:** User is in Simple mode but bookmarks `/ai` or types it in the URL bar. Without route guards, they see the AI Dashboard even though the nav link is hidden.
**Why it happens:** Developers hide the nav link but forget the route still exists.
**How to avoid:** Create an `ExpertRoute` wrapper (like `ProtectedRoute`) that redirects to `/home` when `isSimple` is true.
**Warning signs:** Users can access hidden features by URL in Simple mode.

### Pitfall 2: Expert Mode Behavior Regression
**What goes wrong:** While implementing conditional rendering for Simple mode, the developer accidentally alters Expert mode behavior (e.g., sections that were always visible now require a click to expand).
**Why it happens:** Mixing up `defaultOpen` logic or incorrectly checking mode.
**How to avoid:** Expert mode should be the "no changes" path. All conditionals should follow the pattern `isExpert ? <existing behavior> : <simplified behavior>`. Verify Expert mode is identical to current behavior after each change.
**Warning signs:** Any existing component renders differently in Expert mode after the change.

### Pitfall 3: ModeProvider Not Wrapping All Routes
**What goes wrong:** `useMode()` throws "must be used within ModeProvider" error on some pages.
**Why it happens:** ModeProvider placed inside AppLayout instead of at the app root. Routes outside AppLayout (Login, Setup) crash.
**How to avoid:** Place `ModeProvider` at the same level as `AuthProvider` in `App.tsx`, wrapping all routes. Login/Setup pages don't need mode, but the provider should still be present to prevent context errors if any shared component uses `useMode()`.
**Warning signs:** Runtime error on public routes (Login, Setup).

### Pitfall 4: Missing i18n Keys
**What goes wrong:** Mode toggle shows raw keys like "mode.simple" instead of translated text.
**Why it happens:** CLAUDE.md mandates all user-facing strings go through i18n. Forgetting to add keys to both `de.json` and `en.json`.
**How to avoid:** Add all `mode.*` keys to both locale files in the same commit. The dev-mode `missingKeyHandler` in `i18n/config.ts` will log warnings for missing keys.
**Warning signs:** Console warnings about missing translation keys.

### Pitfall 5: Dashboard KPI Section Logic Overlap
**What goes wrong:** In Simple mode the Dashboard should still show Projects and Idea Pool access but should hide the KPI overview/pie chart sections. If the conditional is too broad, it hides the project list too.
**Why it happens:** The KPI overview section and the project list are adjacent sections in Dashboard.tsx. A mode check placed at the wrong scope hides both.
**How to avoid:** Apply mode checks at the individual section level, not at the page level. Specifically: `overviewSection` (KPIs + pie chart) gets hidden. `projectSection` (project tabs + list) stays visible. `aiMemberSection` gets hidden.
**Warning signs:** Simple mode Dashboard shows nothing useful.

### Pitfall 6: Collapsible Sections Not Re-Expanding on Mode Switch
**What goes wrong:** User is in Simple mode, expands a section, then switches to Expert mode. The section stays in its manually-toggled state instead of being always-open in Expert mode.
**Why it happens:** The `open` state in `CollapsibleSection` is initialized from `defaultOpen` only on mount. Mode changes don't reset it.
**How to avoid:** Use a `useEffect` that watches `isExpert` and resets the open state: `useEffect(() => { if (isExpert) setOpen(true); }, [isExpert])`. Alternatively, skip the `CollapsibleSection` wrapper entirely in Expert mode and render children directly.
**Warning signs:** Expert mode has collapsed sections that should be open.

## Code Examples

### Complete useMode Hook (verified pattern from existing useAuth/useLanguage)
```typescript
// client/src/hooks/useMode.ts
// Source: Pattern derived from client/src/hooks/useAuth.tsx + client/src/hooks/useLanguage.ts
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type UXMode = "simple" | "expert";
const MODE_KEY = "eluma-mode";

interface ModeContextValue {
  mode: UXMode;
  isExpert: boolean;
  isSimple: boolean;
  setMode: (m: UXMode) => void;
  toggleMode: () => void;
}

const ModeContext = createContext<ModeContextValue | null>(null);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<UXMode>(
    () => (localStorage.getItem(MODE_KEY) as UXMode) || "simple"
  );

  const setMode = useCallback((m: UXMode) => {
    localStorage.setItem(MODE_KEY, m);
    setModeState(m);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next = prev === "simple" ? "expert" : "simple";
      localStorage.setItem(MODE_KEY, next);
      return next;
    });
  }, []);

  const value: ModeContextValue = {
    mode,
    isExpert: mode === "expert",
    isSimple: mode === "simple",
    setMode,
    toggleMode,
  };

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode(): ModeContextValue {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error("useMode must be used within a ModeProvider");
  }
  return context;
}
```

### ModeToggle Component (verified pattern from LanguageSwitcher.tsx)
```typescript
// client/src/components/ModeToggle.tsx
// Source: Pattern derived from client/src/components/LanguageSwitcher.tsx
import { useTranslation } from "react-i18next";
import { useMode } from "../hooks/useMode.js";

const styles = {
  container: {
    display: "inline-flex",
    gap: "2px",
    borderRadius: "4px",
    overflow: "hidden",
    border: "1px solid #d1d5db",
    fontSize: "0.75rem",
  },
  button: (active: boolean) => ({
    padding: "3px 8px",
    border: "none",
    cursor: "pointer",
    fontWeight: active ? "700" : "400",
    backgroundColor: active ? "#2563eb" : "#f9fafb",
    color: active ? "#ffffff" : "#374151",
    transition: "background-color 0.15s, color 0.15s",
  }),
} as const;

export function ModeToggle() {
  const { t } = useTranslation();
  const { isSimple, isExpert, setMode } = useMode();

  return (
    <div style={styles.container}>
      <button
        type="button"
        style={styles.button(isSimple)}
        onClick={() => setMode("simple")}
        aria-label={t("mode.simple")}
        aria-pressed={isSimple}
      >
        {t("mode.simple")}
      </button>
      <button
        type="button"
        style={styles.button(isExpert)}
        onClick={() => setMode("expert")}
        aria-label={t("mode.expert")}
        aria-pressed={isExpert}
      >
        {t("mode.expert")}
      </button>
    </div>
  );
}
```

### App.tsx ModeProvider Integration
```typescript
// client/src/App.tsx -- wrapping pattern
// Source: Mirrors existing AuthProvider wrapping pattern
import { ModeProvider } from "./hooks/useMode.js";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ModeProvider>
          <Routes>
            {/* ... all existing routes ... */}
          </Routes>
        </ModeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

### i18n Keys
```json
// Both de.json and en.json need these keys
{
  "mode": {
    "simple": "Simple",           // DE: "Einfach"
    "expert": "Expert",           // DE: "Experte"
    "toggle_label": "UI Mode",    // DE: "UI-Modus"
    "simple_tooltip": "Simplified view with core features only",
    "expert_tooltip": "Full view with all features and settings"
  }
}
```

### Conditional Nav Links in AppLayout
```typescript
// Inside AppLayout in App.tsx
const { isExpert } = useMode();

<nav style={styles.nav}>
  <button onClick={() => navigate("/home")} style={navStyle("/home")}>
    {t("nav.dashboard")}
  </button>
  <button onClick={() => navigate("/projects")} style={navStyle("/projects")}>
    {t("nav.projects")}
  </button>
  <button onClick={() => navigate("/ideas")} style={navStyle("/ideas")}>
    {t("nav.ideas")}
  </button>
  {isExpert && (
    <button onClick={() => navigate("/soul")} style={navStyle("/soul")}>
      {t("nav.soul_docs")}
    </button>
  )}
  {isExpert && (
    <button onClick={() => navigate("/ai")} style={navStyle("/ai")}>
      {t("nav.ai")}
    </button>
  )}
  {isExpert && (
    <button onClick={() => navigate("/integrations")} style={navStyle("/integrations")}>
      {t("nav.integrations")}
    </button>
  )}
</nav>

{/* headerRight */}
<ModeToggle />
<NotificationBell />
{isExpert && <SettingsButton />}
```

## Detailed Visibility Map

### Navigation Links
| Link | Simple | Expert |
|------|--------|--------|
| Dashboard | Visible | Visible |
| Projects | Visible | Visible |
| Idea Pool | Visible | Visible |
| Soul Docs | Hidden | Visible |
| AI | Hidden | Visible |
| Integrations | Hidden | Visible |
| Settings (notifications) | Hidden | Visible |

### Dashboard Sections
| Section | Simple | Expert |
|---------|--------|--------|
| Welcome header + Language Switcher | Visible | Visible |
| AI Team Member widget | Hidden | Visible |
| Project Overview (KPI cards + pie chart) | Hidden | Visible |
| Project Tabs + List | Visible | Visible |
| Team Manager panel | Hidden (or collapsed) | Visible |
| Activity Feed panel | Hidden (or collapsed) | Visible |

### ProjectDetail Sections
| Section | Simple | Expert |
|---------|--------|--------|
| Project Tabs (switching) | Visible | Visible |
| Project header (name, phase badge) | Visible | Visible |
| Project description (editable) | Visible | Visible |
| Phase Timeline | Collapsed (expandable) | Visible (open) |
| Agent Panel (GSD action) | Visible | Visible |
| WorkflowEngine (current phase) | Visible | Visible |
| Phase History (completed phases) | Collapsed (expandable) | Visible (open) |
| KPI Sidebar (RoiKpiCard + Form) | Hidden | Visible |

### Route Access
| Route | Simple | Expert |
|-------|--------|--------|
| /home | Allowed | Allowed |
| /projects, /projects/:id | Allowed | Allowed |
| /ideas | Allowed | Allowed |
| /soul, /soul/:userId, /soul/meta/:teamId | Redirect to /home | Allowed |
| /ai | Redirect to /home | Allowed |
| /integrations | Redirect to /home | Allowed |
| /settings/notifications | Redirect to /home | Allowed |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CSS media queries for simple/complex views | React Context with conditional rendering | Standard since React 16.8 (hooks, 2019) | Clean component trees, no hidden DOM nodes |
| Feature flag libraries (LaunchDarkly, Flagsmith) | Local feature toggles via Context | Always valid for local UI preferences | No external service needed for UI-only concern |
| CSS `display: none` to hide sections | Conditional rendering (`{flag && <Component />}`) | React best practice | Unmounts components cleanly, prevents hook side effects |

**Deprecated/outdated:**
- Using `window.matchMedia` for mode detection -- mode is user preference, not device capability
- Server-side mode storage for single-user self-hosted app -- unnecessary round-trip

## Open Questions

1. **Default mode for first-time users**
   - What we know: Requirements say Simple mode for non-technical users. The localStorage key will not exist on first visit.
   - What's unclear: Should default be "simple" (safer for new users) or "expert" (no change from current behavior)?
   - Recommendation: Default to "simple" -- this aligns with the phase goal of making the app accessible to non-technical users. Existing users who want Expert mode will toggle once and it persists forever.

2. **Dashboard bottom grid in Simple mode**
   - What we know: Dashboard has TeamManager (left) and ActivityFeed (right) below the project list.
   - What's unclear: Should these be hidden, collapsed, or visible in Simple mode? They're not explicitly mentioned in requirements.
   - Recommendation: Hide TeamManager and ActivityFeed in Simple mode. They are management/history features that add complexity. Simple mode should focus on: welcome + projects + ideas.

3. **AgentPanel visibility in Simple mode**
   - What we know: MODE-03 says Simple mode shows "current GSD action". The AgentPanel in ProjectDetail is the GSD action interface.
   - What's unclear: Is AgentPanel the "current GSD action" referenced in MODE-03?
   - Recommendation: Yes, keep AgentPanel visible in Simple mode. The WorkflowEngine (guided step-by-step) and AgentPanel (AI sessions) are the core GSD actions. Both should remain visible.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `client/src/hooks/useAuth.tsx` -- React Context + Provider pattern
- Existing codebase: `client/src/hooks/useLanguage.ts` -- localStorage persistence pattern
- Existing codebase: `client/src/components/LanguageSwitcher.tsx` -- Toggle component pattern
- Existing codebase: `client/src/App.tsx` -- AppLayout nav structure, route definitions, provider wrapping
- Existing codebase: `client/src/pages/Dashboard.tsx` -- Section layout to conditionally render
- Existing codebase: `client/src/pages/ProjectDetail.tsx` -- Sections to collapse in Simple mode
- `.planning/research/ARCHITECTURE.md` -- Anti-Pattern 5 (Mode as Separate Routes)
- `.planning/research/STACK.md` -- Section 5 (Simple/Expert Mode State Management)

### Secondary (MEDIUM confidence)
- [Progressive disclosure in UX design - LogRocket](https://blog.logrocket.com/ux-design/progressive-disclosure-ux-types-use-cases/) -- Collapsible section best practices
- [Feature Flags in React - Medium](https://medium.com/@ignatovich.dm/implementing-feature-flags-in-react-a-comprehensive-guide-f85266265fb3) -- React feature toggle patterns

### Tertiary (LOW confidence)
- None -- this phase uses only established React patterns that are directly verifiable in the codebase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Zero new libraries. All patterns exist in codebase.
- Architecture: HIGH -- Direct pattern matching with existing useAuth/useLanguage/LanguageSwitcher.
- Pitfalls: HIGH -- Identified from direct codebase inspection (route guards, section scoping, mode switch reactivity).
- Visibility map: MEDIUM -- MODE-03 lists what to hide but some Dashboard sections (TeamManager, ActivityFeed) are judgment calls.

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days -- stable domain, no fast-moving dependencies)
