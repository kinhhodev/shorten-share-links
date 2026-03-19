import { sql } from 'drizzle-orm';
import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailUnique: uniqueIndex('users_email_unique').on(t.email),
  }),
);

export const links = pgTable(
  'links',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    project: text('project'),
    code: text('code').notNull(),
    longUrl: text('long_url').notNull(),
    ownerUserId: uuid('owner_user_id').references(() => users.id, { onDelete: 'set null' }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (t) => ({
    lookupIdx: index('links_lookup_idx').on(t.project, t.code),
    ownerIdx: index('links_owner_idx').on(t.ownerUserId, t.createdAt),
    // Unique for namespaced links: (project, code) when project is not null
    projectCodeUnique: uniqueIndex('links_project_code_unique')
      .on(t.project, t.code)
      .where(sql`${t.project} is not null`),
    // Unique for root links: code when project is null
    rootCodeUnique: uniqueIndex('links_root_code_unique')
      .on(t.code)
      .where(sql`${t.project} is null`),
  }),
);

