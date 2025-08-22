
import { users, plans, roles } from '../db/schema';

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

// Extended user type with role and plan information
export interface UserWithRoleAndPlan extends User {
  role?: Role;
  plan?: Plan;
}

// Extended user type with plan information (backward compatibility)
export interface UserWithPlan extends User {
  plan?: Plan;
}

// Role permissions interface
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

// Storage information interface
export interface StorageInfo {
  used: number; // bytes
  left: number; // bytes
  limit: number; // bytes
  percentageUsed: number; // 0-100
}

// Plan limits interface
export interface PlanLimits {
  fileLimit: number;
  storageLimit: number; // bytes
}

// Role constants
export const ROLE_NAMES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  USER: 'user',
} as const;

export type RoleName = typeof ROLE_NAMES[keyof typeof ROLE_NAMES];
