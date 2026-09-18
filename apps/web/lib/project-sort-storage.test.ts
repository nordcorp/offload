import type { Task } from '@offload/shared';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PROJECT_TASK_SORT_MODE,
  PROJECT_TASK_SORT_STORAGE_PREFIX,
  getProjectTaskSortStorageKey,
  getStoredProjectTaskSortMode,
  isValidProjectTaskSortMode,
  setStoredProjectTaskSortMode,
  sortProjectTasks,
} from './project-sort-storage';

function createTask(overrides: Partial<Task>): Task {
  return {
    id: overrides.id || 'task-id',
    title: overrides.title || 'Task title',
    description: null,
    completed: false,
    completedAt: null,
    priority: overrides.priority || 4,
    urgent: false,
    important: false,
    projectId: 'project-1',
    userId: 'user-1',
    sortOrder: overrides.sortOrder ?? 0,
    createdAt: overrides.createdAt || '2026-01-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('sortProjectTasks', () => {
  it('sorts by priority ascending (P1 -> P2 -> P3 -> P4) and newest first on tie', () => {
    const tasks: Task[] = [
      createTask({ id: 'p3', priority: 3, createdAt: '2026-01-03T10:00:00.000Z' }),
      createTask({ id: 'p1-old', priority: 1, createdAt: '2026-01-01T10:00:00.000Z' }),
      createTask({ id: 'p4', priority: 4, createdAt: '2026-01-04T10:00:00.000Z' }),
      createTask({ id: 'p1-new', priority: 1, createdAt: '2026-01-02T10:00:00.000Z' }),
      createTask({ id: 'p2', priority: 2, createdAt: '2026-01-02T12:00:00.000Z' }),
    ];

    const sorted = sortProjectTasks(tasks, 'priority');

    expect(sorted.map((t) => t.id)).toEqual([
      'p1-new', // P1 newest
      'p1-old', // P1 older
      'p2',     // P2
      'p3',     // P3
      'p4',     // P4
    ]);
  });

  it('sorts by date_desc (newest first) and tiebreaks by priority', () => {
    const tasks: Task[] = [
      createTask({ id: 't1', priority: 3, createdAt: '2026-01-01T10:00:00.000Z' }),
      createTask({ id: 't3', priority: 4, createdAt: '2026-01-03T10:00:00.000Z' }),
      createTask({ id: 't2-p2', priority: 2, createdAt: '2026-01-02T10:00:00.000Z' }),
      createTask({ id: 't2-p1', priority: 1, createdAt: '2026-01-02T10:00:00.000Z' }),
    ];

    const sorted = sortProjectTasks(tasks, 'date_desc');

    expect(sorted.map((t) => t.id)).toEqual([
      't3',    // 2026-01-03
      't2-p1', // 2026-01-02 (P1)
      't2-p2', // 2026-01-02 (P2)
      't1',    // 2026-01-01
    ]);
  });

  it('sorts by date_asc (oldest first) and tiebreaks by priority', () => {
    const tasks: Task[] = [
      createTask({ id: 't3', priority: 4, createdAt: '2026-01-03T10:00:00.000Z' }),
      createTask({ id: 't1', priority: 3, createdAt: '2026-01-01T10:00:00.000Z' }),
      createTask({ id: 't2-p2', priority: 2, createdAt: '2026-01-02T10:00:00.000Z' }),
      createTask({ id: 't2-p1', priority: 1, createdAt: '2026-01-02T10:00:00.000Z' }),
    ];

    const sorted = sortProjectTasks(tasks, 'date_asc');

    expect(sorted.map((t) => t.id)).toEqual([
      't1',    // 2026-01-01
      't2-p1', // 2026-01-02 (P1)
      't2-p2', // 2026-01-02 (P2)
      't3',    // 2026-01-03
    ]);
  });

  it('sorts by manual order using sortOrder', () => {
    const tasks: Task[] = [
      createTask({ id: 'b', sortOrder: 1 }),
      createTask({ id: 'c', sortOrder: 2 }),
      createTask({ id: 'a', sortOrder: 0 }),
    ];

    const sorted = sortProjectTasks(tasks, 'manual');

    expect(sorted.map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('project sort storage helpers', () => {
  const store = new Map<string, string>();
  let locationSearch = '';
  let replaceStateMock: Mock;

  beforeEach(() => {
    store.clear();
    locationSearch = '';
    replaceStateMock = vi.fn((_state, _title, url: string) => {
      const parsed = new URL(url, 'http://localhost');
      locationSearch = parsed.search;
    });

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        store.delete(key);
      }),
    });

    vi.stubGlobal('window', {
      location: {
        pathname: '/projects/123',
        get search() {
          return locationSearch;
        },
        set search(val: string) {
          locationSearch = val;
        },
      },
      history: {
        replaceState: replaceStateMock,
      },
    });
  });

  it('generates storage keys correctly', () => {
    expect(getProjectTaskSortStorageKey('user-42')).toBe(`${PROJECT_TASK_SORT_STORAGE_PREFIX}_user-42`);
    expect(getProjectTaskSortStorageKey(null)).toBe(PROJECT_TASK_SORT_STORAGE_PREFIX);
    expect(getProjectTaskSortStorageKey(undefined)).toBe(PROJECT_TASK_SORT_STORAGE_PREFIX);
  });

  it('validates sort modes', () => {
    expect(isValidProjectTaskSortMode('priority')).toBe(true);
    expect(isValidProjectTaskSortMode('date_desc')).toBe(true);
    expect(isValidProjectTaskSortMode('date_asc')).toBe(true);
    expect(isValidProjectTaskSortMode('manual')).toBe(true);
    expect(isValidProjectTaskSortMode('invalid')).toBe(false);
    expect(isValidProjectTaskSortMode(null)).toBe(false);
  });

  it('defaults to priority when nothing is stored', () => {
    expect(getStoredProjectTaskSortMode('custom_key')).toBe(DEFAULT_PROJECT_TASK_SORT_MODE);
  });

  it('reads and writes to localStorage', () => {
    setStoredProjectTaskSortMode('custom_key', 'date_desc');
    expect(getStoredProjectTaskSortMode('custom_key')).toBe('date_desc');
  });

  it('prefers valid URL parameter over localStorage and cleans up URL', () => {
    store.set('custom_key', 'priority');
    locationSearch = '?sort=date_desc';

    expect(getStoredProjectTaskSortMode('custom_key')).toBe('date_desc');

    setStoredProjectTaskSortMode('custom_key', 'date_desc');
    expect(replaceStateMock).toHaveBeenCalledWith(null, '', '/projects/123');
  });
});
