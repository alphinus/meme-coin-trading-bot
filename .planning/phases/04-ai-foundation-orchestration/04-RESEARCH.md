# Phase 4: AI Foundation & Orchestration - Research

**Researched:** 2026-02-08
**Domain:** Multi-provider LLM orchestration, event-driven AI triggers, cost tracking, text-to-speech, AI team member UX
**Confidence:** HIGH

## Summary

Phase 4 introduces a rule-bound AI team member into the existing event-sourced architecture. The AI must operate across multiple LLM providers (Anthropic, OpenAI at minimum), act only on defined triggers (never free-improvising), track costs transparently, speak in the project's language (DE/EN), and mediate team conflicts. The existing event store, team member model, Soul Document writer, and i18n infrastructure from Phases 1-3 provide strong integration points.

The Vercel AI SDK (npm package `ai`, currently v6.0.69) is the standard choice for multi-provider LLM orchestration in TypeScript/Node.js. It provides a unified API across providers via `generateText`/`streamText`, built-in token usage tracking (`usage.inputTokens`, `usage.outputTokens`), a provider registry for model aliases and routing, and works in plain Express/Node.js (not just Next.js). The SDK returns structured usage data on every call, making cost tracking straightforward -- multiply token counts by known per-token prices for each model. For text-to-speech, the browser-native Web Speech API (`SpeechSynthesis`) supports German and English voices on all modern browsers and requires zero server-side infrastructure.

The key architectural pattern is an **AI Trigger Engine** that listens to the existing event bus, evaluates each event against a rule registry (milestone reached, pattern detected, conflict detected, etc.), and dispatches AI actions when rules match. This keeps AI behavior strictly deterministic and auditable. AI responses become domain events themselves (`ai.response_generated`, `ai.cost_recorded`, etc.), feeding back into the event store and Soul Documents via the existing `processEventForDocumentation` writer with the `ai_reflection` source type that was forward-declared in Phase 3.

**Primary recommendation:** Use Vercel AI SDK v6 with `@ai-sdk/anthropic` and `@ai-sdk/openai` providers, a `customProvider` registry for task-type-based model selection, JSONL-based cost ledger tracking per-request token usage, browser-native `SpeechSynthesis` API (via `easy-speech` wrapper) for TTS, and an event-driven trigger engine built on the existing domain event infrastructure.

## Standard Stack

### Core (New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` | ^6.0.0 | Vercel AI SDK core -- `generateText`, `streamText`, provider registry, token usage | 20M+ monthly downloads, de facto standard for TypeScript LLM integration, works with Express |
| `@ai-sdk/anthropic` | latest | Anthropic provider -- Claude models | Official Vercel-maintained provider, supports Claude 4.5 series |
| `@ai-sdk/openai` | latest | OpenAI provider -- GPT models | Official Vercel-maintained provider, supports GPT-4o, o-series |
| `easy-speech` | ^2.4.0 | Cross-browser SpeechSynthesis wrapper for TTS | Handles browser quirks, async voice loading, language selection; zero dependencies |

### Supporting (Already Installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | ^3.24.0 | Validate AI configuration, trigger rules, API inputs | All new API endpoints and config schemas |
| `uuid` | ^11.0.0 | Generate IDs for AI events, cost records, trigger executions | Every AI action creates domain events |
| `i18next` / `react-i18next` | installed | AI response language selection, UI labels | AI-related UI components and server-side AI prompt language |
| `react-markdown` | ^10.1.0 | Render AI-generated content in Soul Documents and dashboard | Displaying AI reflections and mediation summaries |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel AI SDK | LangChain.js | Heavier, agent-framework focused, overkill for structured trigger-based AI; AI SDK is simpler and more lightweight |
| Vercel AI SDK | multi-llm-ts | Smaller/simpler but less ecosystem support, no provider registry, no telemetry, fewer maintained providers |
| Vercel AI SDK | Direct provider SDKs | Each provider has different APIs; no unified token tracking, temperature control, or streaming interface |
| easy-speech | Raw SpeechSynthesis API | Cross-browser voice loading is unreliable; easy-speech handles init timing, voice enumeration, and fallbacks |
| easy-speech | Server-side TTS (OpenAI TTS API) | Costs money per request, requires audio streaming infrastructure; browser TTS is free and instant |
| JSONL cost ledger | PostgreSQL cost table | Project uses JSONL event store everywhere; adding a DB just for costs breaks the architecture pattern |

