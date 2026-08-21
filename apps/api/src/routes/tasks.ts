import type { FastifyInstance } from 'fastify';
import { createTaskSchema, updateTaskSchema, reorderSchema } from '@offload/shared';
import { authenticate } from '../middleware/authenticate.js';
import { TaskService } from '../services/task.service.js';

export default async function taskRoutes(fastify: FastifyInstance) {
  const service = new TaskService(fastify.prisma);
  fastify.addHook('preHandler', authenticate);

  fastify.get('/api/projects/:id/tasks', async (request) => {
    const { id } = request.params as { id: string };
    return service.listByProject(request.userId, id);
  });

  fastify.get('/api/tasks/inbox', async (request) => service.listInbox(request.userId));

  fastify.get('/api/tasks/matrix', async (request) => {
    const { projectId } = request.query as { projectId?: string };
    return service.matrix(request.userId, projectId);
  });

  fastify.post('/api/tasks', async (request, reply) => {
    const input = createTaskSchema.parse(request.body);
    return reply.status(201).send(await service.create(request.userId, input));
  });

  fastify.patch('/api/tasks/reorder', async (request, reply) => {
    const input = reorderSchema.parse(request.body);
    await service.reorder(request.userId, input);
    return reply.status(204).send();
  });

  fastify.patch('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateTaskSchema.parse(request.body);
    return reply.status(200).send(await service.update(request.userId, id, input));
  });

  fastify.delete('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.delete(request.userId, id);
    return reply.status(204).send();
  });
}
