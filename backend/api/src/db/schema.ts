import { sql } from 'drizzle-orm';
import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    fullName: text('full_name').notNull().default(''),
    phone: text('phone').notNull().default(''),
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
    /** ẩn danh: null; đã đăng nhập: FK users.id */
    ownerUserId: uuid('owner_user_id').references(() => users.id, { onDelete: 'set null' }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (t) => ({
    lookupIdx: index('links_lookup_idx').on(t.project, t.code),
    ownerIdx: index('links_owner_idx').on(t.ownerUserId, t.createdAt),
    /** Cùng project + code có thể tồn tại cho owner khác nhau; trùng cùng owner → suffix -1, -2 ở API */
    projectCodeOwnerUnique: uniqueIndex('links_project_code_owner_unique')
      .on(t.project, t.code, t.ownerUserId)
      .where(sql`${t.project} is not null`),
    rootCodeOwnerUnique: uniqueIndex('links_root_code_owner_unique')
      .on(t.code, t.ownerUserId)
      .where(sql`${t.project} is null`),
  }),
);

