'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Project, CreateProjectInput } from '@offload/shared';
import { apiClient } from '@/lib/api-client';

export interface UseProjectsReturn {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createProject: (input: CreateProjectInput) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient<Project[]>('/api/projects');
      setProjects(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch projects';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = useCallback(async (input: CreateProjectInput): Promise<Project> => {
    setError(null);
    const newProject = await apiClient<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setProjects((prev) => [...prev, newProject]);
    return newProject;
  }, []);

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    setError(null);
    await apiClient<void>(`/api/projects/${id}`, {
      method: 'DELETE',
    });
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return {
    projects,
    isLoading,
    error,
    refetch: fetchProjects,
    createProject,
    deleteProject,
  };
}
