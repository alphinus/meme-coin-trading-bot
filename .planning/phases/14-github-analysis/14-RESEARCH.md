# Phase 14: GitHub Analysis - Research

**Researched:** 2026-02-10
**Domain:** Read-only GitHub repository analysis with AI-powered idea generation
**Confidence:** HIGH

## Summary

Phase 14 adds a read-only GitHub repository analysis feature to both the web UI and Telegram bot. When a user pastes a GitHub URL, the system fetches the repository's README, language breakdown, and file tree via the existing Octokit integration, then uses the existing `generateAiResponse` wrapper (AI SDK `code_analysis` task type) to produce a summary and automatically create an idea in the Idea Pool.

This phase is architecturally simple because nearly all infrastructure already exists: the Octokit singleton client (`server/src/integrations/github/client.ts`), the `parseGitHubUrl` function (`server/src/integrations/github/api.ts`), the `generateAiResponse` wrapper (`server/src/ai/generate.ts`), the `code_analysis` task type with its model mapping and token limits, the idea creation event pattern (`idea.created` + `idea.transcription_added`), and the Telegram text handler (`server/src/telegram/handlers/text.ts`). The existing `forkAndAnalyze` function in `server/src/integrations/github/fork.ts` already implements most of this logic -- but it forks first (a write operation), which Phase 14 must NOT do. Phase 14 extracts and refactors the read-only portion.

**Primary recommendation:** Create a new `analyzeRepo` function in `server/src/integrations/github/analyzer.ts` that reuses `fetchCodeContext` logic from `fork.ts` (README + file tree + package.json) plus adds `octokit.repos.listLanguages` and `octokit.repos.get` (for description/stars/default branch). Wire it to a new `GET /api/github/analyze/:owner/:repo` route, a new `POST /api/github/analyze` route (accepts URL string, parses, analyzes, creates idea), a new client component `RepoAnalysis.tsx`, and a GitHub URL detection handler in the Telegram text message flow.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@octokit/rest` | ^22.0.1 | GitHub API read-only repo analysis | **ALREADY INSTALLED.** Singleton client in `server/src/integrations/github/client.ts`. No new dependency. |
| `ai` (AI SDK) | ^6.0.77 | AI text generation for analysis summaries | **ALREADY INSTALLED.** Used via `generateAiResponse` wrapper with `code_analysis` task type. |
| `zod` | (already installed) | Input validation for routes | **ALREADY INSTALLED.** Used in all existing route handlers. |
| `grammy` | (already installed) | Telegram bot for GitHub URL detection | **ALREADY INSTALLED.** Text handler in `server/src/telegram/handlers/text.ts`. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | -- | -- | No new libraries required for Phase 14 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `octokit.repos.getContent` for README | `octokit.repos.getReadme` | `getReadme` is a convenience wrapper but returns base64-encoded; `getContent` with path "README.md" does the same. The existing `fork.ts` uses `getContent` and it works. Stick with `getContent` for consistency. |
| `octokit.repos.listLanguages` | Parse file extensions from tree | `listLanguages` returns byte counts per language directly from GitHub's Linguist analysis -- far more accurate than guessing from extensions. Use the API. |
| Parallel Octokit calls | Sequential calls | Parallel (`Promise.all`) is 2-3x faster for 4 independent API calls. Use parallel. |
| New event type `integration.github_repo_analyzed` | Reuse `integration.github_code_analyzed` | The existing event type works but its name implies fork-based analysis. Recommend adding a new `integration.github_repo_analyzed` event type for clarity, since this is a distinct read-only flow without forking. |

**Installation:**
```bash
# No new packages required
```

## Architecture Patterns

### Recommended Project Structure

```
server/src/
  integrations/
    github/
      analyzer.ts            # NEW: Read-only repo analysis (getReadme, getLanguages, getFileTree, analyzeRepo)
      client.ts              # EXISTING: Octokit singleton
      api.ts                 # EXISTING: parseGitHubUrl, verifyRepoAccess (reuse directly)
      fork.ts                # EXISTING: Fork-based analysis (NOT modified)
  routes/
    github.ts                # MODIFIED: Add analyze routes (GET + POST)
