import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './api/auth/auth.routes';
import aiRoutes from './api/ai/ai.routes';
import healthRoutes from './api/health/health.routes';
import clientDashboardRoutes from './api/dashboard/client/client.routes';
import ocrRoutes from './api/ocr/ocr.routes';
import adminRoutes from './api/admin';
import claimsRoutes from './api/claims/claims.routes';
import { uploadthingHandler } from './api/uploads/uploadthing.routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// Middlewares
app.use(helmet());

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', apiLimiter);

app.use(cors({
  origin: process.env.APP_URL || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));
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
app.use('/api/v1/claims', claimsRoutes);             // Claim Filing + Admin Review

// Error Handling 
app.use(errorHandler);

export default app;
