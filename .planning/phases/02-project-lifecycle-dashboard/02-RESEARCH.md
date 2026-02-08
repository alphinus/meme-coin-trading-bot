# Phase 2: Project Lifecycle & Dashboard - Research

**Researched:** 2026-02-08
**Domain:** Project lifecycle state machine, ROI/KPI tracking, dashboard visualization, browser-tab navigation
**Confidence:** HIGH

## Summary

Phase 2 builds on the established event-sourcing architecture from Phase 1 to implement a full project lifecycle management system. Every project must progress through 8 mandatory, non-skippable phases (Idea, Feasibility, Effort Estimate, ROI/KPI Initial Assessment, Risks & Dependencies, Decision Point, Implementation, Review & Pattern Extraction). The system also requires ROI/KPI metric tracking at decision, phase, and aggregate levels, along with a global dashboard showing status distribution via pie charts.

The existing codebase provides a strong foundation: the JSONL event store, the projector/reducer pattern, the `apiCall` client wrapper, the `useLanguage` hook for i18n, and the `useAuth` context. Phase 2 extends these with a new `project` aggregate type (already partially defined in shared types and event types), a project reducer with lifecycle state machine logic, new API routes (`/api/projects`), and several new frontend pages/components. The approach leans heavily into the existing event-sourcing pattern -- phase transitions and ROI/KPI entries are domain events, and the current project state (including current phase, metrics) is derived by replaying those events.

For the dashboard, `react-minimal-pie-chart` (2kB gzipped, single dependency) is the recommended charting library for status distribution pie charts. ROI/KPI aggregated values can be displayed as simple numeric cards/tables without a heavy charting library. The browser-tab navigation pattern should be built as a custom component using the existing inline CSS approach, not a UI library -- it is a simple tab bar with close/archive indicators, not a full tab framework.

**Primary recommendation:** Extend the existing event-sourcing architecture with a project reducer that enforces a strict linear lifecycle state machine, use `react-minimal-pie-chart` for status distribution, and keep ROI/KPI display as numeric cards and tables.

## Standard Stack

### Core (already installed from Phase 1)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.0.0 | Frontend UI framework | Already installed, hooks-based architecture |
| react-router-dom | ^7.1.0 | Client-side routing | Already installed, handles project routes |
| Express | ^4.21.0 | API server | Already installed, serves project routes |
| zod | ^3.24.0 | Schema validation | Already installed, validates project creation/update inputs |
| i18next / react-i18next | ^25.8.4 / ^16.5.4 | Internationalization | Already installed, all new UI text needs de/en translations |

### New for Phase 2
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-minimal-pie-chart | ^9.1.2 | Pie/donut chart for status distribution | Dashboard overview page (PROJ-07) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-minimal-pie-chart | recharts 3.x | Recharts is 97kB vs 2kB; supports more chart types but brings 11 deps (redux, immer, etc.). Overkill for pie charts only. |
| react-minimal-pie-chart | Chart.js + react-chartjs-2 | Canvas-based, better animation, but heavier and harder to style to match existing inline CSS approach |
| Custom state machine | XState v5 | XState is powerful but overkill for a strictly linear 8-phase sequence. The existing reducer pattern handles this naturally. |
| Custom tab component | MUI Tabs / Headless UI | Would introduce a UI framework dependency for a single component. The project uses inline CSS throughout. |

**Installation:**
```bash
npm install react-minimal-pie-chart -w client
```

## Architecture Patterns

