import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './api/auth/auth.routes';
import aiRoutes from './api/ai/ai.routes';
import healthRoutes from './api/health/health.routes';
import clientDashboardRoutes from './api/dashboard/client/client.routes';
import ocrRoutes from './api/ocr/ocr.routes';
import adminRoutes from './api/admin';
import { uploadthingHandler } from './api/uploads/uploadthing.routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: process.env.MAX_FILE_SIZE || '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/test', (req, res) => res.json({ message: 'API is working' }));
app.use('/api/v1/admin', adminRoutes);         // Admin Management
app.use('/api/v1/uploadthing', uploadthingHandler);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/dashboard', clientDashboardRoutes); // Connecting Client Dashboard
app.use('/api/v1/dashboard/ocr', ocrRoutes);         // Clinical Extractor Agent

// Error Handling 
app.use(errorHandler);

export default app;
