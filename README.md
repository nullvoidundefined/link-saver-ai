# Link Saver + AI Summarizer — Full Application Description

## Overview

The Link Saver + AI Summarizer is a full-stack bookmark manager where saved URLs are automatically fetched and summarized by an LLM. Summaries stream to the frontend in real time via Server-Sent Events, and Redis caches completed summaries so repeat views are instant. This is the second app in a portfolio of eight progressive AI applications, demonstrating the **SSE streaming pattern** that gets reused in apps 4, 7, and 8.

Unlike a simple "paste URL, get summary" tool, this app streams tokens as they arrive from Claude, shows real-time status indicators (pending/streaming/complete/error), caches aggressively to avoid redundant API calls, and cancels in-flight LLM requests when users navigate away — all patterns critical for production AI applications.

**Live app:** https://link-saver-ai.vercel.app

---

## Core Features

### 1. Save & Auto-Summarize URLs

Users paste a URL into a form. The server fetches the page content using `@extractus/article-extractor`, stores the extracted text, and makes it available for summarization. One click generates a streaming AI summary.

### 2. Real-Time SSE Streaming

The summary endpoint (`GET /links/:id/summary`) streams tokens from Claude to the browser via Server-Sent Events:

1. Client opens an `EventSource` connection
2. Server checks Redis cache
   - **Cache hit** → sends `cached` + `done` events instantly, closes stream
   - **Cache miss** → calls Anthropic streaming API
3. Each text delta from Claude is forwarded as a `token` event
4. On completion, a `done` event includes the full summary + token usage
5. Summary is written to PostgreSQL and cached in Redis (7-day TTL)

The frontend renders a blinking cursor during streaming and shows token usage (input/output) on completion.

**SSE event types:**

| Event    | Payload                             | When                      |
| -------- | ----------------------------------- | ------------------------- |
| `cached` | `{ type: "cached", summary }`       | Cache hit                 |
| `token`  | `{ type: "token", token }`          | Each streaming text delta |
| `done`   | `{ type: "done", summary, usage? }` | Stream complete           |
| `error`  | `{ type: "error", message }`        | LLM or processing error   |

### 3. Redis Summary Caching

```
Redis key: summary:{url_hash}     TTL: 7 days
```

- **url_hash** is a SHA-256 of the URL, computed at link creation time.
- On cache hit, the summary is returned instantly without calling the LLM.
- On cache miss, the LLM streams a fresh summary, which is then cached.
- **Fail-open:** If Redis is unavailable, the app falls back to always calling the LLM.

### 4. Re-Summarize with Cache Busting

A "Re-summarize" button calls `POST /links/:id/resummarize`, which deletes the Redis cache entry and resets the link's summary status. The next summary request re-streams from the LLM with fresh content.

### 5. Abort Handling

When the client disconnects (closes the EventSource or navigates away), the server aborts the in-flight Anthropic API call via `AbortController` to avoid wasting tokens.

### 6. Tag Management & Filtering

- Create tags with custom names and hex colors
- Assign/remove tags on any link
- Filter the link list by tag
- Tags cascade-delete when removed

### 7. Search

Search across links by title, domain, URL, or tag name. Uses PostgreSQL `ILIKE` with a `LEFT JOIN` on tags for full-text matching.

### 8. Token Usage Display

After a summary completes, the UI shows input and output token counts — giving visibility into LLM costs per summary.

### 9. Status Indicators

Each link shows its summary status with color-coded badges:

- **Idle** (gray) — not yet summarized
- **Connecting** (amber) — opening SSE connection
- **Streaming** (blue) — tokens arriving in real time
- **Complete** (green) — summary finished, with optional "(cached)" label
- **Error** (red) — summarization failed, with retry button

### 10. Authentication & Security

- Session-based auth with HTTP-only cookies (`SameSite=None` + `Secure` for cross-domain production)
- Passwords hashed with bcrypt (10 rounds)
- CSRF guard middleware (requires `X-Requested-With` header)
- Rate limiting: 100 req/15 min global, 10 req/15 min on auth, 20 req/hr on summaries (per-user via Redis)
- Protected routes on both frontend and backend

---

## Architecture

### Monorepo Structure

```
link-saver-ai-summarizer/
├── server/           Express API (Railway)
│   ├── src/
│   │   ├── routes/         API route definitions
│   │   ├── handlers/       Request handlers (auth, links, tags, summary)
│   │   ├── services/       Anthropic streaming, content fetcher, summary cache
│   │   ├── prompts/        System prompt for summarization
│   │   ├── repositories/   Database query layer (links, tags, link-tags, auth)
│   │   ├── middleware/      Auth, CSRF, rate limiting, logging
│   │   ├── schemas/        Zod validation schemas
│   │   └── config/         Redis, CORS, environment
│   └── migrations/         6 node-pg-migrate files
│
└── web-client/       Next.js frontend (Vercel)
    ├── src/
    │   ├── app/            App Router pages (dashboard, account)
    │   ├── components/     StreamingSummary, TagManager
    │   └── lib/            API fetch wrapper with SSE support
    └── public/
```

### Tech Stack

