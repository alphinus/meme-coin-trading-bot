# Phase 8: External Integrations & AI Search - Research

**Researched:** 2026-02-08
**Domain:** Gmail integration, Google Calendar sync, GitHub integration (commits/PRs/fork), AI email drafting, AI-powered natural-language search
**Confidence:** MEDIUM-HIGH

## Summary

Phase 8 connects the Eluma platform to three external services (Gmail, Google Calendar, GitHub) and adds AI-powered natural-language search across all data. The codebase already has a ViteExpress monorepo (Express + Vite + React SPA), JSONL append-only event store, multi-provider AI registry (Anthropic/OpenAI via AI SDK), fire-and-forget async processing, and established patterns for reducers, routes, hooks, and notifications.

The Gmail integration requires careful design because the official push notification path (users.watch) mandates Google Cloud Pub/Sub, which adds infrastructure complexity to a self-hosted app. The recommended approach for a 2-user self-hosted system is periodic polling via Gmail API history.list with a stored historyId, avoiding the Pub/Sub dependency entirely. Google Calendar uses the same googleapis library with a similar polling approach. GitHub integration extends the existing gh CLI-based routes to use Octokit REST for richer API interaction (webhooks, fork, commit/PR listing, code analysis). AI Search uses the existing AI infrastructure with tool-calling to translate natural-language queries into structured event store queries.

**Primary recommendation:** Use the `googleapis` npm package (v171+) for Gmail/Calendar with OAuth2 + polling, `@octokit/rest` (v22+) for GitHub API, extend the existing AI generate wrapper with new task types for email routing/drafting/code analysis/search, and implement AI search via tool-calling where the LLM calls defined "search tools" that query the JSONL event store.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `googleapis` | 171.4.0 | Gmail API + Google Calendar API | Official Google client library for Node.js. Single package covers Gmail and Calendar. Built-in OAuth2 token management with automatic refresh. |
| `google-auth-library` | 10.5.0 | OAuth2 client for Google APIs | Companion to googleapis. Handles token storage, refresh, and credential management. Already manages the OAuth2 flow. |
| `@octokit/rest` | 22.0.1 | GitHub REST API client | Official GitHub SDK. Full TypeScript types. Covers repos.createFork, repos.listCommits, pulls.list, repos.get. Handles pagination and rate limiting. |
| `@octokit/webhooks` | 14.2.0 | GitHub webhook verification and routing | Official webhook handler. Verifies signatures, routes events by type. Required for receiving push/PR/commit events. |
| `mailparser` | 3.9.3 | Email body/attachment parsing | Standard library for parsing raw email MIME content into structured objects. Handles HTML, text, attachments, headers. |
| `ai` (AI SDK) | 6.0.77 (already installed) | Tool-calling for AI search, generateText for email/code analysis | Already in the codebase. Tool-calling (`tool()` function + `generateText` with tools) enables AI search. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `nodemailer` | 8.0.1 (already installed) | Send email drafts via SMTP/Gmail | Already in the codebase. Used to send AI-prepared email drafts after user confirmation. |
| `zod` | 3.24.0 (already installed) | Validate API inputs, tool schemas | Already in the codebase. Used for route validation and AI SDK tool input schemas. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| googleapis polling | Gmail Pub/Sub push (users.watch) | Push is real-time but requires Google Cloud Pub/Sub topic, adds infrastructure dependency. Polling every 60s is sufficient for 2 users. |
| @octokit/rest | gh CLI (execSync) | gh CLI is already used for repo creation. But Octokit provides typed API, pagination, webhooks, and works without CLI install. Use Octokit for new features, keep gh CLI for existing repo creation. |
| Custom AI search | Vector DB (pgvector, Pinecone) | Vector search adds database complexity. For the current scale (2 users, ~100s of events), LLM tool-calling over the existing JSONL store is simpler and sufficient. Revisit if data volume exceeds 10k events. |

