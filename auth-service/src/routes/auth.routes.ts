import { Router } from 'express';
import { signup, login, verifyToken } from '../controllers/auth.controller';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/verify', verifyToken);

export default router;

