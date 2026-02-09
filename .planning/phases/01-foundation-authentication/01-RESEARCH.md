# Phase 1: Foundation & Authentication - Research

**Researched:** 2026-02-08
**Domain:** Local-first filesystem-native platform with event sourcing, passkey/password auth, i18n, and remote access
**Confidence:** HIGH

## Summary

This phase builds a local-first, filesystem-native platform foundation for a 2-person team. The architecture is a Node.js/TypeScript backend (Express) serving a React SPA (Vite), with all state stored as human-readable files (JSON, JSONL, Markdown, YAML) on the local filesystem. Authentication uses WebAuthn passkeys with password fallback, sessions are stored as files, and the event store is append-only JSONL. The app is exposed to the internet via Cloudflare Tunnel and managed by pm2.

The stack is deliberately simple: no database, no external auth provider, no container orchestration. The filesystem IS the database. This is architecturally sound for a 2-user system and aligns with the user's explicit vision. Key risks are around WebAuthn's HTTPS requirement (solved by Cloudflare Tunnel providing HTTPS automatically), filesystem concurrency (minimal risk with 2 users), and ensuring the event store format is both grep-friendly and Git-diffable.

**Primary recommendation:** Use Express + Vite + React with TypeScript throughout, SimpleWebAuthn for passkeys with argon2 password fallback, JSONL for the event store (one file per aggregate type), Cloudflare Tunnel for remote access, and i18next for internationalization.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Storage architecture:** Pure filesystem storage -- no database (no SQLite, no Supabase, no external DB). Everything is files: Markdown, JSON, YAML. Human-readable, Git-friendly, no database process needed. Filesystem is the single source of truth for all application state.
- **Authentication:** Simple passkey/password authentication -- no Google OAuth. Two users, locally managed credentials. No external auth provider dependency.
- **Filesystem memory system:** Per-project folders with per-member Markdown files, Git-backed. Memory files are human-editable. App watches for external changes to memory files.
- **GitHub integration:** Per-project repos auto-created using the host machine's configured GitHub account. No separate GitHub org required -- uses whatever `gh` / `git` credentials are on the machine.
- **System capability discovery:** During first install, app scans the host OS and discovers available programs/capabilities. Presented as a setup wizard in the browser on first launch. Wizard shows discovered capabilities with toggle switches for permissions. Triggers OS-level permission prompts where needed. Claude API is the sole AI provider in Phase 1.
- **Deployment:** Must support both macOS and Linux (Ubuntu/Debian) equally. Native deployment via pm2/systemd, no Docker. Portable via system image.
- **Language & i18n:** German and English supported. Default language auto-detected from browser settings, fallback to German. Per-user language preference saved and persists. User can override at any time.
- **Event store (locked aspects):** Events must surface as a visible activity feed in the UI -- a timeline showing who did what, when. Every state change recorded as append-only event with correlation ID.

### Claude's Discretion

- **Remote access:** Choose the best approach for exposing the local app to the internet (reverse tunnel, VPN, or SSH-based -- optimize for simplicity and security for a 2-user setup)
- **Event store format:** Choose the best file-based event format (JSON-lines per entity, individual files, or hybrid -- optimize for filesystem-first approach, grep-friendliness, and Git-diffability)
- **Git commit granularity:** Auto-commit per change vs periodic batching for memory files
- **Filesystem security boundary:** Blacklist vs whitelist approach
- **Frontend framework choice:** Optimize for local-first, 2-user collaborative app
- **Setup wizard depth:** Balance between quick essentials and guided walkthrough

### Deferred Ideas (OUT OF SCOPE)

- OS-level integrations (camera, microphone, calendar, notes apps) -- discovered in Phase 1 setup wizard, but deep integration belongs in Phase 6 (Voice) and Phase 8 (Integrations)
- Playwright/browser automation via plugin or Chrome Extension -- future capability
- Proactive AI assistant behavior -- Phase 4 (AI Foundation & Orchestration)
- Full system analysis for AI learning ("app learns what's possible on this filesystem") -- Phase 4+ when AI foundation exists
- Local AI model discovery (Ollama, LM Studio) -- Phase 4 when AI orchestration is built
- "Absolute dateiuebergreifende Analyse" (cross-file analysis for AI context) -- Phase 4

