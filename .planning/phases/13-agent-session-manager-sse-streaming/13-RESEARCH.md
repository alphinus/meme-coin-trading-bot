# Phase 13: Agent Session Manager & SSE Streaming - Research

**Researched:** 2026-02-10
**Domain:** SSE reconnection, session lifecycle hardening, markdown rendering, UI integration
**Confidence:** HIGH

## Summary

Phase 13 builds on a substantial foundation already created by Phase 12. The session manager (`server/src/agent/session-manager.ts`), SSE adapter (`sse-adapter.ts`), agent routes (`routes/agent.ts`), client hook (`useAgentStream.ts`), and agent output component (`AgentOutput.tsx`) all exist and are functional. However, five specific gaps remain between Phase 12's infrastructure and Phase 13's success criteria.

**Gap 1 -- Session enforcement is per-user, not per-project (AGENT-02).** The current `session-manager.ts` line 41-45 checks `session.userId === userId && session.state === "running"`. The success criteria requires "one session per project at a time." The fix is straightforward: check `session.projectId === projectId` instead of (or in addition to) `session.userId === userId`, and make `projectId` required in `StartSessionOptions`.

**Gap 2 -- No SSE event IDs or reconnection support (AGENT-04).** The current SSE stream endpoint (`routes/agent.ts` line 116) writes events WITHOUT the `id:` field. The client hook (`useAgentStream.ts`) does not handle reconnection -- it calls `es.close()` on error instead of letting EventSource auto-reconnect. The SSE spec mandates that `EventSource` automatically reconnects and sends `Last-Event-ID` header, but the server must: (a) include `id:` in every event, (b) read `Last-Event-ID` on reconnect, and (c) replay buffered events from that ID forward. The buffer infrastructure already exists (`session.buffer`) -- it just needs sequential IDs and the replay-from-ID logic.

**Gap 3 -- No syntax highlighting in code blocks (AGENT-05).** `AgentOutput.tsx` uses `react-markdown` with `remark-gfm` for markdown rendering, but fenced code blocks render as plain `<pre><code>` without syntax coloring. For proper code block formatting, add `rehype-highlight` (which uses highlight.js) via the `rehypePlugins` prop and include a highlight.js CSS theme.

**Gap 4 -- No GSD action button integration (AGENT-01).** The `useAgentStream` hook and `AgentOutput` component exist but are not wired into any page. Success criterion 1 says "User clicks a GSD action button and sees streaming text output." A GSD action button must be placed somewhere in the UI (likely project detail page) that triggers `startSession`.

**Gap 5 -- Missing i18n keys for new UI strings.** The current `agent.*` i18n keys cover the output component, but new strings are needed for reconnection status, abort confirmation, and any new GSD button labels.

**Primary recommendation:** Phase 13 is a hardening and integration phase, not a greenfield build. Focus on closing the 5 gaps above. Do not rewrite the existing working infrastructure from Phase 12.

## Existing Infrastructure (from Phase 12)

Before planning new work, the planner MUST understand what already exists and works.

### Server Files (already built)
| File | What It Does | Phase 13 Impact |
|------|-------------|-----------------|
| `server/src/agent/session-manager.ts` | Singleton `agentSessions`. start(), get(), getInfo(), abort(), cleanup(). Uses EventEmitter + buffer per session. 10-min timeout. | Needs: change per-user to per-project enforcement, add event ID tracking, add replay-from-ID method |
| `server/src/agent/sse-adapter.ts` | `adaptMessage(SDKMessage): SSEEvent[]`. Maps stream_event/assistant/result/system/tool_progress to flat events. Strips ANSI. | Complete as-is. No changes needed. |
| `server/src/agent/types.ts` | `AgentSession`, `AgentSessionState`, `SSEEvent`, `SSEEventType`, `StartSessionOptions`, `AgentSessionInfo`. | Needs: add `eventId` field to buffer tracking, make `projectId` required in `StartSessionOptions` |
| `server/src/agent/tool-permissions.ts` | `canUseTool` handler with 10-tool allowlist + 8 Bash regex patterns. | Complete as-is. No changes needed. |
| `server/src/routes/agent.ts` | POST /start, GET /stream/:sessionId, DELETE /:sessionId, GET /status/:sessionId. SSE with heartbeat, buffer replay, auth checks. | Needs: add `id:` field to SSE events, handle `Last-Event-ID` header on reconnect, change from user to project ownership validation |
| `server/src/app.ts` | Imports agentRouter, registers at `/api/agent`, graceful shutdown calls `agentSessions.cleanup()`. | Complete as-is. No changes needed. |

