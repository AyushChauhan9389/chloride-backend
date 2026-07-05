import { pgTable, serial, text, timestamp, integer, bigint, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Roles table for user access levels
export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: text('description'),
  permissions: text('permissions').notNull(), // JSON string of permissions
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Plans table for different subscription tiers
export const plans = pgTable('plans', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  fileLimit: integer('file_limit').notNull(),
  storageLimit: bigint('storage_limit', { mode: 'number' }).notNull(), // in bytes
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Users table with role and plan relationships and storage tracking
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  roleId: integer('role_id').references(() => roles.id),
  planId: integer('plan_id').references(() => plans.id),
  storageUsed: bigint('storage_used', { mode: 'number' }).default(0).notNull(), // in bytes
  storageLeft: bigint('storage_left', { mode: 'number' }).default(0).notNull(), // in bytes
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Files table for uploaded file metadata
export const files = pgTable('files', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  keyId: varchar('key_id', { length: 255 }).notNull(), // S3 object key
  OriginalViewUrl: text('original_view_url').notNull(),
  OriginalDownloadUrl: text('original_download_url').notNull(),
  ShortViewUrl: text('short_view_url'),
  ShortDownloadUrl: text('short_download_url'),
  size: bigint('size', { mode: 'number' }).notNull(), // in bytes
  userId: integer('user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Shortened URLs table for URL shortening
export const shortenedUrls = pgTable('shortened_urls', {
  id: serial('id').primaryKey(),
  originalUrl: text('original_url').notNull(),
  shortCode: varchar('short_code', { length: 255 }).notNull().unique(),
  // The S3 object key this short code resolves to, used to mint fresh
  // presigned URLs at redirect time (private-bucket model).
  keyId: varchar('key_id', { length: 255 }),
  // 'view' (inline) or 'download' (attachment) presign variant.
  variant: varchar('variant', { length: 16 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, { fields: [users.roleId], references: [roles.id] }),
  plan: one(plans, { fields: [users.planId], references: [plans.id] }),
  files: many(files),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const plansRelations = relations(plans, ({ many }) => ({
  users: many(users),
}));

export const filesRelations = relations(files, ({ one }) => ({
  user: one(users, { fields: [files.userId], references: [users.id] }),
}));