**Installation:**
```bash
npm install ai @ai-sdk/anthropic @ai-sdk/openai -w server
npm install easy-speech -w client
```

## Architecture Patterns

### Recommended Project Structure (New Files)

```
server/src/
  ai/
    providers.ts          # Provider registry setup (Anthropic + OpenAI + custom aliases)
    config.ts             # AI configuration types, model pricing, temperature presets
    generate.ts           # Wrapper around AI SDK generateText with cost tracking
    triggers/
      engine.ts           # Trigger evaluation engine -- listens to events, dispatches AI actions
      rules.ts            # Trigger rule definitions (milestone, pattern, conflict, catch)
      types.ts            # TriggerRule, TriggerContext, TriggerResult types
    actions/
      reflection.ts       # AI reflection action (analyzes events, writes to Soul Document)
      mediation.ts        # Conflict mediation action (analyzes two positions, proposes compromise)
      notification.ts     # AI "has something to say" action (sets face emoji state)
    cost/
      tracker.ts          # Cost recording -- appends to JSONL cost ledger per AI call
      pricing.ts          # Model pricing table (input/output per 1M tokens)
      dashboard.ts        # Cost aggregation queries (per project, per model, per month)
  events/
    reducers/
      ai-member.ts        # AI team member state reducer (name, character, emoji state)
      ai-cost.ts          # Cost ledger reducer for dashboard queries
  routes/
    ai.ts                 # API routes: AI config, trigger status, cost dashboard, model override

client/src/
  components/
    AiTeamMember.tsx      # AI avatar with face emoji indicator on dashboard
    AiCostDashboard.tsx   # Cost widget (per project, per model, per month)
    AiModelOverride.tsx   # Model override selector for AI nodes
    AiMediationView.tsx   # Conflict mediation display with compromise proposal
    AiOverrideMenu.tsx    # Slide-on menu for overriding AI decisions (hidden, audited)
    TextToSpeech.tsx      # TTS toggle button and speech controls
  hooks/
    useAiMember.ts        # AI team member state (name, emoji, character)
    useAiCost.ts          # Cost dashboard data
    useTextToSpeech.ts    # TTS initialization, speak function, voice selection
  pages/
    AiDashboard.tsx       # AI overview page (or widget on main dashboard)

shared/types/
  ai.ts                   # AI-related shared types (AiMemberConfig, CostRecord, TriggerRule, etc.)
```

### Pattern 1: Event-Driven AI Trigger Engine

**What:** A service that subscribes to domain events via the existing event store pattern, evaluates each event against a registry of trigger rules, and dispatches AI actions when rules match. Every AI action is itself recorded as a domain event, creating a full audit trail.

**When to use:** Every time a domain event occurs that could trigger an AI response (milestone reached, pattern detected, conflict detected, catch logic fired).

**Example:**
```typescript
// server/src/ai/triggers/engine.ts
import type { DomainEvent } from "shared/types/events.js";
import type { TriggerRule, TriggerContext } from "./types.js";
import { loadTriggerRules } from "./rules.js";
import { executeAiAction } from "../generate.js";

const rules: TriggerRule[] = loadTriggerRules();

/**
 * Evaluate a domain event against all trigger rules.
 * Called from route handlers (fire-and-forget pattern, same as processEventForDocumentation).
 */
export async function evaluateTriggersForEvent(event: DomainEvent): Promise<void> {
  // Never trigger on AI's own events (prevent loops)
  if (event.type.startsWith("ai.")) return;

  const context: TriggerContext = { event, timestamp: new Date().toISOString() };

  for (const rule of rules) {
    if (rule.matches(context)) {
      await executeAiAction(rule.action, context);
    }
  }
}
```

### Pattern 2: Provider Registry with Task-Type Routing

**What:** Use AI SDK's `createProviderRegistry` and `customProvider` to define model aliases by task type. Lightweight tasks (notifications, simple summaries) use fast/cheap models (Claude Haiku, GPT-4o-mini). Complex tasks (mediation, deep analysis) use powerful models (Claude Sonnet/Opus, GPT-4o). Users can override per AI node.

**When to use:** Every AI call goes through the registry. Model selection is automatic by task type but overridable.

