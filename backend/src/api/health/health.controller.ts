import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import redis from '../../config/redis';
import logger from '../../utils/logger';

export const getHealth = async (req: Request, res: Response): Promise<void> => {
  const status = {
    service: 'OK',
    database: 'UNKNOWN',
    redis: 'UNKNOWN',
    timestamp: new Date().toISOString(),
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    status.database = 'OK';
  } catch (error) {
    logger.error('Database health check failed');
    status.database = 'ERROR';
  }

  try {
    const redisPing = await redis.ping();
    if (redisPing === 'PONG') {
      status.redis = 'OK';
    }
  } catch (error) {
    logger.error('Redis health check failed');
    status.redis = 'ERROR';
  }

  const isHealthy = status.database === 'OK' && status.redis === 'OK';

  res.status(isHealthy ? 200 : 503).json(status);
};