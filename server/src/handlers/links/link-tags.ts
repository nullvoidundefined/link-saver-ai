import type { Request, Response } from "express";

import * as linkTagsRepo from "app/repositories/link-tags/link-tags.js";
import * as linksRepo from "app/repositories/links/links.js";
import * as tagsRepo from "app/repositories/tags/tags.js";
import { logger } from "app/utils/logs/logger.js";
import { parseIdParam } from "app/utils/parsers/parseIdParam.js";

export async function addTag(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const linkId = parseIdParam(req.params.id);
  if (!linkId) {
    res.status(400).json({ error: { message: "Invalid link ID" } });
    return;
  }

  const tagId = typeof req.body?.tagId === "string" ? req.body.tagId : null;
  if (!tagId) {
    res.status(400).json({ error: { message: "tagId is required" } });
    return;
  }

  // Verify both link and tag belong to this user
  const [link, tag] = await Promise.all([
    linksRepo.getLinkById(linkId, userId),
    tagsRepo.getTagById(tagId, userId),
  ]);

  if (!link) {
    res.status(404).json({ error: { message: "Link not found" } });
    return;
  }
  if (!tag) {
    res.status(404).json({ error: { message: "Tag not found" } });
    return;
  }

  await linkTagsRepo.addTagToLink(linkId, tagId);

  logger.info({ event: "link_tagged", linkId, tagId, userId }, "Tag added to link");
  const tags = await linkTagsRepo.getTagsForLink(linkId);
  res.status(200).json({ data: tags });
}

export async function removeTag(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const linkId = parseIdParam(req.params.id);
  const tagId = parseIdParam(req.params.tagId);

  if (!linkId || !tagId) {
    res.status(400).json({ error: { message: "Invalid link or tag ID" } });
    return;
  }

  // Verify link belongs to user
  const link = await linksRepo.getLinkById(linkId, userId);
  if (!link) {
    res.status(404).json({ error: { message: "Link not found" } });
    return;
  }

  const deleted = await linkTagsRepo.removeTagFromLink(linkId, tagId);
  if (!deleted) {
    res.status(404).json({ error: { message: "Tag association not found" } });
    return;
  }

  logger.info({ event: "link_untagged", linkId, tagId, userId }, "Tag removed from link");
  res.status(204).end();
}

export async function listTags(req: Request, res: Response): Promise<void> {
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

  const tags = await linkTagsRepo.getTagsForLink(linkId);
  res.json({ data: tags });
}
