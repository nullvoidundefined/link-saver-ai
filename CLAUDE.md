# App 2: Link Saver + AI Summarizer

Bookmark manager where saved URLs are auto-fetched and summarized by LLM with real-time SSE streaming. Redis caches summaries for repeat views.

## Key AI pattern

Server-Sent Events (SSE) streaming from Anthropic API. This SSE pattern is reused in apps 4, 7, 8.

## Stack

- Monorepo: `packages/api`, `packages/web`
- Next.js on Vercel, Express on Railway
- PostgreSQL on Neon, Redis on Railway
- Anthropic Claude API (streaming)
- `@extractus/article-extractor` for content extraction

## Spec

Read `FULL_APPLICATION_SPEC.md` for full system design, DB schema, and task breakdown.

## Build order

POC → save one URL, fetch content, stream summary back to browser → then library UI → then caching.

## Shared convention files

Read the relevant file in `.claude/bottomlessmargaritas/` **before writing code** in that layer:

- **Backend:** `.claude/bottomlessmargaritas/CLAUDE-BACKEND.md`
- **Frontend:** `.claude/bottomlessmargaritas/CLAUDE-FRONTEND.md`
- **Database:** `.claude/bottomlessmargaritas/CLAUDE-DATABASE.md`
- **Styling:** `.claude/bottomlessmargaritas/CLAUDE-STYLING.md`
- **Deployment:** `.claude/bottomlessmargaritas/CLOUD-DEPLOYMENT.md`
