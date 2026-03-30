# Link Saver AI — Technical Summary

## Architecture

Link Saver AI is a two-package pnpm monorepo consisting of an Express 5 API server and a Next.js 15 web client. The server runs on Railway inside a multi-stage Docker container, the frontend deploys to Vercel, the database is serverless PostgreSQL on Neon, and Redis runs on Railway for caching and rate limiting.

All communication between the frontend and API is over REST, except for summary generation which uses Server-Sent Events (SSE). The browser opens an EventSource connection to the API, which in turn opens a streaming connection to the Anthropic Claude API. Tokens are forwarded to the browser as they arrive, giving the user real-time visibility into summary generation. When a summary has already been generated for a URL, Redis serves it instantly without touching the LLM.

The server follows a layered architecture: Routes define URL patterns and attach middleware, Handlers parse input and orchestrate responses, Services encapsulate business logic (Anthropic streaming, content fetching, cache operations), and Repositories own all SQL queries. This separation keeps each layer independently testable and free of cross-cutting concerns.

## Stack

| Layer              | Technology                                  | Notes                                             |
| ------------------ | ------------------------------------------- | ------------------------------------------------- |
| Frontend           | Next.js 15 (App Router)                     | React 19, TanStack React Query                    |
| API Server         | Express 5                                   | Async error propagation, TypeScript strict mode   |
| Database           | PostgreSQL (Neon)                           | 5 tables, UUID primary keys, CASCADE deletes      |
| Cache              | Redis (Railway)                             | ioredis, lazy initialization, fail-open           |
| LLM                | Anthropic Claude (claude-sonnet-4-20250514) | Streaming SDK with AbortController                |
| Auth               | Custom sessions                             | bcrypt + SHA256 hashed tokens + HTTP-only cookies |
| Validation         | Zod 4                                       | All request bodies validated at handler layer     |
| Logging            | Pino + pino-http                            | JSON in production, pretty-print in development   |
| Testing            | Vitest + supertest                          | Unit and integration tests                        |
| Content Extraction | @extractus/article-extractor                | Fallback to raw fetch + HTML stripping            |
| Package Manager    | pnpm 9                                      | Workspace monorepo                                |

## Key Patterns

1. **SSE Streaming with AbortController** — The server opens an EventSource-compatible response and forwards Claude tokens as they arrive. An AbortController tied to `req.on('close')` cancels the in-flight Anthropic API call if the user navigates away, preventing wasted tokens.

2. **Redis Cache with Fail-Open Degradation** — Summaries are cached by `SHA256(url)` with a 7-day TTL. If Redis is unavailable (connection failure or `REDIS_URL` unset), all cache operations return null and the app continues in uncached mode. No 5xx errors from Redis failures.

3. **Per-User Redis Rate Limiting** — Summary generation is rate-limited to 20 requests per hour per user using Redis INCR with EXPIRE. The rate limiter also fails open if Redis is down.

4. **Custom Session Authentication** — The server generates a 32-byte random token, stores its SHA256 hash in the database, and sends the raw token in an HTTP-only cookie. A database breach cannot be used to hijack sessions. Login atomically deletes old sessions and creates a new one inside a transaction.

5. **CSRF via X-Requested-With Header** — Instead of stateful CSRF tokens, the app relies on the fact that browsers block custom headers on cross-origin requests without a CORS preflight. The CORS policy is locked to the frontend origin, so any request with `X-Requested-With` must come from trusted code.

6. **Content Extraction with Fallback** — The primary extractor (@extractus/article-extractor) parses clean article text. If it fails (paywalled sites, SPAs), the server falls back to raw fetch with a 15-second timeout and manual HTML stripping. Content is capped at 100,000 characters.

## Data Flow

1. User pastes a URL into the link form and clicks Save Link.
2. The frontend POSTs to `/links` with the URL.
3. The server extracts the article content using @extractus/article-extractor (with fallback), computes `SHA256(url)`, and inserts a row into the `links` table with status `pending`.
4. User clicks Generate Summary on the saved link.
5. The frontend opens an EventSource connection to `GET /links/:id/summary`.
6. The server checks Redis for a cached summary keyed by `summary:{sha256(url)}`.
7. On cache hit: the server sends a `cached` event followed by `done` and closes the stream.
8. On cache miss: the server sets the link status to `streaming`, opens a streaming connection to the Anthropic Claude API, and forwards each token to the browser as an SSE `token` event.
9. When the stream completes, the server writes the full summary to PostgreSQL, caches it in Redis with a 7-day TTL, sends a `done` event with token usage, and closes the stream.
10. If the user disconnects mid-stream, the AbortController cancels the Anthropic API call immediately.

## API Endpoints

