# Phase 3: Documentation Engine - Research

**Researched:** 2026-02-08
**Domain:** Append-only documentation system with Soul Documents, event-driven writes, and GDPR-compliant soft-delete
**Confidence:** HIGH

## Summary

Phase 3 builds a documentation engine on top of the existing event-sourced JSONL store and filesystem memory system from Phases 1 and 2. The core concept is that every significant event in the system (decisions, status changes, KPI evaluations, AI interventions, etc.) triggers an immediate append-only write to structured documentation. Each team member gets a persistent "Soul Document" -- a growing Markdown file that captures their thinking patterns, decisions, and AI reflections. At the team level, a "Meta Soul Document" aggregates patterns across all members to surface thinking errors, biases, and tendencies.

The existing infrastructure is well-suited for this. The JSONL event store already captures all domain events with timestamps and source attribution. The filesystem memory system (`data/memory/`) already provides per-project Markdown files with Git versioning. The documentation engine extends this by: (1) introducing a new `soul_document` aggregate type in the event store to track documentation entries as first-class events, (2) creating a Soul Document writer service that listens for relevant domain events and appends formatted entries to per-member Markdown files, (3) building API endpoints for reading Soul Documents with entry-level soft-delete, and (4) adding React views for browsing Soul Documents and the Meta Soul Document.

The critical architectural insight is that Soul Document entries should live as both JSONL events (for querying, filtering, and soft-delete tracking) AND as appended sections in Markdown files (for human readability and Git-diffable history). The JSONL events are the source of truth; the Markdown files are a derived projection that can be regenerated. This dual-write pattern leverages both the event store's queryability and the memory system's human-readable, Git-versioned nature.

**Primary recommendation:** Extend the existing event store with `soul_document.*` event types, build a DocumentWriter service that reacts to domain events and appends formatted entries, store entry metadata in JSONL for querying/soft-delete, and project the visible Markdown from non-deleted entries. Use react-markdown for rendering Soul Documents in the frontend.

## Standard Stack

### Core (No New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Existing JSONL event store | N/A | Store soul_document events as first-class domain events | Already built, append-only, queryable |
| Existing fs/memory system | N/A | Store Soul Document Markdown files with Git versioning | Already built, Git-backed, human-readable |
| Existing simple-git | 3.x | Version Soul Document Markdown changes | Already integrated with debounced commit queue |
| Express | 4.x | API routes for Soul Document CRUD | Already in use |
| React | 18.x | Frontend Soul Document views | Already in use |
| Zod | latest | Validate soul document API inputs | Already in use |

### New Dependencies

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-markdown | 10.x | Render Markdown content in Soul Document viewer | Displaying Soul Documents and Meta Soul Document in the frontend |
| remark-gfm | 4.x | GitHub Flavored Markdown support (tables, strikethrough, task lists) | Soul Documents use GFM for rich formatting |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-markdown | markdown-to-jsx | Slightly smaller but fewer plugins, less ecosystem support |
| react-markdown | @uiw/react-md-editor | Includes an editor (overkill -- Soul Documents are append-only, not user-editable) |
| Dual JSONL+Markdown | Markdown-only | Would lose queryability for filtering/soft-delete; grep is not enough for structured entry management |
| Dual JSONL+Markdown | JSONL-only | Would lose human-readable Markdown files that can be opened in any editor; defeats the memory system's purpose |

**Installation:**
```bash
npm install react-markdown remark-gfm -w client
```

## Architecture Patterns

### Recommended Project Structure (New Files)