### Client Files (already built)
| File | What It Does | Phase 13 Impact |
|------|-------------|-----------------|
| `client/src/hooks/useAgentStream.ts` | `useAgentStream()` hook. EventSource connection, named event listeners, startSession/abortSession/reset. Returns fullText, status, currentTool, result, error, statusMessage. | Needs: handle reconnection properly (don't close on transient error), track last event ID |
| `client/src/components/AgentOutput.tsx` | Full streaming output display. react-markdown + remark-gfm. Tool indicators, status display, cancel button, auto-scroll, cost/duration/turns display. i18n integrated. | Needs: add syntax highlighting for code blocks via rehype-highlight |

### Dependencies (already installed)
| Package | Location | Version |
|---------|----------|---------|
| `@anthropic-ai/claude-agent-sdk` | server | ^0.2.37 |
| `strip-ansi` | server | ^7.1.2 |
| `react-markdown` | client | ^10.1.0 |
| `remark-gfm` | client | ^4.0.1 |

## Standard Stack

### Core (already installed -- no new server dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/claude-agent-sdk` | ^0.2.37 | Agent sessions | Already installed in Phase 12 |
| `react-markdown` | ^10.1.0 | Markdown rendering | Already installed, used in AgentOutput |
| `remark-gfm` | ^4.0.1 | GitHub Flavored Markdown | Already installed, used in AgentOutput |
| `EventSource` (browser native) | N/A | SSE connection with auto-reconnect | W3C standard, no polyfill needed for React 19 + modern browsers |

### New Dependencies (client only)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|-------------|
| `rehype-highlight` | ^7.0.2 | Syntax highlighting in code blocks | Uses highlight.js under the hood. Single rehype plugin, plugs directly into react-markdown's rehypePlugins prop. No custom component mapping needed. |
| `highlight.js` | ^11.11.1 | Syntax highlighting engine (peer dependency of rehype-highlight) | Industry standard. Needed for language detection + CSS themes. rehype-highlight depends on it. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `rehype-highlight` | `react-syntax-highlighter` | react-syntax-highlighter requires custom `components` prop mapping for code blocks, more code to wire up. rehype-highlight is zero-config with react-markdown: just add to `rehypePlugins`. |
| `rehype-highlight` | Custom `components.code` with Prism | More control over themes but requires manual component mapping, handling inline vs block code, and extracting language from className. Over-engineered for this use case. |
| Native EventSource reconnect | Custom fetch + ReadableStream reconnect | EventSource has built-in reconnect with `Last-Event-ID`. Reimplementing with fetch loses this for no benefit. EventSource limitation: GET only, but our SSE stream endpoint is already GET. |

**Installation:**
```bash
npm install rehype-highlight highlight.js -w client
```

## Architecture Patterns

### Pattern 1: SSE Event IDs for Reconnection
**What:** Assign sequential integer IDs to every SSE event. Store the ID alongside each event in the session buffer. On reconnection, replay from the client's `Last-Event-ID` forward.

**Why sequential integers:** The SSE spec sends `Last-Event-ID` as a string. Sequential integers enable simple "replay from N+1" logic. UUIDs would require a lookup table. The Phase 12 research already recommended this approach.

**Server-side implementation:**
```typescript
// In routes/agent.ts -- SSE stream endpoint
// Read Last-Event-ID from reconnecting client
const lastEventId = parseInt(req.headers["last-event-id"] as string, 10) || 0;

let eventId = 0;
const sendEvent = (event: SSEEvent): void => {
  eventId++;
  res.write(`id: ${eventId}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
  (res as any).flush?.();
};

// Replay buffered events, skipping those already received
for (const [index, bufferedEvent] of session.buffer.entries()) {
  const bufferedId = index + 1; // IDs are 1-based
  if (bufferedId > lastEventId) {
    sendEvent(bufferedEvent);
  }
}
```

**Client-side (EventSource auto-reconnect):**
```typescript
// EventSource automatically reconnects on connection loss
// It sends Last-Event-ID header with the last received id
// Key: do NOT close the EventSource on transient errors
const es = new EventSource(`/api/agent/stream/${sessionId}`);

// Only close on terminal events (result, error with data)
es.addEventListener("result", (e) => {
  // Terminal -- close connection
  es.close();
});

