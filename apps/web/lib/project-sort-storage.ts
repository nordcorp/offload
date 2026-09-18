import type { Task } from '@offload/shared';

export type ProjectTaskSortMode = 'priority' | 'date_desc' | 'date_asc' | 'manual';

export const DEFAULT_PROJECT_TASK_SORT_MODE: ProjectTaskSortMode = 'priority';

export const PROJECT_TASK_SORT_STORAGE_PREFIX = 'offload_project_sort_mode';

export function getProjectTaskSortStorageKey(userId?: string | null): string {
  return userId ? `${PROJECT_TASK_SORT_STORAGE_PREFIX}_${userId}` : PROJECT_TASK_SORT_STORAGE_PREFIX;
}

export function isValidProjectTaskSortMode(value: unknown): value is ProjectTaskSortMode {
  return value === 'priority' || value === 'date_desc' || value === 'date_asc' || value === 'manual';
}

export function sortProjectTasks(tasks: Task[], sortMode: ProjectTaskSortMode): Task[] {
  const list = [...tasks];
  switch (sortMode) {
    case 'priority':
      return list.sort((a, b) => {
        // Priority ascending: 1 (P1) is top priority, followed by 2, 3, 4
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        // Within same priority: newest first
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        if (timeA !== timeB) {
          return timeB - timeA;
        }
        return a.sortOrder - b.sortOrder;
      });

    case 'date_desc':
      return list.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        if (timeA !== timeB) {
          return timeB - timeA;
        }
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.sortOrder - b.sortOrder;
      });

    case 'date_asc':
      return list.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        if (timeA !== timeB) {
          return timeA - timeB;
        }
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.sortOrder - b.sortOrder;
      });

    case 'manual':
    default:
      return list.sort((a, b) => a.sortOrder - b.sortOrder);
  }
}

export function getStoredProjectTaskSortMode(storageKey: string): ProjectTaskSortMode {
  if (typeof window === 'undefined') return DEFAULT_PROJECT_TASK_SORT_MODE;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSort = urlParams.get('sort') || urlParams.get('sortBy');
    if (isValidProjectTaskSortMode(urlSort)) {
      return urlSort;
    }

    const stored = localStorage.getItem(storageKey) || localStorage.getItem(PROJECT_TASK_SORT_STORAGE_PREFIX);
    if (isValidProjectTaskSortMode(stored)) {
      return stored;
    }

    return DEFAULT_PROJECT_TASK_SORT_MODE;
  } catch {
    return DEFAULT_PROJECT_TASK_SORT_MODE;
  }
}

export function setStoredProjectTaskSortMode(storageKey: string, mode: ProjectTaskSortMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey, mode);
    localStorage.setItem(PROJECT_TASK_SORT_STORAGE_PREFIX, mode);

    if (window.location.search) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('sort') || urlParams.has('sortBy')) {
        urlParams.delete('sort');
        urlParams.delete('sortBy');
        const newSearch = urlParams.toString();
        const newUrl = newSearch
          ? `${window.location.pathname}?${newSearch}`
          : window.location.pathname;
        window.history.replaceState(null, '', newUrl);
      }
    }
  } catch {
    // Ignore storage and navigation errors
  }
}
