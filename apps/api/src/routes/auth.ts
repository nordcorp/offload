import type { FastifyInstance } from 'fastify';
import { registerSchema, loginSchema } from '@offload/shared';
import { authenticate } from '../middleware/authenticate.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60,
};

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/api/auth/register', async (request, reply) => {
    const input = registerSchema.parse(request.body);
    const { user, accessToken, refreshToken } = await fastify.authService.register(input);
    reply.setCookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    return reply.status(201).send({ accessToken, user });
  });

  fastify.post('/api/auth/login', async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const { user, accessToken, refreshToken } = await fastify.authService.login(input);
    reply.setCookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    return reply.status(200).send({ accessToken, user });
  });

  fastify.post('/api/auth/refresh', async (request, reply) => {
    const token = request.cookies.refreshToken;
    if (!token) return reply.status(401).send({ error: 'No refresh token', code: 'UNAUTHORIZED' });
    const { user, accessToken, refreshToken } = await fastify.authService.refresh(token);
    reply.setCookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    return reply.status(200).send({ accessToken, user });
  });

  fastify.post('/api/auth/logout', { preHandler: [authenticate] }, async (request, reply) => {
    const token = request.cookies.refreshToken;
    if (token) await fastify.authService.logout(token);
    reply.clearCookie('refreshToken', { path: '/' });
    return reply.status(204).send();
  });
}
