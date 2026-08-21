import type { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing token', code: 'UNAUTHORIZED' });
  }
  try {
    const token = authHeader.slice(7);
    const { userId } = await request.server.authService.verifyAccessToken(token);
    request.userId = userId;
  } catch {
    return reply.status(401).send({ error: 'Invalid token', code: 'UNAUTHORIZED' });
  }
}