</user_constraints>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.x | Language for entire codebase | Type safety, IDE support, catches errors at compile time |
| Express | 4.x | HTTP server, API routes, middleware | Most mature Node.js server framework, massive ecosystem |
| React | 18.x | Frontend UI framework | Largest ecosystem, best tooling, hooks-based architecture |
| Vite | 6.x | Frontend build tool and dev server | 40x faster than CRA, native TypeScript, HMR, proxy support |
| vite-express | latest | Express + Vite integration | Handles dev HMR and production static serving automatically |
| @simplewebauthn/server | 13.x | WebAuthn/passkey server-side | FIDO-conformant, TypeScript-first, actively maintained |
| @simplewebauthn/browser | 13.x | WebAuthn/passkey client-side | Paired with server package, handles browser WebAuthn API |
| argon2 | latest | Password hashing (fallback auth) | PHC winner, memory-hard, superior to bcrypt for modern apps |
| i18next | 23.x+ | Internationalization framework | Industry standard, TypeScript support, plugin ecosystem |
| react-i18next | 13.x+ | React bindings for i18next | useTranslation hook, Suspense support, type-safe keys |
| chokidar | 4.x | Filesystem watching | Cross-platform, handles edge cases fs.watch misses, 110M weekly downloads |
| simple-git | 3.x | Programmatic Git operations | TypeScript support, promise-based, covers all common operations |
| pm2 | latest | Process management | Auto-restart, clustering, ecosystem config, log management |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| express-session | latest | Session management middleware | Managing authenticated user sessions |
| session-file-store | latest | Filesystem session storage | Storing sessions as JSON files (no database needed) |
| cloudflared | latest | Cloudflare Tunnel client | Exposing local app to internet securely |
| uuid | latest | Generate unique IDs | Event IDs, correlation IDs, entity IDs |
| zod | latest | Runtime schema validation | Validating API inputs, event schemas, config files |
| cors | latest | CORS middleware | Development cross-origin requests |
| helmet | latest | Security headers | Production HTTP security hardening |
| compression | latest | Response compression | Gzip/brotli for production responses |
| concurrently | latest | Run multiple commands | Dev script to run server + client together |
| @octokit/rest | latest | GitHub API client | Creating repositories programmatically (alternative to gh CLI) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React | SolidJS | Better performance but smaller ecosystem, fewer libraries |
| React | Svelte/SvelteKit | Excellent DX but different paradigm, smaller hiring pool |
| Express | Fastify | Faster but Express has more middleware compatibility |
| vite-express | Manual proxy | More control but more boilerplate for dev/prod serving |
| argon2 | bcrypt | bcrypt is simpler but argon2 is more secure against GPU attacks |
| simple-git | child_process + git CLI | Direct but more error-prone, less structured output |
| @octokit/rest | gh CLI via child_process | gh CLI is simpler when host credentials are available |
| session-file-store | JWT tokens | JWTs are stateless but harder to revoke; file sessions align with filesystem-first approach |

**Installation:**
```bash
# Backend
npm install express express-session session-file-store @simplewebauthn/server argon2 i18next simple-git chokidar uuid zod cors helmet compression

# Frontend
npm install react react-dom react-i18next i18next @simplewebauthn/browser

# Dev dependencies
npm install -D typescript @types/node @types/express @types/express-session vite @vitejs/plugin-react concurrently tsx
```

## Discretion Decisions (Recommendations)

### Remote Access: Cloudflare Tunnel

**Recommendation:** Use Cloudflare Tunnel (cloudflared) for remote access.

