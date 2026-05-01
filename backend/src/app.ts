import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './api/auth/auth.routes';
import healthRoutes from './api/health/health.routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/auth', authRoutes);
app.use('/health', healthRoutes);

// Error Handling (Must be last)
app.use(errorHandler);

export default app;