**Installation:**
```bash
cd /Users/developer/eluma/server
npm install googleapis google-auth-library @octokit/rest @octokit/webhooks mailparser
npm install -D @types/mailparser
```

Note: `ai`, `nodemailer`, `zod`, and their types are already installed.

## Architecture Patterns

### Recommended Project Structure

New files for Phase 8 follow existing patterns:

```
server/src/
  integrations/           # NEW: Integration adapters
    google/
      auth.ts             # Google OAuth2 client setup + token storage
      gmail.ts            # Gmail polling, message fetch, history tracking
      calendar.ts         # Calendar event listing, watch/sync
    github/
      client.ts           # Octokit client setup with auth
      webhooks.ts         # Webhook verification + event routing
      fork.ts             # Fork workflow + code analysis
    email/
      parser.ts           # Email parsing (mailparser wrapper)
      router.ts           # AI-powered email-to-project routing
      drafter.ts          # AI email draft generation
  search/                 # NEW: AI-powered search
    engine.ts             # Tool-calling search engine
    tools.ts              # Search tool definitions (projects, decisions, events)
  events/reducers/
    integration.ts        # NEW: Integration state reducer (connected accounts, sync state)
  routes/
    integrations.ts       # NEW: Integration management API routes
    search.ts             # NEW: AI search API route
shared/types/
  integration.ts          # NEW: Integration types (GoogleAuth, GitHubLink, EmailDraft, etc.)
client/src/
  hooks/
    useIntegrations.ts    # NEW: Integration management hook
    useSearch.ts          # NEW: AI search hook
  pages/
    Integrations.tsx      # NEW: Integration settings/management page
  components/
    SearchBar.tsx          # NEW: AI-powered search bar component
    EmailDraftReview.tsx   # NEW: Email draft review/confirm/send component
    GitHubFork.tsx         # NEW: GitHub URL input + fork flow component
    CalendarWidget.tsx     # NEW: Calendar meeting list for project detail
```

### Pattern 1: Integration Adapter with Polling

**What:** Each Google API integration uses a polling adapter that stores the last sync checkpoint (historyId for Gmail, syncToken for Calendar) in the JSONL event store, polls periodically, and emits domain events for new data.

**When to use:** For Gmail and Calendar where push notifications require Google Cloud Pub/Sub infrastructure.

**Example:**
```typescript
// server/src/integrations/google/gmail.ts
import { google } from "googleapis";
import { getOAuth2Client } from "./auth.js";
import { appendEvent, readEvents } from "../../events/store.js";

interface GmailSyncState {
  historyId: string;
  lastPollAt: string;
}

/**
 * Poll Gmail for new messages since last known historyId.
 * Emits integration.email_received events for each new message.
 */
export async function pollGmailInbox(userId: string): Promise<void> {
  const oauth2 = await getOAuth2Client(userId);
  const gmail = google.gmail({ version: "v1", auth: oauth2 });

  // Get last known historyId from integration events
  const syncState = await getGmailSyncState(userId);

  if (!syncState.historyId) {
    // First poll: get current historyId, list recent messages
    const profile = await gmail.users.getProfile({ userId: "me" });
    const newHistoryId = profile.data.historyId!;
    // Store initial historyId
    appendEvent({
      type: "integration.gmail_synced",
      aggregateType: "integration",
      aggregateId: userId,
      userId,
      correlationId: randomUUID(),
      version: 1,
      data: { historyId: newHistoryId },
    });
    return;
  }

  // Poll for changes since last historyId
  const history = await gmail.users.history.list({
    userId: "me",
    startHistoryId: syncState.historyId,
    labelIds: ["INBOX"],
    historyTypes: ["messageAdded"],
  });

  if (history.data.history) {
    for (const record of history.data.history) {
      for (const msg of record.messagesAdded || []) {
        // Fetch full message
        const fullMsg = await gmail.users.messages.get({
          userId: "me",
          id: msg.message!.id!,
          format: "full",
        });
        // Emit event for processing
        appendEvent({
          type: "integration.email_received",
          aggregateType: "integration",
          aggregateId: userId,
          userId,
          correlationId: randomUUID(),
          version: 1,
          data: {
            messageId: msg.message!.id!,
            threadId: msg.message!.threadId!,
            headers: extractHeaders(fullMsg.data),
            snippet: fullMsg.data.snippet,
          },
        });
      }
    }
  }

  // Update historyId checkpoint
  const newHistoryId = history.data.historyId || syncState.historyId;
  appendEvent({
    type: "integration.gmail_synced",
    aggregateType: "integration",
    aggregateId: userId,
    userId,
    correlationId: randomUUID(),
    version: 1,
    data: { historyId: newHistoryId },
  });
}
```