client/src/
  components/
    RepoAnalysis.tsx          # NEW: Display analysis results (README summary, tech stack, file tree)
    GitHubAnalyze.tsx         # NEW: URL input + analysis trigger (similar to GitHubFork.tsx but no fork)
  hooks/
    useIntegrations.ts        # MODIFIED: Add analyzeRepo method
server/src/
  telegram/
    handlers/
      text.ts                # MODIFIED: Detect GitHub URLs, trigger analysis
  i18n/
    locales/
      de.json                # MODIFIED: Add GitHub analysis translation keys
      en.json                # MODIFIED: Add GitHub analysis translation keys
  telegram/
    locales/
      de.ftl                 # MODIFIED: Add Telegram GitHub analysis strings
      en.ftl                 # MODIFIED: Add Telegram GitHub analysis strings
shared/types/
  events.ts                  # MODIFIED: Add "integration.github_repo_analyzed" event type
  integration.ts             # MODIFIED: Add GitHubAnalysisResult type
```

### Pattern 1: Read-Only Repo Analyzer (Extract from fork.ts)

**What:** A standalone function that fetches repository metadata, README, languages, and file tree via Octokit -- without forking. Then passes the gathered context to `generateAiResponse` for AI analysis and creates an idea in the pool.

**When to use:** GH-01 (web UI analysis), GH-03 (Telegram analysis).

**Source:** Adapted from existing `fetchCodeContext` in `server/src/integrations/github/fork.ts` lines 106-174.

```typescript
// server/src/integrations/github/analyzer.ts
import { getOctokit } from "./client.js";
import { generateAiResponse } from "../../ai/generate.js";
import { appendEvent } from "../../events/store.js";
import { randomUUID } from "crypto";

const MAX_AI_INPUT_CHARS = 8000;
const MAX_FILE_TREE_ENTRIES = 50;

export interface RepoAnalysis {
  owner: string;
  repo: string;
  description: string;
  stars: number;
  defaultBranch: string;
  readme: string;
  languages: Record<string, number>;
  fileTree: string[];
  aiSummary: string;
  technologies: string[];
  useCases: string[];
  ideaId: string;
}

/**
 * Fetch repository metadata, README, languages, and file tree.
 * All calls are read-only (no fork, no write operations).
 * Runs Octokit calls in parallel for speed.
 */
export async function fetchRepoData(owner: string, repo: string) {
  const octokit = getOctokit();

  // Parallel fetch: metadata, README, languages, file tree
  const [metaResult, readmeResult, langResult, treeResult] = await Promise.allSettled([
    octokit.repos.get({ owner, repo }),
    octokit.repos.getContent({ owner, repo, path: "README.md" }),
    octokit.repos.listLanguages({ owner, repo }),
    octokit.git.getTree({ owner, repo, tree_sha: "HEAD", recursive: "1" }),
  ]);

  // Extract metadata
  const meta = metaResult.status === "fulfilled" ? metaResult.value.data : null;
  const description = meta?.description || "";
  const stars = meta?.stargazers_count || 0;
  const defaultBranch = meta?.default_branch || "main";

  // Extract README
  let readme = "";
  if (readmeResult.status === "fulfilled") {
    const data = readmeResult.value.data;
    if ("content" in data && typeof data.content === "string") {
      readme = Buffer.from(data.content, "base64").toString("utf-8");
    }
  }

  // Extract languages
  const languages: Record<string, number> =
    langResult.status === "fulfilled" ? langResult.value.data : {};

  // Extract file tree
  let fileTree: string[] = [];
  if (treeResult.status === "fulfilled") {
    fileTree = treeResult.value.data.tree
      .filter((item) => item.type === "blob")
      .slice(0, MAX_FILE_TREE_ENTRIES)
      .map((item) => item.path)
      .filter((p): p is string => !!p);
  }

  return { description, stars, defaultBranch, readme, languages, fileTree };
}

