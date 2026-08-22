'use client';

import React, { useState, useMemo } from 'react';
import { LayoutGrid, Filter } from 'lucide-react';
import type { Tag, QuadrantKey } from '@offload/shared';
import { useMatrix } from '@/hooks/use-matrix';
import { useProjects } from '@/hooks/use-projects';
import { useTags } from '@/hooks/use-tags';
import { EisenhowerMatrix } from '@/components/matrix';
import { TaskDetail } from '@/components/tasks/task-detail';

export default function MatrixPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { projects } = useProjects();
  const {
    matrix,
    isLoading,
    moveTaskQuadrant,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
  } = useMatrix(selectedProjectId);

  const { tags, assignTag, unassignTag } = useTags();

  // Combine all active tasks to find the selected task for the detail drawer
  const allTasks = useMemo(() => {
    return [
      ...(matrix.urgent_important || []),
      ...(matrix.not_urgent_important || []),
      ...(matrix.urgent_not_important || []),
      ...(matrix.not_urgent_not_important || []),
    ];
  }, [matrix]);

  const selectedTask = useMemo(() => {
    return allTasks.find((t) => t.id === selectedTaskId) || null;
  }, [allTasks, selectedTaskId]);

  const totalCount = allTasks.length;

  const handleMoveTask = async (taskId: string, targetQuadrant: QuadrantKey) => {
    await moveTaskQuadrant(taskId, targetQuadrant);
  };

  const handleAddTask = async (title: string, quadrant: QuadrantKey) => {
    await addTask(
      {
        title,
        projectId: selectedProjectId || undefined,
      },
      quadrant
    );
  };

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
      await assignTag(taskId, tag.id);
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <LayoutGrid className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900">Eisenhower Matrix</h1>
              {totalCount > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                  {totalCount} active
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              Prioritize tasks by urgency and importance across quadrants
            </p>
          </div>
        </div>

        {/* Project Filter Selector */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Filter className="w-3.5 h-3.5 text-zinc-400 absolute left-3 pointer-events-none" />
            <select
              aria-label="Filter matrix by project"
              value={selectedProjectId || ''}
              onChange={(e) => setSelectedProjectId(e.target.value || null)}
              className="text-xs font-medium pl-8 pr-7 py-1.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer appearance-none shadow-2xs"
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            {selectedProject && (
              <span
                className="w-2 h-2 rounded-full absolute right-2.5 pointer-events-none"
                style={{ backgroundColor: selectedProject.color }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Eisenhower Matrix Grid */}
      <EisenhowerMatrix
        matrix={matrix}
        isLoading={isLoading}
        onMoveTask={handleMoveTask}
        onAddTask={handleAddTask}
        onSelectTask={(task) => setSelectedTaskId(task.id)}
        onToggleTask={toggleTask}
        onDeleteTask={handleDeleteTask}
      />

      {/* Task Detail Drawer */}
      <TaskDetail
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTaskId(null)}
        onUpdate={updateTask}
        onDelete={handleDeleteTask}
        availableTags={tags}
        onToggleTag={handleToggleTag}
      />
    </div>
  );
}
