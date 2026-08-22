'use client';

import React from 'react';
import { Inbox } from 'lucide-react';
import { useTasks } from '@/hooks/use-tasks';
import { TaskList } from '@/components/tasks/task-list';

export default function InboxPage() {
  const { tasks, addTask, toggleTask, deleteTask, isLoading } = useTasks(null);

  const activeCount = tasks.filter((t) => !t.completed).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Inbox className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900">Inbox</h1>
              {activeCount > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                  {activeCount}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500">Capture and organize your unprocessed tasks</p>
          </div>
        </div>
      </div>

      <TaskList
        tasks={tasks}
        isLoading={isLoading}
        onAddTask={(title) => addTask({ title })}
        onToggleTask={toggleTask}
        onDeleteTask={deleteTask}
        emptyTitle="Your inbox is clear"
        emptyDescription="Tasks without an assigned project will appear here. Type below to add one."
        inputPlaceholder="Add a task to inbox... Press Enter"
      />
    </div>
  );
}
