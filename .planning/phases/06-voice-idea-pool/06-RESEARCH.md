# Phase 6: Voice & Idea Pool - Research

**Researched:** 2026-02-08
**Domain:** Browser audio recording, AI transcription, idea staging/refinement workflow
**Confidence:** HIGH

## Summary

Phase 6 introduces two interconnected capabilities: (1) in-browser audio recording with AI-powered transcription, and (2) an Idea Pool -- a pre-project staging area where raw voice/text input is iteratively refined by AI questioning until it meets "GSD-readiness" standards before graduating to a full project.

The technical foundation is solid. The existing AI SDK v6 (`ai@6.0.77`) already ships with `experimental_transcribe`, and the installed `@ai-sdk/openai@3.0.26` already exposes the `.transcription()` factory method supporting `whisper-1`, `gpt-4o-mini-transcribe`, and `gpt-4o-transcribe`. Browser-side audio recording uses the standard MediaRecorder API (no third-party library needed). The main new server dependency is `multer` for multipart file upload handling. The Idea Pool is a new aggregate type in the existing event-sourced JSONL store, following the same reducer pattern as projects, teams, and AI members.

**Primary recommendation:** Use the native MediaRecorder API (no library) for client-side recording, `multer` with memory storage for Express file upload, AI SDK's `experimental_transcribe` with `openai.transcription('whisper-1')` for transcription, and a new `idea_pool` aggregate type with its own JSONL file and reducer for the Idea Pool entity.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` (AI SDK) | 6.0.77 (installed) | `experimental_transcribe` for server-side transcription | Already in project; unified provider interface; handles retries |
| `@ai-sdk/openai` | 3.0.26 (installed) | `openai.transcription('whisper-1')` model factory | Already in project; typed transcription model IDs |
| `multer` | ^2.0.0 | Express multipart/form-data parsing for audio upload | De facto standard for Express file uploads; memory storage avoids disk I/O |
| MediaRecorder API | Browser-native | Client-side audio capture from microphone | No library needed; supported in all modern browsers; outputs webm/opus natively |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@types/multer` | ^1.4.12 | TypeScript definitions for multer | Development only |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| MediaRecorder (native) | `react-audio-voice-recorder` or `use-media-recorder` | Adds dependency for minimal abstraction; native API is ~40 lines in a custom hook |
| `multer` memory storage | `multer` disk storage | Disk avoids memory pressure for large files but adds cleanup; voice memos are small (<25MB Whisper limit) so memory is fine |
| `whisper-1` ($0.006/min) | `gpt-4o-mini-transcribe` | Newer model, potentially better quality, but higher cost; whisper-1 is battle-tested and cheapest |
| OpenAI transcription | Deepgram, AssemblyAI | Would require separate provider; AI SDK supports them but OpenAI is already configured |

**Installation:**
```bash
cd server && npm install multer && npm install -D @types/multer
```

No client-side packages needed (MediaRecorder is browser-native, no new React library required).

## Architecture Patterns

### Recommended Project Structure
```
server/src/
├── voice/
│   ├── transcribe.ts        # Wrapper around experimental_transcribe
│   └── router-analysis.ts   # AI routing logic (which project does this belong to?)
├── idea-pool/
│   ├── refinement.ts        # AI deep-questioning loop logic
│   └── graduation.ts        # Idea -> Project promotion logic
├── events/reducers/
│   └── idea.ts              # New: Idea aggregate reducer
├── routes/
│   ├── voice.ts             # New: POST /api/voice/transcribe
│   └── ideas.ts             # New: CRUD + refinement + graduation endpoints
shared/types/
├── idea.ts                  # New: Idea types (IdeaState, IdeaEntry, etc.)
├── events.ts                # Updated: new event types for idea_pool aggregate
client/src/
├── pages/
│   └── IdeaPool.tsx          # New: Idea Pool page
├── components/
│   ├── VoiceRecorder.tsx     # New: Record button + waveform + stop
│   ├── IdeaCard.tsx          # New: Single idea in the pool
│   ├── IdeaRefinement.tsx    # New: AI Q&A chat for refining an idea
│   └── IdeaGraduation.tsx    # New: Team agreement UI for promoting idea
├── hooks/
│   ├── useVoiceRecorder.ts   # New: MediaRecorder hook
│   └── useIdeaPool.ts        # New: Ideas CRUD + refinement hook
```

### Pattern 1: Audio Recording with MediaRecorder API
**What:** Custom React hook wrapping the browser's native MediaRecorder API
**When to use:** Any time the user needs to record audio in the browser
**Example:**
```typescript
// Source: MDN MediaRecorder API docs
// https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder

function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm',
    });
    chunks.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks.current, { type: 'audio/webm' });
      setAudioBlob(blob);
      stream.getTracks().forEach(t => t.stop()); // Release mic
    };
    recorder.start(1000); // Chunk every 1s for progress feedback
    mediaRecorder.current = recorder;
    setRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorder.current?.stop();
    setRecording(false);
  }, []);

  return { recording, audioBlob, startRecording, stopRecording };
}
```

### Pattern 2: Audio Upload via FormData
**What:** Client sends audio blob via FormData; server receives via multer
**When to use:** Uploading recorded audio for transcription
**Example:**
```typescript
// Client: upload audio blob
async function uploadAudio(blob: Blob): Promise<ApiResponse<TranscriptionResult>> {
  const formData = new FormData();
  formData.append('audio', blob, 'recording.webm');

  const response = await fetch('/api/voice/transcribe', {
    method: 'POST',
    credentials: 'same-origin',
    body: formData, // No Content-Type header -- browser sets multipart boundary
  });
  return response.json();
}
```

```typescript
// Server: receive with multer memory storage
import multer from 'multer';
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB (Whisper limit)
  fileFilter: (_req, file, cb) => {
    const allowed = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.post('/transcribe', upload.single('audio'), async (req, res) => {
  const audioBuffer = req.file!.buffer;
  // Pass to AI SDK transcribe...
});
```

### Pattern 3: AI SDK Transcription
**What:** Using `experimental_transcribe` with the OpenAI transcription provider
**When to use:** Converting audio buffer to text on the server
**Example:**
```typescript
// Source: AI SDK docs (ai-sdk.dev/docs/ai-sdk-core/transcription)
// Verified: experimental_transcribe exists in ai@6.0.77
import { experimental_transcribe as transcribe } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function transcribeAudio(audioBuffer: Buffer, language?: string) {
  const result = await transcribe({
    model: openai.transcription('whisper-1'),
    audio: audioBuffer,
    providerOptions: {
      openai: {
        ...(language && { language }), // ISO-639-1: 'en' or 'de'
      },
    },
  });

  return {
    text: result.text,
    segments: result.segments,
    language: result.language,
    durationInSeconds: result.durationInSeconds,
  };
}
```

### Pattern 4: Idea Pool as Event-Sourced Aggregate
**What:** New `idea_pool` aggregate type in the JSONL event store
**When to use:** Storing and reducing idea state through its lifecycle
**Example:**
```typescript
// New event types for idea lifecycle
type IdeaEventType =
  | 'idea.created'           // Initial capture (voice or text)
  | 'idea.transcription_added' // AI transcription result
  | 'idea.refinement_question' // AI asks a deep question
  | 'idea.refinement_answer'   // User answers the question
  | 'idea.readiness_assessed'  // AI evaluates GSD-readiness
  | 'idea.graduation_proposed' // Someone proposes promoting to project
  | 'idea.graduation_voted'    // Team member votes on graduation
  | 'idea.graduated'           // Idea becomes a project
  | 'idea.archived';           // Idea discarded

// Idea state derived from events (same pattern as ProjectState)
interface IdeaState {
  id: string;
  teamId: string;
  createdBy: string;
  title: string;                    // AI-generated from initial input
  rawInput: string;                 // Original transcription or text
  refinedMarkdown: string;          // Current refined state
  readinessScore: number;           // 0-100, AI-assessed
  refinementRounds: number;         // How many Q&A rounds completed
  status: 'capturing' | 'refining' | 'ready' | 'voting' | 'graduated' | 'archived';
  votes: Record<string, boolean>;   // userId -> approve/reject
  projectId?: string;               // Set when graduated
  createdAt: string;
  updatedAt: string;
}
```

### Pattern 5: AI Deep-Questioning Refinement Loop
**What:** AI iteratively asks questions about an idea until the markdown meets GSD-readiness
**When to use:** After initial idea capture, before graduation to project
**Example:**
```typescript
// Refinement uses the existing generateAiResponse wrapper
async function generateRefinementQuestion(idea: IdeaState, language: 'de' | 'en') {
  return generateAiResponse({
    taskType: 'idea_refinement',  // New task type
    projectId: idea.id,           // Use idea ID as projectId for cost tracking
    language,
    systemPrompt: `You are a project refinement assistant. Your goal is to ask one
focused question that fills the biggest gap in this idea's readiness for the GSD
pipeline. The idea needs: clear problem statement, target audience, feasibility
indicators, and effort estimate. Ask ONE question at a time.`,
    userPrompt: `Current idea state:\n\n${idea.refinedMarkdown}\n\nRefinement rounds
completed: ${idea.refinementRounds}\n\nWhat is the most important missing piece?`,
  });
}

// Readiness assessment
async function assessReadiness(idea: IdeaState, language: 'de' | 'en') {
  return generateAiResponse({
    taskType: 'idea_readiness',   // New task type
    projectId: idea.id,
    language,
    systemPrompt: `Evaluate this idea for GSD-readiness. Score 0-100 based on:
- Problem statement clarity (0-25)
- Target audience definition (0-25)
- Feasibility indicators (0-25)
- Effort/scope estimate (0-25)
Respond with JSON: { "score": N, "missing": ["..."], "recommendation": "..." }`,
    userPrompt: idea.refinedMarkdown,
    temperature: 0.2,
  });
}
```

### Pattern 6: Idea Graduation to Project
**What:** Promoting a refined idea to a full project via team vote
**When to use:** When readiness score meets threshold and team agrees
**Example:**
```typescript
// Graduation creates a project.created event from the idea's refined content
async function graduateIdea(ideaId: string, userId: string) {
  const idea = await getIdeaById(ideaId);
  if (!idea || idea.status !== 'voting') throw new Error('Idea not ready');

  // Check all team members have voted
  const team = await getTeamById(idea.teamId);
  const allVoted = team.members.every(m => idea.votes[m.userId] !== undefined);
  const allApproved = Object.values(idea.votes).every(v => v === true);

  if (!allVoted || !allApproved) throw new Error('Not all members approved');

  const projectId = randomUUID();
  const correlationId = randomUUID();

  // Create the project from idea content
  appendEvent({
    type: 'project.created',
    aggregateType: 'project',
    aggregateId: projectId,
    userId,
    correlationId,
    version: 1,
    data: {
      name: idea.title,
      description: idea.refinedMarkdown,
      teamId: idea.teamId,
      members: team.members.map(m => m.userId),
    },
  });

  // Mark idea as graduated
  appendEvent({
    type: 'idea.graduated',
    aggregateType: 'idea_pool',
    aggregateId: ideaId,
    userId,
    correlationId,
    version: idea.version + 1,
    data: { projectId },
  });

  return { projectId, ideaId };
}
```

### Anti-Patterns to Avoid
- **Storing audio files in JSONL events:** Audio blobs are large (megabytes). Never embed them in event data. The transcription text is what gets stored; the audio is ephemeral (processed and discarded, or optionally stored on filesystem).
- **Client-side transcription:** Do not try to run Whisper in the browser via WASM. It is unreliable, slow, and the API cost is negligible ($0.006/min). Always transcribe server-side.
- **Unbounded refinement loops:** The AI deep-questioning could loop forever. Set a maximum of 5-7 refinement rounds, and allow manual "mark as ready" override.
- **Blocking on audio upload:** Audio files can be several MB. Do not block the Express event loop. Use multer's async handling and stream the buffer to the AI SDK.
- **Mixing voice route with existing apiCall:** The existing `apiCall` helper always sets `Content-Type: application/json`. Audio uploads need FormData without explicit Content-Type. Create a separate `apiUpload` helper or use raw fetch.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio transcription | Custom speech recognition, browser Web Speech API | AI SDK `experimental_transcribe` + OpenAI `whisper-1` | Web Speech API is unreliable, browser-dependent, no offline, poor German support |
| Multipart file parsing | Manual multipart boundary parsing | `multer` with memory storage | Multipart parsing is notoriously error-prone; multer handles edge cases |
| Audio recording | Custom Web Audio API worklet pipeline | Native `MediaRecorder` API | MediaRecorder handles encoding, chunking, and format negotiation natively |
| MIME type detection | Custom magic byte sniffing | `multer` fileFilter + client-side `MediaRecorder.isTypeSupported()` | Browser already knows the MIME type it produced |
| GSD-readiness scoring | Custom heuristic | AI-powered assessment via existing `generateAiResponse` | AI can evaluate content quality semantically, not just structurally |

**Key insight:** The main complexity in this phase is in the workflow design (how ideas flow from capture through refinement to graduation), not in the audio technology. The audio pipeline is straightforward: MediaRecorder -> FormData -> multer -> AI SDK transcribe -> text. The hard part is designing the refinement loop and graduation consensus mechanism.

## Common Pitfalls

### Pitfall 1: MediaRecorder MIME Type Assumptions
**What goes wrong:** Code assumes `audio/webm;codecs=opus` is always available, but Safari uses `audio/mp4` by default.
**Why it happens:** Developers test only in Chrome where webm/opus is default.
**How to avoid:** Always call `MediaRecorder.isTypeSupported()` before setting mimeType. Fall back gracefully. Whisper accepts both webm and mp4.
**Warning signs:** Recording works in Chrome but fails silently in Safari.

### Pitfall 2: Microphone Permission UX
**What goes wrong:** App calls `getUserMedia` without preparing the user, leading to confusing permission dialogs or silent failures when denied.
**Why it happens:** Permission API is async and browser-dependent; some browsers remember denial permanently.
**How to avoid:** Show a clear "tap to allow microphone" UI before calling getUserMedia. Handle `NotAllowedError` and `NotFoundError` with user-friendly messages. Check `navigator.permissions.query({ name: 'microphone' })` first where supported.
**Warning signs:** Users report "recording doesn't work" but give no other details.

### Pitfall 3: FormData Content-Type Header
**What goes wrong:** Setting `Content-Type: application/json` or `Content-Type: multipart/form-data` manually when sending FormData via fetch.
**Why it happens:** Habit from JSON APIs. The existing `apiCall` helper always sets JSON content type.
**How to avoid:** When sending FormData, do NOT set the Content-Type header at all. The browser auto-generates it with the correct multipart boundary string. Create a dedicated `apiUpload` function.
**Warning signs:** Server receives empty body or multer fails to parse the upload.

### Pitfall 4: AI Refinement Infinite Loop
**What goes wrong:** AI keeps asking questions and never declares the idea "ready."
**Why it happens:** The AI prompt doesn't have clear graduation criteria, or the readiness threshold is too high.
**How to avoid:** Define explicit readiness criteria (problem statement, audience, feasibility, effort). Set a maximum refinement round count (5-7). Allow manual "I think this is ready" override by the user. Use structured JSON output for readiness scoring.
**Warning signs:** Ideas stay in "refining" status for weeks with 10+ rounds.

### Pitfall 5: Whisper API 25MB File Size Limit
**What goes wrong:** User records a very long voice memo (>30 minutes) that exceeds 25MB.
**Why it happens:** No client-side size enforcement.
**How to avoid:** Set multer `limits.fileSize` to 25MB. Add client-side recording time limit (e.g., 5 minutes). Show recording duration to user. For longer recordings, chunk on the client side.
**Warning signs:** Transcription API returns 413 or file size error.

### Pitfall 6: Memory Pressure from Audio Buffers
**What goes wrong:** Multiple concurrent audio uploads exhaust server memory when using multer's memory storage.
**Why it happens:** Each in-flight upload holds the full audio buffer in RAM.
**How to avoid:** This is a 2-user app (Elvis and Mario), so memory pressure is minimal. But still: set multer file size limits, and ensure buffers are garbage-collected after transcription completes (don't hold references).
**Warning signs:** Node.js OOM errors under concurrent uploads. (Unlikely at 2-user scale.)

## Code Examples

Verified patterns from official sources:

### Checking MediaRecorder Browser Support
```typescript
// Source: MDN MediaRecorder API
// https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder

function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  throw new Error('No supported audio MIME type found');
}
```

### Express Route with Multer for Audio
```typescript
// Source: Express multer middleware docs
// https://expressjs.com/en/resources/middleware/multer.html
import { Router } from 'express';
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const router = Router();