// EventSource.onerror fires on both transient (reconnectable) and fatal errors
// readyState === CONNECTING means it is reconnecting (good)
// readyState === CLOSED means it gave up (bad)
es.onerror = () => {
  if (es.readyState === EventSource.CLOSED) {
    // Connection permanently failed
    setStatus("error");
  }
  // If readyState === EventSource.CONNECTING, do nothing -- it will reconnect
};
```

**Confidence: HIGH** -- SSE `id:` field and `Last-Event-ID` header are W3C standard, verified via MDN and WHATWG HTML spec.

### Pattern 2: Per-Project Session Enforcement
**What:** Change session uniqueness constraint from per-user to per-project. One active session per project at a time, but a user can have sessions on different projects.

**Current code (session-manager.ts line 41-45):**
```typescript
// Current: per-user enforcement
for (const session of this.sessions.values()) {
  if (session.userId === userId && session.state === "running") {
    throw new Error("Agent session already running for this user");
  }
}
```

**Updated logic:**
```typescript
// New: per-project enforcement
if (projectId) {
  for (const session of this.sessions.values()) {
    if (session.projectId === projectId && session.state === "running") {
      throw new Error("Agent session already running for this project");
    }
  }
}
```

**Type change:** Make `projectId` required in `StartSessionOptions` (currently optional). Every GSD action targets a specific project, so this should always be provided.

**Confidence: HIGH** -- Direct code change based on existing working implementation.

### Pattern 3: rehype-highlight Integration
**What:** Add syntax highlighting to code blocks in AgentOutput with zero component mapping.

**Implementation in AgentOutput.tsx:**
```typescript
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
// Import a highlight.js theme CSS
import "highlight.js/styles/github.css";

// In the component:
<Markdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeHighlight]}
>
  {fullText}
</Markdown>
```

This is a two-line change to AgentOutput.tsx plus one CSS import. No custom `components` prop mapping needed. rehype-highlight automatically detects fenced code blocks with language specifiers (` ```typescript `) and applies highlight.js classes.

