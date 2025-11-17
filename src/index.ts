import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
import authRoutes from './routes/auth.routes';
import planRoutes from './routes/plan.routes';
import roleRoutes from './routes/role.routes';
import uploadRoutes from './routes/upload.routes';
import urlRoutes from './routes/url.routes';
import { authenticate } from './middleware/auth.middleware';

app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/', urlRoutes);

app.get('/', (req: Request, res: Response) => {
    res.status(200).json({ message: 'HO HO HO' });
    return;
});

app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
    return;
});

app.get('/api/protected', authenticate, (req: Request, res: Response) => {
    const user = (req as any).user;
    res.status(200).json({
        message: 'This is a protected route',
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
            plan: user.plan,
            permissions: user.permissions
        }
    });
    return;
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;