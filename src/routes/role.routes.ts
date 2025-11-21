import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin, requireAdminOrStaff, requireManageRolesPermission, canAccessUserData, logAdminAction } from '../middleware/admin.middleware';
import {
  createRoleController,
  getAllRolesController,
  getRoleController,
  updateRoleController,
  deleteRoleController,
  assignRoleController,
  assignRoleByNameController,
  getCurrentUserRoleController,
  checkPermissionController,
  getUsersByRoleController,
  initializeRolesController,
} from '../controllers/role.controller';

const router = Router();

// All role routes require authentication
router.use(authenticate);

// Public user routes (any authenticated user)
router.get('/me', getCurrentUserRoleController);
router.post('/check-permission/:permission', checkPermissionController);

// Admin-only routes - specific paths must come before parameterized paths
router.post('/admin/create', requireAdmin, logAdminAction('CREATE_ROLE'), createRoleController);
router.get('/admin/all', requireAdminOrStaff, getAllRolesController);
router.post('/admin/initialize', requireAdmin, logAdminAction('INITIALIZE_ROLES'), initializeRolesController);
router.post('/admin/assign', requireAdmin, logAdminAction('ASSIGN_ROLE'), assignRoleController);
router.post('/admin/assign-by-name', requireAdmin, logAdminAction('ASSIGN_ROLE_BY_NAME'), assignRoleByNameController);
router.get('/admin/users/:roleName', requireAdminOrStaff, getUsersByRoleController);

// Parameterized routes must come last
router.get('/admin/:roleId', requireAdminOrStaff, getRoleController);
router.put('/admin/:roleId', requireAdmin, logAdminAction('UPDATE_ROLE'), updateRoleController);
router.delete('/admin/:roleId', requireAdmin, logAdminAction('DELETE_ROLE'), deleteRoleController);

export default router;
