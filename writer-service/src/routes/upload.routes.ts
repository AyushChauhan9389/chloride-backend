import { Router } from 'express';
import { uploadSingleFile, uploadMultipleFiles } from '../controllers/upload.controller';
import { uploadSingle, uploadMultiple } from '../middleware/upload.middleware';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/single', authenticate, uploadSingle('file'), uploadSingleFile);
router.post('/multiple', authenticate, uploadMultiple('files', 10), uploadMultipleFiles);

export default router;

