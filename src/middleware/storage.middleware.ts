import { Request, Response, NextFunction } from 'express';
import { checkUserStorageLimit, checkUserFileLimit, getUserStorageInfo } from '../services/plan.service';

export interface StorageLimitCheckOptions {
  checkStorage?: boolean;
  checkFiles?: boolean;
  maxFileSize?: number; // in bytes
  requiredStorage?: number; // in bytes for the operation
  requiredFiles?: number; // number of files for the operation
}

export const checkStorageLimits = (options: StorageLimitCheckOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const {
        checkStorage = true,
        checkFiles = true,
        maxFileSize,
        requiredStorage,
        requiredFiles = 1,
      } = options;

      // Check file size if provided
      if (maxFileSize && req.body?.fileSize) {
        const fileSize = parseInt(req.body.fileSize);
        if (fileSize > maxFileSize) {
          res.status(400).json({
            message: `File size exceeds maximum allowed size`,
            maxFileSize,
            providedFileSize: fileSize,
          });
          return;
        }
      }

      // Check storage limit
      if (checkStorage) {
        const storageToAdd = requiredStorage || req.body?.fileSize || 0;
        const withinStorageLimit = await checkUserStorageLimit(userId, storageToAdd);

        if (!withinStorageLimit) {
          const storageInfo = await getUserStorageInfo(userId);
          res.status(400).json({
            message: 'Storage limit exceeded',
            currentStorage: storageInfo ? {
              used: storageInfo.used,
              left: storageInfo.left,
              limit: storageInfo.limit,
              percentageUsed: storageInfo.percentageUsed,
            } : null,
          });
          return;
        }
      }

      // Check file limit
      if (checkFiles) {
        const filesToAdd = requiredFiles;
        const withinFileLimit = await checkUserFileLimit(userId, filesToAdd);

        if (!withinFileLimit) {
          res.status(400).json({
            message: 'File limit exceeded',
            filesToAdd,
          });
          return;
        }
      }

      // All checks passed
      next();
    } catch (error) {
      console.error('Storage limit check error:', error);
      res.status(500).json({ message: 'Internal server error' });
      return;
    }
  };
};

// Specific middleware for different scenarios
export const checkFileUploadLimits = checkStorageLimits({
  checkStorage: true,
  checkFiles: true,
  maxFileSize: 100 * 1024 * 1024, // 100MB default
});

export const checkStorageOnly = checkStorageLimits({
  checkStorage: true,
  checkFiles: false,
});

export const checkFilesOnly = checkStorageLimits({
  checkStorage: false,
  checkFiles: true,
});

// Middleware to add storage info to request
export const withStorageInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      next(); // Continue without storage info if no user
      return;
    }

    const storageInfo = await getUserStorageInfo(userId);
    (req as any).storageInfo = storageInfo;

    next();
  } catch (error) {
    console.error('Error fetching storage info:', error);
    next(); // Continue even if storage info fails
    return;
  }
};
