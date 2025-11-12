import { Request, Response } from 'express';
import { uploadSingle, uploadMultiple } from '../services/upload.service';

export const uploadSingleFile = async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }

  try {
    const userId = (req as any).user.id;
    const result = await uploadSingle(req.file, userId);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ message: error.message || 'Upload failed' });
  }
};

export const uploadMultipleFiles = async (req: Request, res: Response) => {
  if (!req.files || !Array.isArray(req.files)) {
    res.status(400).json({ message: 'No files uploaded' });
    return;
  }

  try {
    const userId = (req as any).user.id;
    const results = await uploadMultiple(req.files, userId);
    res.status(200).json(results);
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ message: error.message || 'Upload failed' });
  }
};