### Pattern 2: AI Email Routing (Reuses Voice Routing Pattern)

**What:** When an email arrives, use the existing `generateAiResponse` with a new task type to classify which project the email belongs to. This directly mirrors the `analyzeVoiceRouting` pattern from `server/src/voice/router-analysis.ts`.

**When to use:** For INTG-01 (email-to-project routing).

**Example:**
```typescript
// server/src/integrations/email/router.ts
import { generateAiResponse } from "../../ai/generate.js";
import { getAllProjects } from "../../events/reducers/project.js";

export async function analyzeEmailRouting(
  subject: string,
  body: string,
  sender: string,
  teamId: string,
  language: "de" | "en"
): Promise<RoutingSuggestion[]> {
  const allProjects = await getAllProjects();
  const teamProjects = allProjects.filter(p => p.teamId === teamId && !p.archived);
  const projectSummary = teamProjects.map(p =>
    `- ${p.id}: ${p.name} - ${p.description?.slice(0, 100)}`
  ).join("\n");

  const result = await generateAiResponse({
    taskType: "email_routing",  // NEW task type
    projectId: teamId,
    language,
    systemPrompt: `You are an email router. Given an email and existing projects, determine which project this email relates to. Respond ONLY with JSON array.
[{"type": "existing_project"|"unmatched", "projectId": "uuid or omitted", "projectName": "...", "confidence": 0-100, "reasoning": "..."}]`,
    userPrompt: `Existing projects:\n${projectSummary}\n\nEmail from: ${sender}\nSubject: ${subject}\nBody:\n${body.slice(0, 2000)}`,
  });

  return JSON.parse(result.text);
}
```

### Pattern 3: AI Search via Tool-Calling

**What:** AI search translates natural-language queries into structured event store queries using the AI SDK's tool-calling feature. Define search tools (search_projects, search_decisions, search_events) with Zod schemas. The LLM decides which tools to call, the tools execute queries against the JSONL event store, and the LLM synthesizes results into a human-readable answer.

**When to use:** For SRCH-01 (AI-steered navigation).