/**
 * Full analyze flow: fetch data, AI analyze, create idea.
 * Read-only -- no fork, no write operations against GitHub.
 */
export async function analyzeRepo(
  owner: string,
  repo: string,
  userId: string,
  teamId: string,
  language: "de" | "en"
): Promise<RepoAnalysis> {
  const data = await fetchRepoData(owner, repo);
  const correlationId = randomUUID();

  // Build AI input (capped at MAX_AI_INPUT_CHARS)
  const parts = [];
  if (data.readme) parts.push(`## README\n\n${data.readme}`);
  if (Object.keys(data.languages).length > 0)
    parts.push(`## Languages\n\n${Object.entries(data.languages).map(([k, v]) => `${k}: ${v} bytes`).join("\n")}`);
  if (data.fileTree.length > 0)
    parts.push(`## File Structure\n\n${data.fileTree.join("\n")}`);

  let codeContext = parts.join("\n\n---\n\n");
  if (codeContext.length > MAX_AI_INPUT_CHARS) {
    codeContext = codeContext.substring(0, MAX_AI_INPUT_CHARS) + "\n\n[...truncated]";
  }

  // AI analysis
  const aiResult = await generateAiResponse({
    taskType: "code_analysis",
    projectId: teamId,
    language,
    systemPrompt: `Analyze this GitHub repository (${owner}/${repo}).
Provide:
1) What it does (1-2 sentences)
2) Key technologies used (as array)
3) Potential use cases (as array)
4) A project idea title based on this repo

Respond ONLY with JSON:
{ "summary": "...", "technologies": ["..."], "useCases": ["..."], "ideaTitle": "..." }`,
    userPrompt: codeContext,
  });

  // Parse AI response
  let analysis = { summary: "", technologies: [] as string[], useCases: [] as string[], ideaTitle: "" };
  try {
    const jsonMatch = aiResult.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) analysis = JSON.parse(jsonMatch[0]);
  } catch {
    analysis.summary = aiResult.text;
  }

  // Create idea from analysis
  const ideaId = randomUUID();
  const ideaTitle = analysis.ideaTitle || `Inspired by: ${owner}/${repo}`;

  appendEvent({
    type: "idea.created",
    aggregateType: "idea",
    aggregateId: ideaId,
    userId,
    correlationId,
    version: 1,
    data: {
      title: ideaTitle,
      rawInput: analysis.summary || aiResult.text,
      teamId,
      source: "github_analysis",
      sourceUrl: `https://github.com/${owner}/${repo}`,
      technologies: analysis.technologies || [],
      useCases: analysis.useCases || [],
    },
  });

  // Transition to refining (same pattern as text ideas)
  appendEvent({
    type: "idea.transcription_added",
    aggregateType: "idea",
    aggregateId: ideaId,
    userId,
    correlationId,
    version: 2,
    data: {
      transcription: analysis.summary || aiResult.text,
      title: ideaTitle,
    },
  });

  // Emit analysis event
  appendEvent({
    type: "integration.github_repo_analyzed",
    aggregateType: "integration",
    aggregateId: `github:${owner}/${repo}`,
    userId,
    correlationId,
    version: 1,
    data: {
      owner,
      repo,
      analysisResult: analysis,
      ideaId,
      readOnly: true,
    },
  });

  return {
    owner,
    repo,
    description: data.description,
    stars: data.stars,
    defaultBranch: data.defaultBranch,
    readme: data.readme,
    languages: data.languages,
    fileTree: data.fileTree,
    aiSummary: analysis.summary || aiResult.text,
    technologies: analysis.technologies || [],
    useCases: analysis.useCases || [],
    ideaId,
  };
}
```

### Pattern 2: Synchronous Analysis Route (not fire-and-forget)

**What:** Unlike fork-analyze (which returns 202 immediately because forking is slow), read-only analysis can return results synchronously because the four Octokit calls + one AI call complete in 2-5 seconds total. The route waits for the result and returns the full analysis.

**When to use:** GH-01 (web UI), GH-03 (Telegram).

**Why different from fork-analyze:** Fork-analyze returns 202 because `createFork` can take 10-30 seconds plus polling. Read-only analysis has no fork step -- just 4 parallel Octokit reads + 1 AI call. Total latency is typically 2-5 seconds, acceptable for a synchronous response.

```typescript
// In routes/github.ts -- new analyze route
router.post("/analyze", validate(analyzeUrlSchema), async (req, res) => {
  const user = req.user!;
  const { url, teamId, language } = req.body;

  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    res.status(400).json({ success: false, error: "Invalid GitHub URL" });
    return;
  }

  try {
    const result = await analyzeRepo(parsed.owner, parsed.repo, user.id, teamId, language);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: "Analysis failed" });
  }
});
```

### Pattern 3: Telegram GitHub URL Detection

**What:** Modify the existing `handleTextMessage` in `server/src/telegram/handlers/text.ts` to detect GitHub URLs in free text messages. When a GitHub URL is detected (and no workflow input is pending), automatically trigger analysis and reply with formatted results.

**When to use:** GH-03 (Telegram analysis).

**Source:** Follows the same URL detection pattern as `parseGitHubUrl` in `server/src/integrations/github/api.ts`.

```typescript
// In handlers/text.ts -- BEFORE the "no pending input" help message
const GITHUB_URL_REGEX = /https?:\/\/github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)/;

