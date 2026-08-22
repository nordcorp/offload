import { z } from 'zod';

export * from './auth';
export * from './project';
export * from './task';
export * from './tag';

export const reorderSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    sortOrder: z.number().int().min(0),
  })).min(1),
});

export type ReorderInput = z.infer<typeof reorderSchema>;
