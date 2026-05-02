import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import logger from '../../utils/logger';

export const getHealth = async (req: Request, res: Response): Promise<void> => {
  const status = {
    service: 'OK',
    database: 'UNKNOWN',
    timestamp: new Date().toISOString(),
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    status.database = 'OK';
  } catch (error) {
    logger.error('Database health check failed');
    status.database = 'ERROR';
  }

  const isHealthy = status.database === 'OK';

  res.status(isHealthy ? 200 : 503).json(status);
};