// In handleTextMessage, after pending check:
const text = ctx.message?.text || "";
const githubMatch = text.match(GITHUB_URL_REGEX);
if (githubMatch) {
  const user = await resolveElumaUser(ctx.from?.id ?? 0);
  if (!user) { await ctx.reply(ctx.t("handler-not-linked")); return; }

  const team = await getTeamForUser(user.id);
  if (!team) { await ctx.reply(ctx.t("error-no-team")); return; }

  await ctx.reply(ctx.t("github-analyzing"));
  try {
    const result = await analyzeRepo(githubMatch[1], githubMatch[2], user.id, team.id, language);
    await ctx.reply(formatGitHubAnalysis(result, ctx.t), { parse_mode: "MarkdownV2" });
  } catch {
    await ctx.reply(ctx.t("github-analysis-failed"));
  }
  return;
}
```

### Pattern 4: Client-Side Analysis Component

**What:** A React component similar to `GitHubFork.tsx` but for read-only analysis. Takes a URL input, calls the analyze endpoint, displays results inline (README summary, tech stack chips, file tree collapsible). Shows the created idea with a link to the Idea Pool.

**When to use:** GH-01 (web UI analysis).

**Key differences from GitHubFork.tsx:**
- No "forking" status -- goes directly to "analyzing" -> "complete"
- Displays analysis results inline (not just a link to the Idea Pool)
- Shows README summary, language badges, and AI-generated idea title
- Synchronous response (no polling required)

### Anti-Patterns to Avoid

- **Forking before analysis (GH-04 violation):** The existing `forkAndAnalyze` forks repos. Phase 14 MUST NOT fork. Use `repos.get`, `repos.getContent`, `repos.listLanguages`, and `git.getTree` only -- these are all read-only.

- **Using `getTree` with wrong `tree_sha`:** The existing `fork.ts` uses `tree_sha: "HEAD"` which works for the default branch. This is correct for Phase 14 as well. Do NOT try to resolve a specific commit SHA first -- "HEAD" is sufficient and saves an API call.

- **Blocking on large READMEs:** Some READMEs are 50KB+. The `MAX_AI_INPUT_CHARS = 8000` cap from `fork.ts` should be applied here too. Truncate the AI input, not the displayed README.

- **Creating two separate routes for data fetch and idea creation:** The analysis and idea creation should happen in one atomic operation. If the user sees analysis results but the idea was not created, that violates GH-02. One route, one flow.

- **Polling-based client (like fork-analyze):** The existing `GitHubFork.tsx` uses fire-and-forget + setTimeout because fork-analyze returns 202. Phase 14 is synchronous. Do NOT use polling or setTimeout. Just await the API call.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GitHub URL parsing | Custom regex in each handler | `parseGitHubUrl` from `server/src/integrations/github/api.ts` | Already handles HTTPS and SSH formats, strips `.git` suffix. Tested and used throughout codebase. |
| Language detection | Parse file extensions from tree | `octokit.repos.listLanguages({ owner, repo })` | GitHub's Linguist engine is far more accurate. Returns byte counts. One API call vs traversing entire tree. |
| README rendering | Custom markdown parser | Pass raw README to AI for summarization; display raw markdown in client with existing rendering | The summary is what users need. Full README can be linked to GitHub. |
| Idea creation event sequence | Custom idea creation logic | Follow exact pattern from `routes/ideas.ts` POST handler | Must emit both `idea.created` AND `idea.transcription_added` for text-source ideas to transition to "refining" status correctly. |
| Telegram markdown formatting | Raw string concatenation | `escapeMd` from `server/src/telegram/formatters.ts` | MarkdownV2 requires escaping 20+ special characters. The existing helper handles all of them. |

**Key insight:** Phase 14 is almost entirely composition of existing modules. The new code is an `analyzer.ts` service function (50-80 lines), a route handler (20 lines), a client component (100-150 lines), and a Telegram URL detection block (20 lines). No new libraries, no new patterns, no new infrastructure.

## Common Pitfalls

### Pitfall 1: Idea Status Stuck at "capturing"

**What goes wrong:** After `idea.created` is emitted, the idea stays in "capturing" status and never moves to "refining". Users cannot see the AI-generated content in the refinement UI.
**Why it happens:** The idea reducer transitions to "refining" only when `idea.transcription_added` is emitted. If only `idea.created` is emitted, the idea stays at "capturing" and the rawInput is set but `refinedMarkdown` is just the rawInput.
**How to avoid:** Always emit both `idea.created` AND `idea.transcription_added` events for auto-generated ideas, exactly as the text-source idea creation does in `routes/ideas.ts` lines 92-127. The `source` field should be "github_analysis" (or "import" to match existing source enum).
**Warning signs:** Ideas from GitHub analysis show as "capturing" status in the Idea Pool.

### Pitfall 2: Unauthenticated Octokit Rate Limit (60 req/hr)

**What goes wrong:** Analysis fails with 403 after a few uses because the Octokit client is unauthenticated.
**Why it happens:** `GITHUB_TOKEN` not set in `.env`. The client logs a warning but creates an unauthenticated client limited to 60 requests per hour. Phase 14 uses 4 API calls per analysis, so only ~15 analyses per hour are possible.
**How to avoid:** Check `isGitHubConnected()` before analysis and return a clear error if no token. The route should fail early with a 422, not silently degrade. Authenticated rate limit is 5000 req/hr (plenty).
**Warning signs:** 403 errors from GitHub API, `X-RateLimit-Remaining: 0` headers in response.

### Pitfall 3: Private Repo Analysis Fails Silently

**What goes wrong:** User pastes a private repo URL, Octokit returns 404, and the error message says "Repository not found" with no explanation.
**Why it happens:** GitHub returns 404 (not 403) for private repos when the token lacks access. The user thinks the repo does not exist.
**How to avoid:** Call `verifyRepoAccess(owner, repo)` first (already exists in `api.ts`). If it returns null, distinguish between "repo does not exist" and "repo may be private -- check your GITHUB_TOKEN permissions." The existing function already does this.
**Warning signs:** Users reporting "repo not found" for repos that exist.

### Pitfall 4: README Not Found (No README.md)

**What goes wrong:** Repos without a README.md file cause the analysis to have empty summary. The AI receives only the file tree and produces a poor-quality idea.
**Why it happens:** Not all repos have README.md. Some use README, README.rst, or have no README at all.
**How to avoid:** The existing `fetchCodeContext` in `fork.ts` already catches this error and continues. The new `fetchRepoData` should use `Promise.allSettled` (not `Promise.all`) so one failed request does not abort the others. If no README is found, the AI still has languages + file tree + package.json to work with.
**Warning signs:** Ideas generated from repos without READMEs have generic, unhelpful descriptions.

### Pitfall 5: Telegram Analysis Timeout

**What goes wrong:** The Telegram bot takes 5-8 seconds to respond with analysis results, and the user thinks it is broken.
**Why it happens:** Telegram does not show "typing" indicator unless `ctx.api.sendChatAction(chatId, "typing")` is called. The combined Octokit + AI call takes 2-5 seconds.
**How to avoid:** Send a "typing" action immediately via `ctx.api.sendChatAction(ctx.chat!.id, "typing")` before starting analysis. Also send a preliminary "Analyzing repository..." text message so users know the bot is working.
**Warning signs:** Users sending the URL multiple times because they think it was not received.

### Pitfall 6: idea.created source Field Validation

**What goes wrong:** The `createIdeaSchema` in `routes/ideas.ts` validates `source` as `z.enum(["voice", "text", "import"])`. If the analyzer uses `source: "github_analysis"`, the event will be created fine (events bypass route validation), but the idea reducer or UI might not handle the unknown source.
**Why it happens:** The source enum is only validated at the route level, not at the event level. But downstream code may switch on source values.
**How to avoid:** Either add "github_analysis" to the source enum in the idea schema, or use "import" as the source (which semantically matches -- it is an imported idea from an external source). Using "import" is simpler and requires no schema changes. Add `sourceUrl` and `technologies` as extra data fields on the idea event (the event `data` is `Record<string, unknown>` so additional fields are fine).
**Warning signs:** UI components that filter or display by source not showing GitHub-sourced ideas.

## Code Examples

### Octokit Read-Only API Calls (Verified)

All methods below are confirmed available in `@octokit/rest` v22 and are read-only:

```typescript
// 1. Repository metadata (description, stars, default branch)
// Source: Existing usage in server/src/integrations/github/api.ts line 131
const { data } = await octokit.repos.get({ owner, repo });
// data.description, data.stargazers_count, data.default_branch