**Example:**
```typescript
// server/src/search/engine.ts
import { generateText, tool } from "ai";
import { z } from "zod";
import { aiRegistry } from "../ai/providers.js";
import { readAllEvents } from "../events/store.js";
import { getAllProjects } from "../events/reducers/project.js";

const searchTools = {
  search_projects: tool({
    description: "Search projects by name, status, phase, or member",
    inputSchema: z.object({
      query: z.string().describe("Search term for project name or description"),
      phase: z.string().optional().describe("Filter by lifecycle phase"),
      archived: z.boolean().optional().describe("Include archived projects"),
    }),
    execute: async ({ query, phase, archived }) => {
      const projects = await getAllProjects();
      return projects.filter(p => {
        const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase())
          || p.description.toLowerCase().includes(query.toLowerCase());
        const matchesPhase = !phase || p.currentPhase === phase;
        const matchesArchived = archived !== undefined ? p.archived === archived : !p.archived;
        return matchesQuery && matchesPhase && matchesArchived;
      });
    },
  }),

  search_events: tool({
    description: "Search domain events by type, aggregate, or date range",
    inputSchema: z.object({
      eventType: z.string().optional().describe("Event type filter"),
      aggregateType: z.string().optional().describe("Aggregate type filter"),
      since: z.string().optional().describe("ISO date string for events after this date"),
      limit: z.number().optional().describe("Max results"),
    }),
    execute: async ({ eventType, aggregateType, since, limit }) => {
      const events = await readAllEvents({
        type: eventType,
        aggregateType,
        since,
        limit: limit || 20,
      });
      return events;
    },
  }),

  search_decisions: tool({
    description: "Find decisions, phase transitions, and key milestones for a project",
    inputSchema: z.object({
      projectId: z.string().optional().describe("Project ID to search within"),
      projectName: z.string().optional().describe("Project name to search by"),
    }),
    execute: async ({ projectId, projectName }) => {
      // Find by name if no ID
      if (!projectId && projectName) {
        const projects = await getAllProjects();
        const match = projects.find(p =>
          p.name.toLowerCase().includes(projectName.toLowerCase())
        );
        projectId = match?.id;
      }
      if (!projectId) return [];
      const events = await readAllEvents({
        aggregateType: "project",
        aggregateId: projectId,
      });
      return events.filter(e =>
        ["project.phase_completed", "project.phase_advanced",
         "project.roi_kpi_added", "project.updated"].includes(e.type)
      );
    },
  }),
};

export async function aiSearch(
  query: string,
  teamId: string,
  language: "de" | "en"
): Promise<{ answer: string; sources: string[] }> {
  const model = aiRegistry.languageModel("anthropic:balanced");

  const result = await generateText({
    model,
    tools: searchTools,
    stopWhen: stepCountIs(5),
    system: `You are a search assistant for a project management platform. Answer the user's question by searching available data using the provided tools. Be concise and factual. ${language === "de" ? "Antworte auf Deutsch." : "Respond in English."}`,
    prompt: query,
  });

  return {
    answer: result.text,
    sources: result.steps
      .flatMap(s => s.toolCalls)
      .map(tc => `${tc.toolName}(${JSON.stringify(tc.args)})`),
  };
}
```

### Pattern 4: Email Draft Review Flow

**What:** AI generates email drafts, stores them as pending events. Users review in the UI, confirm or edit, then the system sends via nodemailer. This is a two-step flow: AI generates (fire-and-forget) -> User confirms (explicit action).

**When to use:** For INTG-05 (AI email drafts).

**Example:**
```typescript
// Draft lifecycle:
// 1. AI generates draft -> appendEvent("integration.email_draft_created", ...)
// 2. User reviews in UI -> GET /api/integrations/email/drafts
// 3. User confirms -> POST /api/integrations/email/drafts/:id/send
// 4. System sends via nodemailer -> appendEvent("integration.email_sent", ...)
```

### Anti-Patterns to Avoid

- **Storing OAuth tokens in JSONL events:** OAuth tokens are credentials, not domain events. Store them in a separate encrypted file in DATA_DIR, not in the event store. Event store should only contain the fact that an account was connected (integration.google_connected), not the tokens.
- **Synchronous API calls in route handlers:** Google and GitHub API calls can be slow (2-5s). Never await them in the request path. Use the fire-and-forget pattern for polling triggers, and background processing for email analysis.
- **Re-implementing email parsing:** Use mailparser for MIME parsing. Email format is deceptively complex (multipart, encoding, attachments, HTML entities). Do not hand-roll a parser.
- **Real-time polling at high frequency:** For 2 users, polling Gmail/Calendar every 60 seconds is sufficient. Do not poll more frequently than every 30 seconds to avoid rate limiting.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email MIME parsing | Custom regex/string parsing for email bodies | `mailparser` v3.9.3 | Email format has multipart boundaries, base64 encoding, quoted-printable, nested MIME types, charsets. Thousands of edge cases. |
| OAuth2 token refresh | Manual token refresh logic with expiry tracking | `google-auth-library` OAuth2Client | Handles token refresh, retry, expiry detection, credential storage automatically. |
| GitHub API pagination | Manual next/prev link following | `@octokit/rest` built-in pagination | Octokit handles Link header parsing, auto-pagination via `.paginate()` method. |
| Webhook signature verification | Custom HMAC verification for GitHub webhooks | `@octokit/webhooks` | Handles timing-safe comparison, multiple signature algorithms, event routing. |
| Natural-language query parsing | Custom NLP/regex to extract project names and filters | AI SDK tool-calling | LLM with tools handles ambiguity, synonyms, partial matches, multiple languages. |

**Key insight:** Integration code is 80% boilerplate (auth, pagination, parsing, error handling) and 20% business logic. Libraries handle the 80% correctly; hand-rolling leads to subtle bugs (token expiry, rate limits, MIME edge cases).

## Common Pitfalls

### Pitfall 1: Gmail API Quota Exhaustion
**What goes wrong:** Gmail API has a per-user quota of 250 quota units per user per second and a daily limit. Polling too frequently or fetching full messages unnecessarily burns through quota fast.
**Why it happens:** Developers poll every 5 seconds or fetch full message bodies when only headers are needed.
**How to avoid:** Poll every 60 seconds. Use `format: "metadata"` for initial listing, only fetch `format: "full"` when needed for AI analysis. Track historyId to only fetch new messages.
**Warning signs:** HTTP 429 responses, "quota exceeded" errors in logs.

### Pitfall 2: OAuth2 Token Storage Security
**What goes wrong:** OAuth refresh tokens stored in plain text in the event store, accessible to anyone with filesystem access.
**Why it happens:** Treating tokens like any other data in the event-sourced system.
**How to avoid:** Store tokens in a separate file (`DATA_DIR/credentials/google-tokens.json`) outside the event store. The event store records only the connection event (user connected Google account), not the tokens. Use filesystem permissions to restrict access.
**Warning signs:** Tokens appearing in event log files, tokens visible in API responses.

### Pitfall 3: GitHub Webhook Secret Not Configured
**What goes wrong:** Webhook events are accepted without signature verification, allowing spoofed events.
**Why it happens:** Forgetting to set the webhook secret in both GitHub settings and the app config.
**How to avoid:** `@octokit/webhooks` requires a secret. Generate a random secret, store in `.env`, configure in GitHub webhook settings. Refuse to process webhooks without valid signature.
**Warning signs:** Webhook processing works in dev without setting GITHUB_WEBHOOK_SECRET env var.

### Pitfall 4: AI Search Returns Hallucinated Data
**What goes wrong:** The LLM invents project names, decisions, or dates that don't exist in the system.
**Why it happens:** The LLM generates answers from its training data rather than from tool results.
**How to avoid:** Use strict tool-calling with `toolChoice: "required"` for the first step. Validate that the answer references only data returned by tools. Include a system prompt instruction: "Only report information returned by the tools. Never invent data."
**Warning signs:** Search results mention projects or dates that don't exist in the event store.

### Pitfall 5: Google Calendar Watch Channel Expiration
**What goes wrong:** Calendar sync stops after the watch channel expires (max 30 days).
**Why it happens:** No renewal logic for the watch channel.
**How to avoid:** For the polling approach, this is not an issue. If using watch channels in the future, store expiration timestamp and renew proactively before expiry (similar to Gmail's 7-day watch renewal).
**Warning signs:** Calendar events stop appearing in the app after ~30 days.

### Pitfall 6: Fork Operation Timeout
**What goes wrong:** GitHub fork operation takes 10-30 seconds for large repos, causing request timeout.
**Why it happens:** Fork is an async operation on GitHub's side. The API returns immediately with a partial repo object, but the fork may not be ready for cloning/analysis.
**How to avoid:** Return the fork response immediately to the client. Poll the forked repo status (repos.get) until the fork is complete. Then trigger AI code analysis as a background job.
**Warning signs:** 404 errors when trying to access forked repo immediately after creation.

## Code Examples

### Google OAuth2 Client Setup
```typescript
// server/src/integrations/google/auth.ts
import { google } from "googleapis";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || "./data";
const CREDENTIALS_DIR = path.join(DATA_DIR, "credentials");
const TOKENS_FILE = path.join(CREDENTIALS_DIR, "google-tokens.json");

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar.readonly",
];

