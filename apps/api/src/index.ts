import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import prismaPlugin from './plugins/prisma.js';
import errorHandler from './plugins/error-handler.js';
import { AuthService } from './services/auth.service.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import tagRoutes from './routes/tags.js';

declare module 'fastify' {
  interface FastifyInstance {
    authService: AuthService;
  }
}

export async function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });
  await app.register(cookie, { secret: process.env.COOKIE_SECRET || 'dev-secret' });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  await app.register(prismaPlugin);
  await app.register(errorHandler);

  app.get('/health', async () => ({ status: 'ok' }));

  const jwtSecret = new TextEncoder().encode(
    process.env.JWT_SECRET || 'dev-secret-at-least-32-characters-long!!'
  );
  app.decorate('authService', new AuthService(app.prisma, jwtSecret));

  await app.register(authRoutes);
  await app.register(projectRoutes);
  await app.register(taskRoutes);
  await app.register(tagRoutes);

  return app;
}

// Start server if run directly
if (process.env.START_SERVER === 'true') {
  const app = await buildApp();
  await app.listen({ port: Number(process.env.PORT) || 3001, host: '0.0.0.0' });
}