```
server/src/
├── docs/
│   ├── types.ts              # SoulDocumentEntry, MetaSoulDocument types
│   ├── writer.ts             # DocumentWriter service - listens to events, appends entries
│   ├── soul-document.ts      # Soul Document CRUD (read, soft-delete, regenerate)
│   └── meta-soul.ts          # Meta Soul Document generation logic
├── events/
│   └── reducers/
│       └── soul-document.ts  # Reducer for soul_document aggregate
├── routes/
│   └── docs.ts               # API routes for Soul Documents
└── ...existing files...

client/src/
├── pages/
│   ├── SoulDocument.tsx       # Individual Soul Document view
│   └── MetaSoulDocument.tsx   # Team-level Meta Soul Document view
├── components/
│   ├── SoulDocumentViewer.tsx # Markdown renderer with entry-level controls
│   ├── SoulDocumentEntry.tsx  # Single entry component with soft-delete button
│   └── SoulDocumentNav.tsx    # Navigation between team members' documents
├── hooks/
│   ├── useSoulDocument.ts    # Fetch/manage a member's Soul Document
│   └── useMetaSoulDocument.ts # Fetch Meta Soul Document
└── ...existing files...

shared/types/
└── events.ts                  # Extended with soul_document.* event types
```

### Pattern 1: Event-Driven Document Writer (Core Pattern)

**What:** A service that subscribes to domain events and converts them into Soul Document entries. When a relevant event occurs (decision made, phase advanced, KPI added, etc.), the writer creates a formatted entry and appends it to both the JSONL event store and the member's Markdown file.

**When to use:** Every time a significant domain event occurs that should be documented.

**Example:**
```typescript
// server/src/docs/writer.ts
import { appendFileSync } from "fs";
import { appendEvent, readEvents } from "../events/store.js";
import type { DomainEvent } from "shared/types/events.js";
import { resolvePath, getMemoryDir, ensureDir } from "../fs/paths.js";
import { scheduleCommit } from "../fs/git.js";
import { randomUUID } from "crypto";

/**
 * Source types for Soul Document entries.
 * Maps to DOCS-05 requirement: every entry includes source type.
 */
export type EntrySourceType = "text" | "audio" | "decision" | "ai_reflection" | "status_change" | "kpi" | "pattern_match" | "override";

export interface SoulDocumentEntry {
  entryId: string;
  userId: string;          // Which team member's Soul Document
  teamId: string;
  projectId?: string;      // Optional project context
  sourceType: EntrySourceType;
  content: string;         // The formatted documentation text
  triggerEventId: string;  // The domain event that triggered this entry
  triggerEventType: string;
  deleted: boolean;        // GDPR soft-delete flag
  deletedAt?: string;
  deletedBy?: string;
}

/**
 * Write a Soul Document entry.
 * Dual-write: JSONL event (source of truth) + Markdown append (human-readable).
 */
export function writeSoulDocumentEntry(entry: Omit<SoulDocumentEntry, "entryId" | "deleted">): DomainEvent {
  const entryId = randomUUID();

  // 1. Write to JSONL event store (source of truth)
  const event = appendEvent({
    type: "soul_document.entry_added",
    aggregateType: "soul_document",
    aggregateId: entry.userId, // Aggregate by team member
    userId: entry.userId,
    correlationId: entry.triggerEventId,
    version: 1,
    data: {
      entryId,
      teamId: entry.teamId,
      projectId: entry.projectId,
      sourceType: entry.sourceType,
      content: entry.content,
      triggerEventId: entry.triggerEventId,
      triggerEventType: entry.triggerEventType,
    },
  });

  // 2. Append to Markdown file (derived projection)
  appendToMarkdownFile(entry.userId, entry.teamId, entry.sourceType, entry.content, event.timestamp);

  return event;
}

/**
 * Append a formatted entry to the member's Soul Document Markdown file.
 */
function appendToMarkdownFile(
  userId: string,
  teamId: string,
  sourceType: EntrySourceType,
  content: string,
  timestamp: string
): void {
  const memDir = getMemoryDir();
  const soulDocDir = resolvePath(memDir, "_soul_documents");
  ensureDir(soulDocDir);

  const filePath = resolvePath(soulDocDir, `${userId}.md`);

  const sourceLabel = sourceType.replace(/_/g, " ");
  const dateStr = new Date(timestamp).toLocaleDateString("de-CH", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });

  const entry = `\n---\n\n**[${dateStr}]** _${sourceLabel}_\n\n${content}\n`;

  appendFileSync(filePath, entry, "utf-8");
  scheduleCommit(filePath);
}
```

