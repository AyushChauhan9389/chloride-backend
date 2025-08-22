import { db } from '../db';
import { roles, users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { Role, User, RolePermissions, RoleName, ROLE_NAMES } from '../types/user.types';

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

// Role management functions
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

export const getAllRoles = async (): Promise<Role[]> => {
  return await db.query.roles.findMany();
};

export const getRoleById = async (roleId: number): Promise<Role | undefined> => {
  return await db.query.roles.findFirst({
    where: eq(roles.id, roleId),
  });
};

export const getRoleByName = async (roleName: string): Promise<Role | undefined> => {
  return await db.query.roles.findFirst({
    where: eq(roles.name, roleName),
  });
};

export const updateRole = async (roleId: number, updates: Partial<{ name: string; description: string; permissions: RolePermissions }>) => {
  try {
    const updateData: any = {};

    if (updates.name) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.permissions) updateData.permissions = JSON.stringify(updates.permissions);

    const updatedRole = await db.update(roles)
      .set(updateData)
      .where(eq(roles.id, roleId))
      .returning();

    return updatedRole[0];
  } catch (error) {
    throw new Error(`Failed to update role: ${error}`);
  }
};

export const deleteRole = async (roleId: number) => {
  try {
    // Prevent deletion of default roles
    const role = await getRoleById(roleId);
    if (role && Object.values(ROLE_NAMES).includes(role.name as RoleName)) {
      throw new Error('Cannot delete default system roles');
    }

    await db.delete(roles).where(eq(roles.id, roleId));
    return true;
  } catch (error) {
    throw new Error(`Failed to delete role: ${error}`);
  }
};

// User role management
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

export const assignRoleToUserByName = async (userId: number, roleName: RoleName) => {
  try {
    const role = await getRoleByName(roleName);
    if (!role) {
      throw new Error(`Role '${roleName}' not found`);
    }

    return await assignRoleToUser(userId, role.id);
  } catch (error) {
    throw new Error(`Failed to assign role: ${error}`);
  }
};

// Permission checking functions
export const getRolePermissions = (role: Role): RolePermissions => {
  try {
    return JSON.parse(role.permissions);
  } catch (error) {
    console.error('Error parsing role permissions:', error);
    return DEFAULT_ROLE_PERMISSIONS[ROLE_NAMES.USER];
  }
};

export const hasPermission = async (userId: number, permission: keyof RolePermissions): Promise<boolean> => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        role: true,
      },
    });

    if (!user || !user.role) {
      return false;
    }

    const permissions = getRolePermissions(user.role);
    return permissions[permission] || false;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
};

export const checkUserRole = async (userId: number, requiredRole: RoleName): Promise<boolean> => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        role: true,
      },
    });

    if (!user || !user.role) {
      return false;
    }

    // Admin has access to everything
    if (user.role.name === ROLE_NAMES.ADMIN) {
      return true;
    }

    // Staff has access to staff and user permissions
    if (requiredRole === ROLE_NAMES.USER) {
      return [ROLE_NAMES.ADMIN, ROLE_NAMES.STAFF, ROLE_NAMES.USER].includes(user.role.name as RoleName);
    }

    // Exact role match required
    return user.role.name === requiredRole;
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
};

// Default roles initialization
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

// Get users by role
export const getUsersByRole = async (roleName: RoleName) => {
  try {
    const role = await getRoleByName(roleName);
    if (!role) {
      throw new Error(`Role '${roleName}' not found`);
    }

    return await db.query.users.findMany({
      where: eq(users.roleId, role.id),
      with: {
        role: true,
        plan: true,
      },
    });
  } catch (error) {
    throw new Error(`Failed to get users by role: ${error}`);
  }
};

// Get user role information
export const getUserRoleInfo = async (userId: number) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        role: true,
      },
    });

    if (!user || !user.role) {
      return null;
    }

    return {
      userId: user.id,
      role: user.role,
      permissions: getRolePermissions(user.role),
    };
  } catch (error) {
    console.error('Error getting user role info:', error);
    return null;
  }
};
