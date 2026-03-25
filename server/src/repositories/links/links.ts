import { query } from "app/db/pool/pool.js";

export interface LinkRow {
  id: string;
  user_id: string;
  url: string;
  url_hash: string;
  title: string | null;
  domain: string | null;
  summary: string | null;
  summary_status: string;
  fetched_content: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function createLink(
  userId: string,
  url: string,
  urlHash: string,
  title: string | null,
  domain: string,
  fetchedContent: string | null,
): Promise<LinkRow> {
  const result = await query<LinkRow>(
    `INSERT INTO links (user_id, url, url_hash, title, domain, fetched_content, summary_status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')
     RETURNING *`,
    [userId, url, urlHash, title, domain, fetchedContent],
  );
  const row = result.rows[0];
  if (!row) throw new Error("Insert returned no row");
  return row;
}

export async function getLinkById(linkId: string, userId: string): Promise<LinkRow | null> {
  const result = await query<LinkRow>("SELECT * FROM links WHERE id = $1 AND user_id = $2", [
    linkId,
    userId,
  ]);
  return result.rows[0] ?? null;
}

export async function getLinksByUserId(userId: string): Promise<LinkRow[]> {
  const result = await query<LinkRow>(
    "SELECT * FROM links WHERE user_id = $1 ORDER BY created_at DESC",
    [userId],
  );
  return result.rows;
}

export async function updateLinkSummary(
  linkId: string,
  summary: string,
  status: string,
): Promise<void> {
  await query("UPDATE links SET summary = $1, summary_status = $2 WHERE id = $3", [
    summary,
    status,
    linkId,
  ]);
}

export async function updateLinkContent(
  linkId: string,
  content: string,
  title: string | null,
): Promise<void> {
  await query("UPDATE links SET fetched_content = $1, title = COALESCE($2, title) WHERE id = $3", [
    content,
    title,
    linkId,
  ]);
}
