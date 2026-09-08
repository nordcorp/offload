import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaPg } from '@prisma/adapter-pg';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const connectionString =
    process.env.DATABASE_URL || 'postgresql://offload:offload@localhost:5432/offload';
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();
  fastify.decorate('prisma', prisma);
  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});
