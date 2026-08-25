import type { Project } from './types/index.js';

export interface TaskCountState {
  projectId: string | null | undefined;
  completed: boolean;
}

/**
 * Applies the active-task count delta produced by moving a task between states.
 * A task contributes to a project badge only while it belongs to that project
 * and is not completed.
 */
export function transitionActiveTaskCounts(
  projects: Project[],
  from: TaskCountState | null,
  to: TaskCountState | null
): Project[] {
  const fromProjectId = from && !from.completed ? from.projectId : null;
  const toProjectId = to && !to.completed ? to.projectId : null;

  if (fromProjectId === toProjectId) return projects;

  return projects.map((project) => {
    const delta =
      (project.id === toProjectId ? 1 : 0) -
      (project.id === fromProjectId ? 1 : 0);

    if (delta === 0) return project;

    return {
      ...project,
      _count: {
        tasks: Math.max(0, (project._count?.tasks ?? 0) + delta),
      },
    };
  });
}
