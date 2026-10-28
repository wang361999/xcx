import { pgTable, serial, text, varchar, integer, timestamp, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';

// 管理员账号
export const admins = pgTable('admins', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 合集
export const collections = pgTable('collections', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  coverUrl: text('cover_url').notNull(),
  r2Key: text('r2_key').notNull(),
  sortOrder: integer('sort_order').default(0),
  status: varchar('status', { length: 20 }).default('published'), // published / draft
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 图片
export const images = pgTable('images', {
  id: serial('id').primaryKey(),
  collectionId: integer('collection_id').references(() => collections.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 200 }),
  imageUrl: text('image_url').notNull(),
  r2Key: text('r2_key').notNull(),
  copyright: varchar('copyright', { length: 200 }),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 解锁记录
export const unlocks = pgTable('unlocks', {
  id: serial('id').primaryKey(),
  openid: varchar('openid', { length: 100 }).notNull(),
  collectionId: integer('collection_id').references(() => collections.id, { onDelete: 'cascade' }).notNull(),
  unlockedAt: timestamp('unlocked_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueOpenidCollection: uniqueIndex('unlocks_openid_collection_unique').on(table.openid, table.collectionId),
  idxOpenid: index('unlocks_openid_idx').on(table.openid),
}));

// 系统配置
export const settings = pgTable('settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: jsonb('value').notNull(),
});

// 广告埋点
export const adEvents = pgTable('ad_events', {
  id: serial('id').primaryKey(),
  openid: varchar('openid', { length: 100 }),
  adType: varchar('ad_type', { length: 20 }), // reward / banner / interstitial
  adUnitId: varchar('ad_unit_id', { length: 50 }),
  action: varchar('action', { length: 20 }), // load / show / click / close / complete
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  idxOpenid: index('ad_events_openid_idx').on(table.openid),
  idxCreated: index('ad_events_created_idx').on(table.createdAt),
}));

// 类型导出
export type Collection = typeof collections.$inferSelect;
export type Image = typeof images.$inferSelect;
export type Unlock = typeof unlocks.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type AdEvent = typeof adEvents.$inferSelect;
