# Link Saver AI — Quiz

**1. What protocol does the app use to stream AI-generated summaries to the browser?**
A) WebSockets
**B) Server-Sent Events (SSE)**
C) Long polling
D) gRPC streaming
? What streaming protocol sends summary tokens from server to client?

> The app uses Server-Sent Events (SSE) because summaries are strictly unidirectional (server to client). SSE works through proxies, supports auto-reconnect natively, and requires no handshake protocol — making it simpler than WebSockets for this use case.

**2. Which LLM model does the app use for generating summaries?**
A) claude-3-opus
B) gpt-4-turbo
**C) claude-sonnet-4-20250514**
D) claude-3-haiku
? Which specific Anthropic model is configured in the streaming service?

> The anthropic.ts service file configures `claude-sonnet-4-20250514` as the model for all summary generation calls.

**3. What is the maximum content length sent to Claude for summarization?**
A) 10,000 characters
B) 50,000 characters
**C) 100,000 characters**
D) 500,000 characters
? How many characters of article content are allowed before truncation?

> The content-fetcher service defines MAX_CONTENT_LENGTH as 100,000 characters. Content is truncated before being sent to Claude to stay within reasonable token budgets and keep latency predictable.

**4. How are summaries cached in Redis?**
A) By link ID
B) By user ID + URL
**C) By SHA256 hash of the URL**
D) By domain name
? What value is used as the Redis cache key for summaries?

> The cache key is `summary:{SHA256(url)}`. Using the URL hash rather than link ID means the same URL maps to the same cache entry regardless of which user saved it, architecturally enabling cross-user cache sharing.

**5. What happens when Redis is unavailable?**
A) The server returns 503 errors
B) Requests are queued until Redis reconnects
**C) The app continues in uncached mode — all cache operations return null**
D) The server falls back to in-memory caching
? How does the application handle Redis connection failures?

> Redis is optional infrastructure. Every Redis operation is wrapped in try/catch and returns null on failure. The app degrades gracefully to uncached mode rather than returning 5xx errors — it just pays full LLM costs on every request.

**6. What is the TTL for cached summaries in Redis?**
A) 1 day
B) 3 days
**C) 7 days**
D) 30 days
? How long do cached summaries persist before expiring?

> The SUMMARY*TTL_SECONDS constant in summary-cache.ts is set to 7 * 24 \_ 60 \* 60 (604,800 seconds), which is 7 days.

**7. How does the server handle client disconnects during streaming?**
A) The stream continues and results are discarded
B) The stream pauses and resumes on reconnect
**C) An AbortController cancels the in-flight Anthropic API call immediately**
D) The server sends a final error event
? What mechanism stops the LLM call when a user navigates away mid-stream?

> An AbortController is created per request, and `req.on('close')` triggers `abortController.abort()`. The signal is passed to the Anthropic SDK's `messages.stream()` call, which cancels the in-flight API request immediately. This prevents wasted tokens.

**8. What version of Express does the server use, and why?**
A) Express 4 for stability
**B) Express 5 for automatic async error propagation**
C) Express 4 with express-async-errors middleware
D) Fastify instead of Express
? Why was Express 5 chosen over Express 4?

> Express 5 automatically catches errors thrown in async route handlers and passes them to the error-handling middleware. This eliminates the need for try/catch in every handler or a third-party package like express-async-errors.

**9. How is the session token stored in the database?**
A) As the raw token in plaintext
B) As a bcrypt hash
**C) As a SHA256 hash of the raw token**
D) Encrypted with AES-256
? What transformation is applied to the session token before database storage?

> The raw token is stored in the cookie; only its SHA256 hash is stored in the sessions table. This means a database breach cannot be used to hijack sessions — the attacker would have the hash but not the original token, and SHA256 is not reversible.

**10. What cookie settings are used for sessions in production?**
A) httpOnly: true, sameSite: 'strict', secure: true
**B) httpOnly: true, sameSite: 'none', secure: true**
C) httpOnly: false, sameSite: 'lax', secure: true
D) httpOnly: true, sameSite: 'lax', secure: false
? What SameSite and Secure values are used in production?

