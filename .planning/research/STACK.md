# Stack Research

**Domain:** Collaborative Project Intelligence Web App (real-time, AI-integrated, Telegram bot, event-driven)
**Researched:** 2026-02-07
**Confidence:** HIGH

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **Next.js** | 16.1 | Full-stack framework (SSR, API routes, App Router) | Current stable release (Dec 2025). Unified frontend + backend. App Router with React Server Components reduces client bundle. Server Actions eliminate separate API boilerplate for mutations. Turbopack stable for fast dev. React 19.2 support. | HIGH |
| **TypeScript** | 5.7+ | Type safety across entire stack | Non-negotiable for a multi-developer project with AI integrations, Telegram bot, and shared types between web + bot. Catches integration errors at compile time. | HIGH |
| **PostgreSQL** | 16+ | Primary database + event store | ACID-compliant, JSONB for flexible event payloads, LISTEN/NOTIFY for real-time triggers, identity columns (modern standard), row-level security, proven at scale. Append-only event tables with JSONB payloads are a natural fit. | HIGH |
| **Drizzle ORM** | 1.0-beta / 0.45 | TypeScript ORM + query builder | SQL-first, schema-as-code in TypeScript. Zero runtime dependencies (~7.4kb). Excellent for serverless/edge. Direct control over queries. Native PostgreSQL identity column support. Outperforms Prisma on cold starts. | HIGH |
| **Redis** | 7+ | Caching, job queues, session store, pub/sub | Required by BullMQ for background jobs. Also handles rate limiting for AI API calls, caching AI responses, and real-time pub/sub for WebSocket fan-out. | HIGH |
| **Vercel AI SDK** | 6.x (latest: 6.0.69) | Multi-provider AI orchestration | Unified API across OpenAI, Anthropic, Google, and 15+ providers. Switch providers with one line. Built-in streaming, tool calling, agentic loops. Agent abstraction for reusable AI agents. Framework-native React hooks. From same team as Next.js. | HIGH |

### Authentication & Authorization

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **Auth.js (NextAuth v5)** | 5.x (beta, production-stable) | Google OAuth + session management | First-party Next.js auth solution. Native Google OAuth provider. Drizzle adapter available. Universal `auth()` function for App Router. JWT + database sessions. Role-based access via middleware. | MEDIUM |

> **Note on Auth.js v5:** Still technically beta but widely used in production (Dec 2025 guides confirm stability). The `next-auth@beta` npm tag is the install path. If Auth.js v5 stability becomes a concern during development, **Better Auth** is the fallback -- it has gained significant traction in 2025 as a more modern alternative.

### Real-Time Layer

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **Socket.IO** | 4.x | WebSocket server for real-time updates | Proven, self-hosted, no vendor lock-in. Built-in rooms (map to projects), namespaces, reconnection, fallback to long-polling. Pairs with Redis adapter for horizontal scaling. Unlike Supabase Realtime, gives full control over event types and doesn't require Supabase ecosystem buy-in. | HIGH |

> **Why not Supabase Realtime:** Ties you to Supabase ecosystem. Self-hosted Supabase Realtime (Elixir/Phoenix) is operationally heavy. For custom event-driven architecture with append-only storage, Socket.IO + Redis pub/sub gives more control.
>
> **Why not Liveblocks:** Hosted SaaS, no self-hosting option, per-MAU pricing scales poorly for an internal tool, vendor lock-in.

### Telegram Bot

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **grammY** | 1.38+ | Telegram Bot Framework | Modern TypeScript-first design with excellent type safety. Rich plugin ecosystem: `conversations` (multi-step flows), `menu` (inline keyboard menus), `session` (state management). Cleaner DX than Telegraf. Active maintenance, keeps pace with Telegram Bot API updates. Lighter than Telegraf, better for serverless. | HIGH |
| **@grammyjs/conversations** | latest | Multi-step conversation flows | Essential for mirroring web app workflows (project creation, task management) as sequential bot interactions. | HIGH |
| **@grammyjs/menu** | latest | Interactive inline keyboard menus | Button-based UI for navigating projects, tasks, and settings without typing commands. | HIGH |

> **Why not Telegraf:** Telegraf v4 TypeScript types are overly complex and hard to work with. grammY was built from the ground up with TypeScript and has surpassed Telegraf in DX. grammY's plugin system is more composable.

