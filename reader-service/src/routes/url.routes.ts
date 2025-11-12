import { Router } from 'express';
import { redirect } from '../controllers/url.controller';

const router = Router();

router.get('/:shortCode', redirect);

export default router;

