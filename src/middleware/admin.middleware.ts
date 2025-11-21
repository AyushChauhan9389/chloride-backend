import { Request, Response, NextFunction } from 'express';
import { ROLE_NAMES } from '../types/user.types';

export interface AdminUser {
  id: number;
  email: string;
  role: string;
  plan?: string;
  permissions: string[];
}

// Middleware to check if user is admin
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user as AdminUser;

    if (!user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    if (user.role !== ROLE_NAMES.ADMIN) {
      res.status(403).json({
        message: 'Access denied. Admin role required',
        userRole: user.role,
        requiredRole: ROLE_NAMES.ADMIN
      });
      return;
      }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

// Middleware to check if user has admin or staff role
export const requireAdminOrStaff = (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user as AdminUser;

    if (!user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const allowedRoles = [ROLE_NAMES.ADMIN, ROLE_NAMES.STAFF];
    if (!allowedRoles.includes(user.role as any)) {
      res.status(403).json({
        message: 'Access denied. Admin or Staff role required',
        userRole: user.role,
        allowedRoles: allowedRoles
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Admin/Staff check error:', error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

// Middleware to check specific admin permissions
export const requireAdminPermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as AdminUser;

      if (!user) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      // Admin has all permissions
      if (user.role === ROLE_NAMES.ADMIN) {
        return next();
      }

      // Check specific permission
      if (!user.permissions.includes(permission)) {
        res.status(403).json({
          message: `Access denied. Permission '${permission}' required`,
          userPermissions: user.permissions,
          requiredPermission: permission
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: 'Internal server error' });
      return;
    }
  };
};

// Specific admin permission middlewares
export const requireManageUsersPermission = requireAdminPermission('canManageUsers');
export const requireManageRolesPermission = requireAdminPermission('canManageRoles');
export const requireManagePlansPermission = requireAdminPermission('canManagePlans');
export const requireViewAllUsersPermission = requireAdminPermission('canViewAllUsers');
export const requireViewAnalyticsPermission = requireAdminPermission('canViewAnalytics');

// Middleware to check if user can access specific user data
export const canAccessUserData = (targetUserIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as AdminUser;
      const targetUserId = parseInt(req.params[targetUserIdParam] || req.body[targetUserIdParam]);

      if (!user) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      // Admin can access any user's data
      if (user.role === ROLE_NAMES.ADMIN) {
        next();
        return;
      }

      // Staff can access user data if they have view permission
      if (user.role === ROLE_NAMES.STAFF && user.permissions.includes('canViewAllUsers')) {
        next();
        return;
      }

      // Users can only access their own data
      if (user.role === ROLE_NAMES.USER && user.id === targetUserId) {
        next();
        return;
      }

      res.status(403).json({
        message: 'Access denied. Cannot access other user data',
        userId: user.id,
        targetUserId: targetUserId,
        userRole: user.role
      });
    } catch (error) {
      console.error('User data access check error:', error);
      res.status(500).json({ message: 'Internal server error' });
      return;
      }
  };
};

// Middleware to log admin actions
export const logAdminAction = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AdminUser;

    if (user && (user.role === ROLE_NAMES.ADMIN || user.role === ROLE_NAMES.STAFF)) {
      const timestamp = new Date().toISOString();
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      console.log(`[${timestamp}] ADMIN ACTION: ${action}`, {
        userId: user.id,
        email: user.email,
        role: user.role,
        ip: ip,
        userAgent: userAgent,
        method: req.method,
        path: req.path,
        body: req.body,
        query: req.query,
        params: req.params
      });
    }

    next();
  };
};