> SameSite=None and Secure=true are required in production because the frontend (Vercel) and API (Railway) live on different domains. For the browser to send the session cookie on cross-origin requests, both settings are mandatory.

**11. How does the app protect against CSRF attacks?**
A) Stateful CSRF tokens stored in sessions
B) Double-submit cookie pattern
**C) Requiring X-Requested-With header on state-changing requests**
D) Origin header validation only
? What CSRF mitigation strategy does the app use?

> The app uses the X-Requested-With header check. Browsers block custom headers on cross-origin requests without a CORS preflight. Since CORS is locked to the frontend origin, any request with X-Requested-With must have come from trusted code. The api.ts wrapper adds this header automatically.

**12. What is the per-user rate limit for summary generation?**
A) 10 per hour
**B) 20 per hour**
C) 50 per hour
D) 100 per hour
? How many summaries can a single user generate per hour?

> The summarizeRateLimit middleware limits each user to 20 summaries per hour using Redis INCR with a 3600-second EXPIRE. The limit is enforced by incrementing a key `ratelimit:summary:{userId}`.

**13. What library extracts article content from URLs?**
A) cheerio
B) puppeteer
**C) @extractus/article-extractor**
D) jsdom
? Which package is the primary content extraction tool?

> The app uses @extractus/article-extractor as the primary content extraction library. It parses pages and extracts clean article body text, stripping navigation, ads, and boilerplate.

**14. What happens when the article extractor fails?**
A) The link is saved without content and cannot be summarized
B) The server returns a 422 error
**C) The server falls back to raw fetch with a 15-second timeout and manual HTML stripping**
D) The server retries the extraction three times
? What is the fallback strategy for content extraction failure?

> If the primary extractor fails (paywalled sites, JavaScript-heavy SPAs), the server falls back to a raw fetch with a 15-second AbortSignal timeout and a User-Agent of 'LinkSaverBot/1.0', then strips HTML by removing script/style blocks, tags, and decoding entities.

**15. How many tables are in the database schema?**
A) 3
B) 4
**C) 5**
D) 6
? How many PostgreSQL tables does the app use?

> The database has 5 tables: users, sessions, links, tags, and link_tags (junction table).

**16. What type are the primary keys in the database?**
A) Auto-incrementing integers
**B) UUIDs generated by PostgreSQL (gen_random_uuid())**
C) ULIDs
D) Application-generated UUIDs
? What data type and generation strategy is used for primary keys?

> All primary keys are UUIDs generated by PostgreSQL using gen_random_uuid(). The sessions table is an exception — its primary key is a TEXT field containing the SHA256 hash of the session token.

**17. What happens to a user's data when their account is deleted?**
A) Data is soft-deleted with a deleted_at timestamp
B) Data is orphaned and cleaned up by a background job
**C) All data is automatically removed via ON DELETE CASCADE foreign keys**
D) A pre-delete trigger archives the data
? How does the schema handle cascading deletes?

> Foreign keys use ON DELETE CASCADE throughout, so deleting a user removes all their sessions, links, tags, and link-tag associations. Deleting a tag also removes its junction table entries.

**18. What state machine does the StreamingSummary component implement?**
A) idle, loading, success, error
B) initial, fetching, rendering, done
**C) idle, connecting, streaming, complete, error**
D) pending, active, paused, finished
? What are the status states in the StreamingSummary component?

> The component tracks status through five states: idle (initial), connecting (EventSource opening), streaming (tokens arriving), complete (done event received), and error (error event or connection loss).

**19. How does the StreamingSummary component avoid React's "update during render" error?**
A) Using useRef to track the accumulated text
B) Using a debounced state setter
**C) Tracking accumulated text in a closure variable inside startStreaming**
D) Using React.startTransition for updates
? What technique prevents state update conflicts in the streaming component?

> The component tracks accumulated summary text in a closure variable (`let accumulated = ''`) inside the startStreaming function, rather than reading from React state. The onComplete callback runs from an async event handler (not during render), so parent state updates are safely batched.

**20. What state management approach does the frontend use?**
A) Redux for global state
B) Zustand for client-side store
**C) TanStack React Query for auth + React useState for UI state**
D) React Context for everything
? How is client-side state managed?

