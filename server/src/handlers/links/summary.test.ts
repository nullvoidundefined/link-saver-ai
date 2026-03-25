import cookieParser from "cookie-parser";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { streamLinkSummary } from "app/handlers/links/summary.js";
import { errorHandler } from "app/middleware/errorHandler/errorHandler.js";
import * as linksRepo from "app/repositories/links/links.js";
import * as anthropicService from "app/services/anthropic.js";
import * as contentFetcher from "app/services/content-fetcher.js";
import * as summaryCache from "app/services/summary-cache.js";
import { uuid } from "app/utils/tests/uuids.js";

vi.mock("app/repositories/links/links.js");
vi.mock("app/services/anthropic.js");
vi.mock("app/services/summary-cache.js");
vi.mock("app/services/content-fetcher.js");
vi.mock("app/utils/logs/logger.js", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const userId = uuid();
const linkId = uuid();

const mockLink: linksRepo.LinkRow = {
  id: linkId,
  user_id: userId,
  url: "https://example.com/article",
  url_hash: "abc123",
  title: "Test Article",
  domain: "example.com",
  summary: null,
  summary_status: "pending",
  fetched_content: "This is the article content for testing.",
  created_at: new Date(),
  updated_at: new Date(),
};

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  // Inject fake user
  app.use((req, _res, next) => {
    req.user = { id: userId, email: "test@example.com", created_at: new Date(), updated_at: null };
    next();
  });
  app.get("/links/:id/summary", streamLinkSummary);
  app.use(errorHandler);
  return app;
}

function parseSSEEvents(body: string): Array<Record<string, unknown>> {
  return body
    .split("\n\n")
    .filter((chunk) => chunk.startsWith("data: "))
    .map((chunk) => JSON.parse(chunk.replace("data: ", "")));
}

describe("streamLinkSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when link not found", async () => {
    vi.mocked(linksRepo.getLinkById).mockResolvedValueOnce(null);

    const res = await request(createApp()).get(`/links/${linkId}/summary`);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe("Link not found");
  });

  it("returns cached summary instantly via SSE on cache hit", async () => {
    vi.mocked(linksRepo.getLinkById).mockResolvedValueOnce(mockLink);
    vi.mocked(summaryCache.getCachedSummary).mockResolvedValueOnce("Cached summary text");

    const res = await request(createApp()).get(`/links/${linkId}/summary`).buffer(true);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch("text/event-stream");

    const events = parseSSEEvents(res.text);
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: "cached", summary: "Cached summary text" });
    expect(events[1]).toEqual({ type: "done", summary: "Cached summary text" });
  });

  it("streams tokens from LLM on cache miss", async () => {
    vi.mocked(linksRepo.getLinkById).mockResolvedValueOnce(mockLink);
    vi.mocked(summaryCache.getCachedSummary).mockResolvedValueOnce(null);
    vi.mocked(linksRepo.updateLinkSummary).mockResolvedValue();
    vi.mocked(summaryCache.cacheSummary).mockResolvedValue();

    vi.mocked(anthropicService.streamSummary).mockImplementationOnce(
      async (_content, _url, callbacks) => {
        callbacks.onToken("Hello ");
        callbacks.onToken("world");
        await callbacks.onDone("Hello world", { inputTokens: 100, outputTokens: 10 });
      },
    );

    const res = await request(createApp()).get(`/links/${linkId}/summary`).buffer(true);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch("text/event-stream");

    const events = parseSSEEvents(res.text);
    expect(events[0]).toEqual({ type: "token", token: "Hello " });
    expect(events[1]).toEqual({ type: "token", token: "world" });
    expect(events[2]).toEqual({
      type: "done",
      summary: "Hello world",
      usage: { inputTokens: 100, outputTokens: 10 },
    });

    // Verify cache was written
    expect(summaryCache.cacheSummary).toHaveBeenCalledWith("abc123", "Hello world");
    expect(linksRepo.updateLinkSummary).toHaveBeenCalledWith(linkId, "Hello world", "complete");
  });

  it("sends error event when LLM fails", async () => {
    vi.mocked(linksRepo.getLinkById).mockResolvedValueOnce(mockLink);
    vi.mocked(summaryCache.getCachedSummary).mockResolvedValueOnce(null);
    vi.mocked(linksRepo.updateLinkSummary).mockResolvedValue();

    vi.mocked(anthropicService.streamSummary).mockImplementationOnce(
      async (_content, _url, callbacks) => {
        await callbacks.onError(new Error("API rate limit exceeded"));
      },
    );

    const res = await request(createApp()).get(`/links/${linkId}/summary`).buffer(true);

    expect(res.status).toBe(200);
    const events = parseSSEEvents(res.text);
    expect(events).toContainEqual({ type: "error", message: "API rate limit exceeded" });
    expect(linksRepo.updateLinkSummary).toHaveBeenCalledWith(linkId, "", "failed");
  });

  it("fetches content when not already available", async () => {
    const linkWithoutContent = { ...mockLink, fetched_content: null };
    vi.mocked(linksRepo.getLinkById).mockResolvedValueOnce(linkWithoutContent);

    vi.mocked(contentFetcher.fetchContent).mockResolvedValueOnce({
      content: "Fetched content",
      title: "Fetched Title",
      domain: "example.com",
    });
    vi.mocked(linksRepo.updateLinkContent).mockResolvedValue();
    vi.mocked(summaryCache.getCachedSummary).mockResolvedValueOnce("Cached");

    const res = await request(createApp()).get(`/links/${linkId}/summary`).buffer(true);

    expect(res.status).toBe(200);
    expect(linksRepo.updateLinkContent).toHaveBeenCalledWith(
      linkId,
      "Fetched content",
      "Fetched Title",
    );
  });

  it("returns 422 when content is empty", async () => {
    const linkWithoutContent = { ...mockLink, fetched_content: "   " };
    vi.mocked(linksRepo.getLinkById).mockResolvedValueOnce(linkWithoutContent);

    const res = await request(createApp()).get(`/links/${linkId}/summary`);

    expect(res.status).toBe(422);
    expect(res.body.error.message).toBe("No content available to summarize");
  });
});