### Recommended New File Structure (additions to Phase 1)
```
server/src/
├── events/
│   └── reducers/
│       └── project.ts          # NEW: Project lifecycle reducer
├── routes/
│   └── projects.ts             # NEW: Project CRUD + lifecycle API
└── ...

client/src/
├── pages/
│   ├── ProjectList.tsx          # NEW: Project list with tab navigation
│   ├── ProjectDetail.tsx        # NEW: Single project view with phases
│   └── Dashboard.tsx            # MODIFIED: Add global overview + pie charts
├── components/
│   ├── ProjectTabs.tsx          # NEW: Browser-tab-like project navigation
│   ├── PhaseTimeline.tsx        # NEW: 8-phase horizontal progress indicator
│   ├── PhaseContent.tsx         # NEW: Content/form for current phase
│   ├── RoiKpiCard.tsx           # NEW: ROI/KPI display card
│   ├── RoiKpiForm.tsx           # NEW: ROI/KPI entry form
│   ├── StatusPieChart.tsx       # NEW: Pie chart wrapper for status distribution
│   └── ArchiveTab.tsx           # NEW: Archived projects list
├── hooks/
│   ├── useProjects.ts           # NEW: Project list + CRUD hook
│   ├── useProject.ts            # NEW: Single project state hook
│   └── useProjectMetrics.ts     # NEW: ROI/KPI aggregation hook
└── ...

shared/types/
├── events.ts                    # MODIFIED: Add project lifecycle event types
└── models.ts                    # MODIFIED: Add ProjectState, PhaseData, RoiKpi types
```

### Pattern 1: Linear Lifecycle State Machine via Event-Sourced Reducer

**What:** Enforce a strict 8-phase sequence using the existing reducer pattern. Phase transitions are events; the current phase is derived state.

**When to use:** All project phase transitions.

**Example:**
```typescript
// shared/types/models.ts - Phase definitions
export const PROJECT_PHASES = [
  "idea",
  "feasibility",
  "effort_estimate",
  "roi_kpi_initial",
  "risks_dependencies",
  "decision_point",
  "implementation",
  "review_extraction",
] as const;

export type ProjectPhase = typeof PROJECT_PHASES[number];

export interface PhaseData {
  phase: ProjectPhase;
  enteredAt: string;
  completedAt?: string;
  data: Record<string, unknown>; // Phase-specific form data
}

export interface RoiKpiEntry {
  id: string;
  category: string;       // e.g., "revenue", "cost_savings", "time_saved"
  label: string;           // Human-readable label
  value: number;
  unit: string;            // e.g., "EUR", "hours", "percent"
  phase: ProjectPhase;     // Which phase this metric was recorded in
  decisionId?: string;     // Optional: ties to a specific decision
  recordedAt: string;
}

export interface ProjectState {
  id: string;
  name: string;
  description: string;
  teamId: string;
  members: string[];
  currentPhase: ProjectPhase;
  phases: PhaseData[];
  roiKpis: RoiKpiEntry[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}
```

```typescript
// server/src/events/reducers/project.ts - Reducer with lifecycle enforcement
import type { DomainEvent } from "shared/types/events.js";
import type { ProjectState, PROJECT_PHASES } from "shared/types/models.js";

export function reduceProjectState(events: DomainEvent[]): ProjectState | null {
  if (events.length === 0) return null;

  let state: Partial<ProjectState> = {};

  for (const event of events) {
    switch (event.type) {
      case "project.created": {
        const data = event.data as {
          name: string;
          description: string;
          teamId: string;
          members: string[];
        };
        state = {
          id: event.aggregateId,
          name: data.name,
          description: data.description,
          teamId: data.teamId,
          members: data.members,
          currentPhase: "idea",
          phases: [{
            phase: "idea",
            enteredAt: event.timestamp,
            data: {},
          }],
          roiKpis: [],
          archived: false,
          createdAt: event.timestamp,
          updatedAt: event.timestamp,
        };
        break;
      }
      case "project.phase_completed": {
        const data = event.data as {
          phase: string;
          phaseData: Record<string, unknown>;
        };
        // Mark current phase as completed
        const phases = state.phases || [];
        const currentPhaseEntry = phases.find(
          (p) => p.phase === data.phase && !p.completedAt
        );
        if (currentPhaseEntry) {
          currentPhaseEntry.completedAt = event.timestamp;
          currentPhaseEntry.data = data.phaseData;
        }
        state.updatedAt = event.timestamp;
        break;
      }
      case "project.phase_advanced": {
        const data = event.data as { nextPhase: string };
        state.currentPhase = data.nextPhase as any;
        const phases = state.phases || [];
        phases.push({
          phase: data.nextPhase as any,
          enteredAt: event.timestamp,
          data: {},
        });
        state.phases = phases;
        state.updatedAt = event.timestamp;
        break;
      }
      case "project.roi_kpi_added": {
        const data = event.data as {
          kpiId: string;
          category: string;
          label: string;
          value: number;
          unit: string;
          phase: string;
          decisionId?: string;
        };
        const kpis = state.roiKpis || [];
        kpis.push({
          id: data.kpiId,
          category: data.category,
          label: data.label,
          value: data.value,
          unit: data.unit,
          phase: data.phase as any,
          decisionId: data.decisionId,
          recordedAt: event.timestamp,
        });
        state.roiKpis = kpis;
        state.updatedAt = event.timestamp;
        break;
      }
      case "project.archived": {
        state.archived = true;
        state.updatedAt = event.timestamp;
        break;
      }
      case "project.updated": {
        const data = event.data as { name?: string; description?: string };
        if (data.name) state.name = data.name;
        if (data.description) state.description = data.description;
        state.updatedAt = event.timestamp;
        break;
      }
      case "project.member_added": {
        const data = event.data as { userId: string };
        const members = state.members || [];
        if (!members.includes(data.userId)) {
          members.push(data.userId);
          state.members = members;
        }
        state.updatedAt = event.timestamp;
        break;
      }
      default:
        break;
    }
  }

  if (!state.id) return null;
  return state as ProjectState;
}
```

