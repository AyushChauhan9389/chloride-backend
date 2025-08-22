
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

// Updated users table with role and plan relationships and storage tracking
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

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  role: one(roles, { fields: [users.roleId], references: [roles.id] }),
  plan: one(plans, { fields: [users.planId], references: [plans.id] }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const plansRelations = relations(plans, ({ many }) => ({
  users: many(users),
}));
