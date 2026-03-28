import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { config } from '../config/index.js';

const authPlugin = fp(async (fastify) => {
  await fastify.register(jwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: config.JWT_ACCESS_EXPIRES },
  });

  // Decorator: verifies JWT and attaches user to request
  fastify.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
    }
  });

  // Decorator: optionally authenticate (doesn't fail if no token)
  fastify.decorate('optionalAuth', async (request) => {
    try {
      await request.jwtVerify();
    } catch (_) {
      // No-op — route handles unauthenticated case
    }
  });
});

export { authPlugin };