> The app uses TanStack React Query to manage the auth/me session check (with staleTime: Infinity) and React useState for all other UI state (links, tags, selected link, filter state). There is no global client-side store.

**21. What SSE event types does the summary endpoint emit?**
A) start, data, end, error
B) open, message, close, error
**C) cached, token, done, error**
D) init, delta, complete, fail
? What are the four event data types sent over the SSE stream?

> The SSE stream emits four event types via the data field: `cached` (cache hit with full summary), `token` (individual streaming token), `done` (stream complete with full text and usage), and `error` (failure message).

**22. What is the global API rate limit in production?**
A) 50 requests per 15 minutes
**B) 100 requests per 15 minutes**
C) 500 requests per 15 minutes
D) 1000 requests per 15 minutes
? How many requests per window does the global rate limiter allow in production?

> The global rate limiter allows 1000 requests per 15 minutes in development and 100 requests per 15 minutes in production. Auth-specific endpoints are further limited to 10 per 15 minutes in production.

**23. How does the server generate session tokens?**
A) uuid.v4()
B) jwt.sign() with a secret key
**C) crypto.randomBytes(32).toString('hex')**
D) nanoid(64)
? What cryptographic function generates the raw session token?

> The server uses crypto.randomBytes(32).toString('hex') to generate a 64-character random hex string as the session token. This provides 256 bits of entropy, making brute-force attacks infeasible.

**24. What is the session duration?**
A) 7 days
B) 14 days
**C) 30 days**
D) 90 days
? How long does a session remain valid before expiring?

> The SESSION*TTL_MS constant is set to 30 * 24 _ 60 _ 60 \_ 1000 (30 days). The cookie maxAge matches this value, and the sessions table stores an expires_at timestamp checked on every request.

**25. What logging library does the server use?**
A) winston
B) bunyan
**C) pino**
D) morgan
? Which structured logging library is used?

> The server uses Pino for structured logging. In production it outputs JSON; in development it uses pino-pretty for human-readable formatting. pino-http adds request/response logging with auto-generated request IDs.

**26. How does the pg pool handle SSL in production?**
A) SSL is disabled
B) SSL is always required with strict certificate validation
**C) SSL is enabled with rejectUnauthorized controlled by an environment variable**
D) SSL uses a custom CA certificate
? How is PostgreSQL SSL configured?

> In production, SSL is enabled with rejectUnauthorized defaulting to true unless DATABASE_SSL_REJECT_UNAUTHORIZED is set to 'false'. In development, it defaults to false unless explicitly set to 'true'. This flexibility supports both Neon (which requires SSL) and local development.

**27. What is the maximum request body size?**
A) 1kb
B) 5kb
**C) 10kb**
D) 100kb
? What limit is set on JSON and URL-encoded request bodies?

> Both express.json() and express.urlencoded() are configured with a limit of '10kb' to prevent unexpectedly large request payloads.

**28. What happens during user registration at the database level?**
A) User is created, then session is created in a separate query
B) User is created with a built-in session field
**C) User creation and session creation happen atomically in a database transaction**
D) A stored procedure handles both operations
? How does the registration flow ensure data consistency?

> Registration uses withTransaction() to atomically create the user and session. If session creation fails, the user row is rolled back — preventing orphaned users with no way to log in.

**29. What happens to existing sessions when a user logs in?**
A) Old sessions remain valid alongside the new one
B) The oldest session is invalidated
**C) All previous sessions are deleted atomically before creating the new one**
D) Old sessions expire naturally
? How does the login flow handle existing sessions?

> Login atomically deletes all existing sessions for the user and creates a new one inside a single database transaction. This implements a single-session-per-account model.

**30. What search strategy does the links list endpoint use?**
A) PostgreSQL full-text search with tsvector
B) Elasticsearch
**C) ILIKE pattern matching across titles, domains, URLs, and tag names**
D) Client-side filtering only
? How does the search query filter links?

> The searchLinks repository function uses ILIKE with a `%query%` pattern to match across link titles, domains, URLs, and tag names. It joins through the link_tags and tags tables using LEFT JOIN and DISTINCT to include tag name matches.