/**
 * Create an OAuth2 client with stored tokens.
 * Returns null if no tokens are stored (user needs to authenticate).
 */
export function getOAuth2Client(): ReturnType<typeof google.auth.OAuth2> | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/integrations/google/callback";

  if (!clientId || !clientSecret) {
    console.warn("[google/auth] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set");
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  // Load stored tokens
  if (existsSync(TOKENS_FILE)) {
    const tokens = JSON.parse(readFileSync(TOKENS_FILE, "utf-8"));
    oauth2Client.setCredentials(tokens);

    // Auto-refresh: google-auth-library handles this automatically
    // when the access token expires, it uses the refresh token
    oauth2Client.on("tokens", (newTokens) => {
      // Persist refreshed tokens
      const existing = JSON.parse(readFileSync(TOKENS_FILE, "utf-8"));
      const merged = { ...existing, ...newTokens };
      writeFileSync(TOKENS_FILE, JSON.stringify(merged, null, 2));
    });
  } else {
    return null; // No tokens yet -- user needs to go through OAuth flow
  }

  return oauth2Client;
}

/**
 * Generate the Google OAuth2 authorization URL.
 */
export function getAuthUrl(): string {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/integrations/google/callback"
  );

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent", // Force consent screen to get refresh token
  });
}

/**
 * Exchange authorization code for tokens and persist them.
 */
