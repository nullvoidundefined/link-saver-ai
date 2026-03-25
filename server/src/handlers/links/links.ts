import crypto from "node:crypto";

import type { Request, Response } from "express";

import * as linksRepo from "app/repositories/links/links.js";
import { createLinkSchema, updateLinkSchema } from "app/schemas/links.js";
import { fetchContent } from "app/services/content-fetcher.js";
import { bustSummaryCache } from "app/services/summary-cache.js";
import { logger } from "app/utils/logs/logger.js";
import { parseIdParam } from "app/utils/parsers/parseIdParam.js";

export async function create(req: Request, res: Response): Promise<void> {
  const parsed = createLinkSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join("; ");
    res.status(400).json({ error: { message } });
    return;
  }

  const userId = req.user!.id;
  const { url } = parsed.data;
  const urlHash = crypto.createHash("sha256").update(url).digest("hex");

  let title: string | null = null;
  let domain = new URL(url).hostname;
  let content: string | null = null;

  try {
    const extracted = await fetchContent(url);
    title = extracted.title;
    domain = extracted.domain;
    content = extracted.content;
  } catch (err) {
    logger.warn({ err, url }, "Content extraction failed entirely");
  }

  const link = await linksRepo.createLink(userId, url, urlHash, title, domain, content);
  logger.info({ event: "link_created", linkId: link.id, userId }, "Link saved");
  res.status(201).json({ data: link });
}

export async function list(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const links = q
    ? await linksRepo.searchLinks(userId, q)
    : await linksRepo.getLinksByUserId(userId);
  res.json({ data: links });
}

export async function getById(req: Request, res: Response): Promise<void> {
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
  res.json({ data: link });
}

export async function update(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const linkId = parseIdParam(req.params.id);
  if (!linkId) {
    res.status(400).json({ error: { message: "Invalid link ID" } });
    return;
  }

  const parsed = updateLinkSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join("; ");
    res.status(400).json({ error: { message } });
    return;
  }

  const link = await linksRepo.updateLink(linkId, userId, parsed.data);
  if (!link) {
    res.status(404).json({ error: { message: "Link not found" } });
    return;
  }

  logger.info({ event: "link_updated", linkId, userId }, "Link updated");
  res.json({ data: link });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const linkId = parseIdParam(req.params.id);
  if (!linkId) {
    res.status(400).json({ error: { message: "Invalid link ID" } });
    return;
  }

  // Fetch the link first so we can bust the summary cache
  const link = await linksRepo.getLinkById(linkId, userId);
  if (!link) {
    res.status(404).json({ error: { message: "Link not found" } });
    return;
  }

  await linksRepo.deleteLink(linkId, userId);
  await bustSummaryCache(link.url_hash);

  logger.info({ event: "link_deleted", linkId, userId }, "Link deleted");
  res.status(204).end();
}
