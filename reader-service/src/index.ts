import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import urlRoutes from './routes/url.routes';
import fileRoutes from './routes/file.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

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
app.use('/api/files', fileRoutes);
app.use('/', urlRoutes); // URL shortener redirects

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    service: 'reader-service',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
  return;
});

// Start server
app.listen(PORT, () => {
  console.log(`Reader Service is running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

export default app;