### Pattern 2: Event Listener for Automatic Documentation (DOCS-04)

**What:** A mapping from domain event types to Soul Document entry generators. When certain events fire, the documentation engine automatically creates entries.

**When to use:** To satisfy DOCS-04 -- "every decision, assumption, status change, KPI evaluation, AI intervention, override, and pattern match triggers an immediate append-only write."

**Example:**
```typescript
// server/src/docs/writer.ts (continued)

/**
 * Map of domain events that trigger Soul Document entries.
 * Each mapper receives the event and returns the entry content and source type.
 */
const EVENT_TO_ENTRY_MAP: Record<string, (event: DomainEvent) => { sourceType: EntrySourceType; content: string } | null> = {
  "project.phase_completed": (event) => ({
    sourceType: "status_change",
    content: `Completed phase **${event.data.phase}** on project. ${event.data.phaseData ? "Notes: " + JSON.stringify(event.data.phaseData) : ""}`,
  }),
  "project.phase_advanced": (event) => ({
    sourceType: "status_change",
    content: `Advanced project from **${event.data.previousPhase}** to **${event.data.nextPhase}**.`,
  }),
  "project.roi_kpi_added": (event) => ({
    sourceType: "kpi",
    content: `Added KPI: **${event.data.label}** = ${event.data.value} ${event.data.unit} (${event.data.category}) in phase ${event.data.phase}.`,
  }),
  "project.created": (event) => ({
    sourceType: "decision",
    content: `Created project **${event.data.name}**: ${event.data.description}`,
  }),
  "project.archived": (event) => ({
    sourceType: "status_change",
    content: `Project archived. Reason: ${event.data.reason || "manual"}`,
  }),
  // Future: AI events, voice transcription events, override events
};

/**
 * Process a domain event and generate Soul Document entries if applicable.
 * Call this after every appendEvent() in the system.
 */
export function processEventForDocumentation(event: DomainEvent): void {
  const mapper = EVENT_TO_ENTRY_MAP[event.type];
  if (!mapper) return;

  const result = mapper(event);
  if (!result) return;

  writeSoulDocumentEntry({
    userId: event.userId,
    teamId: "", // Resolve from event context
    projectId: event.aggregateType === "project" ? event.aggregateId : undefined,
    sourceType: result.sourceType,
    content: result.content,
    triggerEventId: event.id,
    triggerEventType: event.type,
  });
}
```

### Pattern 3: GDPR Soft-Delete for Individual Entries (DOCS-06)

**What:** Mark individual Soul Document entries as deleted without removing them from the audit log. The Markdown file is regenerated from non-deleted entries.

**When to use:** When a user requests deletion of a specific entry (GDPR right to erasure).

**Example:**
```typescript
// server/src/docs/soul-document.ts
import { appendEvent, readEvents } from "../events/store.js";
import type { DomainEvent } from "shared/types/events.js";

/**
 * Soft-delete a Soul Document entry.
 * 1. Appends a soul_document.entry_deleted event (audit trail)
 * 2. Regenerates the Markdown file excluding deleted entries
 */
export function softDeleteEntry(
  userId: string,
  entryId: string,
  deletedBy: string
): DomainEvent {
  const event = appendEvent({
    type: "soul_document.entry_deleted",
    aggregateType: "soul_document",
    aggregateId: userId,
    userId: deletedBy,
    correlationId: entryId,
    version: 1,
    data: {
      entryId,
      deletedBy,
      reason: "gdpr_request",
    },
  });

  // Regenerate the Markdown file from non-deleted entries
  regenerateMarkdownFile(userId);

  return event;
}

/**
 * Get all non-deleted entries for a user's Soul Document.
 * Reads all soul_document events, builds a set of deleted entryIds,
 * then returns only entries that are not deleted.
 */
export async function getSoulDocumentEntries(userId: string): Promise<SoulDocumentEntry[]> {
  const events = await readEvents("soul_document", userId);

  // Sort chronologically
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const entries: Map<string, SoulDocumentEntry> = new Map();
  const deletedIds: Set<string> = new Set();

  for (const event of events) {
    if (event.type === "soul_document.entry_added") {
      const data = event.data as Record<string, unknown>;
      entries.set(data.entryId as string, {
        entryId: data.entryId as string,
        userId: event.aggregateId,
        teamId: data.teamId as string,
        projectId: data.projectId as string | undefined,
        sourceType: data.sourceType as EntrySourceType,
        content: data.content as string,
        triggerEventId: data.triggerEventId as string,
        triggerEventType: data.triggerEventType as string,
        deleted: false,
      });
    } else if (event.type === "soul_document.entry_deleted") {
      const data = event.data as Record<string, unknown>;
      deletedIds.add(data.entryId as string);
    }
  }

  // Mark deleted entries and filter them out for display
  return Array.from(entries.values()).map(entry => ({
    ...entry,
    deleted: deletedIds.has(entry.entryId),
  }));
}
```

