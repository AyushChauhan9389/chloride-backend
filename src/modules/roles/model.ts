import { t } from 'elysia';

export const permissionsSchema = t.Object({
  canCreateUsers: t.Optional(t.Boolean()),
  canDeleteUsers: t.Optional(t.Boolean()),
  canManagePlans: t.Optional(t.Boolean()),
  canManageRoles: t.Optional(t.Boolean()),
  canViewAllUsers: t.Optional(t.Boolean()),
  canUploadFiles: t.Optional(t.Boolean()),
  canDeleteFiles: t.Optional(t.Boolean()),
  canViewAnalytics: t.Optional(t.Boolean()),
});

export const createRoleBody = t.Object({
  name: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  permissions: t.Optional(permissionsSchema),
});

export const updateRoleBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  permissions: t.Optional(permissionsSchema),
});

export const assignRoleBody = t.Object({
  userId: t.Number(),
  roleId: t.Number(),
});

export const assignRoleByNameBody = t.Object({
  userId: t.Number(),
  roleName: t.String(),
});