**Theme choice:** Use `highlight.js/styles/github.css` for light mode (matches Eluma's white card UI). If dark mode is added later, switch to `github-dark.css`.

**Confidence: HIGH** -- Verified via react-markdown docs, rehype-highlight README, and the existing `remarkPlugins` pattern already in use.

### Pattern 4: Client Reconnection State Management
**What:** Update `useAgentStream` to properly handle EventSource reconnection without losing state.

**Current bug:** The `es.onerror` handler in `useAgentStream.ts` (line 130-135) sets status to "error" whenever EventSource fires an error. But EventSource fires `onerror` on EVERY transient disconnect, even when it plans to reconnect. This causes the UI to flash "Error" during a network blip.

**Fix:** Only set error status when EventSource is permanently closed:
```typescript
es.onerror = () => {
  if (es.readyState === EventSource.CLOSED) {
    setStatus((prev) => (prev === "done" ? prev : "error"));
    setError("Connection lost");
  }
  // readyState === CONNECTING means auto-reconnect is happening
  // Optionally show a "Reconnecting..." status
};
```

**Reconnecting indicator:** Add a "reconnecting" status to `StreamStatus` type so the UI can show "Reconnecting..." instead of "Error" during transient disconnects:
```typescript
export type StreamStatus = "idle" | "starting" | "streaming" | "reconnecting" | "done" | "error";

es.onerror = () => {
  if (es.readyState === EventSource.CONNECTING) {
    setStatus("reconnecting");
  } else if (es.readyState === EventSource.CLOSED) {
    setStatus((prev) => (prev === "done" ? prev : "error"));
    setError("Connection lost");
  }
};
```

**Duplicate event prevention:** When EventSource reconnects, the server replays from `Last-Event-ID`. But the client has already accumulated chunks from before the disconnect. The server only sends events AFTER the `Last-Event-ID`, so no duplicates will arrive. The buffer is the source of truth, and the sequential ID ensures correct replay.

**Confidence: HIGH** -- Based on W3C EventSource spec behavior and direct code inspection.

### Pattern 5: GSD Action Button Integration
**What:** Wire a "Run GSD" button into the project detail page that triggers an agent session with streaming output.

**Where to place:** The project detail page (`client/src/pages/ProjectDetail.tsx`) is the natural location. GSD actions are per-project. The button should be visible when no session is active for that project.

**Integration pattern:**
```typescript
// In a project detail page or component
const { fullText, status, currentTool, result, error, statusMessage, startSession, abortSession } = useAgentStream();

const handleGsdAction = () => {
  startSession({
    prompt: "Analyze this project and suggest next steps",
    projectId: project.id,
    cwd: project.repoPath, // or cloned repo path
  });
};

// Button
{status === "idle" && (
  <button onClick={handleGsdAction}>{t("agent.run_gsd")}</button>
)}

// Output
<AgentOutput
  fullText={fullText}
  status={status}
  currentTool={currentTool}
  result={result}
  error={error}
  statusMessage={statusMessage}
  onAbort={abortSession}
/>
```

**Confidence: HIGH** -- All building blocks exist. This is pure integration.

### Anti-Patterns to Avoid

- **Rewriting session-manager.ts from scratch:** Phase 12's implementation works. Make targeted changes (per-project, event IDs), do not refactor.
- **Custom EventSource polyfill or wrapper:** Native EventSource has everything needed. Do not add `eventsource-polyfill` or `sse.js`.
- **Closing EventSource on transient errors:** This breaks auto-reconnect. Only close on terminal events (result, error with data payload).
- **Storing event IDs as UUIDs:** Sequential integers are simpler, enable "replay from N" without lookup, and match the SSE spec's `Last-Event-ID` expectation.
- **Adding event IDs to the SSEEvent type:** Event IDs are a transport concern (SSE protocol), not a domain concern. The buffer index IS the event ID. Do not add an `id` field to the `SSEEvent` interface.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Syntax highlighting in code blocks | Custom `<code>` component with regex language detection | `rehype-highlight` plugin for react-markdown | Zero-config integration, handles all highlight.js languages, no component mapping needed |
| SSE reconnection protocol | Custom fetch + ReadableStream with manual retry | Native `EventSource` auto-reconnect with `Last-Event-ID` | W3C standard, handles reconnect timing, retry header, and Last-Event-ID automatically |
| SSE event ID sequencing | UUID generation or timestamp-based IDs | Sequential integer counter (buffer index + 1) | Simpler, enables "replay from N" math, no lookup table needed |
| Markdown rendering | Custom HTML generation from markdown AST | `react-markdown` + `remark-gfm` + `rehype-highlight` | Already working in AgentOutput.tsx. Just add the rehype plugin. |

**Key insight:** Phase 13 is mostly about fixing gaps in existing working code and wiring existing components together. The heavy lifting (session manager, SSE adapter, agent output) was done in Phase 12.

## Common Pitfalls

### Pitfall 1: EventSource onerror Breaks Reconnection
**What goes wrong:** Calling `es.close()` or setting error state in the `onerror` handler prevents EventSource from auto-reconnecting. The user sees "Error" when they should see "Reconnecting...".
**Why it happens:** The current `useAgentStream.ts` onerror handler (line 130-135) checks `readyState === CLOSED` but then conditionally sets error status even when it is CONNECTING.
**How to avoid:** Distinguish between `CONNECTING` (transient, will reconnect) and `CLOSED` (permanent failure). Only set error on `CLOSED`.
**Warning signs:** Users report "Connection lost" errors during brief network interruptions that resolve themselves.

### Pitfall 2: Duplicate Events After Reconnection
**What goes wrong:** After reconnect, client receives events it already processed, causing duplicated text in the output.
**Why it happens:** Server replays the full buffer instead of only events after `Last-Event-ID`.
**How to avoid:** Read the `Last-Event-ID` header from the reconnection request. Use the buffer index to skip already-sent events. The buffer is 0-indexed; event IDs are 1-indexed (buffer[0] = event ID 1). Replay from `buffer[lastEventId]` forward.
**Warning signs:** Text appears doubled or repeated after a network blip.

### Pitfall 3: Session State Stale After Server Restart
**What goes wrong:** If the server restarts (PM2) while a session is active, the in-memory session map is lost. The client's EventSource reconnects but the server has no session to find, returning 404.
**Why it happens:** Sessions are in-memory only. No persistence layer.
**How to avoid:** This is acceptable for Phase 13. When the SSE endpoint returns 404 on reconnect, the client should detect this and show a "Session ended -- server restarted" message instead of retrying indefinitely. Set the `retry:` field in SSE to a reasonable value (e.g., 3000ms) so reconnection does not hammer the server.
**Warning signs:** EventSource stuck in reconnect loop after server restart, generating 404s every few seconds.

### Pitfall 4: Buffer Overflow for Long Sessions
**What goes wrong:** The session buffer is capped at 500 events (`MAX_BUFFER_SIZE = 500` in session-manager.ts). For long agent sessions producing many text deltas, the buffer fills up and new events are silently dropped. A reconnecting client misses events.
**Why it happens:** Each `text_delta` from the Agent SDK becomes one buffer entry. A session producing 10,000 tokens at ~5 chars per delta generates ~2,000 events. The 500 cap is exceeded within a few minutes.
**How to avoid:** Increase `MAX_BUFFER_SIZE` to at least 2000. Alternatively, coalesce consecutive `text` events into larger chunks before buffering (e.g., buffer every 100ms of text into one event). The coalescing approach is better for memory but more complex.
**Warning signs:** Reconnecting client shows truncated output (early text present, middle missing).

### Pitfall 5: Missing `retry:` Field Causes Aggressive Reconnection
**What goes wrong:** Without a `retry:` field in SSE, the browser uses its default reconnection interval (typically 3 seconds in Chrome, varies by browser). After a server restart, the client reconnects every 3 seconds, hitting 404 repeatedly.
**How to avoid:** Send `retry: 3000\n\n` once at the start of the SSE stream. This sets a 3-second retry interval. For production, 3 seconds is reasonable -- fast enough to resume after a network blip, slow enough not to hammer the server.
**Warning signs:** Server logs showing repeated 404s from the same client every second.

### Pitfall 6: Cookie Session Not Sent with EventSource (Cross-Origin Dev)
**What goes wrong:** In development, if the Vite dev server and Express server are on different ports without proper proxy config, EventSource may not send the session cookie, causing 401 errors.
**Why it happens:** EventSource for same-origin requests sends cookies by default. But if the URL includes a different port, it becomes cross-origin and cookies are not sent unless `withCredentials: true` is used.
**How to avoid:** ViteExpress proxies all `/api/*` requests, making them same-origin. As long as the EventSource URL is `/api/agent/stream/:id` (relative, no explicit host:port), cookies are sent. Do NOT use `http://localhost:3000/api/...` in EventSource URL.
**Warning signs:** 401 errors only in development, works fine in production.

## Code Examples

### Complete SSE Endpoint with Event IDs and Reconnection
```typescript
// Source: W3C SSE spec + existing routes/agent.ts
router.get("/stream/:sessionId", (req, res) => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: "Not authenticated" });
    return;
  }

  const { sessionId } = req.params;
  const session = agentSessions.get(sessionId);

  if (!session) {
    res.status(404).json({ success: false, error: "Session not found" });
    return;
  }

  if (session.userId !== userId) {
    res.status(403).json({ success: false, error: "Not authorized" });
    return;
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Set reconnection interval
  res.write("retry: 3000\n\n");
  (res as any).flush?.();

  // Track event IDs -- buffer index + 1
  let nextEventId = 1;

  const sendEvent = (event: SSEEvent, eventId: number): void => {
    res.write(`id: ${eventId}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
    (res as any).flush?.();
  };

  // Read Last-Event-ID for reconnection replay
  const lastEventId = parseInt(req.headers["last-event-id"] as string, 10) || 0;

  // Replay buffered events from lastEventId forward
  for (let i = 0; i < session.buffer.length; i++) {
    const eventId = i + 1;
    if (eventId > lastEventId) {
      sendEvent(session.buffer[i], eventId);
    }
  }
  nextEventId = session.buffer.length + 1;

  // If session already ended, close
  if (session.state !== "running") {
    res.end();
    return;
  }

  // Live event forwarding
  const onData = (event: SSEEvent): void => {
    sendEvent(event, nextEventId++);
  };

  const onEnd = (): void => {
    cleanup();
    res.end();
  };

  session.emitter.on("data", onData);
  session.emitter.on("end", onEnd);

  // Heartbeat
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
    (res as any).flush?.();
  }, 15_000);

  const cleanup = (): void => {
    clearInterval(heartbeat);
    session.emitter.off("data", onData);
    session.emitter.off("end", onEnd);
  };

  req.on("close", cleanup);
});
```

### Client Hook with Reconnection Support
```typescript
// Source: W3C EventSource spec + existing useAgentStream.ts
export type StreamStatus = "idle" | "starting" | "streaming" | "reconnecting" | "done" | "error";