**Why:**
- Free tier covers personal/small team use
- No open ports on the host machine -- outbound-only connections
- Automatic HTTPS with valid certificates (solves WebAuthn's HTTPS requirement)
- Built-in DDoS protection via Cloudflare's network
- Can add Zero Trust access policies (email-based OTP) as an extra security layer
- Simple installation: `brew install cloudflare/cloudflare/cloudflared` (macOS) or `.deb` package (Linux)
- Runs as a system service alongside pm2
- No domain purchase strictly required for quick tunnels, but recommended for stable URLs
- Requires a free Cloudflare account

**Setup:** Install cloudflared, authenticate (`cloudflared tunnel login`), create a tunnel (`cloudflared tunnel create eluma`), configure to point to `localhost:3000`, run as service.

**Rejected alternatives:**
- ngrok: Paid for custom domains, rate limits on free tier
- localhost.run: SSH-based but less reliable, no access policies
- Tailscale/WireGuard VPN: Requires client install on every device, not browser-accessible
- frp: Self-hosted, requires a public server to relay through

### Event Store Format: JSONL per Aggregate Type

**Recommendation:** One `.jsonl` file per aggregate type (e.g., `events/projects.jsonl`, `events/users.jsonl`, `events/teams.jsonl`).

**Why:**
- **Grep-friendly:** `grep "projectId\":\"abc" events/projects.jsonl` works perfectly
- **Git-diffable:** Each line is a self-contained event; diffs show exactly which events were added
- **Append-only:** `fs.appendFileSync()` is atomic for writes under PIPE_BUF (4KB on Linux, safe for event JSON)
- **Simple reads:** Stream line-by-line with readline or read all and split by newline
- **Natural grouping:** All project events in one file, all user events in another
- **Manageable file sizes:** With 2 users, files stay small for years

**Rejected alternatives:**
- Individual files per event: Too many small files, slower to read aggregate history
- Single monolithic event log: Gets large, harder to grep for specific aggregate
- Hybrid (directories per entity + files per event): Over-engineered for 2-user system

**Event schema:**
```typescript
interface DomainEvent {
  id: string;              // UUID v4
  type: string;            // e.g., "project.created", "task.completed"
  aggregateType: string;   // e.g., "project", "user", "team"
  aggregateId: string;     // Entity ID
  timestamp: string;       // ISO 8601
  userId: string;          // Who triggered it
  correlationId: string;   // Groups related events
  version: number;         // Aggregate version (optimistic concurrency)
  data: Record<string, unknown>; // Event-specific payload
}
```

### Git Commit Granularity: Debounced Batching (5-second window)

**Recommendation:** Debounced auto-commit with a 5-second quiet window.

**Why:**
- Avoids commit spam during rapid edits
- Still captures changes quickly enough for meaningful version history
- Groups related changes (e.g., multiple memory file updates from a single operation)
- Each commit message auto-generated: `"auto: update [filenames] at [timestamp]"`

**Rejected alternatives:**
- Per-change commits: Too noisy, floods git log, slows down on rapid changes
- Periodic batching (e.g., every 5 minutes): Too coarse, could lose context of what changed together

### Filesystem Security Boundary: Whitelist Approach

**Recommendation:** Whitelist (allowlist) with explicit permitted paths.

**Why:**
- More secure by default: only explicitly allowed paths are accessible
- Simpler mental model: "the app can only touch these directories"
- Easier to audit: list is short and explicit
- Default paths: app data directory, configured project directories, temp directory

**Default allowlist:**
```yaml
allowed_paths:
  - ~/.eluma/              # App data root
  - ~/projects/            # Default project workspace (configurable)
  - /tmp/eluma/            # Temporary files
```

**Rejected alternatives:**
- Blacklist: Risky because you must enumerate every dangerous path; miss one and you have a security hole

### Frontend Framework: React with Vite

**Recommendation:** React 18.x with Vite 6.x, TypeScript throughout.

**Why:**
- Largest ecosystem of any frontend framework (39.5% market share in 2026)
- Best tooling: DevTools, extensive library compatibility
- Hooks-based architecture fits the reactive event-sourced model well
- TypeScript support is excellent and mature
- Team knowledge: Most widely known framework, lowest learning barrier
- i18next integration is the most mature with react-i18next
- WebAuthn browser library examples primarily target React
- Vite provides instant HMR and fast builds

**Rejected alternatives:**
- SolidJS: Better raw performance but much smaller ecosystem; not needed for 2-user app
- Svelte: Excellent DX but different paradigm; i18n and WebAuthn tooling less mature

### Setup Wizard Depth: Quick Essentials with Optional Deep Dive

**Recommendation:** 3-step essential wizard with "Advanced" expandable sections.

**Steps:**
1. **Account Setup:** Create admin user (passkey + password), set language preference
2. **Team Setup:** Create team, invite second user
3. **System Scan:** Auto-discover capabilities, show results with toggles, highlight Claude API key input

Each step shows the essential fields with an "Advanced Settings" expandable section for power users.

## Architecture Patterns

### Recommended Project Structure

```
eluma/
├── package.json              # Root package.json (workspaces)
├── tsconfig.json             # Shared TypeScript config
├── ecosystem.config.js       # pm2 configuration
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts          # Express app entry point
│   │   ├── app.ts            # Express app setup (middleware, routes)
│   │   ├── routes/
│   │   │   ├── auth.ts       # Passkey/password auth endpoints
│   │   │   ├── events.ts     # Event store API
│   │   │   ├── projects.ts   # Project CRUD via events
│   │   │   ├── teams.ts      # Team management
│   │   │   ├── memory.ts     # Filesystem memory API
│   │   │   ├── system.ts     # System capability discovery
│   │   │   └── github.ts     # GitHub repo management
│   │   ├── events/
│   │   │   ├── store.ts      # JSONL event store read/write
│   │   │   ├── types.ts      # Event type definitions
│   │   │   ├── projector.ts  # Event -> current state projection
│   │   │   └── feed.ts       # Activity feed from events
│   │   ├── auth/
│   │   │   ├── passkey.ts    # WebAuthn registration/authentication
│   │   │   ├── password.ts   # Argon2 password hash/verify
│   │   │   └── session.ts    # Session management config
│   │   ├── fs/
│   │   │   ├── paths.ts      # Path resolution and allowlist
│   │   │   ├── watcher.ts    # Chokidar file watcher setup
│   │   │   ├── git.ts        # simple-git operations
│   │   │   └── memory.ts     # Memory file CRUD
│   │   ├── system/
│   │   │   ├── discovery.ts  # OS capability scanner
│   │   │   └── config.ts     # System config persistence
│   │   ├── i18n/
│   │   │   └── server.ts     # Server-side i18n setup
│   │   └── middleware/
│   │       ├── auth.ts       # Auth guard middleware
│   │       └── validate.ts   # Zod validation middleware
│   └── data/                 # Default data directory (configurable)
│       ├── events/           # JSONL event files
│       ├── sessions/         # Session files
│       ├── users/            # User credential files (JSON)
│       ├── teams/            # Team config files
│       ├── projects/         # Project state (projected from events)
│       ├── memory/           # Per-project memory files
│       │   └── {project}/
│       │       ├── elvis.md
│       │       └── mario.md
│       └── system/           # System config, capabilities
├── client/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx          # React entry point
│       ├── App.tsx           # Root component with router
│       ├── i18n/
│       │   ├── config.ts     # i18next initialization
│       │   └── locales/
│       │       ├── de.json   # German translations
│       │       └── en.json   # English translations
│       ├── pages/
│       │   ├── Login.tsx     # Passkey/password login
│       │   ├── Setup.tsx     # Setup wizard
│       │   ├── Dashboard.tsx # Main dashboard
│       │   └── Settings.tsx  # User/system settings
│       ├── components/
│       │   ├── ActivityFeed.tsx  # Event timeline
│       │   ├── LanguageSwitcher.tsx
│       │   └── PasskeyPrompt.tsx
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── useEvents.ts
│       │   └── useTranslation.ts  # Wrapper around react-i18next
│       └── api/
│           └── client.ts     # Fetch wrapper for API calls
└── shared/
    └── types/
        ├── events.ts         # Shared event type definitions
        ├── models.ts         # Domain model types
        └── api.ts            # API request/response types
```

### Pattern 1: Filesystem Event Store

**What:** Append-only JSONL files as the event store, with projections for current state.

**When to use:** Every state change in the application.

**Example:**
```typescript
// server/src/events/store.ts
import { appendFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuid } from 'uuid';
import type { DomainEvent } from '../../shared/types/events';

const EVENTS_DIR = process.env.EVENTS_DIR || './data/events';

export function appendEvent(event: Omit<DomainEvent, 'id' | 'timestamp'>): DomainEvent {
  const fullEvent: DomainEvent = {
    ...event,
    id: uuid(),
    timestamp: new Date().toISOString(),
  };

  const filePath = join(EVENTS_DIR, `${event.aggregateType}.jsonl`);

  if (!existsSync(EVENTS_DIR)) {
    mkdirSync(EVENTS_DIR, { recursive: true });
  }

  appendFileSync(filePath, JSON.stringify(fullEvent) + '\n', 'utf-8');
  return fullEvent;
}

export function readEvents(aggregateType: string, aggregateId?: string): DomainEvent[] {
  const filePath = join(EVENTS_DIR, `${aggregateType}.jsonl`);

  if (!existsSync(filePath)) return [];

  const lines = readFileSync(filePath, 'utf-8').trim().split('\n').filter(Boolean);
  const events = lines.map(line => JSON.parse(line) as DomainEvent);

  if (aggregateId) {
    return events.filter(e => e.aggregateId === aggregateId);
  }
  return events;
}

export function readAllEvents(limit?: number): DomainEvent[] {
  // Read from all JSONL files, merge, sort by timestamp
  // Used for the activity feed
}
```

### Pattern 2: WebAuthn + Password Hybrid Auth

**What:** Passkey-first authentication with password fallback, both stored on filesystem.

**When to use:** User login and registration flows.

**Important constraint:** WebAuthn requires a secure context (HTTPS or localhost). Cloudflare Tunnel provides HTTPS automatically for remote access. For local development, `localhost` is treated as a secure context by browsers.

**Example:**
```typescript
// server/src/auth/passkey.ts
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

const RP_NAME = 'Eluma';
const RP_ID = process.env.RP_ID || 'localhost';
const ORIGIN = process.env.ORIGIN || 'http://localhost:3000';

export async function createRegistrationOptions(user: User) {
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: user.username,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
    excludeCredentials: user.passkeys.map(pk => ({
      id: pk.credentialId,
      transports: pk.transports,
    })),
  });

  // Store challenge for verification (in session)
  return options;
}
```

### Pattern 3: Projected State from Events

**What:** Derive current state by replaying events (with optional caching).

**When to use:** Every read operation that needs current state.

**Example:**
```typescript
// server/src/events/projector.ts
import { readEvents } from './store';

interface ProjectState {
  id: string;
  name: string;
  description: string;
  members: string[];
  createdAt: string;
  updatedAt: string;
}

export function projectState(aggregateType: string, aggregateId: string): ProjectState | null {
  const events = readEvents(aggregateType, aggregateId);
  if (events.length === 0) return null;

  let state: Partial<ProjectState> = {};

  for (const event of events) {
    switch (event.type) {
      case 'project.created':
        state = { ...event.data, id: event.aggregateId, createdAt: event.timestamp } as any;
        break;
      case 'project.updated':
        state = { ...state, ...event.data, updatedAt: event.timestamp };
        break;
      case 'project.member_added':
        state.members = [...(state.members || []), event.data.memberId as string];
        break;
      // ... handle other event types
    }
  }

  return state as ProjectState;
}

// Cache projected state to a JSON file for fast reads
export function cacheProjection(aggregateType: string, aggregateId: string): void {
  const state = projectState(aggregateType, aggregateId);
  if (state) {
    const cachePath = join(DATA_DIR, aggregateType, `${aggregateId}.json`);
    writeFileSync(cachePath, JSON.stringify(state, null, 2));
  }
}
```

### Pattern 4: System Capability Discovery

**What:** Scan the host OS for installed programs and capabilities.

**When to use:** First-launch setup wizard and system settings page.

**Example:**
```typescript
// server/src/system/discovery.ts
import { execSync } from 'child_process';
import { platform } from 'os';

interface Capability {
  name: string;
  category: 'editor' | 'browser' | 'cli' | 'media' | 'ai';
  installed: boolean;
  path?: string;
  version?: string;
}

const PROGRAMS_TO_DETECT: Array<{ name: string; binary: string; category: Capability['category'] }> = [
  { name: 'Visual Studio Code', binary: 'code', category: 'editor' },
  { name: 'Vim', binary: 'vim', category: 'editor' },
  { name: 'Git', binary: 'git', category: 'cli' },
  { name: 'GitHub CLI', binary: 'gh', category: 'cli' },
  { name: 'Node.js', binary: 'node', category: 'cli' },
  { name: 'Python', binary: 'python3', category: 'cli' },
  { name: 'ffmpeg', binary: 'ffmpeg', category: 'media' },
  { name: 'Chrome', binary: platform() === 'darwin' ? 'open -Ra "Google Chrome"' : 'google-chrome', category: 'browser' },
  { name: 'Firefox', binary: platform() === 'darwin' ? 'open -Ra Firefox' : 'firefox', category: 'browser' },
  // ... more programs
];

function isBinaryAvailable(binary: string): { available: boolean; path?: string } {
  try {
    const result = execSync(`which ${binary}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    return { available: true, path: result };
  } catch {
    return { available: false };
  }
}