### Pattern 4: Meta Soul Document Generation (DOCS-03)

**What:** Aggregate entries across all team members to surface team-level patterns like thinking errors, biases, abort patterns, and over/under-engineering tendencies.

**When to use:** When displaying the Meta Soul Document view.

**Important note:** Full AI-powered pattern analysis belongs in Phase 4 (AI Foundation). In Phase 3, the Meta Soul Document provides a structured aggregation of all entries organized by pattern type. The actual AI analysis (detecting thinking errors, biases, etc.) will be layered on in Phase 4. Phase 3 builds the data foundation and UI shell.

**Example:**
```typescript
// server/src/docs/meta-soul.ts

/**
 * Generate a Meta Soul Document for a team.
 * Phase 3: Aggregates entries by member, source type, and project.
 * Phase 4 will add AI-powered pattern detection.
 */
export async function generateMetaSoulDocument(teamId: string): Promise<MetaSoulDocument> {
  // Get all team members
  const team = await getTeamById(teamId);
  if (!team) throw new Error("Team not found");

  const memberSummaries: MemberSummary[] = [];

  for (const member of team.members) {
    const entries = await getSoulDocumentEntries(member.userId);
    const activeEntries = entries.filter(e => !e.deleted);

    memberSummaries.push({
      userId: member.userId,
      totalEntries: activeEntries.length,
      entriesBySourceType: groupBy(activeEntries, "sourceType"),
      entriesByProject: groupBy(activeEntries, "projectId"),
      recentEntries: activeEntries.slice(-10), // Last 10 entries
    });
  }

  return {
    teamId,
    generatedAt: new Date().toISOString(),
    members: memberSummaries,
    // Phase 4 will populate these with AI analysis:
    thinkingErrors: [],
    biases: [],
    abortPatterns: [],
    engineeringTendencies: [],
  };
}
```

### Pattern 5: Soul Document Markdown Viewer (Frontend)

**What:** A read-only Markdown viewer for Soul Documents with entry-level soft-delete controls.

**When to use:** The dedicated Soul Document pages.

