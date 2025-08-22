import { db } from '../db';
import { plans, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { Plan, User, StorageInfo, PlanLimits } from '../types/user.types';

// Utility functions for storage calculations
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const parseBytes = (sizeStr: string): number => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const size = parseFloat(sizeStr);
  const unit = sizeStr.replace(/[\d.]/g, '').trim();

  const index = sizes.indexOf(unit);
  if (index === -1) return size;

  return size * Math.pow(1024, index);
};

// Plan management functions
export const createPlan = async (planData: { name: string; fileLimit: number; storageLimit: number }) => {
  try {
    const newPlan = await db.insert(plans).values({
      name: planData.name,
      fileLimit: planData.fileLimit,
      storageLimit: planData.storageLimit,
    }).returning();

    return newPlan[0];
  } catch (error) {
    throw new Error(`Failed to create plan: ${error}`);
  }
};

export const getAllPlans = async (): Promise<Plan[]> => {
  return await db.query.plans.findMany();
};

export const getPlanById = async (planId: number): Promise<Plan | undefined> => {
  return await db.query.plans.findFirst({
    where: eq(plans.id, planId),
  });
};

export const updatePlan = async (planId: number, updates: Partial<{ name: string; fileLimit: number; storageLimit: number }>) => {
  try {
    const updatedPlan = await db.update(plans)
      .set(updates)
      .where(eq(plans.id, planId))
      .returning();

    return updatedPlan[0];
  } catch (error) {
    throw new Error(`Failed to update plan: ${error}`);
  }
};

export const deletePlan = async (planId: number) => {
  try {
    await db.delete(plans).where(eq(plans.id, planId));
    return true;
  } catch (error) {
    throw new Error(`Failed to delete plan: ${error}`);
  }
};

// User plan management
export const assignPlanToUser = async (userId: number, planId: number) => {
  try {
    const plan = await getPlanById(planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    const updatedUser = await db.update(users)
      .set({
        planId: planId,
        storageLeft: plan.storageLimit,
        storageUsed: 0,
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser[0];
  } catch (error) {
    throw new Error(`Failed to assign plan: ${error}`);
  }
};

// Storage management functions
export const getUserStorageInfo = async (userId: number): Promise<StorageInfo | null> => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      plan: true,
    },
  });

  if (!user || !user.plan) {
    return null;
  }

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
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        plan: true,
      },
    });

    if (!user || !user.plan) {
      throw new Error('User or plan not found');
    }

    const newStorageUsed = user.storageUsed + bytesToAdd;
    const newStorageLeft = user.plan.storageLimit - newStorageUsed;

    if (newStorageLeft < 0) {
      throw new Error('Storage limit exceeded');
    }

    await db.update(users)
      .set({
        storageUsed: newStorageUsed,
        storageLeft: newStorageLeft,
      })
      .where(eq(users.id, userId));

    return true;
  } catch (error) {
    throw new Error(`Failed to update storage: ${error}`);
  }
};

export const checkUserStorageLimit = async (userId: number, bytesToAdd: number = 0): Promise<boolean> => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        plan: true,
      },
    });

    if (!user || !user.plan) {
      return false;
    }

    return (user.storageUsed + bytesToAdd) <= user.plan.storageLimit;
  } catch (error) {
    return false;
  }
};

// File limit checking
export const checkUserFileLimit = async (userId: number, currentFileCount: number = 1): Promise<boolean> => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        plan: true,
      },
    });

    if (!user || !user.plan) {
      return false;
    }

    // Note: In a real implementation, you'd track file count per user
    // For now, we'll assume currentFileCount is passed from the application
    return currentFileCount <= user.plan.fileLimit;
  } catch (error) {
    return false;
  }
};