// In connectStream:
const es = new EventSource(`/api/agent/stream/${sessionId}`);
eventSourceRef.current = es;
setStatus("streaming");

// Named event listeners (same as existing)
es.addEventListener("text", (e: MessageEvent) => { /* ... */ });
es.addEventListener("result", (e: MessageEvent) => {
  // Terminal event -- close connection
  es.close();
  setStatus("done");
});
es.addEventListener("error", (e: MessageEvent) => {
  if (e.data) {
    // Server-sent error event with data -- terminal
    es.close();
    setError(JSON.parse(e.data).message);
    setStatus("error");
  }
  // No data means connection error -- let EventSource reconnect
});

// Connection-level error handler
es.onerror = () => {
  if (es.readyState === EventSource.CONNECTING) {
    // Transient -- EventSource will reconnect automatically
    setStatus("reconnecting");
  } else if (es.readyState === EventSource.CLOSED) {
    // Permanent failure
    setStatus((prev) => (prev === "done" ? prev : "error"));
    setError("Connection lost");
  }
};
```

### rehype-highlight in AgentOutput
```typescript
// Source: rehype-highlight README + react-markdown docs
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css"; // Light theme

<Markdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeHighlight]}
>
  {fullText}
</Markdown>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom EventSource wrapper for reconnection | Native EventSource with `id:` fields | Always (SSE spec) | Zero-dependency reconnection with `Last-Event-ID` replay |
| `react-syntax-highlighter` for code blocks | `rehype-highlight` as react-markdown plugin | react-markdown v9+ (2024) | Simpler integration: one line in rehypePlugins vs custom components prop |
| Per-user session limit | Per-project session limit | Phase 13 requirement | Allows same user to run sessions on different projects |