**Example:**
```typescript
// client/src/components/SoulDocumentViewer.tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  entries: SoulDocumentEntry[];
  onSoftDelete: (entryId: string) => void;
  isOwnDocument: boolean; // Only show delete on own document
}

export function SoulDocumentViewer({ entries, onSoftDelete, isOwnDocument }: Props) {
  const activeEntries = entries.filter(e => !e.deleted);

  return (
    <div className="soul-document">
      {activeEntries.map(entry => (
        <div key={entry.entryId} className="soul-entry">
          <div className="entry-header">
            <span className="entry-timestamp">{formatDate(entry.timestamp)}</span>
            <span className="entry-source">{entry.sourceType}</span>
            {isOwnDocument && (
              <button
                onClick={() => onSoftDelete(entry.entryId)}
                className="entry-delete"
                title="Remove entry (GDPR)"
              >
                Remove
              </button>
            )}
          </div>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {entry.content}
          </ReactMarkdown>
        </div>
      ))}
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Parsing Markdown to find entries:** Do not parse the Markdown file to identify individual entries. The JSONL events are the source of truth for entry identity. The Markdown file is a derived projection only.
- **Storing entry metadata in Markdown frontmatter:** Do not embed structured data (entry IDs, deletion flags) in Markdown. Keep the Markdown human-readable and regenerable from events.
- **Modifying existing Markdown lines for soft-delete:** Do not edit lines in the Markdown file to mark entries as deleted. Instead, regenerate the entire Markdown file from non-deleted events. This maintains the append-only philosophy at the event level.
- **Making the Meta Soul Document AI-dependent in Phase 3:** The Meta Soul Document should provide useful structured aggregation WITHOUT AI. AI analysis layers on top in Phase 4. Do not block Phase 3 delivery on AI capabilities.
- **Putting Soul Document content inline in the event data:** Keep event data payloads focused on metadata. The content string is part of the event data, but keep it concise. Long-form analysis (when AI arrives in Phase 4) should be stored as separate entries, not embedded in other events.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown rendering in React | Custom HTML parser or dangerouslySetInnerHTML | react-markdown 10.x with remark-gfm | XSS protection, CommonMark compliance, plugin ecosystem |
| Entry-level tracking in Markdown | Custom line-number or marker-based tracking | JSONL events as source of truth | Markdown is fragile for structured data; events are queryable |
| Git versioning of Soul Documents | Custom version tracking | Existing simple-git infrastructure | Already built with debounced commit queue |
| Timestamp formatting | Custom date formatting | `toLocaleDateString` with `Intl` API | Handles i18n formatting automatically for DE/EN |
| UUID generation | Custom ID generators | `crypto.randomUUID()` | Already used throughout the codebase |
| File path validation | Manual path traversal checks | Existing `resolvePath()` from `fs/paths.ts` | Already handles allowlist enforcement |

**Key insight:** Phase 3's value is in the documentation *design* -- what gets captured, how entries are structured, how the Meta Soul Document aggregates patterns. The underlying storage and versioning infrastructure already exists from Phase 1. Do not rebuild any of it.

## Common Pitfalls

### Pitfall 1: Circular Event Generation

**What goes wrong:** The DocumentWriter listens for domain events and creates new events. If it listens to its own `soul_document.*` events, it creates an infinite loop.
**Why it happens:** The writer reacts to events but also produces events.
**How to avoid:** The DocumentWriter must explicitly ignore all `soul_document.*` event types. Only react to events from other aggregate types (project, team, user, memory).
**Warning signs:** Rapidly growing `soul_document.jsonl` file, CPU spike on event processing.

### Pitfall 2: Race Condition on Markdown Regeneration

**What goes wrong:** Multiple soft-deletes or new entries arriving simultaneously cause concurrent Markdown file regenerations that overwrite each other.
**Why it happens:** The regenerateMarkdownFile() operation reads all events, builds the file content, and writes it. Two concurrent operations can interleave.
**How to avoid:** Use a per-user write lock (simple mutex) for Markdown file operations. Since this is a 2-user system, a simple `Map<string, Promise<void>>` queue is sufficient. Alternatively, use the existing debounced commit queue pattern -- queue regenerations and batch them.
**Warning signs:** Missing entries in regenerated Markdown, file content flip-flopping in Git history.

### Pitfall 3: Missing Team Context in Event-to-Entry Mapping

**What goes wrong:** When a `project.phase_advanced` event fires, the DocumentWriter needs to know which team and member to write the entry for. The event has `userId` but not always `teamId`.
**Why it happens:** Domain events store the minimum necessary data. Team context must be resolved.
**How to avoid:** The DocumentWriter must resolve team membership from the user reducer at entry-writing time. Cache team membership in memory (only 2 users, 1 team) to avoid repeated event replays.
**Warning signs:** Entries missing from Soul Documents, "team not found" errors in logs.

### Pitfall 4: Oversized JSONL Events from Long Content

**What goes wrong:** Soul Document entries with long content strings push individual JSONL lines over the 4KB PIPE_BUF limit, breaking append atomicity.
**Why it happens:** `appendFileSync` atomicity only holds for writes under PIPE_BUF (4KB on Linux). A Soul Document entry with a long AI reflection or detailed decision rationale could exceed this.
**How to avoid:** Keep Soul Document entry content concise (under 2KB). For longer content, store the content in the Markdown file and reference it by entry ID in the event. Alternatively, accept the theoretical risk -- with only 2 users, the chance of concurrent writes to the same JSONL file is negligible.
**Warning signs:** Corrupted JSONL lines (truncated JSON) in `soul_document.jsonl`.

### Pitfall 5: Markdown File Growing Without Bound

**What goes wrong:** Over months/years, a Soul Document Markdown file grows very large, making it slow to read and regenerate.
**Why it happens:** Append-only philosophy means entries are never removed (even soft-deleted entries are just excluded from regeneration, but new entries keep appending).
**How to avoid:** For Phase 3, this is acceptable -- the 50k token consolidation rule (STOR-01/STOR-02) is a v2 requirement and explicitly out of scope for v1. Monitor file sizes and plan for consolidation when file sizes approach 50k tokens. Git history preserves all content regardless.
**Warning signs:** Markdown files exceeding 100KB, slow Soul Document page loads.

### Pitfall 6: GDPR Soft-Delete Not Removing Content from Git History

**What goes wrong:** Soft-deleting an entry removes it from the current Markdown file but the content remains in Git commit history.
**Why it happens:** Git is an append-only version control system. Previous versions of files are always accessible.
**How to avoid:** For v1, document this limitation clearly. The soft-delete satisfies GDPR by: (1) removing the content from the active document, (2) recording the deletion in the audit log, (3) keeping the event with `deleted: true` flag. True erasure from Git would require `git filter-branch` which is destructive and complex. If legally required, implement a "hard purge" utility in a future phase. The GDPR approach of "marked as deleted, kept in audit log" matches the stated requirement exactly.
**Warning signs:** Legal review flagging Git history as non-compliant (unlikely for v1 internal tool).

## Code Examples

### New Event Types to Add to shared/types/events.ts

```typescript
// Add to EventType union and EVENT_TYPES array
| "soul_document.entry_added"
| "soul_document.entry_deleted"
| "soul_document.entry_manual"    // User manually writes to their Soul Document
| "soul_document.meta_generated"  // Meta Soul Document was regenerated
```

### Soul Document Entry Type Definition

```typescript
// shared/types/models.ts (additions)

