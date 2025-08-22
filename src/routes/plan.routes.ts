import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin, requireManagePlansPermission, logAdminAction } from '../middleware/admin.middleware';
import {
  createPlanController,
  getAllPlansController,
  getPlanController,
  updatePlanController,
  deletePlanController,
  assignPlanController,
  getUserStorageController,
  checkStorageLimitController,
  checkFileLimitController,
  updateUserStorageController,
} from '../controllers/plan.controller';

const router = Router();

// All plan routes require authentication
router.use(authenticate);

// Admin routes for plan management (protected with admin middleware)
router.post('/admin/create', requireAdmin, logAdminAction('CREATE_PLAN'), createPlanController);
router.get('/admin/all', requireAdmin, getAllPlansController);
router.get('/admin/:planId', requireAdmin, getPlanController);
router.put('/admin/:planId', requireAdmin, logAdminAction('UPDATE_PLAN'), updatePlanController);
router.delete('/admin/:planId', requireAdmin, logAdminAction('DELETE_PLAN'), deletePlanController);

// Admin route to update user storage (for file operations)
router.put('/admin/user-storage', requireAdmin, logAdminAction('UPDATE_USER_STORAGE'), updateUserStorageController);

// User routes for plan and storage management
router.post('/assign', assignPlanController);
router.get('/user/storage', getUserStorageController);
router.post('/user/check-storage', checkStorageLimitController);
router.post('/user/check-files', checkFileLimitController);

// Public route to get all available plans (no auth required)
router.get('/available', getAllPlansController);

export default router;
