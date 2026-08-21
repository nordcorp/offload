import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export default fp(async (fastify: FastifyInstance) => {
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: error.flatten(),
      });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return reply.status(409).send({ error: 'Resource already exists', code: 'CONFLICT' });
      }
      if (error.code === 'P2025') {
        return reply.status(404).send({ error: 'Resource not found', code: 'NOT_FOUND' });
      }
    }
    const statusCode = (error as any).statusCode;
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      return reply.status(statusCode).send({ error: (error as any).message, code: 'CLIENT_ERROR' });
    }
    request.log.error(error);
    return reply.status(500).send({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  });
});
