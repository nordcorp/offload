import type { PrismaClient } from '@prisma/client';
import type { CreateTaskInput, UpdateTaskInput, ReorderInput } from '@offload/shared';

const taskInclude = { tags: { include: { tag: true } } } as const;

function formatTask(task: any) {
  return { ...task, tags: task.tags?.map((tt: any) => tt.tag) ?? [] };
}

export class TaskService {
  constructor(private prisma: PrismaClient) {}

  async listByProject(userId: string, projectId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { userId, projectId },
      orderBy: { sortOrder: 'asc' },
      include: taskInclude,
    });
    return tasks.map(formatTask);
  }

  async listInbox(userId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { userId, projectId: null },
      orderBy: { sortOrder: 'asc' },
      include: taskInclude,
    });
    return tasks.map(formatTask);
  }

  async matrix(userId: string, projectId?: string) {
    const where = { userId, completed: false, ...(projectId ? { projectId } : {}) };
    const tasks = await this.prisma.task.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: taskInclude,
    });
    const formatted = tasks.map(formatTask);
    return {
      urgent_important: formatted.filter((t) => t.urgent && t.important),
      not_urgent_important: formatted.filter((t) => !t.urgent && t.important),
      urgent_not_important: formatted.filter((t) => t.urgent && !t.important),
      not_urgent_not_important: formatted.filter((t) => !t.urgent && !t.important),
    };
  }

  async create(userId: string, input: CreateTaskInput) {
    const maxOrder = await this.prisma.task.aggregate({
      where: { userId, projectId: input.projectId ?? null },
      _max: { sortOrder: true },
    });
    const task = await this.prisma.task.create({
      data: {
        title: input.title,
        description: input.description,
        projectId: input.projectId,
        priority: input.priority ?? 4,
        urgent: input.urgent ?? false,
        important: input.important ?? false,
        userId,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
      include: taskInclude,
    });
    return formatTask(task);
  }

  async update(userId: string, id: string, input: UpdateTaskInput) {
    const data: any = { ...input };
    if (input.completed === true) data.completedAt = new Date();
    else if (input.completed === false) data.completedAt = null;
    const task = await this.prisma.task.update({
      where: { id, userId },
      data,
      include: taskInclude,
    });
    return formatTask(task);
  }

  async delete(userId: string, id: string) {
    await this.prisma.task.delete({ where: { id, userId } });
  }

  async reorder(userId: string, input: ReorderInput) {
    await this.prisma.$transaction(
      input.items.map((item) =>
        this.prisma.task.update({
          where: { id: item.id, userId },
          data: { sortOrder: item.sortOrder },
        })
      )
    );
  }
}