**31. What Docker build strategy does the server use?**
A) Single-stage build with all dependencies
**B) Multi-stage build: compile in stage 1, copy dist to clean stage 2 with prod deps only**
C) Distroless container with pre-compiled binaries
D) Docker Compose with separate build and runtime services
? How is the production Docker image built?

> The Dockerfile uses a two-stage build. Stage 1 installs all dependencies (including dev deps) and compiles TypeScript to dist/. Stage 2 starts from a fresh Node 22 slim base, installs only production dependencies, and copies the compiled dist/ and migrations/ from stage 1.

**32. How does the server handle the request timeout?**
A) A global timeout in nginx
B) Express built-in timeout middleware
**C) res.setTimeout(30000) in a custom middleware that returns 408 if headers haven't been sent**
D) AbortController with a 30-second signal
? What mechanism enforces the 30-second request timeout?

> A custom middleware calls res.setTimeout(REQUEST_TIMEOUT_MS) where REQUEST_TIMEOUT_MS is 30,000ms. The callback checks if headers have already been sent before returning a 408 status with a REQUEST_TIMEOUT error.

**33. What is the order of the first three middleware in the stack?**
A) cors, helmet, requestLogger
**B) helmet, cors, requestLogger**
C) requestLogger, helmet, cors
D) rateLimiter, helmet, cors
? Which middleware runs first, second, and third?

> The middleware stack order is: helmet (security headers) first, then cors (allow frontend origin), then requestLogger (pino-http with request IDs). This ensures security headers are set before anything else, and logging captures the full request lifecycle.

**34. What database migration tool does the app use?**
A) Prisma Migrate
B) Knex migrations
**C) node-pg-migrate**
D) TypeORM migrations
? Which migration runner handles schema changes?

> The app uses node-pg-migrate with plain JavaScript migration files. JavaScript is used instead of TypeScript so migrations can run directly in production without a compilation step. Files are named with Unix timestamps for ordering.

**35. What is the maximum number of database connections in the pool?**
A) 5
**B) 10**
C) 20
D) 50
? How many connections does the pg pool allow?

> The pg Pool is configured with max: 10, along with an idleTimeoutMillis of 30,000ms, connectionTimeoutMillis of 5,000ms, and statement_timeout of 10,000ms.

**36. What validation library is used for request bodies?**
A) Joi
B) Yup
**C) Zod**
D) class-validator
? Which runtime validation library validates all API input?

> Zod 4 is used for schema validation on all request bodies. Schemas are defined in the schemas/ directory (auth.ts, links.ts, tags.ts) and applied in handlers using safeParse().

**37. How does the health/ready endpoint differ from /health?**
A) /health/ready checks Redis connectivity
B) /health/ready returns additional metrics
**C) /health/ready queries the database while /health responds immediately**
D) /health/ready performs a full integration test
? What additional check does the readiness probe perform?

> The /health endpoint returns `{ status: "ok" }` immediately without any dependency checks. The /health/ready endpoint runs `SELECT 1` against the database and returns `{ status: "ok", db: "connected" }` on success or a 503 with `{ status: "degraded", db: "disconnected" }` on failure.

**38. What User-Agent does the fallback content fetcher send?**
A) Mozilla/5.0 (compatible)
B) Node.js/22
**C) LinkSaverBot/1.0**
D) No User-Agent header
? What identifies the server when making fallback HTTP requests?

> The fallback fetch sends `User-Agent: 'LinkSaverBot/1.0'` in its request headers. This identifies the bot to web servers and allows them to serve or block accordingly.

**39. What happens when the summary rate limit Redis check fails?**
A) The request is rejected with a 500 error
B) The request is queued for retry
**C) The request is allowed through (fail-open)**
D) The middleware falls back to in-memory rate counting
? How does the rate limiter behave when Redis errors occur?

> The summarizeRateLimit middleware catches Redis errors and calls next() — allowing the request through. This fail-open behavior ensures Redis issues don't block users from generating summaries.

**40. How does the frontend make the session cookie work cross-origin?**
A) It sends the token in an Authorization header
B) It uses localStorage to store the token
**C) It sets credentials: 'include' on all fetch requests**
D) It uses a proxy to avoid cross-origin issues
? What fetch option enables cross-origin cookie sending?

