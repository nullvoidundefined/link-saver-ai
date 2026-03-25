# Link Saver + AI Summarizer — API

Bookmark manager API where saved URLs are auto-fetched and summarized by Claude with real-time SSE streaming. Redis caches summaries for repeat views.

## Architecture

```
Client (Next.js)
  │
  ├─ REST ──► Express API ──► PostgreSQL (Neon)
  │             │
  │             ├─ Redis (summary cache, rate limiting)
  │             │
  └─ SSE  ◄─── └─ Anthropic Claude API (streaming)
```

### Request flow

```
Routes → Middleware → Handlers → Services / Repositories → Database / Redis / Anthropic
```

- **Routes** define endpoints and wire up middleware (auth, rate limiting, CSRF).
- **Handlers** contain request/response logic and orchestrate services.
- **Services** wrap external integrations (Anthropic streaming, content extraction, Redis cache).
- **Repositories** execute parameterized SQL queries against the connection pool.
- **Schemas** validate incoming request bodies with Zod.

Path aliases use `app/*` → `src/*` (configured in `tsconfig.json`, resolved at build time by `tsc-alias`).

### SSE streaming flow

The summary endpoint (`GET /links/:id/summary`) streams tokens from Claude to the browser via Server-Sent Events:

```
1. Client opens EventSource connection
2. Server checks Redis cache
   ├─ Cache HIT  → sends "cached" + "done" events, closes stream
   └─ Cache MISS → calls Anthropic streaming API
3. Each text delta from Claude is forwarded as a "token" event
4. On completion, a "done" event includes the full summary + token usage
5. Summary is written to PostgreSQL and cached in Redis (7-day TTL)
```

**SSE event types:**

| Event    | Payload                             | When                      |
| -------- | ----------------------------------- | ------------------------- |
| `cached` | `{ type: "cached", summary }`       | Cache hit                 |
| `token`  | `{ type: "token", token }`          | Each streaming text delta |
| `done`   | `{ type: "done", summary, usage? }` | Stream complete           |
| `error`  | `{ type: "error", message }`        | LLM or processing error   |

**Why SSE over WebSocket:** Summaries are unidirectional (server → client) and request-scoped. SSE is simpler, works through proxies, and auto-reconnects. WebSocket's bidirectional channel adds complexity without benefit here.

**Abort handling:** When the client disconnects (closes the EventSource), the server aborts the in-flight Anthropic API call via `AbortController` to avoid wasting tokens.

### Cache strategy

```
Redis key: summary:{url_hash}     TTL: 7 days
```

- **url_hash** is a SHA-256 of the URL, computed at link creation time.
- On cache hit, the summary is returned instantly without calling the LLM.
- On cache miss, the LLM streams a fresh summary, which is then cached.
- **Explicit bust:** The `POST /links/:id/resummarize` endpoint deletes the cache entry and resets the link's summary status, so the next summary request re-streams from the LLM.
- **Fail-open:** If Redis is unavailable, the app falls back to always calling the LLM.

### Content extraction

When a link is saved, the server fetches the page content using `@extractus/article-extractor`. The extracted text (not raw HTML) is stored in PostgreSQL and sent to the LLM for summarization.

If the link has no stored content when a summary is requested, the server fetches it on demand before streaming.

## Prerequisites