export type EntrySourceType =
  | "text"             // Direct text input from user
  | "audio"            // Transcribed voice message (Phase 6)
  | "decision"         // Decision made (project created, phase advanced, etc.)
  | "ai_reflection"    // AI observation about the user (Phase 4)
  | "status_change"    // Phase/project status change
  | "kpi"              // KPI entry added or updated
  | "pattern_match"    // Pattern detected (Phase 4)
  | "override"         // User overrode an AI recommendation (Phase 4)
  | "assumption";      // Assumption recorded

export interface SoulDocumentEntry {
  entryId: string;
  userId: string;
  teamId: string;
  projectId?: string;
  sourceType: EntrySourceType;
  content: string;
  triggerEventId: string;
  triggerEventType: string;
  timestamp: string;
  deleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface MetaSoulDocument {
  teamId: string;
  generatedAt: string;
  members: Array<{
    userId: string;
    displayName: string;
    totalEntries: number;
    entriesBySourceType: Record<string, number>;
    recentEntries: SoulDocumentEntry[];
  }>;
  // Phase 4 will populate these:
  patterns: Array<{
    type: "thinking_error" | "bias" | "abort_pattern" | "over_engineering" | "under_engineering";
    description: string;
    affectedMembers: string[];
    evidence: string[];
    detectedAt: string;
  }>;
}
```

### API Routes Structure

```typescript
// server/src/routes/docs.ts

// GET  /api/docs/soul/:userId          - Get a user's Soul Document entries
// POST /api/docs/soul/:userId/entry    - Manually add an entry (text input)
// DELETE /api/docs/soul/:userId/:entryId - Soft-delete an entry (GDPR)
// GET  /api/docs/meta/:teamId          - Get the Meta Soul Document
// POST /api/docs/meta/:teamId/generate - Trigger Meta Soul Document regeneration
// GET  /api/docs/soul/:userId/markdown  - Get the raw Markdown content
```

### Hook Pattern for Soul Document

```typescript
// client/src/hooks/useSoulDocument.ts
import { useState, useEffect, useCallback } from "react";
import { apiCall } from "../api/client.js";
import type { SoulDocumentEntry } from "shared/types/models.js";

export function useSoulDocument(userId: string | undefined) {
  const [entries, setEntries] = useState<SoulDocumentEntry[]>([]);
  const [markdown, setMarkdown] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocument = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [entriesResult, mdResult] = await Promise.all([
        apiCall<SoulDocumentEntry[]>("GET", `/api/docs/soul/${userId}`),
        apiCall<{ content: string }>("GET", `/api/docs/soul/${userId}/markdown`),
      ]);
      if (entriesResult.success) setEntries(entriesResult.data);
      if (mdResult.success) setMarkdown(mdResult.data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchDocument(); }, [fetchDocument]);

