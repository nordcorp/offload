import type { PrismaClient } from '@prisma/client';
import type { CreateTagInput, UpdateTagInput } from '@offload/shared';

export class TagService {
  constructor(private prisma: PrismaClient) {}

  async list(userId: string) {
    return this.prisma.tag.findMany({ where: { userId }, orderBy: { name: 'asc' } });
  }

  async create(userId: string, input: CreateTagInput) {
    return this.prisma.tag.create({ data: { ...input, userId } });
  }

  async update(userId: string, id: string, input: UpdateTagInput) {
    return this.prisma.tag.update({ where: { id, userId }, data: input });
  }

  async delete(userId: string, id: string) {
    await this.prisma.tag.delete({ where: { id, userId } });
  }

  async assignToTask(userId: string, taskId: string, tagId: string) {
    await this.prisma.task.findUniqueOrThrow({ where: { id: taskId, userId } });
    await this.prisma.tag.findUniqueOrThrow({ where: { id: tagId, userId } });
    await this.prisma.taskTag.create({ data: { taskId, tagId } });
  }

  async unassignFromTask(userId: string, taskId: string, tagId: string) {
    await this.prisma.task.findUniqueOrThrow({ where: { id: taskId, userId } });
    await this.prisma.taskTag.delete({ where: { taskId_tagId: { taskId, tagId } } });
  }
}