**Example:**
```typescript
// server/src/ai/providers.ts
import { createProviderRegistry, customProvider } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const aiRegistry = createProviderRegistry({
  anthropic: customProvider({
    languageModels: {
      fast: anthropic("claude-haiku-4-5"),
      balanced: anthropic("claude-sonnet-4-5"),
      powerful: anthropic("claude-opus-4-5"),
    },
    fallbackProvider: anthropic,
  }),
  openai: customProvider({
    languageModels: {
      fast: openai("gpt-4o-mini"),
      balanced: openai("gpt-4o"),
      powerful: openai("o3"),
    },
    fallbackProvider: openai,
  }),
});

// Task-type to model tier mapping
export const TASK_MODEL_MAP: Record<string, string> = {
  notification: "anthropic:fast",       // Quick emoji/notification decisions
  reflection: "anthropic:balanced",     // Soul Document AI reflections
  mediation: "anthropic:powerful",      // Conflict mediation needs deep reasoning
  pattern_match: "anthropic:balanced",  // Pattern recognition in Soul Documents
  summary: "openai:fast",              // Quick summaries
};

export function getModelForTask(taskType: string, override?: string): string {
  return override || TASK_MODEL_MAP[taskType] || "anthropic:balanced";
}
```

### Pattern 3: Cost Tracking via JSONL Ledger

**What:** Every AI SDK call records a cost event to a dedicated `ai_cost.jsonl` file via the existing event store pattern. The usage object from `generateText` provides `inputTokens` and `outputTokens`. Multiply by the model's known pricing to calculate cost. Aggregate for dashboard display.

**When to use:** Every AI call, no exceptions.

**Example:**
```typescript
// server/src/ai/cost/tracker.ts
import { appendEvent } from "../../events/store.js";
import { MODEL_PRICING } from "./pricing.js";

interface AiUsage {
  inputTokens: number;
  outputTokens: number;
}

export function recordAiCost(
  projectId: string,
  modelId: string,
  taskType: string,
  usage: AiUsage,
  correlationId: string
): void {
  const pricing = MODEL_PRICING[modelId];
  const inputCost = (usage.inputTokens / 1_000_000) * (pricing?.inputPerMillion || 0);
  const outputCost = (usage.outputTokens / 1_000_000) * (pricing?.outputPerMillion || 0);
  const totalCost = inputCost + outputCost;

  appendEvent({
    type: "ai.cost_recorded",
    aggregateType: "ai_cost",
    aggregateId: projectId,
    userId: "ai-system",
    correlationId,
    version: 0,
    data: {
      modelId,
      taskType,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      inputCost,
      outputCost,
      totalCost,
      currency: "USD",
    },
  });
}
```

### Pattern 4: AI Team Member as Event-Sourced Entity

**What:** The AI team member is an entity in the event store with its own aggregate type (`ai_member`). Its state includes name, character/personality, current emoji state (whether it has something to say), and per-team configuration. The face emoji state is set when a trigger fires and cleared when the user reads/dismisses the AI message.

**When to use:** Dashboard rendering, AI personality configuration, "has something to say" indicator.

**Example:**
```typescript
// shared/types/ai.ts
export interface AiMemberConfig {
  teamId: string;
  name: string;           // Configurable AI name per team
  character: string;      // Personality description used in system prompts
  language: "de" | "en";  // Matches project language
  faceEmoji: string;      // Current emoji state (e.g., "thinking", "alert", "idle")
  hasMessage: boolean;    // Whether AI has something to communicate
  pendingMessageId?: string;
}

export interface CostRecord {
  id: string;
  projectId: string;
  modelId: string;
  taskType: string;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  currency: string;
  timestamp: string;
}

export type AiTaskType =
  | "notification"
  | "reflection"
  | "mediation"
  | "pattern_match"
  | "summary"
  | "catch_logic";

export interface ModelOverride {
  nodeId: string;       // Which AI node this override applies to
  modelId: string;      // The overridden model
  overriddenBy: string; // userId who set the override
  overriddenAt: string; // ISO timestamp
  reason?: string;      // Optional documentation
}
```

### Pattern 5: Browser-Native Text-to-Speech

**What:** Use the browser's built-in `SpeechSynthesis` API (via `easy-speech` wrapper) for AI voice output. The wrapper handles cross-browser voice loading quirks. Voice is selected based on the project language (DE/EN). TTS is always optional -- triggered by user interaction, never auto-playing.

**When to use:** When displaying an AI response, provide a "speak" button. User controls playback.

