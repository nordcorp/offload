'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  MatrixResponse,
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  QuadrantKey,
  Tag,
} from '@offload/shared';
import { apiClient } from '@/lib/api-client';
import { addTagToTaskTags, removeTagFromTaskTags } from '@/lib/utils';
import { useProjects } from '@/hooks/use-projects';

export const QUADRANT_FLAGS: Record<
  QuadrantKey,
  { urgent: boolean; important: boolean }
> = {
  urgent_important: { urgent: true, important: true },
  not_urgent_important: { urgent: false, important: true },
  urgent_not_important: { urgent: true, important: false },
  not_urgent_not_important: { urgent: false, important: false },
};

export function getQuadrantKey(urgent: boolean, important: boolean): QuadrantKey {
  if (urgent && important) return 'urgent_important';
  if (!urgent && important) return 'not_urgent_important';
  if (urgent && !important) return 'urgent_not_important';
  return 'not_urgent_not_important';
}

const EMPTY_MATRIX: MatrixResponse = {
  urgent_important: [],
  not_urgent_important: [],
  urgent_not_important: [],
  not_urgent_not_important: [],
};

export interface UseMatrixReturn {
  matrix: MatrixResponse;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  moveTaskQuadrant: (taskId: string, targetQuadrant: QuadrantKey) => Promise<void>;
  addTask: (input: CreateTaskInput | string, quadrant: QuadrantKey) => Promise<Task>;
  updateTask: (id: string, input: UpdateTaskInput) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (id: string, completed?: boolean) => Promise<Task>;
  assignTag: (taskId: string, tag: Tag) => Promise<void>;
  unassignTag: (taskId: string, tagId: string) => Promise<void>;
}