### Pattern 2: Phase Transition Validation (Server-Side Gate)

**What:** The server validates that phase transitions are strictly sequential. No phase can be skipped.

**When to use:** Every `/api/projects/:id/advance` call.

**Example:**
```typescript
// server/src/routes/projects.ts - Phase advance endpoint (excerpt)
function getNextPhase(current: ProjectPhase): ProjectPhase | null {
  const idx = PROJECT_PHASES.indexOf(current);
  if (idx === -1 || idx >= PROJECT_PHASES.length - 1) return null;
  return PROJECT_PHASES[idx + 1];
}

// POST /api/projects/:id/advance
router.post("/:id/advance", async (req, res) => {
  const project = await getProjectById(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: "Project not found" });

  const nextPhase = getNextPhase(project.currentPhase);
  if (!nextPhase) {
    // Project is in the final phase -- complete and archive
    // ... emit project.archived event
    return;
  }

  const correlationId = randomUUID();

  // Complete current phase
  appendEvent({
    type: "project.phase_completed",
    aggregateType: "project",
    aggregateId: project.id,
    userId: req.user!.id,
    correlationId,
    version: /* next version */,
    data: {
      phase: project.currentPhase,
      phaseData: req.body.phaseData || {},
    },
  });

  // Advance to next phase
  appendEvent({
    type: "project.phase_advanced",
    aggregateType: "project",
    aggregateId: project.id,
    userId: req.user!.id,
    correlationId,
    version: /* next version */,
    data: { nextPhase },
  });

  const updated = await getProjectById(project.id);
  res.json({ success: true, data: updated });
});
```

### Pattern 3: ROI/KPI Aggregation via Event Projection

**What:** ROI/KPI metrics are stored as events and aggregated by projecting all events for a project, a phase, or across all projects.

**When to use:** Dashboard views (per-decision, per-phase, global aggregate).

