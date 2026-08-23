import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createTagSchema, updateTagSchema, tagAssignSchema } from '@offload/shared';
import { authenticate } from '../middleware/authenticate.js';
import { TagService } from '../services/tag.service.js';

const idParamSchema = z.object({ id: z.string().uuid() });
const taskTagParamSchema = z.object({ id: z.string().uuid(), tagId: z.string().uuid() });

export default async function tagRoutes(fastify: FastifyInstance) {
  const service = new TagService(fastify.prisma);
  fastify.addHook('preHandler', authenticate);

  fastify.get('/api/tags', async (request) => service.list(request.userId));
  fastify.post('/api/tags', async (request, reply) => {
    const input = createTagSchema.parse(request.body);
    return reply.status(201).send(await service.create(request.userId, input));
  });
  fastify.patch('/api/tags/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const input = updateTagSchema.parse(request.body);
    return reply.status(200).send(await service.update(request.userId, id, input));
  });
  fastify.delete('/api/tags/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await service.delete(request.userId, id);
    return reply.status(204).send();
  });
  fastify.post('/api/tasks/:id/tags', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const { tagId } = tagAssignSchema.parse(request.body);
    await service.assignToTask(request.userId, id, tagId);
    return reply.status(204).send();
  });
  fastify.delete('/api/tasks/:id/tags/:tagId', async (request, reply) => {
    const { id, tagId } = taskTagParamSchema.parse(request.params);
    await service.unassignFromTask(request.userId, id, tagId);
    return reply.status(204).send();
  });
}