**Deprecated/outdated:**
- `react-syntax-highlighter` approach: Still works but requires manual `components.code` mapping. `rehype-highlight` is the modern approach for react-markdown integration.

## Open Questions

1. **Buffer size adequacy for long sessions**
   - What we know: Current buffer cap is 500 events. Long sessions can generate 2000+ events.
   - What's unclear: Whether increasing to 2000 is sufficient, or if coalescing text events is needed.
   - Recommendation: Increase to 2000 for now. Monitor in production. Coalescing is a future optimization.

2. **GSD action button placement and prompt generation**
   - What we know: A button must exist that triggers `startSession`. The `ProjectDetail` page is the likely location.
   - What's unclear: What prompt to use, whether it should be user-editable, and what the CWD should be (project may not have a local clone yet).
   - Recommendation: For Phase 13, use a hardcoded prompt like "Analyze this project and suggest next steps" with a text field for user customization. CWD defaults to `process.cwd()` (the eluma server directory). Full project-specific CWD handling is a Phase 14+ concern when GitHub cloning is wired up.

3. **EventSource 6-connection-per-domain limit (HTTP/1.1)**
   - What we know: Browsers limit to 6 concurrent same-origin connections on HTTP/1.1. Each SSE connection holds one.
   - What's unclear: Whether Eluma users will hit this limit (they would need 6+ open tabs with active streams).
   - Recommendation: Accept for now. Self-hosted with 1-3 users, this is unlikely to be an issue. HTTP/2 raises the limit to 100.

## Sources

### Primary (HIGH confidence)
- [WHATWG HTML Spec - Server-Sent Events](https://html.spec.whatwg.org/multipage/server-sent-events.html) -- Event ID format, Last-Event-ID header, reconnection algorithm, retry field
- [MDN - Using Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) -- EventSource API, event format, reconnection behavior
- [javascript.info - Server-Sent Events](https://javascript.info/server-sent-events) -- EventSource credentials, reconnection, Last-Event-ID header behavior
- [react-markdown GitHub](https://github.com/remarkjs/react-markdown) -- rehypePlugins prop, components prop for custom rendering
- [rehype-highlight npm](https://www.npmjs.com/package/rehype-highlight) -- Integration with unified/rehype ecosystem
- Existing codebase: `server/src/agent/session-manager.ts`, `server/src/routes/agent.ts`, `client/src/hooks/useAgentStream.ts`, `client/src/components/AgentOutput.tsx` -- Direct inspection of Phase 12 artifacts

### Secondary (MEDIUM confidence)
- [expressjs/compression#17](https://github.com/expressjs/compression/issues/17) -- res.flush() for SSE with compression (already applied in Phase 12)
- [MDN EventSource.withCredentials](https://developer.mozilla.org/en-US/docs/Web/API/EventSource/withCredentials) -- Same-origin credential behavior

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries verified, most already installed. Only `rehype-highlight` + `highlight.js` are new.
- Architecture: HIGH -- All patterns based on existing Phase 12 code. Changes are targeted fixes, not new architecture.
- Pitfalls: HIGH -- SSE reconnection behavior verified against W3C spec. Buffer overflow risk identified from direct code inspection.

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable domain -- SSE is a W3C standard, react-markdown/rehype-highlight are mature)
