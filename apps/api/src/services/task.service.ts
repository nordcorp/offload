import type { PrismaClient, Task as DbTask, Tag as DbTag } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type { CreateTaskInput, UpdateTaskInput, ReorderInput, Task as SharedTask } from '@offload/shared';

class HttpError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

const taskInclude = { tags: { include: { tag: true } } } as const;

type DbTaskWithTags = DbTask & {
  tags?: Array<{ tag: DbTag }>;
};

function formatTask(task: DbTaskWithTags): SharedTask {
  const { tags, createdAt, completedAt, priority, ...rest } = task;
  return {
    ...rest,
    createdAt: createdAt.toISOString(),
    completedAt: completedAt ? completedAt.toISOString() : null,
    priority: priority as 1 | 2 | 3 | 4,
    tags: tags?.map((tt) => tt.tag) ?? [],
  };
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
    if (input.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: input.projectId, userId },
      });
      if (!project) {
        throw new HttpError('Project not found', 404);
      }
    }
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
    const data: Prisma.TaskUncheckedUpdateInput = { ...input };
    if (input.completed === true) data.completedAt = new Date();
    else if (input.completed === false) data.completedAt = null;

    if (input.projectId !== undefined) {
      const existing = await this.prisma.task.findUnique({
        where: { id, userId },
        select: { projectId: true },
      });
      if (existing && existing.projectId !== input.projectId) {
        if (input.projectId !== null) {
          const project = await this.prisma.project.findFirst({
            where: { id: input.projectId, userId },
          });
          if (!project) {
            throw new HttpError('Project not found', 404);
          }
        }
        const maxOrder = await this.prisma.task.aggregate({
          where: { userId, projectId: input.projectId },
          _max: { sortOrder: true },
        });
        data.sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;
      }
    }

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