### Background Processing

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **BullMQ** | 5.x | Job queue for background tasks | AI inference jobs, email sending, voice transcription, event consolidation (50k token merges), GitHub/Gmail API sync. Built on Redis Streams. Supports scheduled jobs (cron), retries, rate limiting, priority queues. Proven at scale. | HIGH |

### Voice I/O

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **OpenAI gpt-4o-transcribe** | API | Speech-to-text transcription | Best accuracy across languages (German + English critical). Successor to Whisper with lower word error rate. Available via Vercel AI SDK. | HIGH |
| **OpenAI gpt-4o-mini-tts** | API | Text-to-speech output | Instructable TTS ("speak like a friendly assistant"). Multiple voices. Low latency. Cost-effective via mini model. | MEDIUM |
| **Web Audio API / MediaRecorder** | Browser native | In-app voice recording | No library needed. MediaRecorder captures audio in browser, sends to API route for transcription. Works on all modern browsers. | HIGH |

> **Why OpenAI over Deepgram/AssemblyAI for STT:** OpenAI gpt-4o-transcribe leads on accuracy for both German and English. Single vendor for both STT and TTS simplifies billing and integration. All accessible through Vercel AI SDK.

### UI & Styling

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **Tailwind CSS** | 4.x | Utility-first CSS | New `@theme` directive, OKLCH colors, faster build times. Industry standard for component-based UIs. | HIGH |
| **shadcn/ui** | latest | Component library (copy-paste, not npm) | Built on Radix UI primitives (accessibility). Full Tailwind v4 + React 19 support. You own the code -- no version lock-in. `data-slot` attributes for styling. | HIGH |
| **tw-animate-css** | latest | Animation utilities | Replaced deprecated `tailwindcss-animate`. Default for new shadcn/ui projects. | HIGH |

### Internationalization

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **next-intl** | latest | i18n for Next.js (German + English) | Next.js-native. App Router + Server Components support. ICU message syntax (plurals, interpolation, rich text). Date/time/number formatting with timezone handling. Internationalized routing with per-language pathnames. TypeScript support for message keys. | HIGH |

### Validation & Type Safety

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **Zod** | 4.3+ | Runtime schema validation | 14x faster string parsing vs Zod 3. Tree-shakable Zod Mini variant. Used by Vercel AI SDK for tool schemas, next-safe-action for server action validation, Drizzle for schema validation. Single validation library across entire stack. | HIGH |
| **next-safe-action** | 8.x | Type-safe Server Actions | Wraps Next.js Server Actions with Zod validation, error handling, middleware (auth checks). Zero dependencies. End-to-end type safety between server and client. | HIGH |

