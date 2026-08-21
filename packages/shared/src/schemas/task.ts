import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  projectId: z.string().uuid().optional(),
  priority: z.number().int().min(1).max(4).optional().default(4),
  urgent: z.boolean().optional().default(false),
  important: z.boolean().optional().default(false),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  completed: z.boolean().optional(),
  priority: z.number().int().min(1).max(4).optional(),
  urgent: z.boolean().optional(),
  important: z.boolean().optional(),
  projectId: z.string().uuid().nullable().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