**Example:**
```typescript
// server/src/routes/projects.ts - Metrics aggregation (excerpt)

// GET /api/projects/:id/metrics
router.get("/:id/metrics", async (req, res) => {
  const project = await getProjectById(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: "Not found" });

  // Per-phase aggregation
  const byPhase = new Map<string, RoiKpiEntry[]>();
  for (const kpi of project.roiKpis) {
    const existing = byPhase.get(kpi.phase) || [];
    existing.push(kpi);
    byPhase.set(kpi.phase, existing);
  }

  res.json({
    success: true,
    data: {
      total: project.roiKpis,
      byPhase: Object.fromEntries(byPhase),
    },
  });
});

// GET /api/projects/dashboard/overview
router.get("/dashboard/overview", async (req, res) => {
  const allProjects = await getAllProjects();

  // Status distribution for pie chart
  const statusCounts = new Map<string, number>();
  for (const p of allProjects) {
    const phase = p.archived ? "archived" : p.currentPhase;
    statusCounts.set(phase, (statusCounts.get(phase) || 0) + 1);
  }

  // Aggregate ROI/KPI across all projects
  const aggregatedKpis: Record<string, number> = {};
  for (const p of allProjects) {
    for (const kpi of p.roiKpis) {
      const key = `${kpi.category}_${kpi.unit}`;
      aggregatedKpis[key] = (aggregatedKpis[key] || 0) + kpi.value;
    }
  }

  res.json({
    success: true,
    data: {
      statusDistribution: Object.fromEntries(statusCounts),
      aggregatedKpis,
      totalProjects: allProjects.length,
      activeProjects: allProjects.filter((p) => !p.archived).length,
      archivedProjects: allProjects.filter((p) => p.archived).length,
    },
  });
});
```

### Pattern 4: Browser-Tab-Like Project Navigation

**What:** Projects appear as browser tabs at the top of the main content area. Active project is highlighted. Archived projects move to a separate "Archive" tab. Tabs are scrollable when there are many projects.

**When to use:** ProjectList page / main navigation.

