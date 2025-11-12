import { Request, Response } from 'express';
import { getFileById, getFilesByUserId, getAllFiles } from '../services/file.service';

export const getFile = async (req: Request, res: Response) => {
  const fileId = parseInt(req.params.fileId);

  try {
    const file = await getFileById(fileId);

    if (!file) {
      res.status(404).json({ message: 'File not found' });
      return;
    }

    // Check if user has access to this file
    const userId = (req as any).user?.id;
    if (file.userId !== userId && (req as any).user?.role !== 'admin') {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    res.status(200).json(file);
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUserFiles = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;

  try {
    const files = await getFilesByUserId(userId);
    res.status(200).json(files);
  } catch (error) {
    console.error('Get user files error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const listAllFiles = async (req: Request, res: Response) => {
  // Only admins can list all files
  if ((req as any).user?.role !== 'admin') {
    res.status(403).json({ message: 'Access denied' });
    return;
  }

  try {
    const files = await getAllFiles();
    res.status(200).json(files);
  } catch (error) {
    console.error('List all files error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

