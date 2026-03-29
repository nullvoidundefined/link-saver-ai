import * as linksRepo from 'app/repositories/links/links.js';
import { createLinkSchema, updateLinkSchema } from 'app/schemas/links.js';
import { fetchContent } from 'app/services/content-fetcher.js';
import { bustSummaryCache } from 'app/services/summary-cache.js';
import { ApiError } from 'app/utils/ApiError.js';
import { logger } from 'app/utils/logs/logger.js';
import { parseIdParam } from 'app/utils/parsers/parseIdParam.js';
import type { Request, Response } from 'express';
import crypto from 'node:crypto';

export async function create(req: Request, res: Response): Promise<void> {
  const parsed = createLinkSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join('; ');
    throw ApiError.badRequest(message);
  }

  const userId = req.user!.id;
  const { url } = parsed.data;
  const urlHash = crypto.createHash('sha256').update(url).digest('hex');

  let title: string | null = null;
  let domain = new URL(url).hostname;
  let content: string | null = null;

  try {
    const extracted = await fetchContent(url);
    title = extracted.title;
    domain = extracted.domain;
    content = extracted.content;
  } catch (err) {
    logger.warn({ err, url }, 'Content extraction failed entirely');
  }

  const link = await linksRepo.createLink(
    userId,
    url,
    urlHash,
    title,
    domain,
    content,
  );
  logger.info({ event: 'link_created', linkId: link.id, userId }, 'Link saved');
  res.status(201).json({ data: link });
}

export async function list(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const links = q
    ? await linksRepo.searchLinks(userId, q)
    : await linksRepo.getLinksByUserId(userId);
  res.json({ data: links });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const linkId = parseIdParam(req.params.id);
  if (!linkId) {
    throw ApiError.badRequest('Invalid link ID');
  }
  const link = await linksRepo.getLinkById(linkId, userId);
  if (!link) {
    throw ApiError.notFound('Link not found');
  }
  res.json({ data: link });
}

export async function update(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const linkId = parseIdParam(req.params.id);
  if (!linkId) {
    throw ApiError.badRequest('Invalid link ID');
  }

  const parsed = updateLinkSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join('; ');
    throw ApiError.badRequest(message);
  }

  const link = await linksRepo.updateLink(linkId, userId, parsed.data);
  if (!link) {
    throw ApiError.notFound('Link not found');
  }

  logger.info({ event: 'link_updated', linkId, userId }, 'Link updated');
  res.json({ data: link });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const linkId = parseIdParam(req.params.id);
  if (!linkId) {
    throw ApiError.badRequest('Invalid link ID');
  }

  // Fetch the link first so we can bust the summary cache
  const link = await linksRepo.getLinkById(linkId, userId);
  if (!link) {
    throw ApiError.notFound('Link not found');
  }

  await linksRepo.deleteLink(linkId, userId);
  await bustSummaryCache(link.url_hash);

  logger.info({ event: 'link_deleted', linkId, userId }, 'Link deleted');
  res.status(204).end();
}
