// Shared types across all services

export interface User {
  id: number;
  email: string;
  password: string;
  roleId: number | null;
  planId: number | null;
  storageUsed: number;
  storageLeft: number;
  createdAt: Date;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  permissions: string;
  createdAt: Date;
}

export interface Plan {
  id: number;
  name: string;
  fileLimit: number;
  storageLimit: number;
  createdAt: Date;
}

export interface File {
  id: number;
  name: string;
  keyId: string;
  OriginalViewUrl: string;
  OriginalDownloadUrl: string;
  ShortViewUrl: string | null;
  ShortDownloadUrl: string | null;
  size: number;
  userId: number;
  createdAt: Date;
}

export interface ShortenedUrl {
  id: number;
  originalUrl: string;
  shortCode: string;
  createdAt: Date;
}

export interface JWTPayload {
  id: number;
  email: string;
  role?: string;
  plan?: string;
  permissions?: string[];
}

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

export const ROLE_NAMES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  USER: 'user',
} as const;

export type RoleName = typeof ROLE_NAMES[keyof typeof ROLE_NAMES];