// 2. README content
// Source: Existing usage in server/src/integrations/github/fork.ts line 115
const { data } = await octokit.repos.getContent({
  owner, repo, path: "README.md"
});
// data.content (base64 encoded), decode with Buffer.from(data.content, "base64").toString("utf-8")

// 3. Language breakdown (byte counts)
// Source: @octokit/rest v22 docs - repos.listLanguages
const { data } = await octokit.repos.listLanguages({ owner, repo });
// Returns: { TypeScript: 45230, JavaScript: 12000, CSS: 3400 }

// 4. Recursive file tree
// Source: Existing usage in server/src/integrations/github/fork.ts line 131
const { data } = await octokit.git.getTree({
  owner, repo, tree_sha: "HEAD", recursive: "1"
});
// data.tree: Array<{ path, type, sha, size }>
// Filter: .filter(item => item.type === "blob") for files only
```

### AI Analysis Prompt (Reuse code_analysis Task Type)

```typescript
// Source: Adapted from server/src/integrations/github/fork.ts lines 268-285
// Uses existing generateAiResponse wrapper with code_analysis task type
// Model: "anthropic:balanced" (claude-sonnet-4-5)
// Temperature: 0.2 (deterministic for code analysis)
// Max tokens: 1500

const aiResult = await generateAiResponse({
  taskType: "code_analysis",
  projectId: teamId,
  language,
  systemPrompt: `Analyze this GitHub repository (${owner}/${repo}).
Provide:
1) What it does (1-2 sentences)
2) Key technologies used (as array)
3) Potential use cases (as array)
4) A suggested project idea title based on this repo

Respond ONLY with JSON:
{ "summary": "...", "technologies": ["..."], "useCases": ["..."], "ideaTitle": "..." }`,
  userPrompt: codeContext,
});
```

### Idea Creation (Event Pattern from routes/ideas.ts)

```typescript
// Source: server/src/routes/ideas.ts lines 89-127
// CRITICAL: Must emit BOTH events for status to transition correctly