| Method | Path                     | Auth | Description                               |
| ------ | ------------------------ | ---- | ----------------------------------------- |
| POST   | `/auth/register`         | No   | Create user and session                   |
| POST   | `/auth/login`            | No   | Validate credentials, create session      |
| POST   | `/auth/logout`           | No   | Delete session, clear cookie              |
| GET    | `/auth/me`               | Yes  | Return current user                       |
| POST   | `/links`                 | Yes  | Save a link, fetch content                |
| GET    | `/links`                 | Yes  | List user's links (optional `?q=` search) |
| GET    | `/links/:id`             | Yes  | Get single link                           |
| PATCH  | `/links/:id`             | Yes  | Update link title                         |
| DELETE | `/links/:id`             | Yes  | Delete link, bust cache                   |
| GET    | `/links/:id/summary`     | Yes  | SSE stream summary (cached or live)       |
| POST   | `/links/:id/resummarize` | Yes  | Bust cache, reset status to pending       |
| POST   | `/links/:id/tags`        | Yes  | Assign tag to link                        |
| GET    | `/links/:id/tags`        | Yes  | List tags on a link                       |
| DELETE | `/links/:id/tags/:tagId` | Yes  | Remove tag from link                      |
| POST   | `/tags`                  | Yes  | Create tag                                |
| GET    | `/tags`                  | Yes  | List user's tags                          |
| GET    | `/tags/:id`              | Yes  | Get single tag                            |
| PATCH  | `/tags/:id`              | Yes  | Update tag name/color                     |
| DELETE | `/tags/:id`              | Yes  | Delete tag (cascades)                     |
| GET    | `/health`                | No   | Basic health check                        |
| GET    | `/health/ready`          | No   | DB connectivity check                     |

## Database Schema

### users

| Column        | Type        | Notes                    |
| ------------- | ----------- | ------------------------ |
| id            | UUID (PK)   | gen_random_uuid()        |
| email         | TEXT        | UNIQUE, NOT NULL         |
| password_hash | TEXT        | bcrypt, 12 salt rounds   |
| created_at    | TIMESTAMPTZ | DEFAULT NOW()            |
| updated_at    | TIMESTAMPTZ | Auto-updated via trigger |

### sessions

| Column     | Type        | Notes                    |
| ---------- | ----------- | ------------------------ |
| id         | TEXT (PK)   | SHA256 hash of raw token |
| user_id    | UUID (FK)   | CASCADE on user delete   |
| expires_at | TIMESTAMPTZ | 30-day TTL               |
| created_at | TIMESTAMPTZ | DEFAULT NOW()            |

### links

| Column          | Type        | Notes                                   |
| --------------- | ----------- | --------------------------------------- |
| id              | UUID (PK)   | gen_random_uuid()                       |
| user_id         | UUID (FK)   | CASCADE on user delete                  |
| url             | TEXT        | NOT NULL                                |
| url_hash        | TEXT        | SHA256(url), used as Redis cache key    |
| title           | TEXT        | Nullable, extracted from content        |
| domain          | TEXT        | Extracted hostname                      |
| summary         | TEXT        | Nullable, populated after generation    |
| summary_status  | TEXT        | pending / streaming / complete / failed |
| fetched_content | TEXT        | Cleaned article text                    |
| created_at      | TIMESTAMPTZ | DEFAULT NOW()                           |
| updated_at      | TIMESTAMPTZ | Auto-updated via trigger                |

### tags

| Column     | Type        | Notes                  |
| ---------- | ----------- | ---------------------- |
| id         | UUID (PK)   | gen_random_uuid()      |
| user_id    | UUID (FK)   | CASCADE on user delete |
| name       | TEXT        | UNIQUE per user        |
| color      | TEXT        | Default #6366f1        |
| created_at | TIMESTAMPTZ | DEFAULT NOW()          |

### link_tags

| Column     | Type        | Notes                          |
| ---------- | ----------- | ------------------------------ |
| link_id    | UUID (FK)   | CASCADE on link delete         |
| tag_id     | UUID (FK)   | CASCADE on tag delete          |
| created_at | TIMESTAMPTZ | DEFAULT NOW()                  |
|            |             | Composite PK (link_id, tag_id) |

## Environment Variables

| Variable              | Required  | Where      | Description                                         |
| --------------------- | --------- | ---------- | --------------------------------------------------- |
| `DATABASE_URL`        | Yes       | Server     | PostgreSQL connection string (Neon)                 |
| `ANTHROPIC_API_KEY`   | Yes       | Server     | Claude API key                                      |
| `CORS_ORIGIN`         | Prod only | Server     | Frontend URL for CORS                               |
| `REDIS_URL`           | No        | Server     | Redis connection string; caching disabled if absent |
| `NODE_ENV`            | No        | Server     | `production` on Railway                             |
| `PORT`                | No        | Server     | HTTP port (default 3001)                            |
| `GCP_PROJECT_ID`      | No        | Server     | GCP project for Secret Manager                      |
| `GCP_SA_JSON`         | No        | Server     | GCP service account credentials                     |
| `NEXT_PUBLIC_API_URL` | Prod only | Web Client | API base URL (default http://localhost:3001)        |

## Decisions

- **Express 5 over Express 4** — Async errors propagate automatically to the error handler, eliminating try/catch boilerplate in every handler.
- **SHA256(url) as cache key** — Makes cache keys deterministic and computable without a DB lookup. Architecturally enables cross-user cache sharing since the same URL always maps to the same key.
- **Fail-open Redis** — Redis is treated as optional infrastructure. Every Redis operation catches errors and returns null on failure, so the app degrades to uncached mode rather than returning 500 errors.
- **AbortController for streaming cancellation** — Client disconnects immediately terminate the in-flight Anthropic API call, preventing wasted tokens on abandoned summaries.
- **Single-session-per-account model** — Each login atomically deletes all previous sessions inside a transaction, simplifying session management and reducing attack surface.
