import { Elysia, t, status } from 'elysia';
import { authPlugin } from '../../plugins/auth';
import { ROLE_NAMES } from '../../types';
import type { RoleName, RolePermissions } from '../../types';
import {
  assignRoleToUser,
  assignRoleToUserByName,
  createRole,
  deleteRole,
  getAllRoles,
  getRoleById,
  getRolePermissions,
  getUserRoleInfo,
  getUsersByRole,
  hasPermission,
  initializeDefaultRoles,
  updateRole,
} from './service';
import {
  assignRoleBody,
  assignRoleByNameBody,
  createRoleBody,
  updateRoleBody,
} from './model';

const ADMIN_ONLY = { auth: { roles: [ROLE_NAMES.ADMIN] } } as const;
const ADMIN_OR_STAFF = { auth: { roles: [ROLE_NAMES.ADMIN, ROLE_NAMES.STAFF] } } as const;

export const rolesModule = new Elysia({ prefix: '/api/roles', tags: ['Roles'] })
  .use(authPlugin)
  // --- Any authenticated user ---
  .get(
    '/me',
    async ({ user }) => {
      const roleInfo = await getUserRoleInfo(user.id);
      if (!roleInfo) return status(404, { message: 'User role information not found' });
      return { message: 'User role information retrieved successfully', roleInfo };
    },
    { auth: true }
  )
  .post(
    '/check-permission/:permission',
    async ({ user, params }) => {
      const hasPerm = await hasPermission(user.id, params.permission as keyof RolePermissions);
      return { message: 'Permission check completed', hasPermission: hasPerm, permission: params.permission };
    },
    { auth: true, params: t.Object({ permission: t.String() }) }
  )
  // --- Admin only ---
  .post(
    '/admin/create',
    async ({ body }) => {
      const role = await createRole(body as { name: string; description?: string; permissions?: RolePermissions });
      return status(201, {
        message: 'Role created successfully',
        role: { ...role, permissions: getRolePermissions(role!) },
      });
    },
    { ...ADMIN_ONLY, body: createRoleBody }
  )
  .get(
    '/admin/all',
    async () => {
      const roles = await getAllRoles();
      return {
        message: 'Roles retrieved successfully',
        roles: roles.map((role) => ({ ...role, permissions: getRolePermissions(role) })),
      };
    },
    ADMIN_OR_STAFF
  )
  .get(
    '/admin/:roleId',
    async ({ params }) => {
      const role = await getRoleById(params.roleId);
      if (!role) return status(404, { message: 'Role not found' });
      return {
        message: 'Role retrieved successfully',
        role: { ...role, permissions: getRolePermissions(role) },
      };
    },
    { ...ADMIN_OR_STAFF, params: t.Object({ roleId: t.Number() }) }
  )
  .put(
    '/admin/:roleId',
    async ({ params, body }) => {
      const role = await updateRole(params.roleId, body as Partial<{ name: string; description: string; permissions: RolePermissions }>);
      if (!role) return status(404, { message: 'Role not found' });
      return {
        message: 'Role updated successfully',
        role: { ...role, permissions: getRolePermissions(role) },
      };
    },
    { ...ADMIN_ONLY, params: t.Object({ roleId: t.Number() }), body: updateRoleBody }
  )
  .delete(
    '/admin/:roleId',
    async ({ params }) => {
      const role = await getRoleById(params.roleId);
      if (!role) return status(404, { message: 'Role not found' });
      try {
        await deleteRole(params.roleId);
      } catch (error) {
        if (error instanceof Error && error.message.includes('Cannot delete default system roles')) {
          return status(400, { message: error.message });
        }
        throw error;
      }
      return { message: 'Role deleted successfully' };
    },
    { ...ADMIN_ONLY, params: t.Object({ roleId: t.Number() }) }
  )
  .post(
    '/admin/assign',
    async ({ body }) => {
      const user = await assignRoleToUser(body.userId, body.roleId);
      return {
        message: 'Role assigned successfully',
        user: { id: user?.id, email: user?.email, roleId: user?.roleId },
      };
    },
    { ...ADMIN_ONLY, body: assignRoleBody }
  )
  .post(
    '/admin/assign-by-name',
    async ({ body }) => {
      if (!Object.values(ROLE_NAMES).includes(body.roleName as RoleName)) {
        return status(400, { message: 'Invalid role name' });
      }
      const user = await assignRoleToUserByName(body.userId, body.roleName as RoleName);
      return {
        message: 'Role assigned successfully',
        user: { id: user?.id, email: user?.email, roleId: user?.roleId },
      };
    },
    { ...ADMIN_ONLY, body: assignRoleByNameBody }
  )
  .get(
    '/admin/users/:roleName',
    async ({ params }) => {
      if (!Object.values(ROLE_NAMES).includes(params.roleName as RoleName)) {
        return status(400, { message: 'Invalid role name' });
      }
      const users = await getUsersByRole(params.roleName as RoleName);
      return {
        message: `Users with ${params.roleName} role retrieved successfully`,
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          role: u.role?.name,
          plan: u.plan?.name,
          createdAt: u.createdAt,
        })),
      };
    },
    { ...ADMIN_OR_STAFF, params: t.Object({ roleName: t.String() }) }
  )
  .post(
    '/admin/initialize',
    async () => {
      await initializeDefaultRoles();
      return { message: 'Default roles initialized successfully' };
    },
    ADMIN_ONLY
  );