export async function exchangeCode(code: string): Promise<void> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/integrations/google/callback"
  );

  const { tokens } = await oauth2Client.getToken(code);
  mkdirSync(CREDENTIALS_DIR, { recursive: true });
  writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}
```

### Octokit Client with GitHub Token
```typescript
// server/src/integrations/github/client.ts
import { Octokit } from "@octokit/rest";

let _octokit: Octokit | null = null;

/**
 * Get or create the Octokit client.
 * Uses GITHUB_TOKEN env var for authentication.
 * Falls back to unauthenticated (limited rate: 60 req/hour).
 */
export function getOctokit(): Octokit {
  if (!_octokit) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      console.warn("[github/client] GITHUB_TOKEN not set. Rate limited to 60 req/hour.");
    }
    _octokit = new Octokit({ auth: token || undefined });
  }
  return _octokit;
}

/**
 * Fork a repository and return the fork URL.
 * GitHub forks are async -- the returned repo may not be immediately ready.
 */
export async function forkRepository(
  owner: string,
  repo: string
): Promise<{ forkUrl: string; fullName: string }> {
  const octokit = getOctokit();
  const response = await octokit.rest.repos.createFork({ owner, repo });
  return {
    forkUrl: response.data.html_url,
    fullName: response.data.full_name,
  };
}

/**
 * List recent commits for a repository.
 */
export async function listCommits(
  owner: string,
  repo: string,
  options?: { sha?: string; since?: string; per_page?: number }
): Promise<Array<{ sha: string; message: string; author: string; date: string }>> {
  const octokit = getOctokit();
  const { data } = await octokit.rest.repos.listCommits({
    owner,
    repo,
    sha: options?.sha,
    since: options?.since,
    per_page: options?.per_page || 20,
  });
  return data.map(c => ({
    sha: c.sha,
    message: c.commit.message,
    author: c.commit.author?.name || "unknown",
    date: c.commit.author?.date || "",
  }));
}

/**
 * List pull requests for a repository.
 */
