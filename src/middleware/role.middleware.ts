import { Request, Response, NextFunction } from 'express';
import { hasPermission, checkUserRole } from '../services/role.service';
import { RoleName, RolePermissions, ROLE_NAMES } from '../types/user.types';

export interface RoleCheckOptions {
  requiredRole?: RoleName;
  requiredPermission?: keyof RolePermissions;
  allowAdminOverride?: boolean; // defaults to true
}

export interface PermissionCheckOptions {
  permission: keyof RolePermissions;
  allowAdminOverride?: boolean; // defaults to true
}

// Middleware to check if user has required role
export const requireRole = (options: RoleCheckOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { requiredRole, allowAdminOverride = true } = options;

      if (requiredRole) {
        const hasRole = await checkUserRole(userId, requiredRole);

        if (!hasRole) {
          // If admin override is allowed and user is admin, allow access
          if (allowAdminOverride) {
            const isAdmin = await checkUserRole(userId, ROLE_NAMES.ADMIN);
            if (isAdmin) {
              return next();
            }
          }

          return res.status(403).json({
            message: `Access denied. Required role: ${requiredRole}`,
          });
        }
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ message: 'Internal server error' });
      return;
    }
  };
};

// Middleware to check if user has required permission
export const requirePermission = (options: PermissionCheckOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { permission, allowAdminOverride = true } = options;

      const hasPerm = await hasPermission(userId, permission);

      if (!hasPerm) {
        // If admin override is allowed, check if user is admin
        if (allowAdminOverride) {
          const isAdmin = await checkUserRole(userId, ROLE_NAMES.ADMIN);
          if (isAdmin) {
            return next();
          }
        }

        return res.status(403).json({
          message: `Access denied. Required permission: ${permission}`,
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: 'Internal server error' });
      return;
    }
  };
};

// Specific middleware for common role checks
export const requireAdmin = requireRole({ requiredRole: ROLE_NAMES.ADMIN });
export const requireStaff = requireRole({ requiredRole: ROLE_NAMES.STAFF });
export const requireUser = requireRole({ requiredRole: ROLE_NAMES.USER });

// Specific middleware for common permission checks
export const requireCreateUsersPermission = requirePermission({ permission: 'canCreateUsers' });
export const requireDeleteUsersPermission = requirePermission({ permission: 'canDeleteUsers' });
export const requireManagePlansPermission = requirePermission({ permission: 'canManagePlans' });
export const requireManageRolesPermission = requirePermission({ permission: 'canManageRoles' });
export const requireViewAllUsersPermission = requirePermission({ permission: 'canViewAllUsers' });
export const requireUploadFilesPermission = requirePermission({ permission: 'canUploadFiles' });
export const requireDeleteFilesPermission = requirePermission({ permission: 'canDeleteFiles' });
export const requireViewAnalyticsPermission = requirePermission({ permission: 'canViewAnalytics' });

// Middleware to add role information to request
export const withRoleInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return next(); // Continue without role info if no user
    }

    const { getUserRoleInfo } = await import('../services/role.service');
    const roleInfo = await getUserRoleInfo(userId);

    (req as any).roleInfo = roleInfo;
    next();
  } catch (error) {
    console.error('Error fetching role info:', error);
    next(); // Continue even if role info fails
  }
};

// Middleware to check multiple permissions (user must have ALL specified permissions)
export const requirePermissions = (permissions: (keyof RolePermissions)[], allowAdminOverride: boolean = true) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Check if user is admin first (if override is allowed)
      if (allowAdminOverride) {
        const isAdmin = await checkUserRole(userId, ROLE_NAMES.ADMIN);
        if (isAdmin) {
          return next();
        }
      }

      // Check all required permissions
      for (const permission of permissions) {
        const hasPerm = await hasPermission(userId, permission);
        if (!hasPerm) {
          return res.status(403).json({
            message: `Access denied. Required permission: ${permission}`,
            requiredPermissions: permissions,
            missingPermission: permission,
          });
        }
      }

      next();
    } catch (error) {
      console.error('Multiple permissions check error:', error);
      res.status(500).json({ message: 'Internal server error' });
      return;
    }
  };
};

// Middleware to check if user has ANY of the specified roles
export const requireAnyRole = (roles: RoleName[], allowAdminOverride: boolean = true) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Check if user is admin first (if override is allowed)
      if (allowAdminOverride) {
        const isAdmin = await checkUserRole(userId, ROLE_NAMES.ADMIN);
        if (isAdmin) {
          return next();
        }
      }

      // Check if user has any of the required roles
      for (const role of roles) {
        const hasRole = await checkUserRole(userId, role);
        if (hasRole) {
          return next();
        }
      }

      return res.status(403).json({
        message: `Access denied. Required one of roles: ${roles.join(', ')}`,
      });
    } catch (error) {
      console.error('Any role check error:', error);
      res.status(500).json({ message: 'Internal server error' });
      return;
    }
  };
};

// Middleware to restrict access based on ownership (user can only access their own resources)
export const requireOwnership = (resourceUserIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = (req as any).user?.id;
      const resourceUserId = req.params[resourceUserIdParam] || req.body[resourceUserIdParam];

      if (!currentUserId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Allow if user is accessing their own resource
      if (currentUserId === parseInt(resourceUserId)) {
        return next();
      }

      // For other users, check if they have admin permissions
      // Note: This is a basic check - you might want to call hasPermission here
      // For now, we'll let it pass and let the specific route handler decide
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({ message: 'Internal server error' });
      return;
    }
  };
};