router.post('/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No audio file provided' });
  }
  // req.file.buffer is the audio data as Buffer
  // req.file.mimetype is the MIME type
  // req.file.size is the byte count
});
```

### AI SDK Transcription with Language Hint
```typescript
// Source: AI SDK docs (ai-sdk.dev/docs/ai-sdk-core/transcription)
// Verified: experimental_transcribe exported from ai@6.0.77
import { experimental_transcribe as transcribe } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY || 'missing' });

const result = await transcribe({
  model: openai.transcription('whisper-1'),
  audio: audioBuffer, // Buffer from multer
  providerOptions: {
    openai: {
      language: 'de', // ISO-639-1: improves accuracy and latency
    },
  },
});
// result.text: string (full transcription)
// result.segments: Array<{ text, startSecond, endSecond }>
// result.language: string | undefined
// result.durationInSeconds: number | undefined
```

### Client-Side FormData Upload (separate from apiCall)
```typescript
// New helper alongside existing apiCall
async function apiUpload<T>(
  url: string,
  formData: FormData
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      body: formData, // DO NOT set Content-Type header
    });
    const json = await response.json();
    if (!response.ok || json.success === false) {
      return { success: false, error: json.error || `HTTP ${response.status}` };
    }
    const data = json.data !== undefined ? json.data : json;
    return { success: true, data: data as T };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Upload failed' };
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Web Speech API for browser-side STT | Server-side Whisper API via AI SDK | 2023+ | Reliable, multilingual, consistent across browsers |
| Direct OpenAI API calls with `openai` npm | AI SDK `experimental_transcribe` | AI SDK 4+ (2024) | Unified provider interface, typed responses, built-in retries |
| `whisper-1` only | `whisper-1`, `gpt-4o-transcribe`, `gpt-4o-mini-transcribe` | Late 2024 | More model options; whisper-1 remains cheapest at $0.006/min |
| getUserMedia + manual encoding | MediaRecorder API | 2016+ (now universal) | All modern browsers support it; no polyfill needed |

