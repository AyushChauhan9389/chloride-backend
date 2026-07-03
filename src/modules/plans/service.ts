import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { plans, users } from '../../db/schema';
import type { Plan, StorageInfo } from '../../types';

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
      storageLeft: plan.storageLimit,
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
  return currentFileCount <= user.plan.fileLimit;
};