  const addEntry = useCallback(async (content: string) => {
    if (!userId) return;
    const result = await apiCall("POST", `/api/docs/soul/${userId}/entry`, { content });
    if (result.success) await fetchDocument();
  }, [userId, fetchDocument]);

  const softDelete = useCallback(async (entryId: string) => {
    if (!userId) return;
    const result = await apiCall("DELETE", `/api/docs/soul/${userId}/${entryId}`);
    if (result.success) await fetchDocument();
  }, [userId, fetchDocument]);

  return { entries, markdown, loading, error, addEntry, softDelete, refresh: fetchDocument };
}
```

### Markdown File Header Template

```markdown
---
type: soul_document
member: {displayName}
userId: {userId}
team: {teamName}
created: {ISO timestamp}
---

# Soul Document: {displayName}

This document captures thinking patterns, decisions, and reflections for {displayName}.
Each entry is automatically appended when significant events occur.

---
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual journaling / meeting notes | Event-driven auto-documentation | Event sourcing matured 2022-2024 | Every action is captured without manual effort |
| Editable documents (wiki-style) | Append-only with GDPR soft-delete | GDPR enforcement 2018+ | Legal compliance while preserving history |
| Monolithic "user profile" page | Living Soul Document (growing record) | This project's innovation | Captures patterns over time, not just current state |
| AI-generated summaries replacing content | AI reflections appended alongside human content | LLM adoption 2023+ | Both perspectives coexist without content loss |

**Deprecated/outdated:**
- **Wiki-style overwriting for documentation**: Contradicts append-only philosophy and loses history
- **Database-only audit logs**: Not human-readable, not Git-diffable, not accessible outside the app

## Open Questions

1. **Soul Document Storage Location**
   - What we know: The existing memory system stores files in `data/memory/{projectId}/`. Soul Documents are per-member, not per-project.
   - What's unclear: Should Soul Documents live in `data/memory/_soul_documents/` (alongside project memory) or in a separate top-level directory like `data/soul_documents/`?
   - Recommendation: Use `data/memory/_soul_documents/` to keep them within the existing Git-versioned memory directory. The underscore prefix distinguishes them from project folders. This means Soul Documents get Git versioning for free.

2. **Event Listener Integration Point**
   - What we know: The codebase uses `appendEvent()` synchronously. There is no event bus or pub/sub mechanism.
   - What's unclear: How to hook the DocumentWriter into the event flow without modifying every `appendEvent()` call site.
   - Recommendation: Create a `appendEventWithDocs()` wrapper that calls `appendEvent()` and then `processEventForDocumentation()`. Gradually migrate existing call sites. Alternatively, wrap `appendEvent()` itself to always call the documentation processor (simpler but couples the systems). The wrapper approach is cleaner and allows gradual migration.

