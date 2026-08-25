'use client';

import {
  createContext,
  createElement,
  useState,
  useEffect,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
} from 'react';
import {
  transitionActiveTaskCounts,
  type Project,
  type CreateProjectInput,
  type TaskCountState,
} from '@offload/shared';
import { apiClient } from '@/lib/api-client';

export interface UseProjectsReturn {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createProject: (input: CreateProjectInput) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  reorderProjects: (projects: Project[]) => Promise<void>;
  transitionActiveTaskCount: (
    from: TaskCountState | null,
    to: TaskCountState | null
  ) => void;
}

const ProjectsContext = createContext<UseProjectsReturn | null>(null);

function useProjectsState(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const projectsRef = useRef<Project[]>(projects);
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

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

  const reorderProjects = useCallback(
    async (newProjects: Project[]): Promise<void> => {
      setError(null);
      const previousProjects = projectsRef.current;

      const items = newProjects.map((p, index) => ({
        id: p.id,
        sortOrder: index,
      }));

      // Optimistically update
      setProjects(newProjects.map((p, index) => ({ ...p, sortOrder: index })));

      try {
        await apiClient<void>('/api/projects/reorder', {
          method: 'PATCH',
          body: JSON.stringify({ items }),
        });
      } catch (err: unknown) {
        setProjects(previousProjects);
        const message = err instanceof Error ? err.message : 'Failed to reorder projects';
        setError(message);
        throw err;
      }
    },
    []
  );

  const transitionActiveTaskCount = useCallback(
    (from: TaskCountState | null, to: TaskCountState | null): void => {
      setProjects((prev) => transitionActiveTaskCounts(prev, from, to));
    },
    []
  );

  return {
    projects,
    isLoading,
    error,
    refetch: fetchProjects,
    createProject,
    deleteProject,
    reorderProjects,
    transitionActiveTaskCount,
  };
}

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const value = useProjectsState();

  return createElement(ProjectsContext.Provider, { value }, children);
}

export function useProjects(): UseProjectsReturn {
  const context = useContext(ProjectsContext);

  if (!context) {
    throw new Error('useProjects must be used within a ProjectsProvider');
  }

  return context;
}
