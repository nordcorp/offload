'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Task, CreateTaskInput, UpdateTaskInput } from '@offload/shared';
import { apiClient } from '@/lib/api-client';

export interface UseTasksReturn {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addTask: (input: CreateTaskInput | string) => Promise<Task>;
  updateTask: (id: string, input: UpdateTaskInput) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (id: string, completed?: boolean) => Promise<Task>;
}

export function useTasks(projectId?: string | null): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to the current tasks for rollback in optimistic updates
  const tasksRef = useRef<Task[]>(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const endpoint = projectId ? `/api/projects/${projectId}/tasks` : '/api/tasks/inbox';

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient<Task[]>(endpoint);
      setTasks(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch tasks';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = useCallback(
    async (input: CreateTaskInput | string): Promise<Task> => {
      setError(null);
      const taskInput: CreateTaskInput =
        typeof input === 'string' ? { title: input } : input;

      const payload: CreateTaskInput = {
        ...taskInput,
        projectId:
          taskInput.projectId !== undefined
            ? taskInput.projectId
            : projectId
              ? projectId
              : undefined,
      };

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const optimisticTask: Task = {
        id: tempId,
        title: payload.title,
        description: payload.description ?? null,
        completed: false,
        completedAt: null,
        priority: (payload.priority as 1 | 2 | 3 | 4) ?? 4,
        urgent: payload.urgent ?? false,
        important: payload.important ?? false,
        projectId: payload.projectId ?? null,
        userId: '',
        sortOrder: tasksRef.current.length,
        createdAt: new Date().toISOString(),
        tags: [],
      };

      // Optimistically append task
      setTasks((prev) => [...prev, optimisticTask]);

      try {
        const createdTask = await apiClient<Task>('/api/tasks', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        // Replace optimistic task with server response
        setTasks((prev) =>
          prev.map((t) => (t.id === tempId ? createdTask : t))
        );
        return createdTask;
      } catch (err: unknown) {
        // Rollback optimistic task
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
        const message = err instanceof Error ? err.message : 'Failed to create task';
        setError(message);
        throw err;
      }
    },
    [projectId]
  );

  const updateTask = useCallback(
    async (id: string, input: UpdateTaskInput): Promise<Task> => {
      setError(null);
      const previousTasks = tasksRef.current;

      // Optimistically update
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          return {
            ...t,
            ...input,
            completed:
              input.completed !== undefined ? input.completed : t.completed,
            completedAt:
              input.completed === true
                ? t.completedAt ?? new Date().toISOString()
                : input.completed === false
                  ? null
                  : t.completedAt,
            projectId:
              input.projectId !== undefined ? input.projectId : t.projectId,
            priority:
              input.priority !== undefined
                ? (input.priority as 1 | 2 | 3 | 4)
                : t.priority,
          };
        })
      );

      try {
        const updatedTask = await apiClient<Task>(`/api/tasks/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        });

        setTasks((prev) =>
          prev.map((t) => (t.id === id ? updatedTask : t))
        );
        return updatedTask;
      } catch (err: unknown) {
        // Rollback on failure
        setTasks(previousTasks);
        const message = err instanceof Error ? err.message : 'Failed to update task';
        setError(message);
        throw err;
      }
    },
    []
  );

  const deleteTask = useCallback(
    async (id: string): Promise<void> => {
      setError(null);
      const previousTasks = tasksRef.current;

      // Optimistically remove
      setTasks((prev) => prev.filter((t) => t.id !== id));

      try {
        await apiClient<void>(`/api/tasks/${id}`, {
          method: 'DELETE',
        });
      } catch (err: unknown) {
        // Rollback on failure
        setTasks(previousTasks);
        const message = err instanceof Error ? err.message : 'Failed to delete task';
        setError(message);
        throw err;
      }
    },
    []
  );

  const toggleTask = useCallback(
    async (id: string, forceCompleted?: boolean): Promise<Task> => {
      const task = tasksRef.current.find((t) => t.id === id);
      const nextCompleted =
        forceCompleted !== undefined ? forceCompleted : !task?.completed;
      return updateTask(id, { completed: nextCompleted });
    },
    [updateTask]
  );

  return {
    tasks,
    isLoading,
    error,
    refetch: fetchTasks,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
  };
}
