'use client';

import React, { useState } from 'react';
import { Inbox } from 'lucide-react';
import type { Tag, UpdateTaskInput } from '@offload/shared';
import { useTasks } from '@/hooks/use-tasks';
import { useTags } from '@/hooks/use-tags';
import { TaskList } from '@/components/tasks/task-list';
import { TaskDetail } from '@/components/tasks/task-detail';

export default function InboxPage() {
  const {
    tasks,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    assignTag,
    unassignTag,
    isLoading,
  } = useTasks(null);
  const { tags } = useTags();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;
  const activeCount = tasks.filter((t) => !t.completed).length;

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
        onDeleteTask={handleDeleteTask}
        onSelectTask={(task) => setSelectedTaskId(task.id)}
        emptyTitle="Your inbox is clear"
        emptyDescription="Tasks without an assigned project will appear here. Type below to add one."
        inputPlaceholder="Add a task to inbox... Press Enter"
      />

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
