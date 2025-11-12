import { Router } from 'express';
import { getFile, getUserFiles, listAllFiles } from '../controllers/file.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/my-files', authenticate, getUserFiles);
router.get('/all', authenticate, listAllFiles);
router.get('/:fileId', authenticate, getFile);

export default router;

