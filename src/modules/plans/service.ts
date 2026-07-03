import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { plans, users } from '../../db/schema';
import { UNLIMITED, isUnlimited } from '../../lib/storage';
import type { Plan, StorageInfo } from '../../types';

const MB = 1024 * 1024;
const GB = 1024 * MB;

// Default plans seeded on startup. Use UNLIMITED (-1) for no cap.
export const DEFAULT_PLANS: Array<{ name: string; fileLimit: number; storageLimit: number }> = [
  { name: 'Free', fileLimit: 10, storageLimit: 100 * MB },
  { name: 'Pro', fileLimit: 1000, storageLimit: 5 * GB },
  { name: 'Max', fileLimit: UNLIMITED, storageLimit: UNLIMITED },
];

// Idempotently create any missing default plans. Existing plans are left
// untouched so admin edits aren't clobbered.
export const initializeDefaultPlans = async () => {
  const existing = await db.query.plans.findMany();
  for (const spec of DEFAULT_PLANS) {
    if (!existing.find((p) => p.name === spec.name)) {
      await createPlan(spec);
      console.log(`Created default plan: ${spec.name}`);
    }
  }
};

export const createPlan = async (planData: {
  name: string;
  fileLimit: number;
  storageLimit: number;
}) => {
  const [newPlan] = await db
    .insert(plans)
    .values({
      name: planData.name,
      fileLimit: planData.fileLimit,
      storageLimit: planData.storageLimit,
    })
    .returning();
  return newPlan;
};

export const getAllPlans = async (): Promise<Plan[]> => {
  return db.query.plans.findMany();
};

export const getPlanById = async (planId: number) => {
  return db.query.plans.findFirst({ where: eq(plans.id, planId) });
};

export const updatePlan = async (
  planId: number,
  updates: Partial<{ name: string; fileLimit: number; storageLimit: number }>
) => {
  const [updatedPlan] = await db
    .update(plans)
    .set(updates)
    .where(eq(plans.id, planId))
    .returning();
  return updatedPlan;
};

export const deletePlan = async (planId: number) => {
  await db.delete(plans).where(eq(plans.id, planId));
  return true;
};

export const assignPlanToUser = async (userId: number, planId: number) => {
  const plan = await getPlanById(planId);
  if (!plan) throw new Error('Plan not found');

  const [updatedUser] = await db
    .update(users)
    .set({
      planId,
      // Unlimited plans keep storageLeft as the UNLIMITED sentinel.
      storageLeft: isUnlimited(plan.storageLimit) ? UNLIMITED : plan.storageLimit,
      storageUsed: 0,
    })
    .where(eq(users.id, userId))
    .returning();

  return updatedUser;
};

export const getUserStorageInfo = async (userId: number): Promise<StorageInfo | null> => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { plan: true },
  });
  if (!user || !user.plan) return null;

  const limit = user.plan.storageLimit;
  const used = user.storageUsed;

  if (isUnlimited(limit)) {
    return { used, left: UNLIMITED, limit: UNLIMITED, percentageUsed: 0 };
  }

  const left = user.storageLeft;
  const percentageUsed = limit > 0 ? (used / limit) * 100 : 0;

  return {
    used,
    left,
    limit,
    percentageUsed: Math.round(percentageUsed * 100) / 100,
  };
};

export const updateUserStorage = async (userId: number, bytesToAdd: number): Promise<boolean> => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { plan: true },
  });
  if (!user || !user.plan) throw new Error('User or plan not found');

  const newStorageUsed = user.storageUsed + bytesToAdd;

  // Unlimited plan: track usage but never cap; keep the UNLIMITED sentinel.
  if (isUnlimited(user.plan.storageLimit)) {
    await db
      .update(users)
      .set({ storageUsed: newStorageUsed, storageLeft: UNLIMITED })
      .where(eq(users.id, userId));
    return true;
  }

  const newStorageLeft = user.plan.storageLimit - newStorageUsed;

  if (newStorageLeft < 0) throw new Error('Storage limit exceeded');

  await db
    .update(users)
    .set({ storageUsed: newStorageUsed, storageLeft: newStorageLeft })
    .where(eq(users.id, userId));

  return true;
};

export const checkUserStorageLimit = async (
  userId: number,
  bytesToAdd = 0
): Promise<boolean> => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { plan: true },
  });
  if (!user || !user.plan) return false;
  if (isUnlimited(user.plan.storageLimit)) return true;
  return user.storageUsed + bytesToAdd <= user.plan.storageLimit;
};

export const checkUserFileLimit = async (
  userId: number,
  currentFileCount = 1
): Promise<boolean> => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { plan: true },
  });
  if (!user || !user.plan) return false;
  if (isUnlimited(user.plan.fileLimit)) return true;
  return currentFileCount <= user.plan.fileLimit;
};
