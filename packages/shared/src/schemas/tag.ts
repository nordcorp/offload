import { z } from 'zod';

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const updateTagSchema = createTagSchema.partial();

export const tagAssignSchema = z.object({
  tagId: z.string().uuid(),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
