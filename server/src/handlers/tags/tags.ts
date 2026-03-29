import * as tagsRepo from 'app/repositories/tags/tags.js';
import { createTagSchema, updateTagSchema } from 'app/schemas/tags.js';
import { ApiError } from 'app/utils/ApiError.js';
import { logger } from 'app/utils/logs/logger.js';
import { parseIdParam } from 'app/utils/parsers/parseIdParam.js';
import type { Request, Response } from 'express';

export async function create(req: Request, res: Response): Promise<void> {
  const parsed = createTagSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join('; ');
    throw ApiError.badRequest(message);
  }

  const userId = req.user!.id;
  const { name, color } = parsed.data;

  const tag = await tagsRepo.createTag(userId, name, color);
  logger.info({ event: 'tag_created', tagId: tag.id, userId }, 'Tag created');
  res.status(201).json({ data: tag });
}

export async function list(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const tags = await tagsRepo.getTagsByUserId(userId);
  res.json({ data: tags });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const tagId = parseIdParam(req.params.id);
  if (!tagId) {
    throw ApiError.badRequest('Invalid tag ID');
  }
  const tag = await tagsRepo.getTagById(tagId, userId);
  if (!tag) {
    throw ApiError.notFound('Tag not found');
  }
  res.json({ data: tag });
}

export async function update(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const tagId = parseIdParam(req.params.id);
  if (!tagId) {
    throw ApiError.badRequest('Invalid tag ID');
  }

  const parsed = updateTagSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join('; ');
    throw ApiError.badRequest(message);
  }

  const tag = await tagsRepo.updateTag(tagId, userId, parsed.data);
  if (!tag) {
    throw ApiError.notFound('Tag not found');
  }

  logger.info({ event: 'tag_updated', tagId, userId }, 'Tag updated');
  res.json({ data: tag });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const tagId = parseIdParam(req.params.id);
  if (!tagId) {
    throw ApiError.badRequest('Invalid tag ID');
  }

  const deleted = await tagsRepo.deleteTag(tagId, userId);
  if (!deleted) {
    throw ApiError.notFound('Tag not found');
  }

  logger.info({ event: 'tag_deleted', tagId, userId }, 'Tag deleted');
  res.status(204).end();
}
