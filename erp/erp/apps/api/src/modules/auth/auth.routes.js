import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';

export default async function authRoutes(fastify) {
  const { prisma, redis } = fastify;

  // POST /api/v1/auth/login
  fastify.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email:    { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body;

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user || !user.isActive) {
      return reply.status(401).send({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    // Generate tokens
    const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
    const accessToken  = fastify.jwt.sign(payload);
    const refreshToken = jwt.sign(payload, config.JWT_REFRESH_SECRET, { expiresIn: config.JWT_REFRESH_EXPIRES });

    // Store refresh token in DB
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Update last login
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    // Log activity
    await prisma.activityLog.create({
      data: { userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id, ipAddress: request.ip },
    });

    return reply.send({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      },
    });
  });

  // POST /api/v1/auth/refresh
  fastify.post('/refresh', {
    schema: {
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    const { refreshToken } = request.body;

    let payload;
    try {
      payload = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);
    } catch {
      return reply.status(401).send({ success: false, error: { code: 'INVALID_TOKEN', message: 'Refresh token is invalid or expired' } });
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      return reply.status(401).send({ success: false, error: { code: 'INVALID_TOKEN', message: 'Refresh token not found or expired' } });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || !user.isActive) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'User account is inactive' } });
    }

    // Rotate refresh token
    await prisma.refreshToken.delete({ where: { token: refreshToken } });
    const newPayload = { id: user.id, email: user.email, role: user.role, name: user.name };
    const newAccessToken  = fastify.jwt.sign(newPayload);
    const newRefreshToken = jwt.sign(newPayload, config.JWT_REFRESH_SECRET, { expiresIn: config.JWT_REFRESH_EXPIRES });

    await prisma.refreshToken.create({
      data: { token: newRefreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    return reply.send({ success: true, data: { accessToken: newAccessToken, refreshToken: newRefreshToken } });
  });

  // POST /api/v1/auth/logout
  fastify.post('/logout', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { refreshToken } = request.body || {};

    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }

    // Optionally blacklist access token in Redis until expiry
    const token = request.headers.authorization?.split(' ')[1];
    if (token) {
      await redis.setex(`blacklist:${token}`, 60 * 15, '1'); // 15 min TTL
    }

    return reply.send({ success: true, message: 'Logged out successfully' });
  });

  // GET /api/v1/auth/me
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      include: { employee: { select: { id: true, employeeCode: true, position: true, department: { select: { name: true } } } } },
    });

    if (!user) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    return reply.send({
      success: true,
      data: {
        id: user.id, email: user.email, name: user.name, role: user.role,
        lastLoginAt: user.lastLoginAt, employee: user.employee,
      },
    });
  });

  // PATCH /api/v1/auth/change-password
  fastify.patch('/change-password', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body || {};

    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!valid) {
      return reply.status(400).send({ success: false, error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' } });
    }

    const hash = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });

    // Invalidate all refresh tokens
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    return reply.send({ success: true, message: 'Password updated. Please log in again.' });
  });
}
