'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Folder, Loader2, ArrowUpDown, ChevronDown } from 'lucide-react';
import type { Tag, UpdateTaskInput } from '@offload/shared';
import { useAuth } from '@/lib/auth-context';
import {
  ProjectTaskSortMode,
  DEFAULT_PROJECT_TASK_SORT_MODE,
  getProjectTaskSortStorageKey,
  getStoredProjectTaskSortMode,
  setStoredProjectTaskSortMode,
  sortProjectTasks,
} from '@/lib/project-sort-storage';
import { useProjects } from '@/hooks/use-projects';
import { useTasks } from '@/hooks/use-tasks';
import { useTags } from '@/hooks/use-tags';
import { TaskList } from '@/components/tasks/task-list';
import { TaskDetail } from '@/components/tasks/task-detail';

export default function ProjectPage() {
  const params = useParams();
  const projectId =
    typeof params?.id === 'string'
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : '';

  const { projects, isLoading: isProjectsLoading } = useProjects();
  const {
    tasks,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    assignTag,
    unassignTag,
    reorderTasks,
    isLoading: isTasksLoading,
  } = useTasks(projectId || null);
  const { tags } = useTags();

  const { user } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<ProjectTaskSortMode>(DEFAULT_PROJECT_TASK_SORT_MODE);

  const storageKey = useMemo(() => getProjectTaskSortStorageKey(user?.id), [user?.id]);

  useEffect(() => {
    const stored = getStoredProjectTaskSortMode(storageKey);
    setSortMode(stored);
  }, [storageKey]);

  const handleSortChange = (mode: ProjectTaskSortMode) => {
    setSortMode(mode);
    setStoredProjectTaskSortMode(storageKey, mode);
  };
  const project = projects.find((p) => p.id === projectId);
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;
  const activeCount = tasks.filter((t) => !t.completed).length;
  const sortedTasks = useMemo(() => sortProjectTasks(tasks, sortMode), [tasks, sortMode]);
  const handleDeleteTask = async (id: string) => {
    if (selectedTaskId === id) {
      setSelectedTaskId(null);
    }
    await deleteTask(id);
  };

  const handleToggleTag = async (taskId: string, tag: Tag, isAssigned: boolean) => {
    if (isAssigned) {
      await unassignTag(taskId, tag.id);
    } else {
      await assignTag(taskId, tag);
    }
  };

  const handleUpdateTask = async (id: string, input: UpdateTaskInput) => {
    if (input.projectId !== undefined && input.projectId !== projectId) {
      if (selectedTaskId === id) {
        setSelectedTaskId(null);
      }
    }
    return updateTask(id, input);
  };

  const handleMoveTask = async (taskId: string, targetProjectId: string | null) => {
    if (selectedTaskId === taskId && targetProjectId !== projectId) {
      setSelectedTaskId(null);
    }
    await updateTask(taskId, { projectId: targetProjectId });
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
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

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 absolute left-3 pointer-events-none" />
            <select
              aria-label="Sort tasks"
              value={sortMode}
              onChange={(e) => handleSortChange(e.target.value as ProjectTaskSortMode)}
              className="text-xs font-medium pl-8 pr-8 py-1.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer appearance-none shadow-2xs"
            >
              <option value="priority">Priority (P1 → P4)</option>
              <option value="date_desc">Date added (newest first)</option>
              <option value="date_asc">Date added (oldest first)</option>
              <option value="manual">Custom order</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      <TaskList
        tasks={sortedTasks}
        isDragDisabled={sortMode !== 'manual'}
        isLoading={isTasksLoading}
        onAddTask={(title) => addTask({ title, projectId })}
        onToggleTask={toggleTask}
        onDeleteTask={handleDeleteTask}
        onSelectTask={(task) => setSelectedTaskId(task.id)}
        onReorderTasks={reorderTasks}
        onMoveTask={handleMoveTask}
        emptyTitle="No tasks in this project"
        emptyDescription={`Tasks assigned to ${project?.name || 'this project'} will appear here. Add one below.`}
        inputPlaceholder={`Add a task to ${project?.name || 'project'}... Press Enter`}
      />

      <TaskDetail
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTaskId(null)}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
        availableTags={tags}
        onToggleTag={handleToggleTag}
      />
    </div>
  );
}