> The apiFetch wrapper in lib/api.ts sets `credentials: 'include'` on all requests. This tells the browser to send the HTTP-only sid cookie on cross-origin requests to the Railway API, which is required because the frontend and API are on different domains.

**41. What is the max_tokens setting for Claude summary generation?**
A) 512
**B) 1024**
C) 2048
D) 4096
? How many tokens maximum can Claude generate per summary?

> The streamSummary function in anthropic.ts sets max_tokens to 1024. This keeps summaries concise (the prompt asks for 3-5 paragraphs) while controlling costs.

**42. What is the default tag color?**
A) #000000
B) #3b82f6
**C) #6366f1**
D) #22c55e
? What hex color is assigned to new tags by default?

> The tags table schema defines a default color of '#6366f1' (indigo) for new tags. Users can override this with any color when creating or updating a tag.

**43. How does Railway know the server started successfully?**
A) It checks for a specific log message
B) It monitors the process exit code
**C) It checks the /health endpoint within a 30-second timeout**
D) It waits for a TCP connection on the configured port
? What health check does Railway perform after deployment?

> The railway.toml configuration sets healthcheckPath to "/health" with a healthcheckTimeout of 30 seconds. Railway hits this endpoint after deploy to confirm the server is running before routing traffic.

**44. What happens to the link's summary_status if a user disconnects mid-stream?**
A) It is set to 'failed'
B) It is rolled back to 'pending'
**C) It remains as 'streaming'**
D) It is set to 'complete' with partial content
? What status is the link left in when streaming is interrupted?

> When the user disconnects mid-stream, the AbortController cancels the API call and the function returns early. The DB status is left as 'streaming' because neither the onDone nor onError callback fires. The user can regenerate on their next visit.

**45. What TypeScript path alias is configured for the server?**
A) @/_ maps to src/_
**B) app/* maps to src/*
**C) ~/_ maps to src/_
D) server/_ maps to src/_
? What import alias resolves server source paths?

> The server tsconfig.json configures paths as `{ "app/*": ["src/*"] }`. After TypeScript compilation, tsc-alias resolves these aliases in the compiled JavaScript output.

**46. What is the connection timeout for the PostgreSQL pool?**
A) 2,000ms
**B) 5,000ms**
C) 10,000ms
D) 30,000ms
? How long will the pool wait to establish a database connection?

> The pg Pool is configured with connectionTimeoutMillis: 5,000 (5 seconds). This prevents the server from hanging indefinitely if the database is unreachable.

**47. What does the loadSession middleware do when session lookup fails?**
A) Returns a 401 error
B) Redirects to the login page
**C) Silently continues without setting req.user (fail-open)**
D) Creates an anonymous session
? How does loadSession handle invalid or expired sessions?

> loadSession runs on every request. If the session lookup fails for any reason (invalid token, expired session, database error), it silently continues without attaching a user to req.user. The requireAuth middleware on protected routes then returns 401 if req.user is not set.

**48. How does the app ensure no duplicate tag names per user?**
A) Application-level validation only
B) A unique index on the name column
**C) A composite UNIQUE constraint on (user_id, name)**
D) A before-insert trigger
? What database constraint prevents duplicate tag names within a user's account?

> The tags table has a UNIQUE (user_id, name) constraint, ensuring no two tags with the same name can exist for the same user. Different users can have tags with identical names.

**49. What restart policy does Railway use for the server?**
A) Always restart
B) Never restart
**C) Restart on failure, maximum 3 retries**
D) Restart on failure, no limit
? How does Railway handle server crashes?

> The railway.toml sets restartPolicyType to "ON_FAILURE" with restartPolicyMaxRetries of 3. The server is only restarted when it exits with an error, and Railway will stop retrying after 3 consecutive failures.

**50. What is the statement_timeout for database queries?**
A) 5,000ms
**B) 10,000ms**
C) 30,000ms
D) No timeout
? How long can a single SQL statement run before PostgreSQL cancels it?

> The pg Pool is configured with statement_timeout: 10,000 (10 seconds). This prevents long-running queries from holding connections and degrading performance. The request-level timeout is 30 seconds, giving room for multiple queries within a single request.