function getBinaryVersion(binary: string): string | undefined {
  try {
    return execSync(`${binary} --version`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim().split('\n')[0];
  } catch {
    return undefined;
  }
}

export function discoverCapabilities(): Capability[] {
  return PROGRAMS_TO_DETECT.map(prog => {
    const check = isBinaryAvailable(prog.binary);
    return {
      name: prog.name,
      category: prog.category,
      installed: check.available,
      path: check.path,
      version: check.available ? getBinaryVersion(prog.binary) : undefined,
    };
  });
}
```

### Anti-Patterns to Avoid

- **Database thinking with files:** Do not try to implement SQL-like queries over files. Use event sourcing patterns: append events, project state, cache projections. Do not build indexes or join operations over flat files.
- **Synchronous file I/O on request paths:** Use async file operations (`fs/promises`) for API request handlers. Only use `appendFileSync` for the event store (where atomicity matters). Read operations should use streaming for large files.
- **Storing secrets in plain JSON:** User passwords must be hashed with argon2, never stored in plaintext. WebAuthn credential public keys are safe to store as-is. Session secrets should be in environment variables, not config files.
- **Tight coupling to file paths:** Use a central path resolution module (`fs/paths.ts`) rather than hardcoding paths throughout the codebase. All paths should be configurable via environment variables or config file.
- **Single-process file watching:** Chokidar should be initialized once at app startup, not per-request. Use a centralized watcher that emits events to interested handlers.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom hash functions | argon2 npm package | Timing attacks, salt generation, memory-hardness are complex |
| WebAuthn protocol | Manual CBOR/attestation parsing | @simplewebauthn/server + /browser | WebAuthn spec is 100+ pages; library handles all edge cases |
| File watching | fs.watch / fs.watchFile | chokidar | fs.watch is unreliable on macOS (missing filenames), has race conditions |
| Git operations | child_process + git CLI directly | simple-git | Error handling, output parsing, cross-platform path issues |
| i18n | Manual string lookup maps | i18next + react-i18next | Pluralization, interpolation, namespace loading, language detection |
| Session storage | Custom file-based sessions | express-session + session-file-store | Session expiry, cleanup, race conditions, encryption |
| HTTPS/tunneling | Self-signed certs + port forwarding | Cloudflare Tunnel | Certificate management, renewal, DDoS protection, DNS management |
| Input validation | Manual if/else checking | zod | Schema composition, type inference, error formatting |
| UUID generation | Math.random-based IDs | uuid package | Collision probability, RFC compliance, cryptographic randomness |

**Key insight:** This project's value is in its unique filesystem-first architecture and event-sourced design. Every minute spent building commodity infrastructure (auth, hashing, tunneling) is a minute not spent on the differentiating features. Use battle-tested libraries for solved problems.

## Common Pitfalls

### Pitfall 1: WebAuthn HTTPS Requirement

**What goes wrong:** WebAuthn/passkeys fail silently or throw errors when not served over HTTPS (except on localhost).
**Why it happens:** The Web Authentication API requires a "secure context" -- either HTTPS or localhost. Development works on localhost, but remote access fails without HTTPS.
**How to avoid:** Use Cloudflare Tunnel which provides automatic HTTPS. Set `RP_ID` and `ORIGIN` environment variables to match the tunnel URL in production. In development, use `localhost` as RP_ID.
**Warning signs:** `NotAllowedError` or `SecurityError` during passkey registration/authentication when accessing remotely.

### Pitfall 2: WebAuthn RP ID Mismatch

**What goes wrong:** Passkeys registered on localhost won't work when accessing via tunnel URL (and vice versa).
**Why it happens:** WebAuthn binds credentials to the RP ID (domain). A passkey registered with `rpID: 'localhost'` cannot be used on `rpID: 'eluma.example.com'`.
**How to avoid:** Use the tunnel domain as the canonical RP_ID from the start (even in development, if possible). Alternatively, allow users to register separate passkeys for localhost and tunnel access. Store RP_ID in a central config that adapts per environment.
**Warning signs:** Authentication works locally but fails remotely (or vice versa).

### Pitfall 3: JSONL File Corruption on Crash

**What goes wrong:** A partial JSON line is written if the process crashes mid-write, corrupting the JSONL file.
**Why it happens:** `appendFileSync` is not fully atomic for writes exceeding PIPE_BUF, and power failures can interrupt any write.
**How to avoid:** Keep individual event JSON lines small (under 4KB for PIPE_BUF atomicity on Linux). Add a validation step on startup that checks the last line of each JSONL file and truncates partial lines. Use `JSON.parse` in a try-catch per line when reading.
**Warning signs:** `SyntaxError: Unexpected end of JSON input` when reading events.

### Pitfall 4: Chokidar Initial Scan Events

**What goes wrong:** Chokidar fires `add` events for all existing files when first initialized, causing the app to process all memory files as if they were just changed.
**Why it happens:** Default behavior -- chokidar reports existing files during initial scan.
**How to avoid:** Use `ignoreInitial: true` option when creating the watcher: `chokidar.watch(path, { ignoreInitial: true })`.
**Warning signs:** Burst of file change events on app startup, unnecessary Git commits or event generation.

### Pitfall 5: Git Commit Race Conditions

**What goes wrong:** Multiple rapid changes trigger overlapping Git commits that conflict.
**Why it happens:** Debounced commits fire but a previous commit is still running (staging/committing is not instantaneous).
**How to avoid:** Implement a commit queue: if a commit is in progress, queue the next one. Process the queue sequentially. Use simple-git's built-in promise chain to serialize operations.
**Warning signs:** Git errors about locked index files (`index.lock`), merge conflicts in auto-commits.

### Pitfall 6: Session File Accumulation

**What goes wrong:** Expired session files accumulate on disk, consuming space and slowing lookups.
**Why it happens:** session-file-store creates a new file per session but may not clean up aggressively enough.
**How to avoid:** Configure `reapInterval` (default: 1 hour) and `ttl` (default: 1 hour) appropriately. For a 2-user app, set `ttl` to 7 days and `reapInterval` to 6 hours.
**Warning signs:** Growing number of files in the sessions directory, slow session lookups.

### Pitfall 7: i18next Missing Translation Keys

**What goes wrong:** UI shows raw translation keys like `dashboard.welcome` instead of translated text.
**Why it happens:** Missing keys in translation JSON files, namespace not loaded, or typos in key strings.
**How to avoid:** Use TypeScript type-safe keys (i18next Type Augmentation). Set `saveMissing: true` in development to log missing keys. Add a fallback language (`fallbackLng: 'de'`) so German always shows even if English key is missing.
**Warning signs:** Raw key strings visible in UI, console warnings about missing translations.

## Code Examples

### Express + Vite Integration Setup

```typescript
// server/src/index.ts
import express from 'express';
import ViteExpress from 'vite-express';
import session from 'express-session';
import FileStore from 'session-file-store';
import helmet from 'helmet';
import compression from 'compression';
import { authRouter } from './routes/auth';
import { eventsRouter } from './routes/events';
import { projectsRouter } from './routes/projects';

const FileStoreSession = FileStore(session);
const app = express();

// Security and compression
app.use(helmet({ contentSecurityPolicy: false })); // CSP configured separately for WebAuthn
app.use(compression());
app.use(express.json());

// Session management with filesystem store
app.use(session({
  store: new FileStoreSession({
    path: './data/sessions',
    ttl: 604800, // 7 days in seconds
    reapInterval: 21600, // Clean every 6 hours
    secret: process.env.SESSION_SECRET,
  }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS in production (via tunnel)
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax',
  },
}));

// API routes
app.use('/api/auth', authRouter);
app.use('/api/events', eventsRouter);
app.use('/api/projects', projectsRouter);

// ViteExpress handles serving frontend (dev HMR + production static)
const PORT = parseInt(process.env.PORT || '3000', 10);
ViteExpress.listen(app, PORT, () => {
  console.log(`Eluma running at http://localhost:${PORT}`);
});
```

### i18next Configuration

```typescript
// client/src/i18n/config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './locales/de.json';
import en from './locales/en.json';

i18n.use(initReactI18next).init({
  resources: {
    de: { translation: de },
    en: { translation: en },
  },
  lng: undefined, // Detect from browser
  fallbackLng: 'de', // German fallback as specified
  detection: {
    order: ['localStorage', 'navigator'],
    lookupLocalStorage: 'eluma-language',
    caches: ['localStorage'],
  },
  interpolation: {
    escapeValue: false, // React already escapes
  },
  saveMissing: process.env.NODE_ENV === 'development',
});

export default i18n;
```

```json
// client/src/i18n/locales/de.json
{
  "common": {
    "save": "Speichern",
    "cancel": "Abbrechen",
    "delete": "Loeschen",
    "loading": "Wird geladen..."
  },
  "auth": {
    "login": "Anmelden",
    "logout": "Abmelden",
    "passkey_prompt": "Mit Passkey anmelden",
    "password_prompt": "Mit Passwort anmelden",
    "register": "Konto erstellen"
  },
  "setup": {
    "welcome": "Willkommen bei Eluma",
    "step1_title": "Konto einrichten",
    "step2_title": "Team erstellen",
    "step3_title": "System erkennen"
  }
}
```

### Filesystem Memory Watcher

```typescript
// server/src/fs/watcher.ts
import chokidar from 'chokidar';
import { simpleGit } from 'simple-git';
import { join } from 'path';

const MEMORY_DIR = process.env.MEMORY_DIR || './data/memory';
const git = simpleGit(MEMORY_DIR);

let commitTimeout: NodeJS.Timeout | null = null;
let pendingFiles: Set<string> = new Set();
let commitInProgress = false;

export function startMemoryWatcher() {
  const watcher = chokidar.watch(MEMORY_DIR, {
    ignoreInitial: true,
    ignored: /(^|[\/\\])\../, // Ignore dotfiles (.git)
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100,
    },
  });

  watcher.on('change', (filePath) => {
    if (filePath.endsWith('.md')) {
      pendingFiles.add(filePath);
      scheduleCommit();
    }
  });

  watcher.on('add', (filePath) => {
    if (filePath.endsWith('.md')) {
      pendingFiles.add(filePath);
      scheduleCommit();
    }
  });
}

