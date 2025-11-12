import { pgTable, serial, text, timestamp, integer, bigint, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table (read-only for this service)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  roleId: integer('role_id'),
  planId: integer('plan_id'),
  storageUsed: bigint('storage_used', { mode: 'number' }).default(0).notNull(),
  storageLeft: bigint('storage_left', { mode: 'number' }).default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Plans table (read-only)
export const plans = pgTable('plans', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  fileLimit: integer('file_limit').notNull(),
  storageLimit: bigint('storage_limit', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Files table
export const files = pgTable('files', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  keyId: varchar('key_id', { length: 255 }).notNull(),
  OriginalViewUrl: text('original_view_url').notNull(),
  OriginalDownloadUrl: text('original_download_url').notNull(),
  ShortViewUrl: text('short_view_url'),
  ShortDownloadUrl: text('short_download_url'),
  size: bigint('size', { mode: 'number' }).notNull(),
  userId: integer('user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Shortened URLs table
export const shortenedUrls = pgTable('shortened_urls', {
  id: serial('id').primaryKey(),
  originalUrl: text('original_url').notNull(),
  shortCode: varchar('short_code', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  plan: one(plans, { fields: [users.planId], references: [plans.id] }),
  files: many(files),
}));

export const plansRelations = relations(plans, ({ many }) => ({
  users: many(users),
}));

export const filesRelations = relations(files, ({ one }) => ({
  user: one(users, { fields: [files.userId], references: [users.id] }),
}));