**Example:**
```typescript
// client/src/components/ProjectTabs.tsx (conceptual)
interface ProjectTab {
  id: string;
  name: string;
  currentPhase: string;
  archived: boolean;
}

function ProjectTabs({
  projects,
  activeId,
  onSelect,
  onArchiveClick,
}: {
  projects: ProjectTab[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onArchiveClick: () => void;
}) {
  const active = projects.filter((p) => !p.archived);
  const hasArchived = projects.some((p) => p.archived);

  return (
    <div style={styles.tabBar}>
      {active.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          style={p.id === activeId ? styles.activeTab : styles.tab}
        >
          <span>{p.name}</span>
          <span style={styles.phaseBadge}>{p.currentPhase}</span>
        </button>
      ))}
      {hasArchived && (
        <button onClick={onArchiveClick} style={styles.archiveTab}>
          Archive
        </button>
      )}
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Storing derived lifecycle state in separate files:** The project's current phase MUST be derived from events, not stored as a separate mutable field. Storing it separately creates a consistency risk between the event log and the "current" state.
- **Client-side phase validation only:** Phase transitions must be validated server-side. The client can show/hide the "advance" button, but the server must enforce that no phase is skipped. Never trust client-provided phase indices.
- **Separate JSONL files per project:** Events for all projects go into a single `project.jsonl` file (consistent with Phase 1's "one JSONL per aggregate type" pattern). Do not create per-project event files.
- **Heavy UI library for tabs:** The project uses inline CSS throughout. Do not introduce Material UI or similar just for tabs. Build a simple custom tab bar component.
- **Monolithic dashboard component:** Split the dashboard into composable sub-components (StatusPieChart, RoiKpiCard, ProjectTabs) rather than a single 500-line Dashboard.tsx.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pie/donut charts | Custom SVG path calculations | `react-minimal-pie-chart` | SVG arc math is error-prone; library handles labels, animations, accessibility |
| UUID generation | Math.random IDs | `crypto.randomUUID()` (already used) | Collision-safe, RFC-compliant |
| Input validation | Manual if/else | `zod` (already installed) | Schema composition, error formatting, TypeScript inference |
| Event storage | Custom file format | Existing JSONL event store | Already battle-tested in Phase 1, append-only atomicity |
| i18n | Manual string lookups | `i18next` + `react-i18next` (already installed) | Pluralization, interpolation, language detection |
| Routing | Manual URL matching | `react-router-dom` (already installed) | Nested routes, params, navigation guards |

**Key insight:** Phase 2 is primarily about domain logic (lifecycle rules, metrics aggregation) and UI composition. All infrastructure (event store, auth, sessions, i18n) is already built. Focus effort on the domain model and user experience, not infrastructure.

## Common Pitfalls

### Pitfall 1: Phase Transition Race Conditions
**What goes wrong:** Two users simultaneously advance a project's phase, emitting conflicting events.
**Why it happens:** No optimistic concurrency check on the aggregate version.
**How to avoid:** Use the `version` field on events. Before emitting a phase advance event, read the current aggregate version. If it has changed since the client loaded the project, reject with 409 Conflict. The version is already part of `DomainEvent` from Phase 1.
**Warning signs:** Project appears in two different phases depending on which client view you load.

### Pitfall 2: Forgetting to Handle the Final Phase -> Archive Transition
**What goes wrong:** After completing Phase 8 (Review & Pattern Extraction), the project stays in the active list instead of moving to archive.
**Why it happens:** The "advance" logic only handles moving to the next phase, not the terminal state.
**How to avoid:** When `getNextPhase()` returns `null` (current phase is the last one), emit a `project.archived` event after completing the phase. The reducer sets `archived: true`, and the UI filters it to the archive tab.
**Warning signs:** Completed projects stay in the active project tabs forever.

### Pitfall 3: ROI/KPI Entries Without Phase Context
**What goes wrong:** ROI/KPI metrics are added without recording which phase they belong to, making per-phase aggregation impossible.
**Why it happens:** The KPI form omits the `phase` field, or uses the wrong phase (e.g., the phase at display time, not the phase at entry time).
**How to avoid:** Always include the project's `currentPhase` at the time of KPI entry in the event data. The server should auto-populate this from the projected project state, not trust the client.
**Warning signs:** Per-phase KPI breakdown shows all metrics in one phase, or "unknown" phase.

### Pitfall 4: N+1 Reads on Dashboard Overview
**What goes wrong:** The dashboard overview page makes one API call per project to get its current state, causing N+1 reads.
**Why it happens:** Naive implementation: fetch project list, then fetch each project's details.
**How to avoid:** Create a single `/api/projects/dashboard/overview` endpoint that reads the `project.jsonl` file once, projects all projects in memory, and returns the aggregated status distribution and KPI totals in a single response.
**Warning signs:** Dashboard is slow with many projects; multiple sequential API calls visible in network tab.

### Pitfall 5: Inline Styles Breaking Tab Scroll
**What goes wrong:** Browser-tab navigation overflows when there are many projects, with no scroll mechanism.
**Why it happens:** Inline CSS `display: flex` without `overflow-x: auto` or `flex-wrap`.
**How to avoid:** Use `overflow-x: auto` on the tab container with `white-space: nowrap` on individual tabs. Set `flex-shrink: 0` on each tab to prevent squishing.
**Warning signs:** Tabs compress to unreadable widths or overflow off-screen.

### Pitfall 6: Event Type Explosion
**What goes wrong:** Creating too many granular event types (one per field change per phase) makes the reducer unwieldy and the event store hard to query.
**Why it happens:** Over-applying event-sourcing dogma.
**How to avoid:** Keep event granularity at the lifecycle level: `project.created`, `project.updated`, `project.phase_completed`, `project.phase_advanced`, `project.roi_kpi_added`, `project.archived`, `project.member_added`. Phase-specific form data goes in the `data` payload of `project.phase_completed`, not as separate event types.
**Warning signs:** 30+ event types for a single aggregate; reducer has 50+ switch cases.

### Pitfall 7: Missing i18n Keys for New Components
**What goes wrong:** New project/dashboard UI shows raw key strings like `project.create_button` instead of translated text.
**Why it happens:** Adding new components without updating both `de.json` and `en.json` locale files.
**How to avoid:** Every new component must have corresponding entries in both locale files. Add all keys in the same task that creates the component. Use the existing `useLanguage()` hook pattern (wraps `useTranslation()`).
**Warning signs:** Raw dotted key strings visible in the UI.

## Code Examples

### Pie Chart for Status Distribution
```typescript
// client/src/components/StatusPieChart.tsx
// Source: https://github.com/toomuchdesign/react-minimal-pie-chart
import { PieChart } from "react-minimal-pie-chart";

interface StatusData {
  title: string;
  value: number;
  color: string;
}

