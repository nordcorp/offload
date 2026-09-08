'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Tag, CreateTagInput } from '@offload/shared';
import { apiClient } from '@/lib/api-client';

export interface UseTagsReturn {
  tags: Tag[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createTag: (input: CreateTagInput) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;
}

export function useTags(): UseTagsReturn {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient<Tag[]>('/api/tags');
      setTags(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch tags';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const createTag = useCallback(async (input: CreateTagInput): Promise<Tag> => {
    setError(null);
    try {
      const newTag = await apiClient<Tag>('/api/tags', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      setTags((prev) => [...prev, newTag]);
      return newTag;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create tag';
      setError(message);
      throw err;
    }
  }, []);

  const deleteTag = useCallback(
    async (id: string): Promise<void> => {
      setError(null);
      const previousTags = tags;
      setTags((prev) => prev.filter((t) => t.id !== id));
      try {
        await apiClient<void>(`/api/tags/${id}`, {
          method: 'DELETE',
        });
      } catch (err: unknown) {
        setTags(previousTags);
        const message = err instanceof Error ? err.message : 'Failed to delete tag';
        setError(message);
        throw err;
      }
    },
    [tags]
  );

  return {
    tags,
    isLoading,
    error,
    refetch: fetchTags,
    createTag,
    deleteTag,
  };
}
