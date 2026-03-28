import fp from 'fastify-plugin';
import Redis from 'ioredis';
import { config } from '../config/index.js';

const redisPlugin = fp(async (fastify) => {
  const redis = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  await redis.connect();

  fastify.decorate('redis', redis);

  fastify.addHook('onClose', async () => {
    await redis.quit();
  });
});

export { redisPlugin };
