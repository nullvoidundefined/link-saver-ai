import { query } from "app/db/pool/pool.js";

export interface TagRow {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: Date;
}

export async function createTag(userId: string, name: string, color?: string): Promise<TagRow> {
  const result = await query<TagRow>(
    `INSERT INTO tags (user_id, name, color)
     VALUES ($1, $2, COALESCE($3, '#6366f1'))
     RETURNING *`,
    [userId, name, color ?? null],
  );
  const row = result.rows[0];
  if (!row) throw new Error("Insert returned no row");
  return row;
}

export async function getTagsByUserId(userId: string): Promise<TagRow[]> {
  const result = await query<TagRow>("SELECT * FROM tags WHERE user_id = $1 ORDER BY name ASC", [
    userId,
  ]);
  return result.rows;
}

export async function getTagById(tagId: string, userId: string): Promise<TagRow | null> {
  const result = await query<TagRow>("SELECT * FROM tags WHERE id = $1 AND user_id = $2", [
    tagId,
    userId,
  ]);
  return result.rows[0] ?? null;
}

export async function updateTag(
  tagId: string,
  userId: string,
  fields: { name?: string; color?: string },
): Promise<TagRow | null> {
  const result = await query<TagRow>(
    `UPDATE tags
     SET name = COALESCE($1, name), color = COALESCE($2, color)
     WHERE id = $3 AND user_id = $4
     RETURNING *`,
    [fields.name ?? null, fields.color ?? null, tagId, userId],
  );
  return result.rows[0] ?? null;
}

export async function deleteTag(tagId: string, userId: string): Promise<boolean> {
  const result = await query("DELETE FROM tags WHERE id = $1 AND user_id = $2", [tagId, userId]);
  return (result.rowCount ?? 0) > 0;
}
