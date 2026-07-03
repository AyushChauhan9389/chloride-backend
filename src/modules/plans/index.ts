import { Elysia, t, status } from 'elysia';
import { authPlugin } from '../../plugins/auth';
import { ROLE_NAMES } from '../../types';
import { formatBytes, parseBytes } from '../../lib/storage';
import {
  assignPlanToUser,
  checkUserFileLimit,
  checkUserStorageLimit,
  createPlan,
  deletePlan,
  getAllPlans,
  getPlanById,
  getUserStorageInfo,
  updatePlan,
  updateUserStorage,
} from './service';
import {
  assignPlanBody,
  checkFilesBody,
  checkStorageBody,
  createPlanBody,
  updatePlanBody,
  updateUserStorageBody,
} from './model';

const ADMIN_ONLY = { auth: { roles: [ROLE_NAMES.ADMIN] } } as const;

export const plansModule = new Elysia({ prefix: '/api/plans', tags: ['Plans'] })
  .use(authPlugin)
  // --- Public ---
  .get('/available', async () => {
    const plans = await getAllPlans();
    return {
      message: 'Plans retrieved successfully',
      plans: plans.map((plan) => ({ ...plan, storageLimitFormatted: formatBytes(plan.storageLimit) })),
    };
  })
  // --- Admin plan management ---
  .post(
    '/admin/create',
    async ({ body }) => {
      const storageLimit =
        typeof body.storageLimit === 'string' ? parseBytes(body.storageLimit) : body.storageLimit;
      const fileLimit = typeof body.fileLimit === 'string' ? parseInt(body.fileLimit) : body.fileLimit;
      const plan = await createPlan({ name: body.name, fileLimit, storageLimit });
      return status(201, { message: 'Plan created successfully', plan });
    },
    { ...ADMIN_ONLY, body: createPlanBody }
  )
  .get(
    '/admin/all',
    async () => {
      const plans = await getAllPlans();
      return {
        message: 'Plans retrieved successfully',
        plans: plans.map((plan) => ({ ...plan, storageLimitFormatted: formatBytes(plan.storageLimit) })),
      };
    },
    ADMIN_ONLY
  )
  // Static route registered before the param route for clarity.
  .put(
    '/admin/user-storage',
    async ({ body }) => {
      const userId = typeof body.userId === 'string' ? parseInt(body.userId) : body.userId;
      const bytesToAdd = typeof body.bytesToAdd === 'string' ? parseInt(body.bytesToAdd) : body.bytesToAdd;
      try {
        await updateUserStorage(userId, bytesToAdd);
      } catch (error) {
        if (error instanceof Error && error.message.includes('Storage limit exceeded')) {
          return status(400, { message: error.message });
        }
        throw error;
      }
      return { message: 'User storage updated successfully' };
    },
    { ...ADMIN_ONLY, body: updateUserStorageBody }
  )
  .get(
    '/admin/:planId',
    async ({ params }) => {
      const plan = await getPlanById(params.planId);
      if (!plan) return status(404, { message: 'Plan not found' });
      return {
        message: 'Plan retrieved successfully',
        plan: { ...plan, storageLimitFormatted: formatBytes(plan.storageLimit) },
      };
    },
    { ...ADMIN_ONLY, params: t.Object({ planId: t.Number() }) }
  )
  .put(
    '/admin/:planId',
    async ({ params, body }) => {
      const updates: { name?: string; fileLimit?: number; storageLimit?: number } = {};
      if (body.name !== undefined) updates.name = body.name;
      if (body.fileLimit !== undefined) updates.fileLimit = body.fileLimit;
      if (body.storageLimit !== undefined) {
        updates.storageLimit =
          typeof body.storageLimit === 'string' ? parseBytes(body.storageLimit) : body.storageLimit;
      }
      const plan = await updatePlan(params.planId, updates);
      if (!plan) return status(404, { message: 'Plan not found' });
      return {
        message: 'Plan updated successfully',
        plan: { ...plan, storageLimitFormatted: formatBytes(plan.storageLimit) },
      };
    },
    { ...ADMIN_ONLY, params: t.Object({ planId: t.Number() }), body: updatePlanBody }
  )
  .delete(
    '/admin/:planId',
    async ({ params }) => {
      const plan = await getPlanById(params.planId);
      if (!plan) return status(404, { message: 'Plan not found' });
      await deletePlan(params.planId);
      return { message: 'Plan deleted successfully' };
    },
    { ...ADMIN_ONLY, params: t.Object({ planId: t.Number() }) }
  )
  // --- Authenticated user routes ---
  .post(
    '/assign',
    async ({ user, body }) => {
      const planId = typeof body.planId === 'string' ? parseInt(body.planId) : body.planId;
      const updated = await assignPlanToUser(user.id, planId);
      return {
        message: 'Plan assigned successfully',
        user: {
          id: updated?.id,
          email: updated?.email,
          planId: updated?.planId,
          storageUsed: updated?.storageUsed,
          storageLeft: updated?.storageLeft,
        },
      };
    },
    { auth: true, body: assignPlanBody }
  )
  .get(
    '/user/storage',
    async ({ user }) => {
      const storageInfo = await getUserStorageInfo(user.id);
      if (!storageInfo) return status(404, { message: 'User storage information not found' });
      return {
        message: 'Storage information retrieved successfully',
        storage: {
          ...storageInfo,
          usedFormatted: formatBytes(storageInfo.used),
          leftFormatted: formatBytes(storageInfo.left),
          limitFormatted: formatBytes(storageInfo.limit),
        },
      };
    },
    { auth: true }
  )
  .post(
    '/user/check-storage',
    async ({ user, body }) => {
      const bytesToAdd = body.bytesToAdd ?? 0;
      const withinLimit = await checkUserStorageLimit(user.id, bytesToAdd);
      return { message: 'Storage limit check completed', withinLimit, bytesToAdd };
    },
    { auth: true, body: checkStorageBody }
  )
  .post(
    '/user/check-files',
    async ({ user, body }) => {
      const currentFileCount = body.currentFileCount ?? 1;
      const withinLimit = await checkUserFileLimit(user.id, currentFileCount);
      return { message: 'File limit check completed', withinLimit, currentFileCount };
    },
    { auth: true, body: checkFilesBody }
  );