**Example:**
```typescript
// client/src/hooks/useTextToSpeech.ts
import { useState, useEffect, useCallback } from "react";
import EasySpeech from "easy-speech";

export function useTextToSpeech(language: "de" | "en") {
  const [ready, setReady] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    EasySpeech.init({ maxTimeout: 5000, interval: 250 })
      .then(() => setReady(true))
      .catch(() => setReady(false));
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!ready) return;
    const voices = EasySpeech.voices();
    const langCode = language === "de" ? "de-DE" : "en-US";
    const voice = voices.find((v) => v.lang.startsWith(langCode)) || voices[0];

    setSpeaking(true);
    try {
      await EasySpeech.speak({ text, voice, rate: 1, pitch: 1, volume: 1 });
    } finally {
      setSpeaking(false);
    }
  }, [ready, language]);

  const stop = useCallback(() => {
    EasySpeech.cancel();
    setSpeaking(false);
  }, []);

  return { ready, speaking, speak, stop };
}
```

### Anti-Patterns to Avoid

- **Free-form AI actions:** AI must NEVER act without a matching trigger rule. No periodic scanning, no time-based actions, no "AI noticed something interesting" spontaneous messages. Every action traces back to a specific domain event and trigger rule.
- **Unbounded LLM calls:** Every `generateText` call MUST have `maxOutputTokens` set. Without this, a single AI call could consume an entire month's budget on a runaway response.
- **Direct provider SDK usage:** Never import `@ai-sdk/anthropic` or `@ai-sdk/openai` directly in action code. Always go through the provider registry so overrides and cost tracking work consistently.
- **Blocking AI calls in request handlers:** AI generation takes seconds. Never `await` AI calls in the main request-response cycle. Use fire-and-forget pattern (same as `processEventForDocumentation`) and push results via events/SSE.
- **Auto-playing TTS:** Never auto-play speech. Always require explicit user interaction to start TTS. Browser autoplay policies will block it anyway, and it is disruptive UX.
- **Storing API keys in code:** API keys go in environment variables (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`), loaded at provider creation time. Never hardcoded, never committed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-provider LLM API abstraction | Custom HTTP clients for each provider | Vercel AI SDK `createProviderRegistry` | Each provider has different auth, streaming, error handling, token counting; SDK handles all of it |
| Token counting | Custom tokenizer per model | AI SDK `usage` object from `generateText`/`streamText` | Different models use different tokenizers (tiktoken vs proprietary); SDK returns exact counts from provider |
| Cross-browser TTS | Raw SpeechSynthesis API calls | `easy-speech` library | Voice loading timing varies by browser; some browsers need user interaction before voices enumerate; easy-speech handles all edge cases |
| Structured output from LLMs | Custom JSON parsing of LLM responses | AI SDK `generateObject` with Zod schema | LLMs output malformed JSON frequently; AI SDK handles retries, schema validation, and type inference |
| Model pricing table | Manual price tracking | Configurable pricing map with known prices | Prices change; make the pricing table a configuration file that can be updated without code changes |

**Key insight:** The LLM provider landscape changes rapidly. Relying on the AI SDK's provider abstraction means adding a new provider (Google, Mistral, etc.) later is a one-line import change, not an architecture rewrite.

## Common Pitfalls

### Pitfall 1: AI Feedback Loops
**What goes wrong:** AI generates a response, which creates a `soul_document.entry_added` event, which triggers the AI to analyze the new entry, which creates another entry, creating an infinite loop.
**Why it happens:** The trigger engine listens to all domain events without filtering out AI-generated events.
**How to avoid:** The trigger engine MUST skip all events where `event.type.startsWith("ai.")`. Additionally, mark AI-generated Soul Document entries with `sourceType: "ai_reflection"` and have the trigger engine skip `soul_document.*` events where the entry source is `ai_reflection`. The existing writer.ts already skips `soul_document.*` events -- this same pattern applies to the trigger engine.
**Warning signs:** Rapid successive AI events in the JSONL log, cost spikes, infinite spinner in UI.

### Pitfall 2: Cost Runaway from Uncontrolled Token Usage
**What goes wrong:** A mediation task sends the full conversation history (potentially 50k+ tokens) as context, resulting in a single API call costing $1-5+ instead of cents.
**Why it happens:** No input token budget per task type, no context window management.
**How to avoid:** Define max context size per task type. For mediation, limit to the two conflicting positions plus relevant project context (cap at 4000 input tokens). For reflections, summarize recent events rather than sending raw event logs. Always set `maxOutputTokens` per task type.
**Warning signs:** Cost records showing >10k input tokens for notification tasks, or >50k for any single task.

### Pitfall 3: Race Conditions in Trigger Evaluation
**What goes wrong:** Two events fire in quick succession (e.g., phase_completed + phase_advanced), both triggering the same AI rule, resulting in duplicate AI responses.
**Why it happens:** Fire-and-forget trigger evaluation runs asynchronously without deduplication.
**How to avoid:** Use the event's `correlationId` to deduplicate triggers. If two events share the same `correlationId`, only the first should trigger the rule. Keep a short-lived Map of recently-processed correlationIds (5-second TTL is sufficient given existing debounce patterns).
**Warning signs:** Duplicate AI messages on the dashboard, double cost entries for the same event chain.

### Pitfall 4: Voice Enumeration Timing in Browsers
**What goes wrong:** `SpeechSynthesis.getVoices()` returns an empty array on page load in some browsers (Chrome, Edge). Code tries to select a German voice but finds none.
**Why it happens:** Voices load asynchronously in some browsers and are not available until the `voiceschanged` event fires.
**How to avoid:** Use `easy-speech` which handles the async voice loading with configurable timeout. Initialize TTS on component mount, not on first speak attempt. Show "Loading voices..." state while `EasySpeech.init()` is pending.
**Warning signs:** TTS works in Firefox but not Chrome, or works after a page refresh but not on first load.

### Pitfall 5: AI System User Identity
**What goes wrong:** AI-generated events need a `userId` field, but the AI is not a real user in the auth system. Using a random string breaks user lookups.
**Why it happens:** The event store schema requires `userId` on every event.
**How to avoid:** Create a well-known AI system user ID (e.g., `"ai-system"`) that is recognized throughout the codebase. Store the AI member configuration under this ID. The team reducer should recognize this as a special member type. Do NOT create a real auth credential for the AI -- it authenticates by being a server-side service, not an HTTP client.
**Warning signs:** "User not found" errors when rendering AI-generated events, broken Soul Document writer when processing AI events.

### Pitfall 6: Prompt Language Mismatch
**What goes wrong:** AI generates a response in English for a German-language project, or vice versa.
**Why it happens:** The system prompt does not include language instructions, or the project language is not passed through to the AI generation call.
**How to avoid:** Every AI generation call MUST include the project's configured language in the system prompt. Create a `buildSystemPrompt(config: AiMemberConfig, language: "de" | "en")` function that always includes: "Respond in {German|English}." Include the AI member's character/personality description and the language instruction together.
**Warning signs:** Mixed-language AI responses, AI responding in English when the project is configured for German.

## Code Examples

### Wrapping AI SDK generateText with Cost Tracking

```typescript
// server/src/ai/generate.ts
import { generateText } from "ai";
import { aiRegistry, getModelForTask } from "./providers.js";
import { recordAiCost } from "./cost/tracker.js";
import { appendEvent } from "../events/store.js";
import { randomUUID } from "crypto";

interface AiGenerateOptions {
  taskType: string;
  projectId: string;
  language: "de" | "en";
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  modelOverride?: string;
  correlationId?: string;
}

// Temperature presets per task type (AI-07)
const TEMPERATURE_PRESETS: Record<string, number> = {
  notification: 0.3,   // Low creativity for factual notifications
  reflection: 0.5,     // Moderate creativity for thoughtful reflections
  mediation: 0.4,      // Balanced -- needs creativity but also precision
  pattern_match: 0.2,  // Low -- pattern matching should be consistent
  summary: 0.3,        // Low -- summaries should be factual
  catch_logic: 0.1,    // Very low -- catch/error detection must be precise
};

// Max output tokens per task type (safety bounds)
const MAX_TOKENS_PRESETS: Record<string, number> = {
  notification: 200,
  reflection: 800,
  mediation: 1500,
  pattern_match: 500,
  summary: 600,
  catch_logic: 400,
};

export async function generateAiResponse(options: AiGenerateOptions) {
  const {
    taskType,
    projectId,
    language,
    systemPrompt,
    userPrompt,
    modelOverride,
    correlationId = randomUUID(),
  } = options;

  const modelId = getModelForTask(taskType, modelOverride);
  const model = aiRegistry.languageModel(modelId);

  const temperature = options.temperature ?? TEMPERATURE_PRESETS[taskType] ?? 0.4;
  const maxOutputTokens = options.maxOutputTokens ?? MAX_TOKENS_PRESETS[taskType] ?? 500;

  const languageInstruction = language === "de"
    ? "Antworte auf Deutsch."
    : "Respond in English.";

  const { text, usage, finishReason } = await generateText({
    model,
    system: `${systemPrompt}\n\n${languageInstruction}`,
    prompt: userPrompt,
    temperature,
    maxOutputTokens,
  });

  // Record cost (AI-09)
  if (usage) {
    recordAiCost(projectId, modelId, taskType, {
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
    }, correlationId);
  }

  // Record AI response event
  const responseEvent = appendEvent({
    type: "ai.response_generated",
    aggregateType: "ai_member",
    aggregateId: projectId,
    userId: "ai-system",
    correlationId,
    version: 0,
    data: {
      taskType,
      modelId,
      text,
      finishReason,
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
      language,
    },
  });

  return { text, usage, finishReason, event: responseEvent };
}
```

### Conflict Mediation Action (AI-11)

```typescript
// server/src/ai/actions/mediation.ts
import { generateAiResponse } from "../generate.js";
import { writeSoulDocumentEntry } from "../../docs/writer.js";

interface MediationInput {
  projectId: string;
  teamId: string;
  language: "de" | "en";
  position1: { userId: string; summary: string };
  position2: { userId: string; summary: string };
  projectContext: string;
  correlationId: string;
}

export async function mediateConflict(input: MediationInput) {
  const { text, event } = await generateAiResponse({
    taskType: "mediation",
    projectId: input.projectId,
    language: input.language,
    systemPrompt: `You are a neutral mediator for a project team. Analyze both team members' positions objectively. Identify areas of agreement, points of tension, and propose a documented compromise that respects both perspectives. Be specific and actionable.`,
    userPrompt: `
Project context: ${input.projectContext}

Position 1 (${input.position1.userId}):
${input.position1.summary}

Position 2 (${input.position2.userId}):
${input.position2.summary}

Analyze both positions and propose a compromise.`,
    correlationId: input.correlationId,
  });

  // Write mediation result to Soul Documents of both participants
  for (const position of [input.position1, input.position2]) {
    writeSoulDocumentEntry({
      userId: position.userId,
      teamId: input.teamId,
      projectId: input.projectId,
      sourceType: "ai_reflection",
      content: `**AI Mediation Result:**\n\n${text}`,
      triggerEventId: event.id,
      triggerEventType: "ai.mediation_completed",
      timestamp: new Date().toISOString(),
    });
  }

  return { text, eventId: event.id };
}
```

### AI Model Override (AI-08, AI-10)

```typescript
// server/src/routes/ai.ts (partial)
import { Router } from "express";
import { appendEvent } from "../events/store.js";
import { z } from "zod";

const router = Router();

// AI-08: Manual model override per AI node
const modelOverrideSchema = z.object({
  nodeId: z.string(),
  modelId: z.string(),
  reason: z.string().optional(),
});

router.post("/override-model", async (req, res) => {
  const parsed = modelOverrideSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: "Invalid override data" });
  }

  const userId = (req.session as any).userId;
  const event = appendEvent({
    type: "ai.model_overridden",
    aggregateType: "ai_member",
    aggregateId: parsed.data.nodeId,
    userId,
    correlationId: parsed.data.nodeId,
    version: 0,
    data: {
      ...parsed.data,
      overriddenBy: userId,
      overriddenAt: new Date().toISOString(),
    },
  });

  res.json({ success: true, data: { eventId: event.id } });
});