const PHASE_COLORS: Record<string, string> = {
  idea: "#60a5fa",
  feasibility: "#34d399",
  effort_estimate: "#fbbf24",
  roi_kpi_initial: "#f472b6",
  risks_dependencies: "#fb923c",
  decision_point: "#a78bfa",
  implementation: "#2563eb",
  review_extraction: "#10b981",
  archived: "#9ca3af",
};

export function StatusPieChart({
  distribution,
}: {
  distribution: Record<string, number>;
}) {
  const data: StatusData[] = Object.entries(distribution).map(
    ([phase, count]) => ({
      title: phase,
      value: count,
      color: PHASE_COLORS[phase] || "#6b7280",
    })
  );

  if (data.length === 0) return null;

  return (
    <PieChart
      data={data}
      lineWidth={60}
      paddingAngle={2}
      label={({ dataEntry }) =>
        `${dataEntry.title} (${dataEntry.value})`
      }
      labelStyle={{ fontSize: "5px", fill: "#333" }}
      labelPosition={112}
      style={{ height: "250px" }}
    />
  );
}
```

### New Event Types to Add
```typescript
// shared/types/events.ts - additions for Phase 2
export type EventType =
  // ... existing types from Phase 1
  | "project.created"           // already exists
  | "project.updated"           // already exists
  | "project.phase_completed"   // NEW
  | "project.phase_advanced"    // NEW
  | "project.roi_kpi_added"     // NEW
  | "project.roi_kpi_updated"   // NEW
  | "project.archived"          // NEW
  | "project.member_added"      // NEW
  ;
```

### Project API Routes Registration
```typescript
// server/src/app.ts - uncomment and add projects router
import projectsRouter from "./routes/projects.js";
// ...
app.use("/api/projects", requireAuth, projectsRouter);
```

### useProjects Hook (follows existing useTeam pattern)
```typescript
// client/src/hooks/useProjects.ts
import { useState, useEffect, useCallback } from "react";
import { apiCall } from "../api/client.js";
import type { ProjectState } from "shared/types/models.js";