### Data Fetching & Client State

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **TanStack Query** | 5.90+ | Server state management + data fetching | Caching, background refetching, optimistic updates, infinite queries. Essential for dynamic pages (project dashboards, task lists) where Server Components alone aren't enough. Suspense support. | HIGH |
| **Zustand** | 5.x | Client state management | Lightweight (~1kb), simple API, no boilerplate. For UI state: active project, sidebar state, modal state, theme. Not for server data (that's TanStack Query). | HIGH |

### Email

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **Resend** | API | Transactional email delivery | Developer-first API. Native Next.js integration via Server Actions. React Email for templating. Webhooks for delivery tracking. Free tier sufficient for internal tool. | MEDIUM |
| **React Email** | latest | Email templates as React components | Build email templates with the same React/TypeScript skills. No separate templating language. Maintained by Resend team. | MEDIUM |

### External API Integrations

| Technology | Purpose | Notes | Confidence |
|------------|---------|-------|------------|
| **googleapis** (npm) | Gmail + Google Calendar API | Official Google client library. OAuth2 token management. Batch API support. | HIGH |
| **@octokit/rest** | GitHub API (including fork operations) | Official GitHub REST API client. Handles pagination, rate limiting. Fork, PR, and repo operations. | HIGH |

### Development Tools

| Tool | Purpose | Notes | Confidence |
|------|---------|-------|------------|
| **pnpm** | Package manager | Strict dependency resolution, disk-efficient, workspace support for monorepo. Faster than npm/yarn. | HIGH |
| **Turborepo** | Monorepo build orchestration | Incremental builds, remote caching, parallel task execution. Made by Vercel, excellent Next.js integration. | HIGH |
| **Vitest** | Unit + component testing | 10-20x faster than Jest. Native ESM. Browser mode. Next.js official recommendation. | HIGH |
| **Playwright** | E2E testing | Cross-browser. Next.js official recommendation. Use for 3-5 critical flows in CI. | HIGH |
| **React Testing Library** | Component testing | User-centric testing approach. Pairs with Vitest. | HIGH |
| **Biome** | Linting + formatting | Rust-based, replaces ESLint + Prettier. 100x faster. Single tool for lint + format. | MEDIUM |
| **Docker** | Containerization | Multi-stage builds with Next.js standalone output. Required for self-hosted deployment. | HIGH |

### Deployment & Infrastructure

| Technology | Purpose | Why Recommended | Confidence |
|------------|---------|-----------------|------------|
| **Hetzner VPS** | Server hosting (EU) | European data residency (Swiss company requirement). CAX21 (~10 EUR/month) or CAX31 (~20 EUR/month). ARM-based, excellent price/performance. GDPR-friendly. | HIGH |
| **Coolify** | Deployment platform (self-hosted) | Open-source Vercel/Heroku alternative. Git push deploy, preview URLs, auto SSL, one-click databases. Runs on Hetzner VPS. No vendor lock-in. | MEDIUM |
| **Docker Compose** | Service orchestration | Compose file for Next.js app, PostgreSQL, Redis, bot process, BullMQ workers. Simple, proven, no K8s complexity needed at 2-5 user scale. | HIGH |

> **Why not Vercel:** Cost scales unpredictably with serverless. WebSocket support limited (Socket.IO needs persistent server). Background workers (BullMQ) can't run on Vercel. Self-hosting on Hetzner gives full control at fixed cost.
>
> **Why not Railway/Fly.io:** Good alternatives if Coolify+Hetzner proves too much ops work. Railway is the easier fallback. But for a Swiss company wanting EU data residency and cost control, Hetzner+Coolify is the better starting point.

---

## Monorepo Structure

```
apps/
  web/          # Next.js 16.1 web application
  bot/          # grammY Telegram bot (standalone Node.js process)
  workers/      # BullMQ worker processes

packages/
  db/           # Drizzle schema, migrations, queries
  ai/           # AI orchestration layer (Vercel AI SDK wrappers)
  shared/       # Shared types, constants, Zod schemas
  events/       # Event store logic, consolidation engine
  integrations/ # Gmail, Calendar, GitHub API clients
  ui/           # shadcn/ui components (shared across web)
  i18n/         # next-intl message files + utilities
```

**Why monorepo:** The Telegram bot and web app share the same database, AI layer, event system, and business logic. A monorepo with shared packages avoids duplication and ensures type consistency across all entry points.

---

## Installation

```bash
# Initialize monorepo
pnpm dlx create-turbo@latest

# Core framework
pnpm add next@latest react@latest react-dom@latest

# Database
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit

# Authentication
pnpm add next-auth@beta @auth/drizzle-adapter

# AI
pnpm add ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google

# Real-time
pnpm add socket.io socket.io-client @socket.io/redis-adapter

# Telegram Bot
pnpm add grammy @grammyjs/conversations @grammyjs/menu @grammyjs/runner

# Background Jobs
pnpm add bullmq ioredis

# Validation
pnpm add zod next-safe-action

# UI
pnpm add tailwindcss@latest
pnpm dlx shadcn@latest init

# i18n
pnpm add next-intl

# Data Fetching & State
pnpm add @tanstack/react-query zustand

# External APIs
pnpm add googleapis @octokit/rest

# Email
pnpm add resend @react-email/components

# Dev dependencies
pnpm add -D typescript @types/node @types/react vitest @vitejs/plugin-react
pnpm add -D playwright @playwright/test @testing-library/react
pnpm add -D @biomejs/biome
```

---

## Alternatives Considered

| Category | Recommended | Alternative | When to Use Alternative |
|----------|-------------|-------------|-------------------------|
| Framework | Next.js 16.1 | Remix / SvelteKit | If you need nested route loaders (Remix) or prefer Svelte's reactivity model. Not recommended here: Next.js ecosystem alignment with Vercel AI SDK is too strong. |
| ORM | Drizzle ORM | Prisma 6 | If team prefers schema-first with `.prisma` files and generated client. Prisma is now Rust-free (Nov 2025) and has better tooling (Studio, Migrate). Trade-off: heavier runtime, slower cold starts. |
| Auth | Auth.js v5 | Better Auth / Clerk | Better Auth if Auth.js v5 beta instability becomes a blocker. Clerk if you want zero auth code and don't mind SaaS dependency + cost. |
| Telegram Bot | grammY | Telegraf 4.x | Only if team already has deep Telegraf experience. Telegraf has larger community but worse TypeScript DX. |
| State Mgmt | Zustand | Jotai | If you need fine-grained atomic state with complex interdependencies. For this project, Zustand's simplicity is sufficient. |
| Real-time | Socket.IO | Supabase Realtime | If you adopt full Supabase stack (managed PostgreSQL + Auth + Realtime). Not recommended here: too much vendor lock-in for a custom event-driven system. |
| Job Queue | BullMQ | Trigger.dev | If you want a hosted job infrastructure with built-in dashboard. BullMQ is self-hosted and more flexible for custom consolidation logic. |
| Hosting | Hetzner + Coolify | Railway | If self-hosting ops is too burdensome. Railway offers PostgreSQL + Redis + Docker with great DX at ~$20-50/month. Good intermediate option before scaling. |
| Email | Resend | Postmark / SendGrid | If you need higher volume or specific deliverability guarantees. Resend is simpler for developer-focused internal tools. |
| Linting | Biome | ESLint + Prettier | If you need specific ESLint plugins not yet supported by Biome (e.g., some a11y rules). Biome covers 90%+ of use cases and is dramatically faster. |
| Testing | Vitest | Jest 30 | Only if existing Jest config/plugins are a hard requirement. Vitest is faster and ESM-native. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Prisma (as default choice)** | Heavier runtime, slower cold starts on serverless, generated client adds build step. Schema-as-code in Drizzle is more transparent. | Drizzle ORM |
| **Express.js (standalone)** | Unnecessary with Next.js API routes + Server Actions. Adding Express creates two servers to maintain. | Next.js API routes + custom server for Socket.IO only |
| **Redux / Redux Toolkit** | Massive boilerplate for a 2-5 person team project. Overkill for this scale. | Zustand (client state) + TanStack Query (server state) |
| **Mongoose / MongoDB** | Document DB loses ACID guarantees needed for financial tracking (cost tracking) and event ordering. No LISTEN/NOTIFY for real-time. | PostgreSQL + Drizzle |
| **Firebase** | Google lock-in, no self-hosting, limited PostgreSQL, poor for custom event-driven architecture. | Self-hosted PostgreSQL + Auth.js |
| **Tailwind CSS v3** | v4 is stable with better performance and new `@theme` directive. shadcn/ui has migrated. | Tailwind CSS v4 |
| **tailwindcss-animate** | Deprecated by shadcn/ui. | tw-animate-css |
| **node-telegram-bot-api** | Low-level, no middleware system, poor TypeScript support, unmaintained. | grammY |
| **Vercel (for hosting)** | WebSocket limitations, no persistent workers for BullMQ, unpredictable serverless costs, US-based. | Hetzner + Coolify (EU, fixed cost) |
| **Supabase (full platform)** | Vendor lock-in for a project needing custom event-driven architecture. Self-hosted Supabase is operationally heavy (Elixir stack). | PostgreSQL + Drizzle + Socket.IO + Auth.js (pick your own components) |
| **GraphQL (Apollo/Yoga)** | Unnecessary complexity for a single-client web app + bot. REST/RPC is simpler. Server Actions + TanStack Query cover the web. Bot calls same service layer directly. | Server Actions + next-safe-action + TanStack Query |
| **Webpack** | Turbopack is stable in Next.js 16.1, significantly faster. | Turbopack (built into Next.js) |

---

## Stack Patterns by Variant

**If you adopt Supabase managed (instead of self-hosted PostgreSQL):**
- Replace: Drizzle direct PostgreSQL connection with Supabase client
- Replace: Socket.IO with Supabase Realtime
- Replace: Auth.js with Supabase Auth
- Benefit: Less ops work, faster start
- Cost: Vendor lock-in, less control over event store, monthly Supabase bill

**If real-time requirements are minimal (just notifications, no collaborative editing):**
- Replace: Socket.IO with Server-Sent Events (SSE)
- Benefit: Simpler, no WebSocket server needed
- Cost: No bidirectional communication, harder to scale

**If team prefers Railway over self-hosting:**
- Replace: Hetzner + Coolify + Docker Compose with Railway
- Benefit: Zero ops, git push deploy, managed PostgreSQL + Redis
- Cost: Higher monthly cost (~$20-50+), US-based infra (EU available but limited)

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js 16.1 | React 19.2 | React 19.2 required for Cache Components |
| Next.js 16.1 | Auth.js v5 (next-auth@beta) | v5 requires Next.js 14+, tested with 16 |
| Drizzle ORM 0.45+ | PostgreSQL 16+ | Use identity columns (not serial) |
| Vercel AI SDK 6.x | @ai-sdk/openai, @ai-sdk/anthropic | Provider packages version-locked to SDK major |
| shadcn/ui (latest) | Tailwind CSS 4.x | Uses `@theme` directive, OKLCH colors |
| shadcn/ui (latest) | React 19 | Uses `data-slot` attributes |
| BullMQ 5.x | Redis 7+ / ioredis | Requires Redis Streams support |
| Socket.IO 4.x | @socket.io/redis-adapter | For multi-process scaling |
| Zod 4.x | next-safe-action 8.x | Standard Schema support |
| TanStack Query 5.x | React 19 | Suspense hooks available |
| next-intl (latest) | Next.js 16.x App Router | Server Components + internationalized routing |

---

## Critical Security Note

All Next.js 13.x-16.x versions have had critical vulnerabilities disclosed (CVE-2025-66478: CVSS 10.0 RCE in React Server Components). **Always run the latest patched version.** Pin to exact versions in production and monitor Next.js security advisories.

---

## Sources

- [Next.js 16.1 Blog](https://nextjs.org/blog/next-16-1) -- Next.js version, features (HIGH confidence)
- [Vercel AI SDK 6 Blog](https://vercel.com/blog/ai-sdk-6) -- AI SDK features, Agent abstraction (HIGH confidence)
- [AI SDK GitHub Releases](https://github.com/vercel/ai/releases) -- Latest version 6.0.69 (HIGH confidence)
- [grammY Official Site](https://grammy.dev/) -- Telegram bot framework features, plugins (HIGH confidence)
- [grammY npm](https://www.npmjs.com/package/grammy) -- Version 1.38.3 (HIGH confidence)
- [grammY Comparison Page](https://grammy.dev/resources/comparison) -- grammY vs Telegraf analysis (HIGH confidence)
- [Drizzle ORM Official](https://orm.drizzle.team/) -- ORM features, version info (HIGH confidence)
- [Drizzle ORM npm](https://www.npmjs.com/package/drizzle-orm) -- Version 0.45.1 (HIGH confidence)
- [Zod Official v4](https://v3.zod.dev/) -- Zod 4 features, performance improvements (HIGH confidence)
- [next-intl Official](https://next-intl.dev/) -- i18n for Next.js (HIGH confidence)
- [Auth.js Migration Guide](https://authjs.dev/getting-started/migrating-to-v5) -- Auth.js v5 changes (HIGH confidence)
- [shadcn/ui Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4) -- Component library updates (HIGH confidence)
- [next-safe-action Official](https://next-safe-action.dev/) -- Server Action type safety (HIGH confidence)
- [BullMQ Official](https://bullmq.io/) -- Job queue features (HIGH confidence)
- [OpenAI Audio Models](https://openai.com/index/introducing-our-next-generation-audio-models/) -- gpt-4o-transcribe, TTS models (HIGH confidence)
- [TanStack Query npm](https://www.npmjs.com/package/@tanstack/react-query) -- Version 5.90.20 (HIGH confidence)
- [Hetzner Coolify Docs](https://docs.hetzner.com/cloud/apps/list/coolify/) -- Deployment setup (MEDIUM confidence)
- [Coolify Official](https://coolify.io/) -- Self-hosting platform features (MEDIUM confidence)
- [Socket.IO vs Supabase Realtime (Ably)](https://ably.com/compare/socketio-vs-supabase) -- Real-time comparison (MEDIUM confidence)
- [Turborepo + pnpm Guide](https://medium.com/@TheblogStacker/2025-monorepo-that-actually-scales-turborepo-pnpm-for-next-js-ab4492fbde2a) -- Monorepo best practices (MEDIUM confidence)
- [tRPC vs Server Actions (Documenso)](https://documenso.com/blog/removing-server-actions) -- API layer decision (MEDIUM confidence)
- [Resend Official](https://resend.com) -- Email service (MEDIUM confidence)

---
*Stack research for: Collaborative Project Intelligence Web App*
*Researched: 2026-02-07*
