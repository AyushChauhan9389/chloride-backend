import express, { type Request, type Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
import authRoutes from './routes/auth.routes';
import { authenticate } from './middleware/auth.middleware';

app.use('/api/auth', authRoutes);

app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'Hello from Express + TypeScript!' });
});

app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/protected', authenticate, (req: Request, res: Response) => {
    res.json({ message: 'This is a protected route', user: (req as any).user });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;