3. **Meta Soul Document AI Analysis Scope in Phase 3**
   - What we know: DOCS-03 requires "detecting thinking errors, biases, abort patterns, and over/under-engineering."
   - What's unclear: These are AI analysis tasks. Phase 4 provides AI capabilities. How much should Phase 3 deliver?
   - Recommendation: Phase 3 builds the data aggregation layer and UI shell. The Meta Soul Document shows structured entry summaries per member (entry counts by type, recent entries, project distribution). The AI analysis sections show placeholder content with "AI analysis available after Phase 4" messaging. The data structure supports the AI fields but they remain empty until Phase 4 populates them.

4. **Manual Soul Document Entries**
   - What we know: DOCS-02 says Soul Documents are "fed from voice messages, text inputs, decisions, and AI reflections." Voice messages are Phase 6, AI reflections are Phase 4.
   - What's unclear: What "text inputs" means in Phase 3 -- is it free-form journaling by the user?
   - Recommendation: Provide a simple text input in the Soul Document view that lets users manually add entries. This satisfies the "text inputs" source type immediately. Label it as a thinking/reflection input, not a chat or note field.

5. **Soul Document Access Control**
   - What we know: All team members see all projects (open visibility per AUTH-04).
   - What's unclear: Can team members read each other's Soul Documents?
   - Recommendation: Yes, open visibility. All team members can read all Soul Documents. Only the document owner can soft-delete their own entries. This matches the project's open-visibility philosophy and enables the Meta Soul Document to be meaningful.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `/Users/developer/eluma/server/src/events/store.ts` -- JSONL event store implementation
- Existing codebase: `/Users/developer/eluma/server/src/fs/memory.ts` -- Memory file CRUD with Git integration
- Existing codebase: `/Users/developer/eluma/server/src/fs/git.ts` -- Git commit queue with 5s debounce
- Existing codebase: `/Users/developer/eluma/server/src/events/reducers/project.ts` -- Reducer pattern reference
- Existing codebase: `/Users/developer/eluma/shared/types/events.ts` -- Domain event types
- [react-markdown npm](https://www.npmjs.com/package/react-markdown) -- v10.x, 116k+ weekly users, XSS-safe by default
- [remark-gfm npm](https://www.npmjs.com/package/remark-gfm) -- v4.x, GFM support (tables, strikethrough, task lists)

### Secondary (MEDIUM confidence)
- [GDPR soft-delete patterns](https://axiom.co/blog/the-right-to-be-forgotten-vs-audit-trail-mandates) -- Architectural separation of personal data from anonymized audit trails
- [GDPR log management](https://last9.io/blog/gdpr-log-management/) -- Soft-delete as valid GDPR compliance approach for audit-critical systems
- [Event sourcing with versioning 2026](https://www.johal.in/event-sourcing-with-event-stores-and-versioning-in-2026/) -- Append-only event stores as standard for auditable systems
- [React Markdown guide](https://strapi.io/blog/react-markdown-complete-guide-security-styling) -- react-markdown usage patterns and security considerations

### Tertiary (LOW confidence)
- None -- all findings verified through codebase inspection or official package documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new infrastructure needed. Only 2 small client dependencies (react-markdown, remark-gfm), both well-established
- Architecture: HIGH -- Directly extends existing event store and memory system patterns. Dual JSONL+Markdown approach is the natural evolution of the existing infrastructure
- Pitfalls: HIGH -- Identified from direct codebase analysis (circular events, concurrent writes, PIPE_BUF limits). These are concrete, verifiable risks
- Open questions: MEDIUM -- AI scope boundary (Phase 3 vs Phase 4) and storage location need decisions during planning but have clear recommended paths

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days -- stable ecosystem, all dependencies are mature)