- Node.js 22+
- PostgreSQL (e.g. [Neon](https://neon.tech))
- Redis (e.g. [Railway](https://railway.app))

## Setup

```bash
pnpm install
cp .env.example .env
# Edit .env — set DATABASE_URL, REDIS_URL, ANTHROPIC_API_KEY
pnpm run migrate:up
```

### Environment variables

| Variable                           | Required   | Default                 | Description                                   |
| ---------------------------------- | ---------- | ----------------------- | --------------------------------------------- |
| `DATABASE_URL`                     | Yes        | —                       | PostgreSQL connection string                  |
| `REDIS_URL`                        | No         | —                       | Redis connection string (caching, rate limit) |
| `ANTHROPIC_API_KEY`                | Yes        | —                       | Anthropic API key for Claude                  |
| `PORT`                             | No         | `3000`                  | Server port                                   |
| `CORS_ORIGIN`                      | Production | `http://localhost:5173` | Allowed origin for CORS                       |
| `NODE_ENV`                         | No         | `development`           | `development` or `production`                 |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | No         | —                       | Set to `false` to skip SSL cert verification  |

## Scripts

| Command                  | Description                             |
| ------------------------ | --------------------------------------- |
| `pnpm run dev`           | Run with hot reload (`tsx watch`)       |
| `pnpm run build`         | Compile TypeScript to `dist/`           |
| `pnpm start`             | Run compiled app (`node dist/index.js`) |
| `pnpm run migrate:up`    | Apply pending migrations                |
| `pnpm run migrate:down`  | Roll back one migration                 |
| `pnpm test`              | Run unit tests                          |
| `pnpm run test:watch`    | Run tests in watch mode                 |
| `pnpm run test:coverage` | Run tests with coverage (80% threshold) |
| `pnpm run lint`          | Lint source                             |
| `pnpm run lint:fix`      | Lint and auto-fix                       |
| `pnpm run format:check`  | Check formatting (Prettier)             |
| `pnpm run format`        | Format code                             |

## API

Base URL: `http://localhost:3000` (or your `PORT`).

All error responses use the shape `{ error: { message: string } }`.

### Health

- **`GET /health`** — Returns `{ status: "ok", db: "connected" }`.

### Authentication

Sessions are cookie-based (`sid`, HTTP-only, 7-day TTL).

| Method | Path             | Description                                             |
| ------ | ---------------- | ------------------------------------------------------- |
| `POST` | `/auth/register` | Register (body: `email`, `password`); sets `sid` cookie |
| `POST` | `/auth/login`    | Login (body: `email`, `password`); sets `sid` cookie    |
| `POST` | `/auth/logout`   | Logout; clears session                                  |
| `GET`  | `/auth/me`       | Get current user (requires auth)                        |

### Links

All link endpoints require authentication.

| Method   | Path                     | Description                            |
| -------- | ------------------------ | -------------------------------------- |
| `POST`   | `/links`                 | Create link (body: `{ url }`)          |
| `GET`    | `/links`                 | List user's links (`?q=` for search)   |
| `GET`    | `/links/:id`             | Get link by ID                         |
| `PATCH`  | `/links/:id`             | Update link (body: `{ title?, url? }`) |
| `DELETE` | `/links/:id`             | Delete link                            |
| `GET`    | `/links/:id/summary`     | Stream summary via SSE                 |
| `POST`   | `/links/:id/resummarize` | Bust cache and reset for re-summary    |
| `POST`   | `/links/:id/tags`        | Add tag to link (body: `{ tagId }`)    |
| `GET`    | `/links/:id/tags`        | List tags for a link                   |
| `DELETE` | `/links/:id/tags/:tagId` | Remove tag from link                   |

**Summary rate limit:** 20 requests per hour per user. Returns `429` with `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After` headers when exceeded.

### Tags

All tag endpoints require authentication.

| Method   | Path        | Description                                    |
| -------- | ----------- | ---------------------------------------------- |
| `POST`   | `/tags`     | Create tag (body: `{ name, color? }`)          |
| `GET`    | `/tags`     | List user's tags                               |
| `GET`    | `/tags/:id` | Get tag by ID                                  |
| `PATCH`  | `/tags/:id` | Update tag (body: `{ name?, color? }`)         |
| `DELETE` | `/tags/:id` | Delete tag (cascades to link-tag associations) |

## Security

| Layer              | Details                                                                      |
| ------------------ | ---------------------------------------------------------------------------- |
| **Helmet**         | Sets security headers (XSS, clickjacking, MIME sniffing, etc.)               |
| **CORS**           | Credentials enabled; origin controlled via `CORS_ORIGIN`                     |
| **CSRF**           | State-changing requests require `X-Requested-With` header; 403 without it    |
| **Rate limiting**  | 100 req / 15 min globally; 10 req / 15 min on auth; 20 req / hr on summaries |
| **Authentication** | Cookie-based sessions; tokens hashed with SHA-256 before storage             |
| **Passwords**      | Hashed with bcrypt (10 rounds)                                               |
| **Body limits**    | JSON and URL-encoded payloads capped at 10 KB                                |
| **Timeouts**       | 30-second request timeout                                                    |

## Testing

- **Framework:** Vitest with v8 coverage (80% threshold)
- **HTTP assertions:** supertest
- **96 tests** covering middleware, handlers, repositories, schemas, and SSE streaming

## Database schema

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
