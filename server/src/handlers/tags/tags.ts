import type { Request, Response } from "express";

import * as tagsRepo from "app/repositories/tags/tags.js";
import { createTagSchema, updateTagSchema } from "app/schemas/tags.js";
import { logger } from "app/utils/logs/logger.js";
import { parseIdParam } from "app/utils/parsers/parseIdParam.js";

export async function create(req: Request, res: Response): Promise<void> {
  const parsed = createTagSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join("; ");
    res.status(400).json({ error: { message } });
    return;
  }

  const userId = req.user!.id;
  const { name, color } = parsed.data;

  const tag = await tagsRepo.createTag(userId, name, color);
  logger.info({ event: "tag_created", tagId: tag.id, userId }, "Tag created");
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
    res.status(400).json({ error: { message: "Invalid tag ID" } });
    return;
  }
  const tag = await tagsRepo.getTagById(tagId, userId);
  if (!tag) {
    res.status(404).json({ error: { message: "Tag not found" } });
    return;
  }
  res.json({ data: tag });
}

export async function update(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const tagId = parseIdParam(req.params.id);
  if (!tagId) {
    res.status(400).json({ error: { message: "Invalid tag ID" } });
    return;
  }

  const parsed = updateTagSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join("; ");
    res.status(400).json({ error: { message } });
    return;
  }

  const tag = await tagsRepo.updateTag(tagId, userId, parsed.data);
  if (!tag) {
    res.status(404).json({ error: { message: "Tag not found" } });
    return;
  }

  logger.info({ event: "tag_updated", tagId, userId }, "Tag updated");
  res.json({ data: tag });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const tagId = parseIdParam(req.params.id);
  if (!tagId) {
    res.status(400).json({ error: { message: "Invalid tag ID" } });
    return;
  }

  const deleted = await tagsRepo.deleteTag(tagId, userId);
  if (!deleted) {
    res.status(404).json({ error: { message: "Tag not found" } });
    return;
  }

  logger.info({ event: "tag_deleted", tagId, userId }, "Tag deleted");
  res.status(204).end();
}
