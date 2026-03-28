/**
 * Create link_tags junction table for many-to-many link ↔ tag associations.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createTable('link_tags', {
    link_id: {
      type: 'uuid',
      notNull: true,
      references: 'links',
      onDelete: 'CASCADE',
    },
    tag_id: {
      type: 'uuid',
      notNull: true,
      references: 'tags',
      onDelete: 'CASCADE',
    },
    created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
  });

  pgm.addConstraint('link_tags', 'link_tags_pkey', {
    primaryKey: ['link_id', 'tag_id'],
  });

  pgm.createIndex('link_tags', 'tag_id');
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
export const down = (pgm) => {
  pgm.dropTable('link_tags');
};
