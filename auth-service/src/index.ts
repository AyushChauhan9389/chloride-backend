import express, { type Request, type Response } from 'express';
import cors, { type CorsOptions } from "cors";
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import { initializeDefaultRoles } from './services/role.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8082;

// Middleware
const allowedOrigins = ["http://localhost:3000", "*"];

const corsOptions: CorsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    service: 'auth-service',
    status: 'OK', 
    timestamp: new Date().toISOString() 
  });
  return;
});

// Initialize default roles on startup
const initializeService = async () => {
  try {
    console.log('Initializing auth service...');
    await initializeDefaultRoles();
    console.log('Auth service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize auth service:', error);
  }
};

// Start server
app.listen(PORT, async () => {
  console.log(`Auth Service is running on http://localhost:${PORT}`);
  await initializeService();
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