function scheduleCommit() {
  if (commitTimeout) clearTimeout(commitTimeout);
  commitTimeout = setTimeout(performCommit, 5000); // 5-second debounce
}

async function performCommit() {
  if (commitInProgress || pendingFiles.size === 0) return;

  commitInProgress = true;
  const files = Array.from(pendingFiles);
  pendingFiles.clear();

  try {
    await git.add(files);
    const timestamp = new Date().toISOString();
    const fileNames = files.map(f => f.split('/').pop()).join(', ');
    await git.commit(`auto: update ${fileNames} at ${timestamp}`);
  } catch (err) {
    console.error('Git commit failed:', err);
    // Re-add files to pending for next attempt
    files.forEach(f => pendingFiles.add(f));
  } finally {
    commitInProgress = false;
    // If more files accumulated during commit, schedule another
    if (pendingFiles.size > 0) scheduleCommit();
  }
}
```

### pm2 Ecosystem Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'eluma',
    script: './server/dist/index.js',
    instances: 1, // Single instance (filesystem-first, no clustering)
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000,
    },
    error_file: './logs/eluma-error.log',
    out_file: './logs/eluma-out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  }],
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| bcrypt for passwords | argon2id | PHC 2015, mainstream 2023+ | Better GPU/ASIC resistance, configurable memory |
| Passwords only | WebAuthn/Passkeys primary | 2023-2026 adoption wave | Phishing-resistant, device-bound credentials |
| express-session + connect-redis | express-session + file store | Always available, but Redis was "default" | Filesystem-first means no Redis dependency |
| Create React App (CRA) | Vite | CRA deprecated 2023 | 40x faster builds, native TypeScript, ESM-first |
| Manual proxy config | vite-express | 2023+ | Handles dev/prod serving seamlessly |
| ngrok for tunnels | Cloudflare Tunnel | 2022+ free tier | Free custom domains, Zero Trust, no rate limits |
| i18next v20 string keys | i18next v23+ type-safe keys | 2023 | TypeScript augmentation catches missing keys at compile time |
| chokidar v3 (13 deps) | chokidar v4/v5 (1 dep, ESM) | Sep 2024 / Nov 2024 | Dramatically reduced dependency tree, ESM-only |

**Deprecated/outdated:**
- **Create React App:** Deprecated, no longer maintained. Use Vite.
- **@types/express-session:** May need separate install; check if bundled in latest express-session.
- **chokidar v3:** Still works but v4/v5 are dramatically leaner. Note v5 requires Node.js >= 20.19.
- **bcrypt native module:** Use argon2 instead for new projects; bcrypt is fine but argon2 is the modern standard.

## Open Questions

1. **Cloudflare Tunnel domain requirement**
   - What we know: Quick tunnels (`cloudflared tunnel --url`) provide temporary URLs. Named tunnels require a Cloudflare-managed domain.
   - What's unclear: Whether the team already has a domain pointed to Cloudflare, or if they need to acquire/configure one.
   - Recommendation: Start with quick tunnels for development. For production, register a domain (or use an existing one) and configure a named tunnel. The setup wizard should prompt for tunnel configuration.

2. **GitHub repo creation approach**
   - What we know: Context says "uses whatever `gh` / `git` credentials are on the machine." Both `gh` CLI and Octokit can create repos.
   - What's unclear: Whether the `gh` CLI is guaranteed to be installed and authenticated.
   - Recommendation: Use `gh` CLI via `child_process.execSync('gh repo create ...')` as the primary approach (simpler, uses existing credentials). Detect `gh` availability during system capability scan. Fall back to prompting the user to install/authenticate `gh` if not available.

3. **chokidar v5 Node.js requirement**
   - What we know: chokidar v5 requires Node.js >= 20.19 and is ESM-only.
   - What's unclear: What Node.js version the target machines will have.
   - Recommendation: Target Node.js 20 LTS (Active LTS until October 2026). Use chokidar v4 if v5's ESM-only constraint causes issues with the project setup. If using Node.js 22, v5 is safe.

4. **WebAuthn RP_ID for dual-access (localhost + tunnel)**
   - What we know: Passkeys are bound to RP_ID. A credential registered for `localhost` won't work for `eluma.example.com`.
   - What's unclear: Whether users will primarily access via localhost or tunnel.
   - Recommendation: Support both by allowing users to register multiple passkeys (one per access method). Store the RP_ID per credential. Default the primary RP_ID to the tunnel domain if configured.

## Sources

### Primary (HIGH confidence)
- [SimpleWebAuthn official docs (v13)](https://simplewebauthn.dev/docs/packages/server) -- Registration/authentication API, Node.js >= 20 LTS requirement
- [SimpleWebAuthn browser docs](https://simplewebauthn.dev/docs/packages/browser) -- Browser API for startRegistration/startAuthentication
- [Chokidar GitHub releases](https://github.com/paulmillr/chokidar/releases) -- v5.0.0 (Nov 2024), ESM-only, Node >= 20.19
- [vite-express GitHub](https://github.com/szymmis/vite-express) -- Express+Vite integration, dev/prod serving
- [react-i18next official docs](https://react.i18next.com/) -- useTranslation hook, TypeScript integration
- [Cloudflare Tunnel official docs](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/) -- Setup, downloads, service installation
- [PM2 official docs](https://pm2.keymetrics.io/docs/usage/application-declaration/) -- Ecosystem config, deployment
- [simple-git GitHub](https://github.com/steveukx/git-js) -- v3, TypeScript, promise-based API

### Secondary (MEDIUM confidence)
- [Argon2 vs bcrypt comparison](https://stytch.com/blog/argon2-vs-bcrypt-vs-scrypt/) -- Argon2id recommended, PHC winner
- [JSONL format specification](https://jsonltools.com/jsonl-format-specification) -- Append-only pattern, line-by-line processing
- [session-file-store npm](https://www.npmjs.com/package/session-file-store) -- Filesystem session storage for express-session
- [Vite backend integration guide](https://vite.dev/guide/backend-integration) -- Proxy configuration, production build serving
- [gh repo create CLI manual](https://cli.github.com/manual/gh_repo_create) -- Non-interactive repo creation
- [WebAuthn localhost/HTTPS requirements](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API) -- Secure context requirement

### Tertiary (LOW confidence)
- [Frontend framework market share 2026](https://www.frontendtools.tech/blog/best-frontend-frameworks-2025-comparison) -- React 39.5% market share claim (single source)
- [hasbin npm package](https://www.npmjs.com/package/hasbin) -- Last published 10 years ago; prefer `which` via child_process instead

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries verified through official docs and recent releases
- Architecture: HIGH -- Event sourcing with JSONL is well-documented; filesystem-first is unconventional but well-reasoned for 2-user system
- Pitfalls: HIGH -- WebAuthn HTTPS requirement, chokidar initial scan, Git race conditions are all well-documented issues
- Discretion decisions: MEDIUM -- Cloudflare Tunnel and JSONL format are strong recommendations but the team may have preferences; event store format requires validation during implementation

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days -- stable ecosystem, no fast-moving dependencies)
