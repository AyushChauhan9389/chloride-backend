import { db } from '../db';
import { roles, users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { RolePermissions, ROLE_NAMES, RoleName } from '@chloride/shared';

// Default role permissions
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

export const createRole = async (roleData: { name: string; description?: string; permissions?: RolePermissions }) => {
  try {
    const permissions = roleData.permissions || DEFAULT_ROLE_PERMISSIONS[roleData.name as RoleName] || DEFAULT_ROLE_PERMISSIONS[ROLE_NAMES.USER];

    const newRole = await db.insert(roles).values({
      name: roleData.name,
      description: roleData.description || '',
      permissions: JSON.stringify(permissions),
    }).returning();

    return newRole[0];
  } catch (error) {
    throw new Error(`Failed to create role: ${error}`);
  }
};

export const getAllRoles = async () => {
  return await db.query.roles.findMany();
};

export const getRoleById = async (roleId: number) => {
  return await db.query.roles.findFirst({
    where: eq(roles.id, roleId),
  });
};

export const getRoleByName = async (roleName: string) => {
  return await db.query.roles.findFirst({
    where: eq(roles.name, roleName),
  });
};

export const assignRoleToUser = async (userId: number, roleId: number) => {
  try {
    const role = await getRoleById(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    const updatedUser = await db.update(users)
      .set({ roleId: roleId })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser[0];
  } catch (error) {
    throw new Error(`Failed to assign role: ${error}`);
  }
};

export const initializeDefaultRoles = async () => {
  try {
    const existingRoles = await getAllRoles();

    for (const roleName of Object.values(ROLE_NAMES)) {
      const existingRole = existingRoles.find(role => role.name === roleName);

      if (!existingRole) {
        const permissions = DEFAULT_ROLE_PERMISSIONS[roleName];
        await createRole({
          name: roleName,
          description: `${roleName.charAt(0).toUpperCase() + roleName.slice(1)} role`,
          permissions,
        });
        console.log(`Created default role: ${roleName}`);
      }
    }
  } catch (error) {
    console.error('Error initializing default roles:', error);
  }
};

