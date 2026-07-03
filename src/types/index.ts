import { users, plans, roles, files } from '../db/schema';

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
export type FileRecord = typeof files.$inferSelect;

export interface UserWithRoleAndPlan extends User {
  role?: Role | null;
  plan?: Plan | null;
}

// Role permissions
export interface RolePermissions {
  canCreateUsers: boolean;
  canDeleteUsers: boolean;
  canManagePlans: boolean;
  canManageRoles: boolean;
  canViewAllUsers: boolean;
  canUploadFiles: boolean;
  canDeleteFiles: boolean;
  canViewAnalytics: boolean;
}

// Storage information
export interface StorageInfo {
  used: number; // bytes
  left: number; // bytes
  limit: number; // bytes
  percentageUsed: number; // 0-100
}

// The decoded JWT payload / authenticated user shape
export interface AuthUser {
  id: number;
  email: string;
  role?: string;
  plan?: string;
  permissions: string[];
}

export const ROLE_NAMES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  USER: 'user',
} as const;

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];
