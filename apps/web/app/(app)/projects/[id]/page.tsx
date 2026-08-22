'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useProjects } from '@/hooks/use-projects';
import { useTasks } from '@/hooks/use-tasks';
import { TaskList } from '@/components/tasks/task-list';
import { Folder, Loader2 } from 'lucide-react';

export default function ProjectPage() {
  const params = useParams();
  const projectId =
    typeof params?.id === 'string'
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : '';

  const { projects, isLoading: isProjectsLoading } = useProjects();
  const { tasks, addTask, toggleTask, deleteTask, isLoading: isTasksLoading } =
    useTasks(projectId || null);

  const project = projects.find((p) => p.id === projectId);
  const activeCount = tasks.filter((t) => !t.completed).length;

  if (isProjectsLoading && !project) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
        <span className="text-sm text-zinc-500">Loading project...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs"
            style={{ backgroundColor: project?.color || '#3b82f6' }}
          >
            <Folder className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900">
                {project?.name || 'Project'}
              </h1>
              {activeCount > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                  {activeCount}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500">Manage tasks for this project</p>
          </div>
        </div>
      </div>

      <TaskList
        tasks={tasks}
        isLoading={isTasksLoading}
        onAddTask={(title) => addTask({ title, projectId })}
        onToggleTask={toggleTask}
        onDeleteTask={deleteTask}
        emptyTitle="No tasks in this project"
        emptyDescription={`Tasks assigned to ${project?.name || 'this project'} will appear here. Add one below.`}
        inputPlaceholder={`Add a task to ${project?.name || 'project'}... Press Enter`}
      />
    </div>
  );
}
