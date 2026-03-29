import * as linkTagsRepo from 'app/repositories/link-tags/link-tags.js';
import * as linksRepo from 'app/repositories/links/links.js';
import * as tagsRepo from 'app/repositories/tags/tags.js';
import { ApiError } from 'app/utils/ApiError.js';
import { logger } from 'app/utils/logs/logger.js';
import { parseIdParam } from 'app/utils/parsers/parseIdParam.js';
import type { Request, Response } from 'express';

export async function addTag(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const linkId = parseIdParam(req.params.id);
  if (!linkId) {
    throw ApiError.badRequest('Invalid link ID');
  }

  const tagId = typeof req.body?.tagId === 'string' ? req.body.tagId : null;
  if (!tagId) {
    throw ApiError.badRequest('tagId is required');
  }

  // Verify both link and tag belong to this user
  const [link, tag] = await Promise.all([
    linksRepo.getLinkById(linkId, userId),
    tagsRepo.getTagById(tagId, userId),
  ]);

  if (!link) {
    throw ApiError.notFound('Link not found');
  }
  if (!tag) {
    throw ApiError.notFound('Tag not found');
  }

  await linkTagsRepo.addTagToLink(linkId, tagId);

  logger.info(
    { event: 'link_tagged', linkId, tagId, userId },
    'Tag added to link',
  );
  const tags = await linkTagsRepo.getTagsForLink(linkId);
  res.status(200).json({ data: tags });
}

export async function removeTag(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const linkId = parseIdParam(req.params.id);
  const tagId = parseIdParam(req.params.tagId);

  if (!linkId || !tagId) {
    throw ApiError.badRequest('Invalid link or tag ID');
  }

  // Verify link belongs to user
  const link = await linksRepo.getLinkById(linkId, userId);
  if (!link) {
    throw ApiError.notFound('Link not found');
  }

  const deleted = await linkTagsRepo.removeTagFromLink(linkId, tagId);
  if (!deleted) {
    throw ApiError.notFound('Tag association not found');
  }

  logger.info(
    { event: 'link_untagged', linkId, tagId, userId },
    'Tag removed from link',
  );
  res.status(204).end();
}

export async function listTags(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const linkId = parseIdParam(req.params.id);
  if (!linkId) {
    throw ApiError.badRequest('Invalid link ID');
  }

  const link = await linksRepo.getLinkById(linkId, userId);
  if (!link) {
    throw ApiError.notFound('Link not found');
  }

  const tags = await linkTagsRepo.getTagsForLink(linkId);
  res.json({ data: tags });
}