export function useProjects() {
  const [projects, setProjects] = useState<ProjectState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const result = await apiCall<ProjectState[]>("GET", "/api/projects");
    if (result.success) {
      setProjects(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const createProject = useCallback(
    async (name: string, description: string, members: string[]) => {
      const result = await apiCall<ProjectState>("POST", "/api/projects", {
        name, description, members,
      });
      if (result.success) {
        await fetchProjects();
      }
      return result;
    },
    [fetchProjects]
  );

  return {
    projects,
    active: projects.filter((p) => !p.archived),
    archived: projects.filter((p) => p.archived),
    loading,
    error,
    createProject,
    refresh: fetchProjects,
  };
}
```

### Routing Structure for Phase 2
```typescript
// client/src/App.tsx - new routes (additions)
<Route path="/projects" element={<ProtectedRoute><AppLayout><ProjectList /></AppLayout></ProtectedRoute>} />
<Route path="/projects/:id" element={<ProtectedRoute><AppLayout><ProjectDetail /></AppLayout></ProtectedRoute>} />
<Route path="/projects/archive" element={<ProtectedRoute><AppLayout><ArchiveList /></AppLayout></ProtectedRoute>} />
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| recharts for all charts | react-minimal-pie-chart for simple charts | 2024+ awareness | 97kB to 2kB for pie charts; use recharts only when bar/line charts needed |
| XState for all workflows | Simple reducer for linear sequences | Ongoing | XState shines for complex branching; linear sequences are simpler with reducer + const array |
| Mutable status field | Event-sourced lifecycle state | Architecture decision | Phase is derived from events, not stored; prevents state inconsistency |
| React Router v5/v6 | React Router v7 | 2025 | New data APIs, improved TypeScript; project already uses v7 |

**Deprecated/outdated:**
- **React Router v5 patterns:** Do not use `useHistory`, `Switch`, or class-based route components. Project uses v7 with `Routes`/`Route`.
- **React class components:** Project uses hooks throughout. All new components must use function components with hooks.

## Open Questions

1. **Phase-specific form fields**
   - What we know: Each of the 8 phases likely needs different input fields (e.g., "Idea" has description/rationale, "Effort Estimate" has hour/cost fields, "ROI/KPI Initial" has metric inputs).
   - What's unclear: The exact fields required for each phase are not specified in the requirements. The requirements focus on the lifecycle flow, not the per-phase content.
   - Recommendation: Keep phase forms flexible using a generic `Record<string, unknown>` data payload in events. Build minimal phase forms for Phase 2 (text fields + structured KPI inputs where relevant) and evolve them in later phases. Do not over-engineer phase-specific schemas upfront.

2. **ROI/KPI metric categories**
   - What we know: Requirements say "ROI/KPI per decision, per phase, and aggregated." This implies structured metric data with categories.
   - What's unclear: What specific KPI categories the users expect (revenue, cost savings, time, quality metrics, etc.).
   - Recommendation: Use a flexible category system: user enters category name, label, numeric value, and unit. Provide a few suggested categories (revenue impact, cost savings, time saved, risk reduction) but allow custom entries. This avoids premature category lock-in.

3. **"Per decision" KPI tracking (PROJ-05)**
   - What we know: Requirements mention viewing ROI/KPI "per decision." This implies decisions are first-class entities within phases.
   - What's unclear: Whether "decision" means a formalized entity (like a decision record) or just the Decision Point phase (Phase 6).
   - Recommendation: Model decisions as sub-entries within phases. KPI entries have an optional `decisionId` field. During the Decision Point phase, the user can create named decisions, each of which can have associated KPIs. This keeps the model flexible without over-engineering.

4. **Navigation layout: tabs vs. sidebar**
   - What we know: Requirements say "browser-tab-like navigation" (PROJ-02).
   - What's unclear: Whether tabs should appear in the main header (like actual browser tabs) or below the header in a sub-navigation area.
   - Recommendation: Place project tabs below the existing header, above the main content. This separates system navigation (header: logo, user, logout) from project navigation (tab bar: project tabs, archive tab, new project button). This follows the browser metaphor where tabs sit below the address bar.

## Sources

### Primary (HIGH confidence)
- Phase 1 codebase at `/Users/developer/eluma/` -- Actual running code, event store, reducers, API patterns, React hooks, i18n setup (directly examined)
- Phase 1 RESEARCH.md at `/Users/developer/.planning/phases/01-foundation-authentication/01-RESEARCH.md` -- Architecture decisions, technology rationale
- react-minimal-pie-chart npm registry -- Version 9.1.2, React 19 compatible, 1 dependency (`svg-partial-circle`), ~2kB gzipped
- recharts npm registry -- Version 3.7.0, React 19 compatible, 11 dependencies, ~97kB

### Secondary (MEDIUM confidence)
- [react-minimal-pie-chart GitHub](https://github.com/toomuchdesign/react-minimal-pie-chart) -- API docs, examples, benchmark showing 2kB vs recharts 97kB
- [Finite State Machines in React](https://blog.codeminer42.com/finite-state-machines-and-how-to-build-any-step-by-step-flow-in-react/) -- Pattern validation for linear workflow FSMs
- [Event sourcing with TypeScript](https://event-driven.io/en/type_script_node_js_event_sourcing/) -- Reducer-based event sourcing patterns

### Tertiary (LOW confidence)
- [Syncfusion chart library comparison](https://www.syncfusion.com/blogs/post/top-5-react-chart-libraries) -- Market comparison (promotional content, used for context only)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- React 19, react-router-dom v7, zod, i18next all verified from existing package.json; react-minimal-pie-chart verified via npm registry
- Architecture: HIGH -- Extends existing event-sourcing patterns proven in Phase 1; linear lifecycle state machine is straightforward with const array + reducer
- Pitfalls: HIGH -- Race conditions, N+1 reads, and archive transitions are well-known patterns in event-sourced systems; i18n key coverage verified from existing locale files
- ROI/KPI model: MEDIUM -- The flexible category approach is sound engineering but specific requirements are ambiguous; may need refinement during implementation

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days -- stable ecosystem, no fast-moving dependencies)