**Deprecated/outdated:**
- `webkitSpeechRecognition` / Web Speech API: Browser-only, inconsistent, no offline, poor multilingual support. Not a replacement for server-side transcription.
- Running Whisper locally via WASM/ONNX: Technically possible but slow, memory-hungry, and defeats the purpose when API cost is $0.006/min for a 2-user app.

## Open Questions

1. **Audio Storage Policy**
   - What we know: Transcription text is stored as event data. Audio buffers are processed in-memory.
   - What's unclear: Should raw audio files be persisted to disk for audit/replay, or discarded after transcription?
   - Recommendation: Discard after transcription for simplicity and privacy. The transcription text in the event log is the record of truth. If audio retention is needed later, store to filesystem memory (already has Git versioning).

2. **Readiness Threshold for Graduation**
   - What we know: AI scores readiness 0-100 based on problem, audience, feasibility, effort.
   - What's unclear: What score should trigger "ready for graduation"? 70? 80?
   - Recommendation: Start with 70 as threshold with manual override. Tune based on experience. This is a UX decision, not a technical one.

3. **Voice Routing to Existing Projects**
   - What we know: VOIC-02 requires AI to analyze transcription and route to correct project.
   - What's unclear: How sophisticated should routing be? Simple keyword matching vs. semantic analysis?
   - Recommendation: Use AI semantic analysis (existing `generateAiResponse` with a `voice_routing` task type). Present top 3 project matches with confidence scores; user confirms. New ideas go to Idea Pool instead.