| Layer | Technology | Deployment |
|-------|-----------|------------|
| Frontend | Next.js 15, React 19, TypeScript | Vercel |
| API Server | Express 5, TypeScript, Pino logging | Railway |
| Database | PostgreSQL, 5 tables | Neon |
| Cache | Redis (ioredis), 7-day TTL | Railway |
| AI | Anthropic Claude API (claude-sonnet-4-20250514), streaming | Anthropic |
| Content Extraction | @extractus/article-extractor | — |
| Auth | Custom session-based (bcrypt + HTTP-only cookies) | — |
| Testing | Vitest, 96 tests, supertest for HTTP | — |
| Dev Tools | ESLint, Prettier, Lefthook (git hooks), pnpm workspaces | — |

### Database Schema (5 Tables)

```
users          sessions       links              tags           link_tags
─────          ────────       ─────              ────           ─────────
id (PK)        id (PK)        id (PK)            id (PK)        link_id (FK)
email          user_id (FK)   user_id (FK)       user_id (FK)   tag_id  (FK)
password_hash  token_hash     url                name           (composite PK)
created_at     expires_at     url_hash           color
               created_at     title              created_at
                              domain             updated_at
                              summary
                              summary_status
                              fetched_content
                              created_at
                              updated_at
```

### Caching Strategy

- **Redis cache** — `summary:{url_hash}` key with 7-day TTL
- **Cache hit** returns the summary instantly via SSE without calling the LLM
- **Cache miss** streams from Claude, then caches the result
- **Explicit bust** via the re-summarize endpoint deletes the cache entry
- **Fail-open** — if Redis is unavailable, every request goes to the LLM

### SSE vs WebSocket

Summaries are unidirectional (server → client) and request-scoped. SSE is simpler, works through proxies, and auto-reconnects. WebSocket's bidirectional channel adds complexity without benefit here. This same pattern is reused in apps 4, 7, and 8.

---

## Build Philosophy

This application was built following a three-phase approach:

### Phase 1: POC (Days 1–3)

Get the core streaming loop working end-to-end, deployed. A user pastes a URL, the API saves it and fetches content, and the SSE endpoint streams an AI summary token-by-token to the browser. API deployed on Railway, frontend on Vercel.

### Phase 2: Week 1

Add Redis caching (cached summaries return instantly, uncached stream from the LLM). Complete links CRUD. Abort handling that cancels the Anthropic API call on client disconnect. Per-user rate limiting via Redis. Full tags system with link-tag associations.

### Phase 3: Week 2

Complete the frontend: link list with status badges and summary previews, streaming summary component with progressive text rendering, re-summarize button, tag management UI with filtering, search across links, token count display. Integration tests covering SSE streaming, cache hit/miss, and error handling. Architecture documentation.

### Key Design Decisions

- **SSE over WebSocket** — Simpler, unidirectional, sufficient for streaming summaries. Reused in later apps.
- **Redis cache with explicit bust** — TTL-based expiry (7 days) plus manual invalidation via re-summarize. Fail-open if Redis is down.
- **Content extraction before LLM** — Send cleaned article text to Claude, not raw HTML. Reduces token usage and improves summary quality.
- **AbortController on disconnect** — Cancels the Anthropic API call when the SSE client closes, preventing wasted tokens.
- **Per-user rate limiting** — Redis INCR + EXPIRE sliding window (20 req/hr) to prevent abuse. Fails open if Redis is unavailable.
- **SameSite=None cookies** — Required for cross-domain auth between Vercel (frontend) and Railway (API).

---

## Suggested Next Steps

### Near-Term Enhancements

1. **Bulk Import** — Import bookmarks from browser export files (HTML bookmark format) or other services.
2. **Summary Comparison** — Show diff between old and new summary after re-summarize, so users can see what changed.
3. **Keyboard Shortcuts** — Quick-save from clipboard (Cmd+V), navigate links with arrow keys, trigger summary with Enter.
4. **Browser Extension** — One-click save from any webpage. Sends the current URL to the API and opens the summary.
5. **Summary Length Control** — Let users choose between brief (1-2 sentences), standard, and detailed summaries via a prompt parameter.

### Medium-Term Features

6. **Reading List / Queue** — Mark links as "to read" vs. "read". Sort and filter by read status.
7. **Collections / Folders** — Group links into named collections beyond flat tags. Nested organization for power users.
8. **Auto-Tagging** — Use Claude to suggest tags based on the content of the article. User confirms or rejects suggestions.
9. **RSS Feed Monitoring** — Subscribe to RSS feeds and auto-save new articles as they appear.
10. **Summary Newsletter** — Weekly email digest of saved links with their summaries, sent via transactional email.

### Long-Term Vision

11. **Semantic Search** — Use embeddings (pgvector) to find links by meaning, not just keyword matching. Reuses patterns from App 4.
12. **Collaborative Collections** — Share link collections with teams. Multiple users can save to and view the same collection.
13. **Content Change Detection** — Periodically re-fetch URLs and notify users when content has significantly changed.
14. **Mobile App** — React Native frontend sharing the same API backend.
15. **API Access** — Public API with API keys for programmatic link saving and retrieval.
