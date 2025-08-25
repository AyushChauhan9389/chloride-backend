import { Request, Response } from 'express';
import {
  createRole,
  getAllRoles,
  getRoleById,
  getRoleByName,
  updateRole,
  deleteRole,
  assignRoleToUser,
  assignRoleToUserByName,
  hasPermission,
  checkUserRole,
  getUsersByRole,
  getUserRoleInfo,
  initializeDefaultRoles,
  getRolePermissions,
} from '../services/role.service';
import { RolePermissions, ROLE_NAMES, RoleName } from '../types/user.types';

// Admin endpoints for role management
export const createRoleController = async (req: Request, res: Response) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Role name is required' });
    }

    // Check if user has permission to create roles
    const userId = (req as any).user?.id;
    const canManageRoles = await hasPermission(userId, 'canManageRoles');

    if (!canManageRoles) {
      return res.status(403).json({ message: 'Insufficient permissions to manage roles' });
    }

    const role = await createRole({
      name,
      description,
      permissions,
    });

    res.status(201).json({
      message: 'Role created successfully',
      role: {
        ...role,
        permissions: getRolePermissions(role!),
      },
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

export const getAllRolesController = async (req: Request, res: Response) => {
  try {
    const roles = await getAllRoles();

    // Format roles with parsed permissions
    const formattedRoles = roles.map(role => ({
      ...role,
      permissions: getRolePermissions(role),
    }));

    res.status(200).json({
      message: 'Roles retrieved successfully',
      roles: formattedRoles,
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

export const getRoleController = async (req: Request, res: Response) => {
  try {
    const roleId = parseInt(req.params.roleId!);

    if (isNaN(roleId)) {
      return res.status(400).json({ message: 'Invalid role ID' });
    }

    const role = await getRoleById(roleId);

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    res.status(200).json({
      message: 'Role retrieved successfully',
      role: {
        ...role,
        permissions: getRolePermissions(role),
      },
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

export const updateRoleController = async (req: Request, res: Response) => {
  try {
    const roleId = parseInt(req.params.roleId!);
    const updates = req.body;

    if (isNaN(roleId)) {
      return res.status(400).json({ message: 'Invalid role ID' });
    }

    // Check if user has permission to update roles
    const userId = (req as any).user?.id;
    const canManageRoles = await hasPermission(userId, 'canManageRoles');

    if (!canManageRoles) {
      return res.status(403).json({ message: 'Insufficient permissions to manage roles' });
    }

    const role = await updateRole(roleId, updates);

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    res.status(200).json({
      message: 'Role updated successfully',
      role: {
        ...role,
        permissions: getRolePermissions(role),
      },
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

export const deleteRoleController = async (req: Request, res: Response) => {
  try {
    const roleId = parseInt(req.params.roleId!);

    if (isNaN(roleId)) {
      return res.status(400).json({ message: 'Invalid role ID' });
    }

    // Check if user has permission to delete roles
    const userId = (req as any).user?.id;
    const canManageRoles = await hasPermission(userId, 'canManageRoles');

    if (!canManageRoles) {
      return res.status(403).json({ message: 'Insufficient permissions to manage roles' });
    }

    const role = await getRoleById(roleId);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    await deleteRole(roleId);

    res.status(200).json({
      message: 'Role deleted successfully',
    });
    return;
  } catch (error) {
    console.error(error);

    if (error instanceof Error && error.message.includes('Cannot delete default system roles')) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

// User role management
export const assignRoleController = async (req: Request, res: Response) => {
  try {
    const { userId, roleId } = req.body;

    if (!userId || !roleId) {
      return res.status(400).json({ message: 'User ID and Role ID are required' });
    }

    // Check if current user can assign roles
    const currentUserId = (req as any).user?.id;
    const canManageRoles = await hasPermission(currentUserId, 'canManageRoles');

    if (!canManageRoles) {
      return res.status(403).json({ message: 'Insufficient permissions to assign roles' });
    }

    const user = await assignRoleToUser(parseInt(userId!), parseInt(roleId!));

    res.status(200).json({
      message: 'Role assigned successfully',
      user: {
        id: user?.id,
        email: user?.email,
        roleId: user?.roleId,
      },
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

export const assignRoleByNameController = async (req: Request, res: Response) => {
  try {
    const { userId, roleName } = req.body;

    if (!userId || !roleName) {
      return res.status(400).json({ message: 'User ID and role name are required' });
    }

    // Validate role name
    if (!Object.values(ROLE_NAMES).includes(roleName as RoleName)) {
      return res.status(400).json({ message: 'Invalid role name' });
    }

    // Check if current user can assign roles
    const currentUserId = (req as any).user?.id;
    const canManageRoles = await hasPermission(currentUserId, 'canManageRoles');

    if (!canManageRoles) {
      return res.status(403).json({ message: 'Insufficient permissions to assign roles' });
    }

    const user = await assignRoleToUserByName(parseInt(userId!), roleName as RoleName);

    res.status(200).json({
      message: 'Role assigned successfully',
      user: {
        id: user?.id,
        email: user?.email,
        roleId: user?.roleId,
      },  
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

// Get current user's role information
export const getCurrentUserRoleController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const roleInfo = await getUserRoleInfo(userId);

    if (!roleInfo) {
      return res.status(404).json({ message: 'User role information not found' });
    }

    res.status(200).json({
      message: 'User role information retrieved successfully',
      roleInfo,
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

// Check user permission
export const checkPermissionController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { permission } = req.params;

    if (!permission) {
      return res.status(400).json({ message: 'Permission is required' });
    }

    const hasPerm = await hasPermission(userId, permission as keyof RolePermissions);

    res.status(200).json({
      message: 'Permission check completed',
      hasPermission: hasPerm,
      permission,
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

// Get users by role (admin only)
export const getUsersByRoleController = async (req: Request, res: Response) => {
  try {
    const { roleName } = req.params;

    // Validate role name
    if (!Object.values(ROLE_NAMES).includes(roleName as RoleName)) {
      return res.status(400).json({ message: 'Invalid role name' });
    }

    // Check if user can view all users
    const userId = (req as any).user?.id;
    const canViewAllUsers = await hasPermission(userId, 'canViewAllUsers');

    if (!canViewAllUsers) {
      return res.status(403).json({ message: 'Insufficient permissions to view users' });
    }

    const users = await getUsersByRole(roleName as RoleName);

    res.status(200).json({
      message: `Users with ${roleName} role retrieved successfully`,
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        role: user.role?.name,
        plan: user.plan?.name,
        createdAt: user.createdAt,
      })),
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

// Initialize default roles (admin only)
export const initializeRolesController = async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    const userId = (req as any).user?.id;
    const isAdmin = await checkUserRole(userId, ROLE_NAMES.ADMIN);

    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can initialize roles' });
    }

    await initializeDefaultRoles();

    res.status(200).json({
      message: 'Default roles initialized successfully',
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};
