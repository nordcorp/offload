import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Tag } from '@offload/shared';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function addTagToTaskTags(tags: Tag[] | undefined, tag: Tag): Tag[] {
  const current = tags || [];
  if (current.some((t) => t.id === tag.id)) return current;
  return [...current, tag];
}

export function removeTagFromTaskTags(tags: Tag[] | undefined, tagId: string): Tag[] {
  return (tags || []).filter((t) => t.id !== tagId);
}
