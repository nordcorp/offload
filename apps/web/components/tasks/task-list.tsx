'use client';

import React from 'react';
import { ChevronRight, CheckCircle2, Loader2, Inbox } from 'lucide-react';
import type { Task } from '@offload/shared';
import { TaskItem } from './task-item';
import { AddTaskInput } from './add-task-input';
import { cn } from '@/lib/utils';

export interface TaskListProps {
  tasks: Task[];
  onToggleTask?: (id: string, completed: boolean) => void;
  onAddTask: (title: string) => Promise<unknown> | void;
  onDeleteTask?: (id: string) => void;
  onSelectTask?: (task: Task) => void;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  inputPlaceholder?: string;
  className?: string;
}

export function TaskList({
  tasks,
  onToggleTask,
  onAddTask,
  onDeleteTask,
  onSelectTask,
  isLoading = false,
  emptyTitle = 'No tasks yet',
  emptyDescription = 'Add your first task below to get started.',
  inputPlaceholder = 'Add a task... Press Enter to save',
  className,
}: TaskListProps) {
  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  if (isLoading && tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
        <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-600" />
        <span className="text-sm">Loading tasks...</span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Active Tasks List */}
      {activeTasks.length > 0 ? (
        <div className="space-y-2">
          {activeTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={onToggleTask}
              onDelete={onDeleteTask}
              onClick={onSelectTask}
            />
          ))}
        </div>
      ) : completedTasks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
          <CheckCircle2 className="w-10 h-10 text-zinc-300 mx-auto mb-2.5" />
          <h3 className="text-sm font-semibold text-zinc-800">{emptyTitle}</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-0.5">
            {emptyDescription}
          </p>
        </div>
      ) : null}

      {/* Add Task Input */}
      <AddTaskInput onAdd={onAddTask} placeholder={inputPlaceholder} />

      {/* Completed Tasks Collapsed Section */}
      {completedTasks.length > 0 && (
        <details className="group mt-6 pt-2 border-t border-zinc-100">
          <summary className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-600 cursor-pointer list-none select-none py-1.5 transition-colors [&::-webkit-details-marker]:hidden">
            <ChevronRight className="w-3.5 h-3.5 transition-transform duration-150 group-open:rotate-90 text-zinc-400" />
            <span>Completed ({completedTasks.length})</span>
          </summary>

          <div className="space-y-2 mt-2 pt-1">
            {completedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={onToggleTask}
                onDelete={onDeleteTask}
                onClick={onSelectTask}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
