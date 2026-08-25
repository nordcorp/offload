import { describe, expect, it } from 'vitest';
import type { Project } from '../types/index.js';
import {
  transitionActiveTaskCounts,
  type TaskCountState,
} from '../project-task-count.js';

const projects: Project[] = [
  {
    id: 'project-a',
    name: 'A',
    color: '#000000',
    sortOrder: 0,
    userId: 'user',
    createdAt: '2026-01-01T00:00:00.000Z',
    _count: { tasks: 2 },
  },
  {
    id: 'project-b',
    name: 'B',
    color: '#ffffff',
    sortOrder: 1,
    userId: 'user',
    createdAt: '2026-01-01T00:00:00.000Z',
    _count: { tasks: 1 },
  },
];

const state = (
  projectId: string | null,
  completed: boolean
): TaskCountState => ({ projectId, completed });

const counts = (items: Project[]) => items.map((project) => project._count?.tasks ?? 0);

describe('transitionActiveTaskCounts', () => {
  it.each([
    ['creates an active task', null, state('project-a', false), [3, 1]],
    ['completes a task', state('project-a', false), state('project-a', true), [1, 1]],
    ['reopens a task', state('project-a', true), state('project-a', false), [3, 1]],
    ['deletes an active task', state('project-a', false), null, [1, 1]],
    ['deletes a completed task', state('project-a', true), null, [2, 1]],
    [
      'moves an active task between projects',
      state('project-a', false),
      state('project-b', false),
      [1, 2],
    ],
    [
      'moves a completed task between projects',
      state('project-a', true),
      state('project-b', true),
      [2, 1],
    ],
  ] satisfies Array<[
    string,
    TaskCountState | null,
    TaskCountState | null,
    number[],
  ]>)('%s', (_name, from, to, expected) => {
    expect(counts(transitionActiveTaskCounts(projects, from, to))).toEqual(expected);
  });

  it.each([
    ['creation', null, state('project-a', false)],
    ['completion', state('project-a', false), state('project-a', true)],
    ['reopening', state('project-a', true), state('project-a', false)],
    ['active deletion', state('project-a', false), null],
    ['active move', state('project-a', false), state('project-b', false)],
  ] satisfies Array<[string, TaskCountState | null, TaskCountState | null]>)(
    'restores counts when a failed %s is rolled back',
    (_name, from, to) => {
      const optimistic = transitionActiveTaskCounts(projects, from, to);
      const rolledBack = transitionActiveTaskCounts(optimistic, to, from);

      expect(counts(rolledBack)).toEqual(counts(projects));
    }
  );

  it('does not let a count become negative', () => {
    const emptyProject = [{ ...projects[0], _count: { tasks: 0 } }];

    expect(
      counts(
        transitionActiveTaskCounts(
          emptyProject,
          state('project-a', false),
          null
        )
      )
    ).toEqual([0]);
  });
});
