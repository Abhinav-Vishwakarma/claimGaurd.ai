import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './api/auth/auth.routes';
import aiRoutes from './api/ai/ai.routes';
import healthRoutes from './api/health/health.routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: process.env.MAX_FILE_SIZE || '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/health', healthRoutes);

// Error Handling 
app.use(errorHandler);

export default app;
