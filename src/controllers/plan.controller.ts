import { Request, Response } from 'express';
import {
  createPlan,
  getAllPlans,
  getPlanById,
  updatePlan,
  deletePlan,
  assignPlanToUser,
  getUserStorageInfo,
  updateUserStorage,
  checkUserStorageLimit,
  checkUserFileLimit,
  formatBytes,
} from '../services/plan.service';
import { NewPlan } from '../types/user.types';

// Admin endpoints for plan management
export const createPlanController = async (req: Request, res: Response) => {
  try {
    const { name, fileLimit, storageLimit } = req.body;

    if (!name || !fileLimit || !storageLimit) {
      res.status(400).json({
        message: 'Name, fileLimit, and storageLimit are required'
      });
      return
    }

    // Parse storage limit if it's a string with units (e.g., "1GB")
    const storageLimitBytes = typeof storageLimit === 'string'
      ? parseBytes(storageLimit)
      : storageLimit;

    const plan = await createPlan({
      name,
      fileLimit: parseInt(fileLimit),
      storageLimit: storageLimitBytes,
    });

    res.status(201).json({
      message: 'Plan created successfully',
      plan,
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

export const getAllPlansController = async (req: Request, res: Response) => {
  try {
    const plans = await getAllPlans();

    // Format storage limits for display
    const formattedPlans = plans.map(plan => ({
      ...plan,
      storageLimitFormatted: formatBytes(plan.storageLimit),
    }));

    res.status(200).json({
      message: 'Plans retrieved successfully',
      plans: formattedPlans,
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

export const getPlanController = async (req: Request, res: Response) => {
  try {
    const planId = parseInt(req.params.planId!);

    if (isNaN(planId)) {
      return res.status(400).json({ message: 'Invalid plan ID' });
    }

    const plan = await getPlanById(planId);

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    res.status(200).json({
      message: 'Plan retrieved successfully',
      plan: {
        ...plan,
        storageLimitFormatted: formatBytes(plan.storageLimit),
      },
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

export const updatePlanController = async (req: Request, res: Response) => {
  try {
    const planId = parseInt(req.params.planId!);
    const updates = req.body;

    if (isNaN(planId)) {
      return res.status(400).json({ message: 'Invalid plan ID' });
    }

    // Parse storage limit if it's a string with units
    if (updates.storageLimit && typeof updates.storageLimit === 'string') {
      updates.storageLimit = parseBytes(updates.storageLimit);
    }

    const plan = await updatePlan(planId, updates);

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    res.status(200).json({
      message: 'Plan updated successfully',
      plan: {
        ...plan,
        storageLimitFormatted: formatBytes(plan.storageLimit),
      },
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

export const deletePlanController = async (req: Request, res: Response) => {
  try {
    const planId = parseInt(req.params.planId!);

    if (isNaN(planId)) {
      return res.status(400).json({ message: 'Invalid plan ID' });
    }

    const plan = await getPlanById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    await deletePlan(planId);

    res.status(200).json({
      message: 'Plan deleted successfully',
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

// User plan management
export const assignPlanController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ message: 'Plan ID is required' });
    }

    const user = await assignPlanToUser(userId, parseInt(planId!));

    res.status(200).json({
      message: 'Plan assigned successfully',
      user: {
        id: user?.id,
        email: user?.email,
        planId: user?.planId,
        storageUsed: user?.storageUsed,
        storageLeft: user?.storageLeft,
      },
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

// Storage management endpoints
export const getUserStorageController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const storageInfo = await getUserStorageInfo(userId);

    if (!storageInfo) {
      return res.status(404).json({ message: 'User storage information not found' });
    }

    res.status(200).json({
      message: 'Storage information retrieved successfully',
      storage: {
        ...storageInfo,
        usedFormatted: formatBytes(storageInfo.used),
        leftFormatted: formatBytes(storageInfo.left),
        limitFormatted: formatBytes(storageInfo.limit),
      },
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

export const checkStorageLimitController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { bytesToAdd = 0 } = req.body;

    const withinLimit = await checkUserStorageLimit(userId, bytesToAdd);

    res.status(200).json({
      message: 'Storage limit check completed',
      withinLimit,
      bytesToAdd,
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

export const checkFileLimitController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { currentFileCount = 1 } = req.body;

    const withinLimit = await checkUserFileLimit(userId, currentFileCount);

    res.status(200).json({
      message: 'File limit check completed',
      withinLimit,
      currentFileCount,
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

// Admin endpoint to update user storage (for file uploads/deletions)
export const updateUserStorageController = async (req: Request, res: Response) => {
  try {
    const { userId, bytesToAdd } = req.body;

    if (!userId || bytesToAdd === undefined) {
      return res.status(400).json({
        message: 'User ID and bytesToAdd are required'
      });
    }

    await updateUserStorage(parseInt(userId), parseInt(bytesToAdd));

    res.status(200).json({
      message: 'User storage updated successfully',
    });
    return;
  } catch (error) {
    console.error(error);

    if (error instanceof Error && error.message.includes('Storage limit exceeded')) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Internal server error' });
    return;
  }
};

// Helper function to parse bytes (same as in service)
const parseBytes = (sizeStr: string): number => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const size = parseFloat(sizeStr);
  const unit = sizeStr.replace(/[\d.]/g, '').trim();

  const index = sizes.indexOf(unit);
  if (index === -1) return size;

  return size * Math.pow(1024, index);
};