export async function listPullRequests(
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "open"
): Promise<Array<{ number: number; title: string; state: string; url: string }>> {
  const octokit = getOctokit();
  const { data } = await octokit.rest.pulls.list({ owner, repo, state });
  return data.map(pr => ({
    number: pr.number,
    title: pr.title,
    state: pr.state,
    url: pr.html_url,
  }));
}
```

### AI SDK Tool-Calling for Search
```typescript
// server/src/search/tools.ts
import { tool } from "ai";
import { z } from "zod";

export const searchProjects = tool({
  description: "Search for projects by name, description, phase, or archived status",
  inputSchema: z.object({
    nameContains: z.string().optional().describe("Substring match on project name"),
    phase: z.string().optional().describe("Filter by current lifecycle phase"),
    includeArchived: z.boolean().optional().default(false),
  }),
  execute: async ({ nameContains, phase, includeArchived }) => {
    // Implementation queries event store via reducer
    const { getAllProjects } = await import("../events/reducers/project.js");
    const projects = await getAllProjects();
    return projects
      .filter(p => {
        if (!includeArchived && p.archived) return false;
        if (nameContains && !p.name.toLowerCase().includes(nameContains.toLowerCase())) return false;
        if (phase && p.currentPhase !== phase) return false;
        return true;
      })
      .map(p => ({
        id: p.id, name: p.name, phase: p.currentPhase,
        description: p.description, archived: p.archived,
      }));
  },
});
```

### New Event Types

The following event types will be added to `shared/types/events.ts`:

```typescript
// Integration events
| "integration.google_connected"
| "integration.google_disconnected"
| "integration.gmail_synced"
| "integration.email_received"
| "integration.email_routed"
| "integration.email_draft_created"
| "integration.email_draft_updated"
| "integration.email_sent"
| "integration.calendar_synced"
| "integration.calendar_event_linked"
| "integration.github_connected"
| "integration.github_webhook_received"
| "integration.github_commit_linked"
| "integration.github_pr_linked"
| "integration.github_fork_created"
| "integration.github_code_analyzed"
// Search events
| "search.query_executed"
```

### New AI Task Types

Add to `TASK_MODEL_MAP` in `server/src/ai/providers.ts`:

```typescript
email_routing: "anthropic:fast",       // Quick classification
email_drafting: "anthropic:balanced",   // Draft generation
code_analysis: "anthropic:balanced",    // GitHub code analysis
search: "anthropic:balanced",          // Natural-language search
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Gmail IMAP polling | Gmail API + history.list polling | 2024+ | More reliable, no IMAP connection management, but requires OAuth2 |
| Custom NLP for search | LLM tool-calling | 2025+ | Eliminates need for custom query parser, handles ambiguity naturally |
| Direct API calls per provider | AI SDK unified tool interface | AI SDK v6 (2025) | `tool()` + `generateText` replaces custom tool-calling implementations |
| GitHub CLI (gh) for all operations | Octokit REST for API, gh for local operations | Ongoing | Octokit provides typed API, pagination, webhooks; gh CLI better for local git operations |

**Deprecated/outdated:**
- Gmail API basic auth (password): Deprecated by Google. OAuth2 is the only supported auth method.
- `node-imap` for Gmail: Unreliable with OAuth2, no longer maintained. Use `googleapis` instead.
- `gpt-3.5-turbo` for function calling: Older model. Use `anthropic:fast` (claude-haiku-4-5) or `openai:fast` (gpt-4o-mini) via the existing provider registry.

## Open Questions

1. **Gmail API: Cloud Pub/Sub vs Polling**
   - What we know: Push notifications require Google Cloud Pub/Sub topic. Polling via history.list works without cloud dependency.
   - What's unclear: Whether the 2-user scale will be satisfied with 60-second polling latency for email routing.
   - Recommendation: Start with polling. The self-hosted constraint makes Pub/Sub infrastructure a poor fit. If latency becomes an issue, consider adding Pub/Sub later.