export function useMatrix(projectId?: string | null): UseMatrixReturn {
  const { transitionTaskCount } = useProjects();
  const [matrix, setMatrix] = useState<MatrixResponse>(EMPTY_MATRIX);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const matrixRef = useRef<MatrixResponse>(matrix);
  useEffect(() => {
    matrixRef.current = matrix;
  }, [matrix]);

  const endpoint = projectId
    ? `/api/tasks/matrix?projectId=${encodeURIComponent(projectId)}`
    : '/api/tasks/matrix';

  const fetchMatrix = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient<MatrixResponse>(endpoint);
      setMatrix({
        urgent_important: data?.urgent_important || [],
        not_urgent_important: data?.not_urgent_important || [],
        urgent_not_important: data?.urgent_not_important || [],
        not_urgent_not_important: data?.not_urgent_not_important || [],
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch matrix tasks';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  const moveTaskQuadrant = useCallback(
    async (taskId: string, targetQuadrant: QuadrantKey): Promise<void> => {
      setError(null);
      const current = matrixRef.current;

      // Find source quadrant
      let sourceQuadrant: QuadrantKey | null = null;
      let targetTask: Task | null = null;

      for (const key of Object.keys(current) as QuadrantKey[]) {
        const found = current[key].find((t) => t.id === taskId);
        if (found) {
          sourceQuadrant = key;
          targetTask = found;
          break;
        }
      }

      if (!sourceQuadrant || !targetTask || sourceQuadrant === targetQuadrant) {
        return;
      }

      const flags = QUADRANT_FLAGS[targetQuadrant];
      const updatedTask: Task = {
        ...targetTask,
        urgent: flags.urgent,
        important: flags.important,
      };

      const previousMatrix = current;

      // Optimistic update
      setMatrix((prev) => ({
        ...prev,
        [sourceQuadrant!]: prev[sourceQuadrant!].filter((t) => t.id !== taskId),
        [targetQuadrant]: [...prev[targetQuadrant], updatedTask],
      }));

      try {
        const result = await apiClient<Task>(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          body: JSON.stringify(flags),
        });

        // Ensure state aligns with returned task
        setMatrix((prev) => ({
          ...prev,
          [targetQuadrant]: prev[targetQuadrant].map((t) => (t.id === taskId ? result : t)),
        }));
      } catch (err: unknown) {
        setMatrix(previousMatrix);
        const message = err instanceof Error ? err.message : 'Failed to move task';
        setError(message);
        throw err;
      }
    },
    []
  );

  const addTask = useCallback(
    async (input: CreateTaskInput | string, quadrant: QuadrantKey): Promise<Task> => {
      setError(null);
      const taskInput: CreateTaskInput =
        typeof input === 'string' ? { title: input } : input;

      const flags = QUADRANT_FLAGS[quadrant];
      const payload: CreateTaskInput = {
        ...taskInput,
        urgent: flags.urgent,
        important: flags.important,
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
        urgent: flags.urgent,
        important: flags.important,
        projectId: payload.projectId ?? null,
        userId: '',
        sortOrder: matrixRef.current[quadrant]?.length ?? 0,
        createdAt: new Date().toISOString(),
        tags: [],
      };

      const previousMatrix = matrixRef.current;

      // Optimistically append to target quadrant
      setMatrix((prev) => ({
        ...prev,
        [quadrant]: [...prev[quadrant], optimisticTask],
      }));
      transitionTaskCount(null, optimisticTask.projectId);

      try {
        const createdTask = await apiClient<Task>('/api/tasks', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        setMatrix((prev) => ({
          ...prev,
          [quadrant]: prev[quadrant].map((t) => (t.id === tempId ? createdTask : t)),
        }));
        transitionTaskCount(optimisticTask.projectId, createdTask.projectId);
        return createdTask;
      } catch (err: unknown) {
        setMatrix(previousMatrix);
        transitionTaskCount(optimisticTask.projectId, null);
        const message = err instanceof Error ? err.message : 'Failed to create task';
        setError(message);
        throw err;
      }
    },
    [projectId, transitionTaskCount]
  );

  const updateTask = useCallback(
    async (id: string, input: UpdateTaskInput): Promise<Task> => {
      setError(null);
      const current = matrixRef.current;

      let sourceQuadrant: QuadrantKey | null = null;
      let existingTask: Task | null = null;

      for (const key of Object.keys(current) as QuadrantKey[]) {
        const found = current[key].find((t) => t.id === id);
        if (found) {
          sourceQuadrant = key;
          existingTask = found;
          break;
        }
      }

      if (!sourceQuadrant || !existingTask) {
        // Task not found in current matrix, call API directly
        const updated = await apiClient<Task>(`/api/tasks/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        });
        return updated;
      }

      const previousMatrix = current;
      const optimisticProjectId =
        input.projectId !== undefined ? input.projectId : existingTask.projectId;

      const newUrgent = input.urgent !== undefined ? input.urgent : existingTask.urgent;
      const newImportant =
        input.important !== undefined ? input.important : existingTask.important;
      const targetQuadrant = getQuadrantKey(newUrgent, newImportant);

      const isCompleted = input.completed !== undefined ? input.completed : existingTask.completed;

      const updatedOptimistic: Task = {
        ...existingTask,
        ...input,
        urgent: newUrgent,
        important: newImportant,
        completed: isCompleted,
        completedAt:
          input.completed === true
            ? existingTask.completedAt ?? new Date().toISOString()
            : input.completed === false
              ? null
              : existingTask.completedAt,
        priority:
          input.priority !== undefined
            ? (input.priority as 1 | 2 | 3 | 4)
            : existingTask.priority,
      };

      setMatrix((prev) => {
        // If completed, remove from matrix views (matrix endpoint only shows uncompleted tasks)
        if (isCompleted) {
          return {
            ...prev,
            [sourceQuadrant!]: prev[sourceQuadrant!].filter((t) => t.id !== id),
          };
        }

        if (sourceQuadrant !== targetQuadrant) {
          return {
            ...prev,
            [sourceQuadrant!]: prev[sourceQuadrant!].filter((t) => t.id !== id),
            [targetQuadrant]: [...prev[targetQuadrant], updatedOptimistic],
          };
        }

        return {
          ...prev,
          [sourceQuadrant!]: prev[sourceQuadrant!].map((t) =>
            t.id === id ? updatedOptimistic : t
          ),
        };
      });
      transitionTaskCount(existingTask.projectId, optimisticProjectId);

      try {
        const savedTask = await apiClient<Task>(`/api/tasks/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        });

        if (!savedTask.completed) {
          const finalQuadrant = getQuadrantKey(savedTask.urgent, savedTask.important);
          setMatrix((prev) => ({
            ...prev,
            [finalQuadrant]: prev[finalQuadrant].map((t) => (t.id === id ? savedTask : t)),
          }));
        }
        transitionTaskCount(optimisticProjectId, savedTask.projectId);
        return savedTask;
      } catch (err: unknown) {
        setMatrix(previousMatrix);
        transitionTaskCount(optimisticProjectId, existingTask.projectId);
        const message = err instanceof Error ? err.message : 'Failed to update task';
        setError(message);
        throw err;
      }
    },
    [transitionTaskCount]
  );

  const deleteTask = useCallback(
    async (id: string): Promise<void> => {
      setError(null);
      const previousMatrix = matrixRef.current;
      const deletedTask = Object.values(previousMatrix)
        .flat()
        .find((task) => task.id === id);

      setMatrix((prev) => ({
        urgent_important: prev.urgent_important.filter((t) => t.id !== id),
        not_urgent_important: prev.not_urgent_important.filter((t) => t.id !== id),
        urgent_not_important: prev.urgent_not_important.filter((t) => t.id !== id),
        not_urgent_not_important: prev.not_urgent_not_important.filter((t) => t.id !== id),
      }));
      if (deletedTask) {
        transitionTaskCount(deletedTask.projectId, null);
      }

      try {
        await apiClient<void>(`/api/tasks/${id}`, {
          method: 'DELETE',
        });
      } catch (err: unknown) {
        setMatrix(previousMatrix);
        if (deletedTask) {
          transitionTaskCount(null, deletedTask.projectId);
        }
        const message = err instanceof Error ? err.message : 'Failed to delete task';
        setError(message);
        throw err;
      }
    },
    [transitionTaskCount]
  );

  const toggleTask = useCallback(
    async (id: string, forceCompleted?: boolean): Promise<Task> => {
      let currentTask: Task | null = null;
      for (const key of Object.keys(matrixRef.current) as QuadrantKey[]) {
        const found = matrixRef.current[key].find((t) => t.id === id);
        if (found) {
          currentTask = found;
          break;
        }
      }
      const nextCompleted =
        forceCompleted !== undefined ? forceCompleted : !currentTask?.completed;
      return updateTask(id, { completed: nextCompleted });
    },
    [updateTask]
  );

  const assignTag = useCallback(
    async (taskId: string, tag: Tag): Promise<void> => {
      setError(null);
      const previousMatrix = matrixRef.current;
      setMatrix((prev) => ({
        urgent_important: prev.urgent_important.map((t) =>
          t.id === taskId ? { ...t, tags: addTagToTaskTags(t.tags, tag) } : t
        ),
        not_urgent_important: prev.not_urgent_important.map((t) =>
          t.id === taskId ? { ...t, tags: addTagToTaskTags(t.tags, tag) } : t
        ),
        urgent_not_important: prev.urgent_not_important.map((t) =>
          t.id === taskId ? { ...t, tags: addTagToTaskTags(t.tags, tag) } : t
        ),
        not_urgent_not_important: prev.not_urgent_not_important.map((t) =>
          t.id === taskId ? { ...t, tags: addTagToTaskTags(t.tags, tag) } : t
        ),
      }));

      try {
        await apiClient<void>(`/api/tasks/${taskId}/tags`, {
          method: 'POST',
          body: JSON.stringify({ tagId: tag.id }),
        });
      } catch (err: unknown) {
        setMatrix(previousMatrix);
        const message = err instanceof Error ? err.message : 'Failed to assign tag';
        setError(message);
        throw err;
      }
    },
    []
  );

  const unassignTag = useCallback(
    async (taskId: string, tagId: string): Promise<void> => {
      setError(null);
      const previousMatrix = matrixRef.current;
      setMatrix((prev) => ({
        urgent_important: prev.urgent_important.map((t) =>
          t.id === taskId ? { ...t, tags: removeTagFromTaskTags(t.tags, tagId) } : t
        ),
        not_urgent_important: prev.not_urgent_important.map((t) =>
          t.id === taskId ? { ...t, tags: removeTagFromTaskTags(t.tags, tagId) } : t
        ),
        urgent_not_important: prev.urgent_not_important.map((t) =>
          t.id === taskId ? { ...t, tags: removeTagFromTaskTags(t.tags, tagId) } : t
        ),
        not_urgent_not_important: prev.not_urgent_not_important.map((t) =>
          t.id === taskId ? { ...t, tags: removeTagFromTaskTags(t.tags, tagId) } : t
        ),
      }));

      try {
        await apiClient<void>(`/api/tasks/${taskId}/tags/${tagId}`, {
          method: 'DELETE',
        });
      } catch (err: unknown) {
        setMatrix(previousMatrix);
        const message = err instanceof Error ? err.message : 'Failed to unassign tag';
        setError(message);
        throw err;
      }
    },
    []
  );

  return {
    matrix,
    isLoading,
    error,
    refetch: fetchMatrix,
    moveTaskQuadrant,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    assignTag,
    unassignTag,
  };
}
