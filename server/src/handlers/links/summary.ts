import type { Request, Response } from "express";

import * as linksRepo from "app/repositories/links/links.js";
import { streamSummary } from "app/services/anthropic.js";
import { fetchContent } from "app/services/content-fetcher.js";
import { logger } from "app/utils/logs/logger.js";
import { parseIdParam } from "app/utils/parsers/parseIdParam.js";

export async function streamLinkSummary(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const linkId = parseIdParam(req.params.id);
  if (!linkId) {
    res.status(400).json({ error: { message: "Invalid link ID" } });
    return;
  }

  const link = await linksRepo.getLinkById(linkId, userId);
  if (!link) {
    res.status(404).json({ error: { message: "Link not found" } });
    return;
  }

  // If we don't have fetched content yet, fetch it now
  let content = link.fetched_content;
  if (!content) {
    try {
      const extracted = await fetchContent(link.url);
      content = extracted.content;
      await linksRepo.updateLinkContent(linkId, content, extracted.title);
    } catch (err) {
      logger.error({ err, linkId }, "Failed to fetch content for summary");
      res.status(500).json({ error: { message: "Failed to fetch page content" } });
      return;
    }
  }

  if (!content || content.trim().length === 0) {
    res.status(422).json({ error: { message: "No content available to summarize" } });
    return;
  }

  // Set SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // Set up abort controller for client disconnect
  const abortController = new AbortController();
  req.on("close", () => {
    abortController.abort();
  });

  // Update status to streaming
  await linksRepo.updateLinkSummary(linkId, "", "streaming");

  await streamSummary(
    content,
    link.url,
    {
      onToken(token) {
        res.write(`data: ${JSON.stringify({ type: "token", token })}\n\n`);
      },
      async onDone(fullText) {
        await linksRepo.updateLinkSummary(linkId, fullText, "complete");
        res.write(`data: ${JSON.stringify({ type: "done", summary: fullText })}\n\n`);
        res.end();
      },
      async onError(error) {
        await linksRepo.updateLinkSummary(linkId, "", "failed");
        res.write(`data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`);
        res.end();
      },
    },
    abortController.signal,
  );
}
