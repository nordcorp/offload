import type { FastifyInstance } from 'fastify';
import { createProjectSchema, updateProjectSchema, reorderSchema } from '@offload/shared';
import { authenticate } from '../middleware/authenticate.js';
import { ProjectService } from '../services/project.service.js';

export default async function projectRoutes(fastify: FastifyInstance) {
  const service = new ProjectService(fastify.prisma);
  fastify.addHook('preHandler', authenticate);

  fastify.get('/api/projects', async (request) => service.list(request.userId));

  fastify.post('/api/projects', async (request, reply) => {
    const input = createProjectSchema.parse(request.body);
    return reply.status(201).send(await service.create(request.userId, input));
  });

  fastify.patch('/api/projects/reorder', async (request, reply) => {
    const input = reorderSchema.parse(request.body);
    await service.reorder(request.userId, input);
    return reply.status(204).send();
  });

  fastify.patch('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateProjectSchema.parse(request.body);
    return reply.status(200).send(await service.update(request.userId, id, input));
  });

  fastify.delete('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.delete(request.userId, id);
    return reply.status(204).send();
  });
}
