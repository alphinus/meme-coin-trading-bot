# Phase 11: Telegram Bot i18n - Research

**Researched:** 2026-02-09
**Domain:** grammY Telegram bot internationalization with @grammyjs/i18n (Fluent)
**Confidence:** HIGH

## Summary

The Telegram bot (`server/src/telegram/`) currently has all user-facing strings hardcoded in English across 8 files: `commands.ts`, `formatters.ts`, `bot.ts`, plus menus (`project-menu.ts`, `idea-menu.ts`, `settings-menu.ts`, `workflow-menu.ts`) and handlers (`text.ts`, `voice.ts`, `callback.ts`). Additionally, the notification emitter (`server/src/notifications/emitter.ts`) generates English-only notification titles and bodies that flow through the Telegram channel.

The project already has `@grammyjs/i18n` v1.1.2 installed and the `I18nFlavor` type is already composed into `BotContext` in `server/src/telegram/types.ts`. However, the plugin is not yet initialized or wired as middleware. The plugin uses **Mozilla Fluent** (.ftl) format, not JSON -- this is a different format from the client-side i18n (i18next with JSON). The `User` model already has a `language: "de" | "en"` field that is available via `resolveElumaUser()` in every handler.

**Primary recommendation:** Wire up `@grammyjs/i18n` with a custom `localeNegotiator` that reads `user.language` from the Eluma user profile (not Telegram's `language_code`), create `de.ftl` and `en.ftl` Fluent translation files, and systematically replace all hardcoded strings with `ctx.t("key")` calls. For the notification emitter (which runs outside bot context), use the `I18n` instance's standalone `i18n.t(locale, key)` method.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@grammyjs/i18n` | 1.1.2 | grammY i18n plugin using Fluent format | Already installed, already typed into BotContext; official grammY plugin |
| `grammy` | 1.39.3 | Telegram bot framework | Already in use |
| Mozilla Fluent (.ftl) | N/A | Translation file format | Required by @grammyjs/i18n; simple key=value with powerful selectors |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@grammyjs/menu` | 1.3.1 | Dynamic inline menus | Already in use; menu button labels need i18n |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@grammyjs/i18n` (Fluent) | Custom JSON key-value map (like `server/src/i18n/server.ts`) | Simpler but loses `ctx.t()` integration, no variable interpolation, no Fluent features. Not recommended since `@grammyjs/i18n` is already installed and typed. |
| Separate Fluent files | Reuse client JSON translations | Cannot reuse -- client uses i18next JSON, this plugin requires Fluent .ftl format. Different systems serve different contexts. |

### Installation
No installation needed. `@grammyjs/i18n` v1.1.2 is already in `server/package.json` and installed.

## Architecture Patterns

### Recommended File Structure
```
server/src/telegram/
  locales/
    de.ftl          # German translations (~100 keys)
    en.ftl          # English translations (~100 keys)
  i18n.ts           # I18n instance creation + locale negotiator
  bot.ts            # Wire i18n.middleware() into bot
  commands.ts       # ctx.t("cmd-start-welcome") replaces hardcoded strings
  formatters.ts     # Accept language param or ctx.t for labels
  types.ts          # Already has I18nFlavor (no change needed)
  menus/            # ctx.t("menu-...") for button labels
  handlers/         # ctx.t("handler-...") for response messages
```

### Pattern 1: I18n Instance with Custom Locale Negotiator
**What:** Create I18n instance that resolves language from Eluma user profile instead of Telegram's `language_code`.
**When to use:** Always -- the user's Eluma `language` preference (synced from web UI) is the authoritative source.
**Example:**
```typescript
// Source: https://grammy.dev/plugins/i18n (localeNegotiator section)
import { I18n } from "@grammyjs/i18n";
import type { BotContext } from "./types.js";
import { resolveElumaUser } from "./auth.js";

export const i18n = new I18n<BotContext>({
  defaultLocale: "de",  // Match client-side fallback
  localeNegotiator: async (ctx) => {
    const telegramUserId = ctx.from?.id;
    if (!telegramUserId) return "de";
    const user = await resolveElumaUser(telegramUserId);
    return user?.language ?? "de";
  },
});

// Load Fluent translation files
i18n.loadLocaleSync("de", { filePath: "server/src/telegram/locales/de.ftl" });
i18n.loadLocaleSync("en", { filePath: "server/src/telegram/locales/en.ftl" });
```

### Pattern 2: Using ctx.t() in Handlers
**What:** Replace hardcoded strings with translation key lookups.
**When to use:** Every `ctx.reply()`, `ctx.editMessageText()`, `ctx.answerCallbackQuery()`, `range.text()`, `range.back()` call.
**Example:**
```typescript
// Before:
await ctx.reply("Your Telegram is not linked to an Eluma account\\.\n\nGenerate a code...");

// After:
await ctx.reply(escapeMd(ctx.t("not-linked")), { parse_mode: "MarkdownV2" });
```

### Pattern 3: Standalone Translation for Notifications
**What:** The notification emitter runs outside bot context (no `ctx`). Use `i18n.t(locale, key)` directly.
**When to use:** In `notifications/emitter.ts` and `notifications/channels/telegram.ts`.
**Example:**
```typescript
// In emitter.ts -- resolve user language, then translate
import { i18n } from "../telegram/i18n.js";
import { loadUser } from "../auth/users.js";

const user = loadUser(member.userId);
const lang = user?.language ?? "de";
const title = i18n.t(lang, "notif-new-project");
const body = i18n.t(lang, "notif-new-project-body", { name: data.name });
```

### Pattern 4: Fluent FTL File Format
**What:** Fluent syntax for translation files.
**When to use:** All translation strings.
**Example:**
```ftl
# server/src/telegram/locales/en.ftl

# Commands
cmd-start-welcome = Welcome to *Eluma Bot*\!
    To connect your account, generate a linking code in the Eluma web app under Settings > Telegram, then send:
    `/start <code>`
cmd-start-linked = Already linked as *{ $displayName }*.
    Use /help to see available commands.
cmd-start-link-success = Successfully linked! Welcome, *{ $displayName }*.
    Use /help to see available commands.
cmd-start-invalid-code = Invalid or expired linking code. Please generate a new code from the Eluma web app and try again.

# Help
cmd-help-title = *Eluma Bot Commands*
cmd-help-start = /start <code> - Link your Telegram to Eluma
cmd-help-projects = /projects - List your team's projects
cmd-help-ideas = /ideas - Browse the idea pool
cmd-help-status = /status - Quick overview of projects and ideas
cmd-help-settings = /settings - Notification preferences
cmd-help-help = /help - Show this help message

# Errors
error-not-linked = Your Telegram is not linked to an Eluma account.
    Generate a code in the web app, then send `/start <code>`.
error-no-team = You are not part of any team yet.
error-no-user = Could not determine your Telegram user.
```

### Pattern 5: MarkdownV2 Escaping with Fluent
**What:** Fluent handles the text content; MarkdownV2 escaping is applied at render time.
**When to use:** Telegram messages using `parse_mode: "MarkdownV2"`.
**Critical insight:** Keep Fluent translations as plain text (no MarkdownV2 escaping in .ftl files). Apply `escapeMd()` after `ctx.t()` returns the plain string. Embed Markdown formatting (`*bold*`, `_italic_`) only where intentional, and escape them in Fluent if they're literal.

### Pattern 6: Formatter Functions with Language Parameter
**What:** `formatProjectList`, `formatIdeaList`, etc. need language context for labels like "Projects", "Ideas", "Phase:", "Members:", etc.
**When to use:** When formatting data-driven messages that combine translated labels with dynamic data.
**Example:**
```typescript
// Option A: Pass ctx.t function to formatter
export function formatProjectList(
  projects: ProjectState[],
  t: (key: string) => string
): string {
  if (projects.length === 0) {
    return escapeMd(t("projects-empty"));
  }
  // ...
  return `*${t("projects-title")}*\n\n${lines.join("\n")}`;
}

// Option B: Pass language and use i18n instance
export function formatProjectList(
  projects: ProjectState[],
  lang: "de" | "en"
): string {
  if (projects.length === 0) {
    return escapeMd(i18n.t(lang, "projects-empty"));
  }
  // ...
}
```
**Recommendation:** Option A (pass `ctx.t`) is cleaner for bot handlers. Option B is needed for notification channel (no ctx available).

### Pattern 7: setMyCommands Per Language
**What:** Telegram's `setMyCommands` supports language-specific command descriptions.
**When to use:** At bot startup to register DE and EN command descriptions.
**Example:**
```typescript
// Register English command descriptions
bot.api.setMyCommands(
  [
    { command: "start", description: "Link your Telegram account to Eluma" },
    { command: "projects", description: "List your team's projects" },
    // ...
  ],
  { language_code: "en" }
);

// Register German command descriptions
bot.api.setMyCommands(
  [
    { command: "start", description: "Telegram-Konto mit Eluma verknüpfen" },
    { command: "projects", description: "Projekte deines Teams auflisten" },
    // ...
  ],
  { language_code: "de" }
);
```

### Anti-Patterns to Avoid
- **Embedding MarkdownV2 escaping in .ftl files:** Translations should be plain text. Escaping is a rendering concern, not a content concern. Apply `escapeMd()` after `ctx.t()`.
- **Using Telegram's `language_code` for locale negotiation:** The user's Eluma `language` preference is authoritative, not Telegram's client language. The Eluma user may have German Telegram but prefer English in Eluma.
- **Creating a separate i18n system for the bot:** Use `@grammyjs/i18n` which is already installed and typed. Don't build a second key-value map system.
- **Mixing i18n and non-i18n strings in same file:** When a file is converted, all user-facing strings in that file must go through `ctx.t()`. No partial conversions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bot i18n middleware | Custom locale detection + translation map | `@grammyjs/i18n` with `localeNegotiator` | Already installed, typed into BotContext, handles all the plumbing |
| Translation format | Custom JSON loader for bot | Mozilla Fluent (.ftl) via `@grammyjs/i18n` | Plugin requires Fluent; it provides variable interpolation, plurals, selectors |
| Per-user locale resolution | Manual lookup in every handler | `localeNegotiator` callback in I18n config | Runs automatically per update, injects `ctx.t()` |

**Key insight:** The `@grammyjs/i18n` plugin is already installed and the `I18nFlavor` type is already in `BotContext`. The infrastructure is pre-built -- the phase is about writing translations and replacing hardcoded strings, not building translation infrastructure.

## Common Pitfalls

### Pitfall 1: MarkdownV2 Escaping in Translation Files
**What goes wrong:** Putting `\\*` and `\\.` in .ftl files makes translations unreadable and error-prone.
**Why it happens:** Developers try to pre-escape for Telegram's MarkdownV2 format inside translation strings.
**How to avoid:** Keep .ftl files as clean plain text. Apply `escapeMd()` at the call site after `ctx.t()`. Use Markdown formatting only for intentional bold/italic.
**Warning signs:** Backslash-heavy translation strings, Telegram parse errors on some languages but not others.

### Pitfall 2: Locale Negotiator Performance
**What goes wrong:** The `localeNegotiator` fires on every update. If it calls `resolveElumaUser()` (which replays events), it duplicates work already done by the handler.
**Why it happens:** The locale negotiator runs before any handler, and handlers typically call `resolveElumaUser()` again.
**How to avoid:** Cache the resolved user on the context or in session. Or accept the minor duplication since `resolveElumaUser` is cheap (reads a JSON file, not event replay -- see `auth.ts` line 127: `loadUser(link.elumaUserId)` reads from disk).
**Warning signs:** Slow bot response times on every message.

### Pitfall 3: Notification Emitter Has No Bot Context
**What goes wrong:** `emitNotificationForEvent()` runs outside the bot middleware pipeline, so `ctx.t()` is unavailable.
**Why it happens:** Notifications are dispatched from route handlers via fire-and-forget, not from Telegram updates.
**How to avoid:** Use `i18n.t(locale, key, variables)` directly on the exported I18n instance. Resolve user language via `loadUser(userId).language`.
**Warning signs:** Notification messages stay in English regardless of user preference.

### Pitfall 4: Fluent Requires Specific Syntax for Variables
**What goes wrong:** Using `{name}` instead of `{ $name }` in .ftl files silently fails (returns the key name).
**Why it happens:** Developers are used to i18next `{{name}}` or template literal `${name}` syntax.
**How to avoid:** Always use Fluent's `{ $variableName }` syntax with the `$` prefix and spaces around braces.
**Warning signs:** Variable placeholders appear literally in bot messages instead of resolved values.

### Pitfall 5: Missing German Translations Break Unicode Rule
**What goes wrong:** If a German translation key is missing, Fluent falls back to the key name (e.g., `cmd-help-title`), producing gibberish for German users.
**Why it happens:** Incomplete translation coverage. One locale file has a key the other doesn't.
**How to avoid:** Always add both `de.ftl` and `en.ftl` entries in the same commit (per CLAUDE.md rule). Verify key parity between files.
**Warning signs:** Users see translation keys like `error-not-linked` instead of actual text.

### Pitfall 6: setMyCommands Only Registers Once
**What goes wrong:** Command descriptions in Telegram's menu stay in one language.
**Why it happens:** `setMyCommands` is called once at startup without language scoping.
**How to avoid:** Call `setMyCommands` twice -- once with `{ language_code: "en" }` and once with `{ language_code: "de" }`. This registers per-language command descriptions in Telegram's UI.
**Warning signs:** German users see English command descriptions in the Telegram command menu.

## Code Examples

### I18n Instance Setup
```typescript
// server/src/telegram/i18n.ts
// Source: https://grammy.dev/plugins/i18n (verified)
import { I18n } from "@grammyjs/i18n";
import { resolve } from "path";
import type { BotContext } from "./types.js";
import { resolveElumaUser } from "./auth.js";

export const i18n = new I18n<BotContext>({
  defaultLocale: "de",
  localeNegotiator: async (ctx) => {
    const telegramUserId = ctx.from?.id;
    if (!telegramUserId) return "de";
    const user = await resolveElumaUser(telegramUserId);
    return user?.language ?? "de";
  },
});

// Load translation files synchronously at import time
const localesDir = resolve(import.meta.dirname, "locales");
i18n.loadLocaleSync("de", { filePath: resolve(localesDir, "de.ftl") });
i18n.loadLocaleSync("en", { filePath: resolve(localesDir, "en.ftl") });
```

### Bot Middleware Registration
```typescript
// In bot.ts createBot():
import { i18n } from "./i18n.js";

// Install i18n middleware (AFTER session, BEFORE commands)
b.use(i18n.middleware());
```

### Command Handler with ctx.t()
```typescript
// In commands.ts
bot.command("help", async (ctx) => {
  const lines = [
    ctx.t("cmd-help-title"),
    "",
    ctx.t("cmd-help-start"),
    ctx.t("cmd-help-projects"),
    ctx.t("cmd-help-ideas"),
    ctx.t("cmd-help-status"),
    ctx.t("cmd-help-settings"),
    ctx.t("cmd-help-help"),
  ];
  await ctx.reply(escapeMd(lines.join("\n")), { parse_mode: "MarkdownV2" });
});
```

### Fluent FTL File (German)
```ftl
# server/src/telegram/locales/de.ftl

# Befehle
cmd-start-welcome = Willkommen beim *Eluma Bot*!
    Um dein Konto zu verbinden, generiere einen Verknüpfungscode in der Eluma Web-App unter Einstellungen > Telegram, dann sende:
    `/start <code>`
cmd-start-linked = Bereits verknüpft als *{ $displayName }*.
    Verwende /help um verfügbare Befehle zu sehen.
cmd-start-link-success = Erfolgreich verknüpft! Willkommen, *{ $displayName }*.
    Verwende /help um verfügbare Befehle zu sehen.
cmd-start-invalid-code = Ungültiger oder abgelaufener Verknüpfungscode. Bitte generiere einen neuen Code in der Eluma Web-App und versuche es erneut.
cmd-help-title = *Eluma Bot Befehle*
cmd-help-start = /start <code> - Telegram mit Eluma verknüpfen
cmd-help-projects = /projects - Projekte deines Teams auflisten
cmd-help-ideas = /ideas - Den Ideen-Pool durchsuchen
cmd-help-status = /status - Schnellübersicht über Projekte und Ideen
cmd-help-settings = /settings - Benachrichtigungseinstellungen
cmd-help-help = /help - Diese Hilfe anzeigen

# Formatierung
fmt-projects-title = Projekte
fmt-ideas-title = Ideen
fmt-status-title = Statusübersicht
fmt-projects-empty = Keine Projekte gefunden. Erstelle eines in der Web-App!
fmt-ideas-empty = Keine Ideen im Pool. Erfasse eine per Sprache oder Web!
fmt-phase-label = Phase
fmt-members-label = Mitglieder
fmt-created-label = Erstellt
fmt-readiness-label = Bereitschaft
fmt-rounds-label = Runden
fmt-active = Aktiv
fmt-archived = Archiviert
fmt-last-activity = Letzte Aktivität
fmt-and-more = ...und { $count } weitere

# Fehler
error-not-linked = Dein Telegram ist nicht mit einem Eluma-Konto verknüpft.
    Generiere einen Code in der Web-App, dann sende `/start <code>`.
error-no-team = Du bist noch keinem Team beigetreten.
error-no-user = Telegram-Benutzer konnte nicht ermittelt werden.

# Menüs
menu-no-project = Kein Projekt ausgewählt
menu-project-not-found = Projekt nicht gefunden
menu-workflow = Workflow >
menu-back-projects = < Zurück zu Projekten
menu-no-projects = Keine Projekte
menu-no-idea = Keine Idee ausgewählt
menu-idea-not-found = Idee nicht gefunden
menu-refine = Verfeinern
menu-propose-graduation = Abschluss vorschlagen
menu-vote-yes = Ja stimmen
menu-vote-no = Nein stimmen
menu-back-ideas = < Zurück zu Ideen
menu-no-ideas = Keine Ideen
menu-settings-title = *Benachrichtigungseinstellungen*
menu-settings-subtitle = Kanal zum Konfigurieren wählen:

# Benachrichtigungen
notif-new-project = Neues Projekt
notif-new-project-body = Projekt "{ $name }" wurde erstellt.
notif-phase-advanced = Phase fortgeschritten
notif-phase-advanced-body = Projekt "{ $name }" ist zu { $phase } fortgeschritten.
notif-project-archived = Projekt archiviert
notif-project-archived-body = Projekt "{ $name }" wurde archiviert.
notif-new-idea = Neue Idee
notif-new-idea-body = Neue Idee "{ $title }" zum Pool hinzugefügt.
notif-idea-graduated = Idee zu Projekt geworden
notif-idea-graduated-body = Idee "{ $title }" ist zu einem vollständigen Projekt geworden.
```

### Notification Emitter with i18n
```typescript
// In emitter.ts
import { i18n } from "../telegram/i18n.js";
import { loadUser } from "../auth/users.js";

// Per recipient, resolve language and translate
const user = loadUser(member.userId);
const lang = user?.language ?? "de";
const title = i18n.t(lang, "notif-new-project");
const body = i18n.t(lang, "notif-new-project-body", { name: data.name });
```

## Scope Inventory

### Files Requiring Changes (11 files)

**Telegram bot files (8 files):**
1. `server/src/telegram/bot.ts` -- Wire i18n middleware
2. `server/src/telegram/commands.ts` -- ~15 hardcoded message strings + setMyCommands descriptions
3. `server/src/telegram/formatters.ts` -- ~12 label strings ("Projects", "Phase:", "Members:", etc.)
4. `server/src/telegram/menus/project-menu.ts` -- ~6 button labels and callback answers
5. `server/src/telegram/menus/idea-menu.ts` -- ~12 button labels and callback answers
6. `server/src/telegram/menus/settings-menu.ts` -- ~4 labels
7. `server/src/telegram/menus/workflow-menu.ts` -- ~10 message strings
8. `server/src/telegram/handlers/text.ts` -- ~5 message strings
9. `server/src/telegram/handlers/voice.ts` -- ~8 message strings
10. `server/src/telegram/handlers/callback.ts` -- ~6 callback answer strings

**Notification files (1 file):**
11. `server/src/notifications/emitter.ts` -- ~15 notification title+body pairs (EVENT_NOTIFICATION_MAP)

**New files to create (3 files):**
- `server/src/telegram/i18n.ts` -- I18n instance + locale negotiator
- `server/src/telegram/locales/de.ftl` -- German Fluent translations (~100 keys)
- `server/src/telegram/locales/en.ftl` -- English Fluent translations (~100 keys)

### Estimated Key Count
- Commands: ~15 keys
- Formatters: ~15 keys
- Menus: ~25 keys
- Handlers: ~15 keys
- Notifications: ~30 keys (title + body for 15 event types)
- **Total: ~100 translation keys per language**

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@grammyjs/i18n` uses Fluent | Still current | Stable since v1.0 | Fluent .ftl format is the only option |
| Session-based locale storage | Custom `localeNegotiator` preferred | Always available | Better when locale is stored externally (like Eluma user profile) |
| `ctx.from.language_code` for locale | `localeNegotiator` with database lookup | Best practice for apps with user profiles | Ensures Eluma preference takes precedence |

**Deprecated/outdated:**
- The old `telegraf-i18n` package (for Telegraf framework) -- not relevant, this project uses grammY.

## Open Questions

1. **MarkdownV2 vs Markdown in translations**
   - What we know: Current code mixes `parse_mode: "Markdown"` and `parse_mode: "MarkdownV2"`. These have different escaping rules. MarkdownV2 requires escaping many more characters.
   - What's unclear: Should we standardize on one parse mode?
   - Recommendation: Keep as-is for now. The escaping functions (`escapeMd` for V2) handle the difference. Translations should be plain text; escaping is applied at render.

2. **Notification emitter imports i18n from telegram module**
   - What we know: The notification emitter needs `i18n.t(locale, key)` but currently has no dependency on the telegram module.
   - What's unclear: Is this circular dependency acceptable?
   - Recommendation: The `i18n.ts` file will be a pure data module (no bot dependency). The emitter importing it creates no circular dependency since `i18n.ts` only depends on `auth.ts` and Fluent files.

3. **localeNegotiator async performance**
   - What we know: `resolveElumaUser()` calls `getTelegramLink()` (event replay) then `loadUser()` (file read). This happens on every update via the negotiator AND again in most handlers.
   - What's unclear: Will the double-resolution cause noticeable latency?
   - Recommendation: Accept the minor overhead. `getTelegramLink` reads a small JSONL file, and `loadUser` reads a small JSON file. For a 2-user system, this is negligible. If needed later, cache the user on `ctx.session`.

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** -- All 12 source files in `server/src/telegram/` read directly
- **`@grammyjs/i18n` v1.1.2** -- Package installed at `node_modules/@grammyjs/i18n/`, type definitions and API inspected directly
- **`server/src/i18n/server.ts`** -- Existing server-side i18n pattern inspected
- **`shared/types/models.ts`** -- User model `language: "de" | "en"` field confirmed
- **CLAUDE.md** -- Encoding rules and i18n conventions confirmed

### Secondary (MEDIUM confidence)
- **https://grammy.dev/plugins/i18n** -- Official grammY i18n plugin documentation (verified via WebFetch 2026-02-09)
- **https://projectfluent.org/fluent/guide/** -- Mozilla Fluent syntax reference (verified via WebFetch 2026-02-09)

### Tertiary (LOW confidence)
- None. All findings verified against installed package and official docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- `@grammyjs/i18n` already installed, API verified against actual type definitions
- Architecture: HIGH -- All source files read, patterns derived from actual codebase structure
- Pitfalls: HIGH -- Identified from actual code patterns (MarkdownV2 mixing, notification emitter architecture, locale negotiator behavior)

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (stable ecosystem, no breaking changes expected)
