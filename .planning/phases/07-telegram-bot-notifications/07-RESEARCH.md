# Phase 7: Telegram Bot & Notifications - Research

**Researched:** 2026-02-08
**Domain:** Telegram Bot API, multi-channel notification system, voice-to-text via Telegram
**Confidence:** HIGH

## Summary

Phase 7 introduces two interconnected capabilities: (1) a Telegram bot that mirrors the full web app workflow -- project navigation, GSD step interaction, voice message transcription with project routing -- and (2) a configurable multi-channel notification system spanning web push, Telegram, and email.

The Telegram bot is the larger effort. It must authenticate Telegram users against existing Eluma users, expose all project/workflow/idea operations via slash commands and inline keyboard buttons, handle voice messages by downloading audio from Telegram servers and feeding it through the existing Whisper transcription pipeline, and deliver status updates proactively. The notification system adds a preference layer (per user, per channel, per priority) and dispatchers for three channels.

The recommended stack is **grammY** (TypeScript-first Telegram bot framework), integrated into the existing Express server via webhook callback. grammY is the modern successor to Telegraf with superior TypeScript support, active maintenance, current Bot API coverage, and an official plugin ecosystem for menus, conversations, sessions, files, and i18n. Voice messages from Telegram arrive as OGG Opus audio, which the Whisper API supports (OGG is in the accepted format list). The existing `transcribeAudio()` function can receive these buffers directly with no conversion needed. For notifications, use **nodemailer** for email and the browser **Notifications API** (via server-sent events or polling from the existing event store) for web notifications -- no web-push library needed since this is a self-hosted single-server app where the web client is always connected.

**Primary recommendation:** Use grammY (^1.39) integrated as Express webhook middleware at `/api/telegram/webhook`, reuse all existing server-side modules (workflow engine, voice transcription, idea pool, AI generate) directly via function calls (not HTTP), and build a notification preference aggregate with dispatchers for each channel.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `grammy` | ^1.39 | Telegram Bot framework | TypeScript-first, best-in-class types, active maintenance, supports latest Bot API, official plugin ecosystem |
| `@grammyjs/files` | latest | Download voice message audio from Telegram | Official plugin; adds `download()` method to file objects for buffer retrieval |
| `@grammyjs/menu` | latest | Interactive inline menu construction | Official plugin; manages callback data routing, multi-page menus, dynamic button generation |
| `nodemailer` | ^6.9 | Send email notifications | De facto Node.js email library; zero runtime dependencies; SMTP transport |
| `ai` (AI SDK) | 6.0.77 (installed) | Voice transcription via `experimental_transcribe` | Already in project; reuse existing `transcribeAudio()` |
| `express` | 4.21 (installed) | Webhook endpoint for Telegram | Already in project; grammY has native Express webhook adapter |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@grammyjs/conversations` | latest | Multi-step conversational workflows in Telegram | When GSD workflow steps require sequential input gathering |
| `@grammyjs/i18n` | latest | Telegram bot message internationalization (DE/EN) | All user-facing bot messages; syncs with existing i18n keys |
| `@types/nodemailer` | latest | TypeScript definitions for nodemailer | Development only |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| grammY | Telegraf 4.x | Telegraf has lagging Bot API support, worse TS types, no active docs. grammY is the clear modern choice |
| grammY | node-telegram-bot-api | Simpler but spaghetti at scale; no middleware, no plugins, no menu abstraction |
| nodemailer | @sendgrid/mail | SendGrid requires external service; nodemailer works with any SMTP server including local ones |
| SSE/polling for web notifications | web-push (service worker) | Web-push requires VAPID keys, service worker setup, PWA configuration -- overkill for a 2-user self-hosted app where the browser tab is typically open |
| @grammyjs/conversations | Custom state machine | Conversations plugin handles replay, side-effects, and async waits correctly; hand-rolling this is error-prone |

**Installation:**
```bash
cd server && npm install grammy @grammyjs/files @grammyjs/menu @grammyjs/conversations @grammyjs/i18n nodemailer && npm install -D @types/nodemailer
```

## Architecture Patterns

### Recommended Project Structure
```
server/src/
  telegram/
    bot.ts                 # Bot instance, middleware setup, webhook config
    commands.ts            # Slash command handlers (/start, /projects, /ideas, /help)
    menus/
      project-menu.ts      # Project list and navigation menu
      workflow-menu.ts      # GSD workflow step interaction menu
      idea-menu.ts          # Idea Pool browsing and refinement menu
      settings-menu.ts      # Notification preferences menu
    handlers/
      voice.ts              # Voice message handler: download -> transcribe -> route
      text.ts               # Free-text message handler (for workflow text_input steps)
      callback.ts           # Callback query router for non-menu buttons
    auth.ts                 # Telegram-to-Eluma user linking and verification
    formatters.ts           # Message formatting helpers (Markdown, truncation)
    types.ts                # Telegram-specific types and context flavor
  notifications/
    preferences.ts          # Notification preference aggregate (event-sourced)
    dispatcher.ts           # Central dispatcher: evaluates preferences, routes to channels
    channels/
      telegram.ts           # Send notification via Telegram bot.api.sendMessage
      email.ts              # Send notification via nodemailer
      web.ts                # Store notification for web client polling
    types.ts                # NotificationPreference, NotificationEvent, Priority types
  routes/
    telegram.ts             # Express webhook endpoint for Telegram
    notifications.ts        # Notification preferences CRUD API