4. **Graduation Voting Mechanism**
   - What we know: VOIC-05 says "team members explicitly agree."
   - What's unclear: Does this mean unanimous approval? Majority? Just the creator?
   - Recommendation: For a 2-person team (Elvis + Mario), require both to approve. Store votes as events. This is simple and matches the team size.

5. **Transcription Model Selection**
   - What we know: `whisper-1` at $0.006/min, `gpt-4o-transcribe` at higher cost but potentially better quality.
   - What's unclear: Is German transcription quality sufficient with whisper-1?
   - Recommendation: Default to `whisper-1` (cheapest, battle-tested). Add to `TASK_MODEL_MAP` as `transcription: "openai:whisper"`. Allow model override via existing override mechanism. Note: transcription uses a separate model path (`.transcription()` not `.languageModel()`), so it needs its own model resolution, not the existing provider registry.

6. **Idea Pool vs. Existing "Idea" Phase**
   - What we know: Projects already start at the "idea" phase in the 8-phase lifecycle. The Idea Pool is a _pre-project_ staging area.
   - What's unclear: How does the Idea Pool relate to the existing "idea" project phase?
   - Recommendation: The Idea Pool is a separate entity (not a project). When an idea graduates, a new project is created starting at the "idea" lifecycle phase. The graduated idea's refined content pre-populates the project description. The two are linked via correlationId.

