import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { roles, users } from '../../db/schema';
import { ROLE_NAMES } from '../../types';
import type { Role, RoleName, RolePermissions } from '../../types';

// Default permission sets per built-in role
const DEFAULT_ROLE_PERMISSIONS: Record<RoleName, RolePermissions> = {
  [ROLE_NAMES.ADMIN]: {
    canCreateUsers: true,
    canDeleteUsers: true,
    canManagePlans: true,
    canManageRoles: true,
    canViewAllUsers: true,
    canUploadFiles: true,
    canDeleteFiles: true,
    canViewAnalytics: true,
  },
  [ROLE_NAMES.STAFF]: {
    canCreateUsers: false,
    canDeleteUsers: false,
    canManagePlans: false,
    canManageRoles: false,
    canViewAllUsers: true,
    canUploadFiles: true,
    canDeleteFiles: true,
    canViewAnalytics: true,
  },
  [ROLE_NAMES.USER]: {
    canCreateUsers: false,
    canDeleteUsers: false,
    canManagePlans: false,
    canManageRoles: false,
    canViewAllUsers: false,
    canUploadFiles: true,
    canDeleteFiles: true,
    canViewAnalytics: false,
  },
};

export const createRole = async (roleData: {
  name: string;
  description?: string;
  permissions?: RolePermissions;
}) => {
  const permissions =
    roleData.permissions ||
    DEFAULT_ROLE_PERMISSIONS[roleData.name as RoleName] ||
    DEFAULT_ROLE_PERMISSIONS[ROLE_NAMES.USER];

  const [newRole] = await db
    .insert(roles)
    .values({
      name: roleData.name,
      description: roleData.description || '',
      permissions: JSON.stringify(permissions),
    })
    .returning();

  return newRole;
};

export const getAllRoles = async (): Promise<Role[]> => {
  return db.query.roles.findMany();
};

export const getRoleById = async (roleId: number) => {
  return db.query.roles.findFirst({ where: eq(roles.id, roleId) });
};

export const getRoleByName = async (roleName: string) => {
  return db.query.roles.findFirst({ where: eq(roles.name, roleName) });
};

export const updateRole = async (
  roleId: number,
  updates: Partial<{ name: string; description: string; permissions: RolePermissions }>
) => {
  const updateData: Record<string, unknown> = {};
  if (updates.name) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.permissions) updateData.permissions = JSON.stringify(updates.permissions);

  const [updatedRole] = await db
    .update(roles)
    .set(updateData)
    .where(eq(roles.id, roleId))
    .returning();

  return updatedRole;
};

export const deleteRole = async (roleId: number) => {
  const role = await getRoleById(roleId);
  if (role && Object.values(ROLE_NAMES).includes(role.name as RoleName)) {
    throw new Error('Cannot delete default system roles');
  }
  await db.delete(roles).where(eq(roles.id, roleId));
  return true;
};

export const assignRoleToUser = async (userId: number, roleId: number) => {
  const role = await getRoleById(roleId);
  if (!role) throw new Error('Role not found');

  const [updatedUser] = await db
    .update(users)
    .set({ roleId })
    .where(eq(users.id, userId))
    .returning();

  return updatedUser;
};

export const assignRoleToUserByName = async (userId: number, roleName: RoleName) => {
  const role = await getRoleByName(roleName);
  if (!role) throw new Error(`Role '${roleName}' not found`);
  return assignRoleToUser(userId, role.id);
};

export const getRolePermissions = (role: Role): RolePermissions => {
  try {
    return JSON.parse(role.permissions);
  } catch {
    return DEFAULT_ROLE_PERMISSIONS[ROLE_NAMES.USER];
  }
};

export const hasPermission = async (
  userId: number,
  permission: keyof RolePermissions
): Promise<boolean> => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { role: true },
  });
  if (!user || !user.role) return false;
  return getRolePermissions(user.role)[permission] || false;
};

export const checkUserRole = async (userId: number, requiredRole: RoleName): Promise<boolean> => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { role: true },
  });
  if (!user || !user.role) return false;

  if (user.role.name === ROLE_NAMES.ADMIN) return true;
  if (requiredRole === ROLE_NAMES.USER) {
    return [ROLE_NAMES.ADMIN, ROLE_NAMES.STAFF, ROLE_NAMES.USER].includes(
      user.role.name as RoleName
    );
  }
  return user.role.name === requiredRole;
};

export const getUsersByRole = async (roleName: RoleName) => {
  const role = await getRoleByName(roleName);
  if (!role) throw new Error(`Role '${roleName}' not found`);

  return db.query.users.findMany({
    where: eq(users.roleId, role.id),
    with: { role: true, plan: true },
  });
};

export const getUserRoleInfo = async (userId: number) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { role: true },
  });
  if (!user || !user.role) return null;

  return {
    userId: user.id,
    role: user.role,
    permissions: getRolePermissions(user.role),
  };
};

export const initializeDefaultRoles = async () => {
  const existingRoles = await getAllRoles();
  for (const roleName of Object.values(ROLE_NAMES)) {
    if (!existingRoles.find((role) => role.name === roleName)) {
      await createRole({
        name: roleName,
        description: `${roleName.charAt(0).toUpperCase() + roleName.slice(1)} role`,
        permissions: DEFAULT_ROLE_PERMISSIONS[roleName],
      });
      console.log(`Created default role: ${roleName}`);
    }
  }
};