shared/types/
  notification.ts           # Shared notification types
  telegram.ts               # Shared Telegram linking types
  events.ts                 # Updated: new event types for telegram and notification aggregates
```

### Pattern 1: grammY Bot Integrated into Existing Express Server
**What:** Create the Telegram bot as middleware within the existing Express app, using webhook mode
**When to use:** Always -- this is the integration pattern for the entire bot
**Example:**
```typescript
// server/src/telegram/bot.ts
import { Bot, Context, session } from "grammy";
import { hydrateFiles, FileFlavor } from "@grammyjs/files";
import { Menu, MenuFlavor } from "@grammyjs/menu";
import { I18n, I18nFlavor } from "@grammyjs/i18n";

// Context type with all flavors
type BotContext = FileFlavor<Context> & MenuFlavor & I18nFlavor;

// Create bot instance (do NOT call bot.start() -- webhooks instead)
const bot = new Bot<BotContext>(process.env.TELEGRAM_BOT_TOKEN || "");

// Install file download support
bot.api.config.use(hydrateFiles(bot.token));

export { bot, BotContext };
```

```typescript
// server/src/routes/telegram.ts
import { Router } from "express";
import { webhookCallback } from "grammy";
import { bot } from "../telegram/bot.js";

const router = Router();

// Telegram sends updates as POST to this endpoint
// NO auth middleware -- Telegram authenticates via bot token
router.post(
  `/webhook/${process.env.TELEGRAM_WEBHOOK_SECRET || "secret"}`,
  webhookCallback(bot, "express")
);

export default router;
```

```typescript
// In server/src/app.ts -- register BEFORE express.json() or with its own parsing
app.use("/api/telegram", telegramRouter);
```

### Pattern 2: Telegram-to-Eluma User Linking
**What:** Map Telegram user IDs to Eluma user accounts via a linking flow
**When to use:** Before any authenticated operation from Telegram
**Example:**
```typescript
// server/src/telegram/auth.ts
import { loadUser, listUsers } from "../auth/users.js";
import { appendEvent, readEvents } from "../events/store.js";
import { randomUUID } from "crypto";

interface TelegramLink {
  telegramUserId: number;
  elumaUserId: string;
  linkedAt: string;
}

// Load telegram links from event store
export async function getTelegramLink(
  telegramUserId: number
): Promise<TelegramLink | null> {
  const events = await readEvents("telegram");
  for (const event of events) {
    if (
      event.type === "telegram.user_linked" &&
      event.data.telegramUserId === telegramUserId
    ) {
      return event.data as unknown as TelegramLink;
    }
  }
  return null;
}

