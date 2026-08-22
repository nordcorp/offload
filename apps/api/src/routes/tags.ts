import type { FastifyInstance } from 'fastify';
import { createTagSchema, updateTagSchema, tagAssignSchema } from '@offload/shared';
import { authenticate } from '../middleware/authenticate.js';
import { TagService } from '../services/tag.service.js';

export default async function tagRoutes(fastify: FastifyInstance) {
  const service = new TagService(fastify.prisma);
  fastify.addHook('preHandler', authenticate);

  fastify.get('/api/tags', async (request) => service.list(request.userId));
  fastify.post('/api/tags', async (request, reply) => {
    const input = createTagSchema.parse(request.body);
    return reply.status(201).send(await service.create(request.userId, input));
  });
  fastify.patch('/api/tags/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateTagSchema.parse(request.body);
    return reply.status(200).send(await service.update(request.userId, id, input));
  });
  fastify.delete('/api/tags/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.delete(request.userId, id);
    return reply.status(204).send();
  });
  fastify.post('/api/tasks/:id/tags', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { tagId } = tagAssignSchema.parse(request.body);
    await service.assignToTask(request.userId, id, tagId);
    return reply.status(204).send();
  });
  fastify.delete('/api/tasks/:id/tags/:tagId', async (request, reply) => {
    const { id, tagId } = request.params as { id: string; tagId: string };
    await service.unassignFromTask(request.userId, id, tagId);
    return reply.status(204).send();
  });
}