// AI-10: Override AI decision (hidden slide-on menu, fully documented and audited)
const decisionOverrideSchema = z.object({
  aiEventId: z.string(),
  overrideReason: z.string().min(1),
  newDecision: z.string(),
});

router.post("/override-decision", async (req, res) => {
  const parsed = decisionOverrideSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: "Invalid override data" });
  }

  const userId = (req.session as any).userId;
  const event = appendEvent({
    type: "ai.decision_overridden",
    aggregateType: "ai_member",
    aggregateId: parsed.data.aiEventId,
    userId,
    correlationId: parsed.data.aiEventId,
    version: 0,
    data: {
      ...parsed.data,
      overriddenBy: userId,
      overriddenAt: new Date().toISOString(),
    },
  });

  res.json({ success: true, data: { eventId: event.id } });
});

export default router;
```

### Cost Dashboard Aggregation (AI-09)

```typescript
// server/src/ai/cost/dashboard.ts
import { readEvents } from "../../events/store.js";
import type { DomainEvent } from "shared/types/events.js";

interface CostSummary {
  totalCost: number;
  byProject: Record<string, number>;
  byModel: Record<string, number>;
  byMonth: Record<string, number>; // "2026-02" format
}

export async function getCostSummary(): Promise<CostSummary> {
  const events = await readEvents("ai_cost");
  const summary: CostSummary = {
    totalCost: 0,
    byProject: {},
    byModel: {},
    byMonth: {},
  };

  for (const event of events) {
    const data = event.data as {
      totalCost: number;
      modelId: string;
    };
    const month = event.timestamp.substring(0, 7); // "2026-02"
    const projectId = event.aggregateId;

    summary.totalCost += data.totalCost;
    summary.byProject[projectId] = (summary.byProject[projectId] || 0) + data.totalCost;
    summary.byModel[data.modelId] = (summary.byModel[data.modelId] || 0) + data.totalCost;
    summary.byMonth[month] = (summary.byMonth[month] || 0) + data.totalCost;
  }

  return summary;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct OpenAI/Anthropic SDK calls | Vercel AI SDK v6 provider registry | 2025-2026 | Unified API, automatic token tracking, easy provider switching |
| LangChain for everything | AI SDK for structured tasks, LangChain for complex agent chains | 2025 | AI SDK is lighter/simpler for non-agent use cases like this |
| Server-side TTS (Google Cloud, AWS Polly) | Browser-native SpeechSynthesis | Mature since 2023+ | Free, no infrastructure, supports DE/EN, works offline |
| Manual token counting (tiktoken) | AI SDK `usage` object | AI SDK v4+ (2024) | Provider returns exact counts, no client-side tokenizer needed |
| `experimental_createProviderRegistry` | `createProviderRegistry` (stable) | AI SDK v5-6 (2025-2026) | Provider registry is now a stable API |

**Deprecated/outdated:**
- `experimental_createProviderRegistry`: Renamed to `createProviderRegistry` in AI SDK v5+
- AI SDK v3/v4 streaming API: v6 uses `streamText` with different parameters; migration guide available
- `prompt_tokens`/`completion_tokens` naming: AI SDK uses `inputTokens`/`outputTokens`

## Integration Points with Existing Codebase

### Phase 3 Forward-Compatibility Hooks

The Phase 3 codebase was explicitly designed with Phase 4 integration points:

1. **`EntrySourceType` includes `"ai_reflection"`** (shared/types/models.ts, line 162): Ready for AI-generated Soul Document entries.
2. **`EVENT_TO_ENTRY_MAP` has Phase 4 comment** (server/src/docs/writer.ts, line 186): `// Phase 4: AI reflection events will be wired here when AI Foundation is built (maps to sourceType: "ai_reflection")`.
3. **`processEventForDocumentation` ignores `soul_document.*`** (server/src/docs/writer.ts, line 200): This same loop-prevention pattern must be applied to AI events.

### New Event Types Needed

```typescript
// Add to shared/types/events.ts EventType union:
| "ai.member_configured"     // AI-01: AI member name/character set for team
| "ai.message_pending"       // AI-02: AI has something to say (face emoji trigger)
| "ai.message_read"          // AI-02: User read/dismissed AI message
| "ai.response_generated"    // AI actions: AI produced a text response
| "ai.cost_recorded"         // AI-09: Cost tracking event
| "ai.model_overridden"      // AI-08: User overrode model for an AI node
| "ai.decision_overridden"   // AI-10: User overrode an AI decision
| "ai.mediation_completed"   // AI-11: Conflict mediation result
| "ai.trigger_fired"         // AI-05: Trigger rule matched and executed
```

### Wiring into Existing Routes

AI trigger evaluation follows the same fire-and-forget pattern as `processEventForDocumentation`:

```typescript
// In existing route handlers (projects.ts, teams.ts, etc.):
import { evaluateTriggersForEvent } from "../ai/triggers/engine.js";

// After creating a domain event:
const event = appendEvent({ ... });
processEventForDocumentation(event);  // existing
evaluateTriggersForEvent(event);      // new -- same fire-and-forget pattern
```

## Open Questions

1. **AI member as team member in TeamState**
   - What we know: The AI needs to appear as a visible team member on the dashboard (AI-01). The existing `TeamMember` interface has `userId` and `role`.
   - What's unclear: Should the AI be added as a real member in the team reducer (with a special role like `"ai"`), or should it be a separate entity that the dashboard renders alongside real members?
   - Recommendation: Add a `role: "ai"` option to the TeamMember type. This lets the AI appear naturally in member lists without special-casing the dashboard. The AI member is created when a team configures its AI (AI-01).

2. **Trigger rule persistence and configurability**
   - What we know: AI acts only on defined triggers (AI-05). Trigger rules need to be defined somewhere.
   - What's unclear: Should trigger rules be hardcoded, stored in a config file, or stored as events in the JSONL store?
   - Recommendation: Start with hardcoded rules in a `rules.ts` file for v1 (milestone completed, conflict detected, pattern match). Make the rule interface extensible so rules can later be loaded from config. Avoid over-engineering a rule engine for 2 users.

3. **Conflict detection mechanism for mediation (AI-11)**
   - What we know: AI mediates when team members disagree.
   - What's unclear: How does the system detect disagreement? There is no explicit "disagree" button in the current UI.
   - Recommendation: Add a "flag disagreement" action in the project phase UI. When one team member flags a disagreement, the system prompts the other member to state their position. Once both positions are captured, the AI mediation trigger fires. This is simpler and more reliable than trying to infer disagreement from text analysis.

4. **Face emoji state management (AI-02)**
   - What we know: AI displays a face emoji when it has something to say.
   - What's unclear: What emojis map to what states? How long does the indicator persist?
   - Recommendation: Simple boolean `hasMessage` plus a category (`"thinking"`, `"suggestion"`, `"warning"`, `"mediation"`). The emoji map is a client-side concern. Persist until user clicks/dismisses. Use SSE or polling (existing 30-second pattern) to push state changes.

## Sources

### Primary (HIGH confidence)
- [AI SDK official docs](https://ai-sdk.dev/docs/introduction) - Provider registry, generateText API, usage object structure, telemetry
- [AI SDK Anthropic provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) - Package name, model IDs, configuration
- [AI SDK OpenAI provider](https://ai-sdk.dev/providers/ai-sdk-providers/openai) - Package name, model IDs, configuration
- [AI SDK Provider Management](https://ai-sdk.dev/docs/ai-sdk-core/provider-management) - createProviderRegistry, customProvider API
- [AI SDK generateText reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text) - Full response structure, usage object fields
- [MDN Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) - SpeechSynthesis interface, browser support

### Secondary (MEDIUM confidence)
- [AI SDK v6 announcement](https://vercel.com/blog/ai-sdk-6) - Agent support, MCP, tool approval features
- [AI SDK npm](https://www.npmjs.com/package/ai) - Version 6.0.69 (2026-02-03)
- [easy-speech GitHub](https://github.com/leaonline/easy-speech) - v2.4.0, API, cross-browser TTS wrapper
- [LangChain vs AI SDK comparison](https://strapi.io/blog/langchain-vs-vercel-ai-sdk-vs-openai-sdk-comparison-guide) - When to use which
- [Anthropic pricing 2026](https://www.metacto.com/blogs/anthropic-api-pricing-a-full-breakdown-of-costs-and-integration) - Claude 4.5 pricing tiers
- [Langfuse token tracking](https://langfuse.com/docs/observability/features/token-and-cost-tracking) - Token/cost tracking patterns

### Tertiary (LOW confidence)
- [multi-llm-ts](https://github.com/nbonamy/multi-llm-ts) - Alternative multi-provider library (not recommended over AI SDK)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Vercel AI SDK is the dominant TypeScript LLM library with 20M+ monthly downloads; API verified via official docs
- Architecture: HIGH - Event-driven trigger pattern follows existing codebase patterns exactly; integration points were pre-designed in Phase 3
- Cost tracking: HIGH - AI SDK's `usage` object is documented and verified; JSONL ledger pattern matches existing data architecture
- TTS: MEDIUM - Web Speech API is well-supported but voice availability varies by OS/browser; easy-speech mitigates but does not eliminate all edge cases
- Trigger rules: MEDIUM - The pattern is sound but specific trigger definitions (what events trigger what AI actions) will need refinement during implementation
- Conflict mediation: MEDIUM - The AI mediation capability depends on UX design for how conflicts are surfaced; the "flag disagreement" approach is a recommendation, not verified against user expectations

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (AI SDK is stable at v6; pricing may change)