// Event 1: Create the idea
appendEvent({
  type: "idea.created",
  aggregateType: "idea",
  aggregateId: ideaId,
  userId,
  correlationId,
  version: 1,
  data: {
    title: ideaTitle,
    rawInput: aiSummary,
    teamId,
    source: "import",           // Use "import" to avoid schema changes
    sourceUrl: `https://github.com/${owner}/${repo}`,
  },
});

// Event 2: Transition to "refining" status
appendEvent({
  type: "idea.transcription_added",
  aggregateType: "idea",
  aggregateId: ideaId,
  userId,
  correlationId,
  version: 2,
  data: {
    transcription: aiSummary,
    title: ideaTitle,
  },
});
```

### Telegram Analysis Formatter

```typescript
// Source: Follows pattern from server/src/telegram/formatters.ts

export function formatGitHubAnalysis(
  analysis: RepoAnalysis,
  t: TranslateFunc
): string {
  const lines = [
    `*${escapeMd(`${analysis.owner}/${analysis.repo}`)}*`,
    ``,
    escapeMd(analysis.aiSummary.slice(0, 500)),
    ``,
    `*${escapeMd(t("github-analysis-tech"))}:*`,
    ...analysis.technologies.map(tech => `  \\- ${escapeMd(tech)}`),
    ``,
    `*${escapeMd(t("github-analysis-languages"))}:*`,
    ...Object.entries(analysis.languages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([lang, bytes]) => `  \\- ${escapeMd(lang)} \\(${Math.round(bytes / 1024)}KB\\)`),
    ``,
    `\u2705 ${escapeMd(t("github-analysis-idea-created"))}`,
  ];
  return lines.join("\n");
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fork repo then analyze | Read-only analysis without fork | Phase 14 (now) | Eliminates write operations. Faster (no fork polling). Simpler. Complies with GH-04. |
| Fire-and-forget + polling for status | Synchronous response | Phase 14 (now) | No polling needed. Analysis returns in 2-5 seconds. Better UX. |
| Manual idea creation from analysis | Auto-create idea from analysis | Phase 14 (now) | One-click: paste URL -> get analysis + idea in pool. |

**Deprecated/outdated:**
- The `forkAndAnalyze` function (Phase 8) remains for the fork-based workflow. Phase 14 does NOT modify or deprecate it. Both flows coexist: fork-analyze for deep analysis with fork, analyze for quick read-only analysis.

## Open Questions

1. **Should analysis results be cached?**
   - What we know: Each analysis makes 4 Octokit API calls + 1 AI call. Rate limit is 5000/hr authenticated.
   - What's unclear: Whether the same URL will be analyzed multiple times. If so, caching the Octokit responses for 5-10 minutes would save API calls and speed up repeated analyses.
   - Recommendation: Skip caching for v1. The rate limit is generous (1250 analyses/hr). Add caching if usage patterns show repeated URLs. Simplicity wins for now.

2. **Should the Telegram handler intercept ALL GitHub URLs or only repo URLs?**
   - What we know: GitHub URLs can point to repos, issues, PRs, files, gists, etc. Only repo-level URLs (`github.com/owner/repo`) make sense for analysis.
   - What's unclear: Whether issue/PR URLs should be handled differently.
   - Recommendation: Only match repo-level URLs (`github.com/owner/repo` with exactly 2 path segments). URLs with additional path segments (issues, pulls, blob, tree) should be ignored and fall through to the default text handler.

3. **Should the `source` field use "import" or a new "github_analysis" value?**
   - What we know: The `createIdeaSchema` in routes/ideas.ts validates `source` as `z.enum(["voice", "text", "import"])`. Adding a new value requires updating the schema and potentially the reducer. Using "import" works without changes.
   - What's unclear: Whether the UI filters or displays differently based on source.
   - Recommendation: Use "import" for v1 to avoid schema changes. Add `sourceUrl` and `sourceType: "github"` as extra data fields for filtering if needed later.

4. **What happens when AI analysis fails but Octokit data was fetched?**
   - What we know: The AI call can fail (API key missing, rate limit, model error). The Octokit data is still valid.
   - What's unclear: Whether to still show repo data without the AI summary, or fail completely.
   - Recommendation: Return partial results. Show README summary, tech stack, file tree from Octokit even if AI fails. Create the idea with rawInput set to a concatenation of the raw data. The refinement loop can still work. Log the AI failure.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `server/src/integrations/github/fork.ts` -- Contains `fetchCodeContext` with README/tree/package.json pattern (direct inspection, lines 106-174)
- Existing codebase: `server/src/integrations/github/api.ts` -- Contains `parseGitHubUrl`, `verifyRepoAccess` (direct inspection)
- Existing codebase: `server/src/integrations/github/client.ts` -- Contains `getOctokit` singleton, `isGitHubConnected` (direct inspection)
- Existing codebase: `server/src/ai/generate.ts` -- Contains `generateAiResponse` wrapper with task type routing (direct inspection)
- Existing codebase: `server/src/ai/providers.ts` -- Contains `code_analysis` task type mapped to `anthropic:balanced` (direct inspection, line 101)
- Existing codebase: `server/src/ai/config.ts` -- Contains temperature (0.2) and max tokens (1500) for `code_analysis` (direct inspection, lines 26, 46)
- Existing codebase: `server/src/routes/ideas.ts` -- Contains idea creation event pattern with `idea.created` + `idea.transcription_added` (direct inspection, lines 89-127)
- Existing codebase: `server/src/telegram/handlers/text.ts` -- Contains text message handler with workflow input detection (direct inspection)
- Existing codebase: `server/src/telegram/formatters.ts` -- Contains `escapeMd` and formatting patterns (direct inspection)
- Existing codebase: `shared/types/events.ts` -- Contains all event type definitions (direct inspection)
- Existing codebase: `shared/types/idea.ts` -- Contains `IdeaState` and `IdeaStatus` types (direct inspection)
- Existing codebase: `shared/types/integration.ts` -- Contains `GitHubConnectionState`, `ForkResult` types (direct inspection)
- Existing codebase: `client/src/components/GitHubFork.tsx` -- Contains fork UI component pattern to follow (direct inspection)
- Existing codebase: `client/src/hooks/useIntegrations.ts` -- Contains `forkRepo` method pattern (direct inspection)
- `@octokit/rest` v22 -- `repos.get`, `repos.getContent`, `repos.listLanguages`, `git.getTree` are standard REST methods, confirmed in use in codebase

### Secondary (MEDIUM confidence)
- [@octokit/rest v22 API docs](https://octokit.github.io/rest.js/v22/) -- `repos.listLanguages` method reference
- Existing Phase 8 research: `.planning/phases/08-integrations/08-RESEARCH.md` -- AI input capping at 8000 chars, fork polling pattern
- Existing architecture research: `.planning/research/ARCHITECTURE.md` -- GitHub Read-Only Analysis Flow diagram

### Tertiary (LOW confidence)
- None. All findings are from direct codebase inspection.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new libraries required. All components already exist and are verified by direct codebase inspection.
- Architecture: HIGH -- The analyzer pattern is a direct extraction from `fork.ts` minus the fork step. Route, hook, and component patterns all match existing codebase conventions.
- Pitfalls: HIGH -- All pitfalls are derived from real code paths and verified against existing implementations. The idea status transition pitfall (#1) is the most critical and is documented with exact line references.

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days -- stable domain, no external API changes expected)
