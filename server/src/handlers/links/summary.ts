import * as linksRepo from 'app/repositories/links/links.js';
import { streamSummary } from 'app/services/anthropic.js';
import { fetchContent } from 'app/services/content-fetcher.js';
import {
  bustSummaryCache,
  cacheSummary,
  getCachedSummary,
} from 'app/services/summary-cache.js';
import { ApiError } from 'app/utils/ApiError.js';
import { logger } from 'app/utils/logs/logger.js';
import { parseIdParam } from 'app/utils/parsers/parseIdParam.js';
import type { Request, Response } from 'express';

export async function streamLinkSummary(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const linkId = parseIdParam(req.params.id);
  if (!linkId) {
    throw ApiError.badRequest('Invalid link ID');
  }

  const link = await linksRepo.getLinkById(linkId, userId);
  if (!link) {
    throw ApiError.notFound('Link not found');
  }

  // If we don't have fetched content yet, fetch it now
  let content = link.fetched_content;
  if (!content) {
    try {
      const extracted = await fetchContent(link.url);
      content = extracted.content;
      await linksRepo.updateLinkContent(linkId, content, extracted.title);
    } catch (err) {
      logger.error({ err, linkId }, 'Failed to fetch content for summary');
      throw ApiError.internal('Failed to fetch page content');
    }
  }

  if (!content || content.trim().length === 0) {
    throw new ApiError(422, 'NO_CONTENT', 'No content available to summarize');
  }

  // Check Redis cache before hitting the LLM
  const cached = await getCachedSummary(link.url_hash);
  if (cached) {
    logger.info({ linkId, urlHash: link.url_hash }, 'Summary cache hit');

    // Ensure DB is up-to-date with the cached value
    if (link.summary_status !== 'complete') {
      await linksRepo.updateLinkSummary(linkId, cached, 'complete');
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(
      `data: ${JSON.stringify({ type: 'cached', summary: cached })}\n\n`,
    );
    res.write(`data: ${JSON.stringify({ type: 'done', summary: cached })}\n\n`);
    res.end();
    return;
  }

  // Cache miss — stream from LLM
  logger.info(
    { linkId, urlHash: link.url_hash },
    'Summary cache miss, streaming from LLM',
  );

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const abortController = new AbortController();
  req.on('close', () => {
    abortController.abort();
  });

  await linksRepo.updateLinkSummary(linkId, '', 'streaming');

  await streamSummary(
    content,
    link.url,
    {
      onToken(token) {
        res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`);
      },
      async onDone(fullText, usage) {
        await linksRepo.updateLinkSummary(linkId, fullText, 'complete');
        await cacheSummary(link.url_hash, fullText);
        res.write(
          `data: ${JSON.stringify({ type: 'done', summary: fullText, usage })}\n\n`,
        );
        res.end();
      },
      async onError(error) {
        await linksRepo.updateLinkSummary(linkId, '', 'failed');
        res.write(
          `data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`,
        );
        res.end();
      },
    },
    abortController.signal,
  );
}

export async function resummarize(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const linkId = parseIdParam(req.params.id);
  if (!linkId) {
    throw ApiError.badRequest('Invalid link ID');
  }

  const link = await linksRepo.getLinkById(linkId, userId);
  if (!link) {
    throw ApiError.notFound('Link not found');
  }

  await bustSummaryCache(link.url_hash);
  await linksRepo.updateLinkSummary(linkId, '', 'pending');

  logger.info(
    { event: 'resummarize', linkId, userId },
    'Cache busted, ready for re-summary',
  );
  res.json({
    data: {
      message: 'Cache cleared. Request the summary endpoint to re-stream.',
    },
  });
}
