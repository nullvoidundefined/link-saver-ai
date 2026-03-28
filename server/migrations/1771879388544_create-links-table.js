/**
 * Create links table for storing saved URLs and their AI summaries.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createTable('links', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    url: { type: 'text', notNull: true },
    url_hash: { type: 'text', notNull: true },
    title: { type: 'text' },
    domain: { type: 'text' },
    summary: { type: 'text' },
    summary_status: {
      type: 'text',
      notNull: true,
      default: "'pending'",
    },
    fetched_content: { type: 'text' },
    created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz', default: pgm.func('NOW()') },
  });

  pgm.createIndex('links', 'user_id');
  pgm.createIndex('links', 'url_hash');
  pgm.createIndex('links', 'summary_status');

  pgm.sql(`
    CREATE TRIGGER set_updated_at BEFORE UPDATE ON links
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
export const down = (pgm) => {
  pgm.sql('DROP TRIGGER IF EXISTS set_updated_at ON links;');
  pgm.dropTable('links');
};
