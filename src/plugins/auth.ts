
import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { bearer } from '@elysiajs/bearer';
import { ROLE_NAMES } from '../types';
import type { AuthUser, RoleName, RolePermissions } from '../types';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

// Shared, named JWT plugin. Elysia dedupes by name, so importing this into
// multiple modules registers a single instance. Exposes `jwt.sign` / `jwt.verify`.
export const jwtPlugin = new Elysia({ name: 'jwt' }).use(
  jwt({
    name: 'jwt',
    secret: JWT_SECRET,
    exp: '1h',
  })
);

interface AuthOptions {
  /** Restrict to these roles (user's role must be one of them). */
  roles?: readonly RoleName[];
  /** Require a specific permission (admin always passes). */
  permission?: keyof RolePermissions;
}

// Authentication + authorization macro. Replaces the old Express
// `authenticate` + `requireAdmin` / `requireAdminOrStaff` / permission
// middlewares. Usage:
//   .get('/x', handler, { auth: true })
//   .get('/x', handler, { auth: { roles: ['admin'] } })
//   .get('/x', handler, { auth: { permission: 'canManageRoles' } })
export const authPlugin = new Elysia({ name: 'auth' })
  .use(jwtPlugin)
  .use(bearer())
  .macro({
    auth(options: AuthOptions | boolean = true) {
      const config: AuthOptions = typeof options === 'boolean' ? {} : options;

      return {
        async resolve({ jwt, bearer, status }) {
          if (!bearer) {
            return status(401, { message: 'Unauthorized' });
          }

          const payload = (await jwt.verify(bearer)) as unknown as AuthUser | false;
          if (!payload) {
            return status(401, { message: 'Unauthorized' });
          }

          const user: AuthUser = {
            id: payload.id,
            email: payload.email,
            role: payload.role,
            plan: payload.plan,
            permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
          };

          const isAdmin = user.role === ROLE_NAMES.ADMIN;

          if (config.roles && config.roles.length > 0) {
            if (!user.role || !config.roles.includes(user.role as RoleName)) {
              return status(403, {
                message: `Access denied. Required role: ${config.roles.join(' or ')}`,
              });
            }
          }

          if (config.permission && !isAdmin) {
            if (!user.permissions.includes(config.permission)) {
              return status(403, {
                message: `Access denied. Required permission: ${config.permission}`,
              });
            }
          }

          return { user };
        },
      };
    },
  });
