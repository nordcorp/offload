import { describe, expect, it } from 'vitest';
import type { Task } from '@offload/shared';

function filterTasksForScope(
  tasks: Task[],
  updatedTaskId: string,
  newProjectId: string | null | undefined,
  currentScopeProjectId: string | null
): Task[] {
  const targetProjectId = newProjectId !== undefined ? newProjectId : null;
  if (targetProjectId !== currentScopeProjectId) {
    return tasks.filter((t) => t.id !== updatedTaskId);
  }
  return tasks;
}

describe('Task move filtering logic', () => {
  const inboxTask: Task = {
    id: 'task-1',
    title: 'Inbox Task',
    description: null,
    completed: false,
    completedAt: null,
    priority: 4,
    urgent: false,
    important: false,
    projectId: null,
    userId: 'user-1',
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    tags: [],
  };

  const projectTask: Task = {
    ...inboxTask,
    id: 'task-2',
    title: 'Project Task',
    projectId: 'project-a',
  };

  it('removes an inbox task from the inbox list when moved to a project', () => {
    const list = [inboxTask];
    const result = filterTasksForScope(list, 'task-1', 'project-a', null);
    expect(result).toHaveLength(0);
  });

  it('keeps an inbox task in the inbox list when its project is unchanged (null)', () => {
    const list = [inboxTask];
    const result = filterTasksForScope(list, 'task-1', null, null);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('task-1');
  });

  it('removes a project task from project-a list when moved to project-b', () => {
    const list = [projectTask];
    const result = filterTasksForScope(list, 'task-2', 'project-b', 'project-a');
    expect(result).toHaveLength(0);
  });

  it('removes a project task from project-a list when moved to inbox', () => {
    const list = [projectTask];
    const result = filterTasksForScope(list, 'task-2', null, 'project-a');
    expect(result).toHaveLength(0);
  });

  it('keeps a project task in project-a list when its project remains project-a', () => {
    const list = [projectTask];
    const result = filterTasksForScope(list, 'task-2', 'project-a', 'project-a');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('task-2');
  });
});