// Link a Telegram user to an Eluma user (via /start <linking_code>)
export async function linkTelegramUser(
  telegramUserId: number,
  elumaUserId: string
): Promise<void> {
  appendEvent({
    type: "telegram.user_linked",
    aggregateType: "telegram",
    aggregateId: String(telegramUserId),
    userId: elumaUserId,
    correlationId: randomUUID(),
    version: 1,
    data: {
      telegramUserId,
      elumaUserId,
      linkedAt: new Date().toISOString(),
    },
  });
}

// Middleware: resolve Telegram user to Eluma user
export async function resolveElumaUser(telegramUserId: number) {
  const link = await getTelegramLink(telegramUserId);
  if (!link) return null;
  return loadUser(link.elumaUserId);
}
```

### Pattern 3: Voice Message Download and Transcription
**What:** Download Telegram voice message audio, pass through existing transcription pipeline
**When to use:** When user sends a voice message to the bot
**Example:**
```typescript
// server/src/telegram/handlers/voice.ts
import { BotContext } from "../bot.js";
import { transcribeAudio } from "../../voice/transcribe.js";
import { analyzeVoiceRouting } from "../../voice/router-analysis.js";
import { resolveElumaUser } from "../auth.js";

export async function handleVoiceMessage(ctx: BotContext) {
  const user = await resolveElumaUser(ctx.from!.id);
  if (!user) {
    await ctx.reply(ctx.t("telegram.not_linked"));
    return;
  }

  await ctx.reply(ctx.t("telegram.transcribing"));

  // Download voice file as buffer
  const file = await ctx.getFile();
  const filePath = file.file_path!;
  const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`;
  const response = await fetch(fileUrl);
  const audioBuffer = Buffer.from(await response.arrayBuffer());

  // Reuse existing transcription pipeline
  const result = await transcribeAudio(audioBuffer, user.language);

  // Show transcription and ask for routing
  await ctx.reply(
    ctx.t("telegram.transcription_result", { text: result.text })
  );

  // Run voice routing analysis
  const team = await getTeamForUser(user.id);
  if (team) {
    const suggestions = await analyzeVoiceRouting(
      result.text,
      team.id,
      user.language
    );
    // Present routing suggestions as inline keyboard buttons
    // ... (build InlineKeyboard from suggestions)
  }
}
```

### Pattern 4: Notification Preference Aggregate (Event-Sourced)
**What:** Store notification preferences per user using the same JSONL event pattern
**When to use:** Managing per-user, per-channel, per-priority notification settings
**Example:**
```typescript
// shared/types/notification.ts
export type NotificationChannel = "web" | "telegram" | "email";
export type NotificationPriority = "low" | "medium" | "high" | "critical";

export interface NotificationPreference {
  userId: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  enabled: boolean;
}

export interface NotificationPreferenceState {
  userId: string;
  preferences: Record<NotificationChannel, Record<NotificationPriority, boolean>>;
  telegramChatId?: number; // For Telegram delivery
  emailAddress?: string;   // For email delivery
}

// Default: all channels enabled for high+critical, web only for medium+low
export const DEFAULT_PREFERENCES: Record<
  NotificationChannel,
  Record<NotificationPriority, boolean>
> = {
  web: { low: true, medium: true, high: true, critical: true },
  telegram: { low: false, medium: false, high: true, critical: true },
  email: { low: false, medium: false, high: false, critical: true },
};
```

### Pattern 5: Project Navigation via Inline Menus
**What:** Use @grammyjs/menu to create paginated project lists with action buttons
**When to use:** /projects command, project selection for GSD workflow
**Example:**
```typescript
// server/src/telegram/menus/project-menu.ts
import { Menu } from "@grammyjs/menu";
import { BotContext } from "../bot.js";
import { getProjectsForTeam } from "../../events/reducers/project.js";

const projectMenu = new Menu<BotContext>("project-list")
  .dynamic(async (ctx, range) => {
    const user = await resolveElumaUser(ctx.from!.id);
    if (!user) return;
    const team = await getTeamForUser(user.id);
    if (!team) return;
    const projects = await getProjectsForTeam(team.id);

    for (const project of projects.filter((p) => !p.archived)) {
      range
        .text(
          `${phaseEmoji(project.currentPhase)} ${project.name}`,
          async (ctx) => {
            // Show project detail with workflow actions
            await ctx.editMessageText(formatProjectDetail(project));
            // Navigate to project-specific submenu
          }
        )
        .row();
    }
  });

export { projectMenu };
```

### Pattern 6: GSD Workflow Steps via Telegram
**What:** Render workflow button_choice steps as InlineKeyboard, text_input steps as conversation prompts
**When to use:** When user interacts with a project's GSD workflow from Telegram
**Example:**
```typescript
// Mapping workflow step types to Telegram UI:
// button_choice  -> InlineKeyboard with option buttons
// text_input     -> Bot asks question, user sends text reply
// info_display   -> Bot sends info text with "Continue" button
// ai_prompt      -> Bot sends AI question, user sends text reply
// auto_advance   -> Bot processes automatically, sends status update

import { InlineKeyboard } from "grammy";
import { getStepsForPhase } from "../../workflow/definitions.js";
import { getWorkflowState, completeWorkflowStep } from "../../workflow/engine.js";

async function renderWorkflowStep(ctx: BotContext, projectId: string) {
  const state = await getWorkflowState(projectId);
  const stepDef = getStepDefinition(state.currentStepId);

  if (stepDef.type === "button_choice") {
    const keyboard = new InlineKeyboard();
    for (const option of stepDef.options!) {
      keyboard
        .text(ctx.t(option.labelKey), `wf:${projectId}:${stepDef.id}:${option.value}`)
        .row();
    }
    await ctx.reply(ctx.t(stepDef.titleKey), { reply_markup: keyboard });
  } else if (stepDef.type === "text_input") {
    // Store pending input state in session
    ctx.session.pendingWorkflowInput = {
      projectId,
      stepId: stepDef.id,
      fieldKey: stepDef.textConfig!.fieldKey,
    };
    await ctx.reply(ctx.t(stepDef.titleKey) + "\n\n" + ctx.t(stepDef.descriptionKey!));
  } else if (stepDef.type === "info_display") {
    const keyboard = new InlineKeyboard()
      .text(ctx.t("workflow.continue"), `wf:${projectId}:${stepDef.id}:continue`);
    await ctx.reply(ctx.t(stepDef.titleKey), { reply_markup: keyboard });
  }
}
```

### Anti-Patterns to Avoid
- **Calling HTTP API routes from the bot handler:** The Telegram bot runs in the same process as the Express server. Do NOT make HTTP requests to localhost/api/... from bot handlers. Instead, import and call the server functions directly (e.g., `completeWorkflowStep()`, `transcribeAudio()`, `getProjectsForTeam()`). This avoids auth overhead, serialization cost, and circular requests.
- **Using long polling in production:** The app runs 24/7 on a self-hosted server with a stable IP. Use webhook mode, not polling. Polling wastes resources and adds latency.
- **Storing session state in grammY sessions for critical data:** grammY in-memory sessions are lost on restart. Use the JSONL event store for all persistent state (telegram links, notification preferences). Only use grammY sessions for ephemeral UI state (e.g., "which project menu is the user currently viewing").
- **Blocking the webhook handler:** grammY enforces a 10-second timeout on webhook callbacks. Voice transcription may take longer. Use a fire-and-forget pattern: acknowledge the message immediately ("Transcribing..."), then process in the background and send a follow-up message.
- **Re-implementing voice routing:** The voice routing logic already exists in `voice/router-analysis.ts`. Reuse it. The only new code is downloading the audio from Telegram servers (vs. receiving it from multer).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Telegram Bot API client | Custom HTTP wrapper for Bot API | grammY | API surface is huge (100+ methods), types change per release, polling/webhook management is complex |
| Interactive menus with state | Custom callback_data parsing + state tracking | @grammyjs/menu | Menu state management, button callback routing, and multi-page navigation are deceptively complex |
| Multi-step conversational input | Custom session-based state machine | @grammyjs/conversations | Handles replay safety, side-effect isolation, concurrent conversations, and async waits |
| Voice file download | Custom Telegram file API calls | @grammyjs/files | Handles URL construction, token injection, download-to-buffer, and file path management |
| Audio transcription | New transcription pipeline for Telegram | Existing `transcribeAudio()` from Phase 6 | Already wraps AI SDK + Whisper; accepts Buffer; handles language hints and fallbacks |
| Voice routing | New routing logic for Telegram | Existing `analyzeVoiceRouting()` from Phase 6 | Already performs AI-powered semantic project matching with confidence scores |
| Email sending | Custom SMTP client | nodemailer | SMTP protocol is complex (TLS, auth, encoding, attachments); nodemailer handles all edge cases |
| i18n for bot messages | Custom translation lookup | @grammyjs/i18n (or share existing i18n keys) | Integrates with grammY context; supports locale detection from Telegram user settings |

**Key insight:** The Telegram bot is primarily an alternative UI layer over existing server-side logic. The bulk of the work is mapping Telegram's interaction model (commands, inline keyboards, text replies, voice messages) to existing function calls. Almost zero new business logic is needed -- it is all UI adaptation.

## Common Pitfalls

### Pitfall 1: Webhook URL Configuration
**What goes wrong:** Bot doesn't receive messages because the webhook URL is wrong, unreachable, or missing HTTPS.
**Why it happens:** Telegram requires a publicly accessible HTTPS URL for webhooks. Self-hosted servers behind NAT or without SSL certificates fail silently.
**How to avoid:** The self-hosted server must have a domain with SSL (Let's Encrypt). Set the webhook URL via `bot.api.setWebhook()` on server startup. Include a secret path segment to prevent unauthorized POST requests. For development, use `bot.start()` (long polling) instead.
**Warning signs:** Bot connects but never receives updates. No errors in logs because Telegram simply can't reach the server.

### Pitfall 2: Telegram Voice Messages and Whisper Format
**What goes wrong:** Voice message transcription fails because of format incompatibility.
**Why it happens:** Telegram voice messages are OGG Opus (.oga). The Whisper API officially supports "ogg" in its format list, and the error message also lists "oga". However, some implementations have reported issues with Opus-encoded OGG.
**How to avoid:** Pass the audio buffer directly to `transcribeAudio()` with no conversion first. If Whisper rejects it, add ffmpeg conversion to webm as a fallback (the existing multer pipeline already accepts webm). Monitor transcription failures and log the error details.
**Warning signs:** Transcription returns errors mentioning "Invalid file format" for Telegram voice messages.

### Pitfall 3: Webhook Handler Timeout (10 seconds)
**What goes wrong:** grammY throws a timeout error because the handler took too long.
**Why it happens:** Voice transcription (Whisper API call + AI routing) can take 5-15 seconds. Synchronous handling in the webhook callback exceeds the timeout.
**How to avoid:** Reply immediately with a "processing" message, then handle transcription in a background async task. Send the result as a follow-up message using `bot.api.sendMessage()` with the chat ID.
**Warning signs:** Intermittent "Webhook handler timed out" errors in logs, especially for voice messages.

### Pitfall 4: Telegram User Not Linked
**What goes wrong:** User sends commands but the bot can't identify which Eluma user they are.
**Why it happens:** No mechanism to link Telegram accounts to Eluma accounts.
**How to avoid:** Implement a linking flow: (1) Web app generates a one-time linking code, (2) User sends `/start <code>` to the bot, (3) Bot validates code and creates a `telegram.user_linked` event. All subsequent bot interactions resolve the Telegram user ID to the Eluma user.
**Warning signs:** Every bot interaction returns "Please link your account first."

### Pitfall 5: Callback Data Length Limit
**What goes wrong:** Inline keyboard buttons stop working because callback data is too long.
**Why it happens:** Telegram limits callback_data to 64 bytes. Encoding project UUIDs (36 chars) plus step IDs plus values can exceed this.
**How to avoid:** Use short prefixes for callback data (e.g., `p:` for project, `wf:` for workflow). Use abbreviated IDs or index-based references. The @grammyjs/menu plugin handles this automatically for registered menus.
**Warning signs:** Buttons appear but pressing them produces no response; Telegram API returns "BUTTON_DATA_INVALID" error.

### Pitfall 6: Notification Spam
**What goes wrong:** Users get overwhelmed with notifications across all channels for every event.
**Why it happens:** Default notification preferences are too aggressive, or every domain event triggers a notification.
**How to avoid:** Define a priority classification for events (only high/critical events trigger notifications by default). Ship with conservative defaults: web notifications for all priorities, Telegram for high+critical only, email for critical only. Let users customize via the notification settings menu in both web and Telegram.
**Warning signs:** Users disable notifications entirely because of volume.

### Pitfall 7: Express JSON Parsing Conflicts with Webhook
**What goes wrong:** grammY webhook handler fails because Express has already consumed the request body.
**Why it happens:** `app.use(express.json())` is applied globally before the webhook route, and grammY's `webhookCallback` needs to parse the raw body itself.
**How to avoid:** Register the Telegram webhook route BEFORE the global `express.json()` middleware, or use a separate Express Router that does not use `express.json()`. The `webhookCallback(bot, "express")` handles its own body parsing.
**Warning signs:** Bot receives empty updates; webhook handler gets `undefined` for `ctx.message`.

## Code Examples

Verified patterns from official sources:

### grammY Bot Setup with Express Webhook
```typescript
// Source: https://grammy.dev/guide/deployment-types
import { Bot, webhookCallback } from "grammy";
import express from "express";

const bot = new Bot("<token>");

bot.command("start", (ctx) => ctx.reply("Welcome!"));
bot.on("message:text", (ctx) => ctx.reply("Got your message!"));

const app = express();
// Register webhook BEFORE express.json() to avoid body parsing conflicts
app.use(`/api/telegram/webhook/${secretPath}`, webhookCallback(bot, "express"));
app.use(express.json());
// ... rest of app setup
```

### Inline Keyboard with Callback Handling
```typescript
// Source: https://grammy.dev/plugins/keyboard
import { InlineKeyboard } from "grammy";

// Build keyboard
const keyboard = new InlineKeyboard()
  .text("Option A", "action:a")
  .text("Option B", "action:b")
  .row()
  .text("Cancel", "action:cancel");

// Send with keyboard
await ctx.reply("Choose an option:", { reply_markup: keyboard });

// Handle callbacks
bot.callbackQuery("action:a", async (ctx) => {
  await ctx.answerCallbackQuery({ text: "You chose A" });
  await ctx.editMessageText("You selected Option A");
});

bot.callbackQuery("action:b", async (ctx) => {
  await ctx.answerCallbackQuery({ text: "You chose B" });
  await ctx.editMessageText("You selected Option B");
});
```

### Menu Plugin for Dynamic Project List
```typescript
// Source: https://grammy.dev/plugins/menu
import { Menu } from "@grammyjs/menu";

const projectMenu = new Menu<BotContext>("projects")
  .dynamic(async (ctx, range) => {
    const projects = await getProjectsForUser(ctx);
    for (const p of projects) {
      range.text(p.name, async (ctx) => {
        await ctx.editMessageText(formatProject(p));
        ctx.menu.nav("project-detail");
      }).row();
    }
  });

const detailMenu = new Menu<BotContext>("project-detail")
  .text("Status", (ctx) => ctx.reply("Current status..."))
  .text("Workflow", (ctx) => ctx.reply("Current step..."))
  .row()
  .text("Back", (ctx) => ctx.menu.nav("projects"));

projectMenu.register(detailMenu);
bot.use(projectMenu);
```

### Voice Message Download and Transcription
```typescript
// Source: https://grammy.dev/guide/files + existing transcribe.ts
bot.on("message:voice", async (ctx) => {
  const user = await resolveElumaUser(ctx.from!.id);
  if (!user) {
    await ctx.reply("Please link your account first. Use /link in the web app.");
    return;
  }

  // Acknowledge immediately (avoid timeout)
  const processingMsg = await ctx.reply("Transcribing your voice message...");

  try {
    // Download voice file
    const file = await ctx.getFile();
    const url = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
    const res = await fetch(url);
    const buffer = Buffer.from(await res.arrayBuffer());

    // Reuse existing transcription pipeline
    const result = await transcribeAudio(buffer, user.language);

    // Edit the processing message with the result
    await ctx.api.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      `Transcription:\n\n${result.text}`
    );

    // Continue with routing...
  } catch (err) {
    await ctx.api.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      "Transcription failed. Please try again."
    );
  }
});
```

### Setting Bot Commands (Slash Commands)
```typescript
// Source: https://grammy.dev/guide/commands
await bot.api.setMyCommands([
  { command: "start", description: "Start the bot / link account" },
  { command: "projects", description: "List your projects" },
  { command: "ideas", description: "View the Idea Pool" },
  { command: "status", description: "Quick status overview" },
  { command: "settings", description: "Notification preferences" },
  { command: "help", description: "Show available commands" },
]);
```

### Nodemailer Email Notification
```typescript
// Source: https://nodemailer.com/
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmailNotification(
  to: string,
  subject: string,
  htmlBody: string
): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || "eluma@localhost",
    to,
    subject,
    html: htmlBody,
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Telegraf 3.x (JavaScript) | grammY 1.x (TypeScript-first) | 2021+ | Full type safety, better Bot API coverage, modern plugin ecosystem |
| Telegraf 4.x (TypeScript migration) | grammY 1.x | 2022+ | grammY has cleaner types, better docs, faster Bot API updates |
| Long polling (development) | Webhooks (production) | Always | Self-hosted 24/7 server should use webhooks for efficiency |
| node-telegram-bot-api | grammY with plugin ecosystem | 2021+ | Scalable architecture with middleware, menus, conversations |
| Custom notification dispatching | Event-sourced preferences + channel dispatchers | N/A | Fits existing event-sourced architecture pattern |

**Deprecated/outdated:**
- Telegraf v3: Untyped JavaScript, unmaintained. Do not use.
- Telegraf v4: Complex types, lagging Bot API support, documentation replaced by generated API reference. grammY is the recommended alternative.
- `node-telegram-bot-api` for complex bots: Fine for simple 50-line bots, becomes unmanageable for full-mirror workflow bots. Use grammY.

## Open Questions

1. **Webhook HTTPS Requirement**
   - What we know: Telegram requires HTTPS webhook URLs. The self-hosted server needs a domain + SSL certificate.
   - What's unclear: Does the current server setup have a domain and SSL configured? Is Let's Encrypt or another certificate provider in place?
   - Recommendation: If no domain/SSL exists yet, use long polling (`bot.start()`) for initial development. Add webhook setup as a deployment step. The code should support both modes via environment variable (`TELEGRAM_WEBHOOK_URL` set = webhook mode, unset = polling mode).

2. **Telegram Bot Token Provisioning**
   - What we know: A Telegram bot token is needed from @BotFather. This is a one-time manual setup.
   - What's unclear: Has the bot been created yet?
   - Recommendation: Plan includes a setup step: create bot via @BotFather, store token in environment variable `TELEGRAM_BOT_TOKEN`. Bot creation takes 30 seconds.

3. **SMTP Server for Email Notifications**
   - What we know: Nodemailer needs an SMTP server. The app is self-hosted.
   - What's unclear: Is there an SMTP server available? Gmail SMTP? Local Postfix?
   - Recommendation: Make email notifications optional. Default to disabled if `SMTP_HOST` is not set. This allows the notification system to ship even without email configured. Telegram and web channels work independently.

4. **Offline Voice Message Queuing (TELE-06)**
   - What we know: The requirement says "offline voice messages are queued and synced when connectivity returns."
   - What's unclear: Telegram itself handles this -- when a user is offline, Telegram queues the message and delivers it when they reconnect. The bot receives it whenever Telegram delivers it.
   - Recommendation: No special queue implementation needed on the bot side. Telegram's infrastructure handles offline queuing natively. The bot just needs to process voice messages whenever they arrive, regardless of delay. Document this as "handled by Telegram infrastructure" in the plan.

5. **Web Notification Delivery Mechanism**
   - What we know: The web app already has polling-based data refresh (30-second intervals for activity feed). No WebSocket or SSE infrastructure exists.
   - What's unclear: Should web notifications use the existing polling mechanism or add real-time delivery?
   - Recommendation: Store web notifications in the event store as `notification.created` events. The web client polls for unread notifications on the same 30-second interval. Add a notification badge/counter to the nav bar. This is consistent with the existing architecture. Real-time delivery (WebSockets/SSE) can be added later if needed but is not required for a 2-user app.

## Sources

### Primary (HIGH confidence)
- [grammY Official Documentation](https://grammy.dev/) -- Framework overview, API, plugins, deployment
- [grammY Keyboard Plugin](https://grammy.dev/plugins/keyboard) -- InlineKeyboard API, callback query handling
- [grammY Menu Plugin](https://grammy.dev/plugins/menu) -- Dynamic menu construction, navigation
- [grammY Files Plugin](https://grammy.dev/plugins/files) -- File download API, `hydrateFiles` setup
- [grammY Deployment Types](https://grammy.dev/guide/deployment-types) -- Webhook vs polling comparison, Express integration
- [grammY Framework Comparison](https://grammy.dev/resources/comparison) -- grammY vs Telegraf vs NTBA detailed analysis
- [Telegram Bot API](https://core.telegram.org/bots/api) -- Official Bot API reference (buttons, voice, getFile)
- Existing codebase: `server/src/voice/transcribe.ts` -- Verified `transcribeAudio()` accepts Buffer, returns TranscriptionResult
- Existing codebase: `server/src/voice/router-analysis.ts` -- Verified `analyzeVoiceRouting()` accepts text+teamId+language
- Existing codebase: `server/src/workflow/engine.ts` -- Verified `completeWorkflowStep()` and `getWorkflowState()` APIs
- Existing codebase: `server/src/events/store.ts` -- Verified `appendEvent()` and `readEvents()` patterns

### Secondary (MEDIUM confidence)
- [grammY npm (v1.39.3)](https://www.npmjs.com/package/grammy) -- Current version, weekly downloads (~137k)
- [grammY Conversations Plugin](https://grammy.dev/plugins/conversations) -- Multi-step workflow handling
- [grammY i18n Plugin](https://grammy.dev/plugins/i18n) -- Internationalization with Fluent format
- [Nodemailer](https://nodemailer.com/) -- Email sending library documentation
- [OpenAI Whisper supported formats](https://platform.openai.com/docs/api-reference/audio/) -- flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm (OGG supported)
- [npm trends: grammy vs telegraf vs node-telegram-bot-api](https://npmtrends.com/grammy-vs-node-telegram-bot-api-vs-telegraf-vs-telegram-bot-api) -- Download statistics comparison

### Tertiary (LOW confidence)
- OGG Opus compatibility with Whisper API: Multiple community reports suggest OGG Opus from Telegram works directly with Whisper, but some older reports suggest conversion may be needed. The official format list includes "ogg" and "oga", and the AI SDK abstracts the file format handling. Needs runtime validation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- grammY is the clear best choice for TypeScript Telegram bots. npm trends, documentation quality, and type safety all support this. Nodemailer is the undisputed Node.js email library.
- Architecture: HIGH -- The integration pattern (grammY webhook in Express, direct function calls to server modules) is well-documented and follows the existing codebase architecture. The notification preference aggregate follows the established event-sourced pattern.
- Pitfalls: HIGH -- Webhook configuration, callback data limits, timeout handling, and format compatibility are well-documented in grammY and Telegram Bot API official docs. The existing codebase inspection reveals the exact function signatures to reuse.
- Voice pipeline reuse: HIGH -- Verified that `transcribeAudio()` accepts Buffer and returns TranscriptionResult. The same function works for both web uploads (via multer) and Telegram downloads (via fetch). OGG format is in Whisper's supported list.
- Notification system: MEDIUM -- The notification preference model is straightforward (event-sourced CRUD), but the dispatcher integration with existing event triggers (Phase 4 AI triggers) needs careful wiring.

**Research date:** 2026-02-08
**Valid until:** 2026-03-10 (30 days -- grammY ecosystem is stable; Telegram Bot API updates are backward-compatible)
