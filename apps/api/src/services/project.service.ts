import type { PrismaClient } from '@prisma/client';
import type { CreateProjectInput, UpdateProjectInput, ReorderInput } from '@offload/shared';

export class ProjectService {
  constructor(private prisma: PrismaClient) {}

  async list(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { tasks: true } } },
    });
  }

  async create(userId: string, input: CreateProjectInput) {
    const maxOrder = await this.prisma.project.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    });
    return this.prisma.project.create({
      data: { ...input, userId, sortOrder: (maxOrder._max.sortOrder ?? -1) + 1 },
    });
  }

  async update(userId: string, id: string, input: UpdateProjectInput) {
    return this.prisma.project.update({ where: { id, userId }, data: input });
  }

  async delete(userId: string, id: string) {
    await this.prisma.project.delete({ where: { id, userId } });
  }

  async reorder(userId: string, input: ReorderInput) {
    await this.prisma.$transaction(
      input.items.map((item) =>
        this.prisma.project.update({
          where: { id: item.id, userId },
          data: { sortOrder: item.sortOrder },
        })
      )
    );
  }
}
