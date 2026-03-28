import { query } from 'app/db/pool/pool.js';
import type { TagRow } from 'app/repositories/tags/tags.js';

export async function addTagToLink(
  linkId: string,
  tagId: string,
): Promise<void> {
  await query(
    `INSERT INTO link_tags (link_id, tag_id)
     VALUES ($1, $2)
     ON CONFLICT (link_id, tag_id) DO NOTHING`,
    [linkId, tagId],
  );
}

export async function removeTagFromLink(
  linkId: string,
  tagId: string,
): Promise<boolean> {
  const result = await query(
    'DELETE FROM link_tags WHERE link_id = $1 AND tag_id = $2',
    [linkId, tagId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getTagsForLink(linkId: string): Promise<TagRow[]> {
  const result = await query<TagRow>(
    `SELECT t.* FROM tags t
     JOIN link_tags lt ON lt.tag_id = t.id
     WHERE lt.link_id = $1
     ORDER BY t.name ASC`,
    [linkId],
  );
  return result.rows;
}
