import Redis from 'ioredis';
import { env } from './env';
import logger from '../utils/logger';

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true, // Connect when needed instead of immediately failing
});

redis.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

export default redis;