## Sources

### Primary (HIGH confidence)
- `ai@6.0.77` installed package -- verified `experimental_transcribe` export exists via runtime check
- `@ai-sdk/openai@3.0.26` installed package -- verified `OpenAITranscriptionModelId` type includes `whisper-1`, `gpt-4o-mini-transcribe`, `gpt-4o-transcribe` in dist/index.d.ts
- [AI SDK Transcription Docs](https://ai-sdk.dev/docs/ai-sdk-core/transcription) -- API signature, parameters, return types, provider options
- [AI SDK transcribe() Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/transcribe) -- Full parameter and return type documentation
- [MDN MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) -- Browser audio recording API reference
- [MDN MediaStream Recording API](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API/Using_the_MediaStream_Recording_API) -- Usage guide for MediaRecorder
- [Express multer middleware](https://expressjs.com/en/resources/middleware/multer.html) -- Official multer documentation

### Secondary (MEDIUM confidence)
- [OpenAI Speech-to-Text Guide](https://platform.openai.com/docs/guides/speech-to-text) -- Whisper models, file formats, size limits
- [OpenAI Audio API Reference](https://platform.openai.com/docs/api-reference/audio/) -- Supported formats: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm
- [Can I Use MediaRecorder](https://caniuse.com/mediarecorder) -- Browser support table confirming universal modern browser support
- [AI SDK Providers: OpenAI](https://ai-sdk.dev/providers/ai-sdk-providers/openai) -- OpenAI provider configuration including transcription

### Tertiary (LOW confidence)
- Whisper API pricing ($0.006/min as of Feb 2026) -- from third-party pricing aggregator sites, not directly from OpenAI pricing page

### Existing Codebase (HIGH confidence)
- `/Users/developer/eluma/server/src/ai/providers.ts` -- Existing provider registry pattern (lazy init, tier aliases)
- `/Users/developer/eluma/server/src/ai/generate.ts` -- Existing `generateAiResponse` wrapper (model selection, cost tracking, event logging)
- `/Users/developer/eluma/server/src/ai/config.ts` -- Existing task type presets (temperature, tokens)
- `/Users/developer/eluma/server/src/events/store.ts` -- Existing JSONL event store (appendEvent, readEvents)
- `/Users/developer/eluma/server/src/events/reducers/project.ts` -- Existing reducer pattern for event-sourced aggregates
- `/Users/developer/eluma/server/src/workflow/definitions.ts` -- Existing workflow step definitions pattern
- `/Users/developer/eluma/shared/types/models.ts` -- EntrySourceType already includes "audio" (forward-compatible)
- `/Users/developer/eluma/shared/types/ai.ts` -- Existing AiTaskType union (needs extension for new task types)
- `/Users/developer/eluma/client/src/api/client.ts` -- Existing apiCall helper (JSON-only, needs FormData counterpart)
- `/Users/developer/eluma/client/src/hooks/useTextToSpeech.ts` -- Existing TTS hook (for playback of AI responses to ideas)
- `/Users/developer/eluma/server/src/app.ts` -- Existing route registration pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All core libraries either already installed (AI SDK, @ai-sdk/openai) or are de facto standards (multer, MediaRecorder API). Verified via installed package inspection and official docs.
- Architecture: HIGH -- Follows established patterns from Phases 1-5 (event-sourced aggregates, reducers, Express routes, React hooks). The Idea Pool is a new aggregate type using the same JSONL store pattern.
- Pitfalls: HIGH -- Well-documented browser API quirks (MIME types, permissions, FormData headers). Refinement loop risks identified from AI workflow experience.
- Transcription integration: HIGH -- Verified `experimental_transcribe` exists in installed `ai@6.0.77` and `openai.transcription()` exists in installed `@ai-sdk/openai@3.0.26`. No package upgrades needed.
- Voice routing logic: MEDIUM -- Semantic routing via AI is conceptually clear but the prompt engineering for accurate project matching needs iteration.
- Graduation consensus: MEDIUM -- Simple for 2-person team; would need redesign for larger teams.

**Research date:** 2026-02-08
**Valid until:** 2026-03-10 (30 days -- stable domain, no fast-moving changes expected)