2. **Google Calendar: Depth of Integration**
   - What we know: Requirement says "meetings linked to projects, post-meeting prompts." This needs: list events, match to projects, detect when a meeting ends, prompt user.
   - What's unclear: How to detect "post-meeting" timing without push notifications. Polling frequency for calendar events.
   - Recommendation: Poll calendar every 5 minutes. When a meeting's end time passes, generate a "post-meeting prompt" notification. Link meetings to projects by AI-matching the meeting title/description to project names.

3. **GitHub Fork + AI Code Analysis: Scope**
   - What we know: INTG-04 requires fork, AI code analysis, entry into idea pool.
   - What's unclear: How deep should code analysis go? Full repo scan or README + structure only? Token limits for large codebases.
   - Recommendation: Analyze README + file tree + first 100 lines of key files (package.json, main entry). Cap AI input at 8000 tokens. Store analysis as idea rawInput.

4. **AI Search: Which Data to Index**
   - What we know: Search must cover "all open decisions in Project X" type queries.
   - What's unclear: Whether search should also cover Soul Documents, Idea Pool, and integration data beyond project events.
   - Recommendation: Start with projects, events, and decisions. Expand to Soul Documents and ideas in a follow-up if needed. Keep search tools focused and composable.

5. **Email Sending: Gmail API vs SMTP**
   - What we know: Nodemailer is already installed. Gmail SMTP has 100-150/day limit. Gmail API send has 100/day per-user limit for free accounts.
   - What's unclear: Whether Gmail API send (users.messages.send) or nodemailer SMTP is more appropriate.
   - Recommendation: Use Gmail API `users.messages.send` since we already have OAuth2 tokens from the inbox integration. Avoids needing separate SMTP credentials. For a 2-user internal tool, the 100/day limit is not a concern.

## Sources

### Primary (HIGH confidence)
- googleapis npm v171.4.0 -- verified via `npm view googleapis version`
- @octokit/rest npm v22.0.1 -- verified via `npm view @octokit/rest version`
- @octokit/webhooks npm v14.2.0 -- verified via `npm view @octokit/webhooks version`
- AI SDK docs (ai-sdk.dev) -- tool-calling with `tool()`, `generateText`, `stopWhen`
- Existing codebase: server/src/ai/generate.ts, server/src/ai/providers.ts, server/src/voice/router-analysis.ts, server/src/notifications/emitter.ts

### Secondary (MEDIUM confidence)
- [Gmail API Push Notifications](https://developers.google.com/gmail/api/guides/push) -- Cloud Pub/Sub requirement confirmed
- [Google Calendar Push Notifications](https://developers.google.com/workspace/calendar/api/guides/push) -- Watch channel mechanics
- [Nodemailer Gmail OAuth2](https://nodemailer.com/smtp/oauth2) -- Gmail SMTP + OAuth2 configuration
- [Octokit REST v22 docs](https://octokit.github.io/rest.js/v18/) -- repos.createFork, repos.listCommits, pulls.list methods
- [AI SDK Tool Calling docs](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling) -- tool() function, multi-step execution

### Tertiary (LOW confidence)
- Gmail API daily quota limits (100-150 sends/day for free accounts) -- from multiple blog sources, needs verification against current Google documentation
- Google Calendar watch channel max expiration (30 days) -- from community sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All library versions verified via npm, existing codebase patterns well-understood
- Architecture: MEDIUM-HIGH - Patterns follow existing codebase conventions (reducers, fire-and-forget, AI generate wrapper). Gmail polling approach is well-documented but untested in this specific codebase.
- Pitfalls: MEDIUM - Based on official documentation and community experience. Gmail Pub/Sub avoidance strategy is a deliberate trade-off documented honestly.
- AI Search: MEDIUM - Tool-calling approach is well-documented in AI SDK but the specific implementation for event store search is novel. May need iteration.

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days -- Google APIs and Octokit are stable, AI SDK tool-calling API is established)
