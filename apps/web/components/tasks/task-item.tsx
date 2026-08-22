'use client';

import React from 'react';
import { Check, Trash2, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '@offload/shared';
import { PRIORITY_COLORS } from '@offload/shared';
import { cn } from '@/lib/utils';

export interface TaskItemProps {
  task: Task;
  onToggle?: (id: string, completed: boolean) => void;
  onClick?: (task: Task) => void;
  onDelete?: (id: string) => void;
  className?: string;
  isDragDisabled?: boolean;
}

export function TaskItem({
  task,
  onToggle,
  onClick,
  onDelete,
  className,
  isDragDisabled = false,
}: TaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: isDragDisabled || task.completed,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS[4];

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle?.(task.id, !task.completed);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(task.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick?.(task)}
      className={cn(
        'group flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-zinc-200/80 bg-white hover:border-zinc-300 hover:shadow-xs transition-all cursor-pointer select-none',
        task.completed && 'bg-zinc-50/60 border-zinc-200/60 opacity-75',
        isDragging && 'opacity-50 shadow-md ring-2 ring-blue-500/20 z-50 bg-white',
        className
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Subtle Drag Affordance */}
        {!task.completed && (
          <span
            aria-hidden="true"
            className="text-zinc-300 group-hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0 -ml-1"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </span>
        )}

        {/* Custom Checkbox with priority colored border */}
        <button
          type="button"
          role="checkbox"
          aria-checked={task.completed}
          aria-label={task.completed ? 'Mark task as incomplete' : 'Mark task as complete'}
          onClick={handleToggle}
          style={{
            borderColor: task.completed ? undefined : priorityColor,
          }}
          className={cn(
            'w-5 h-5 rounded-md flex items-center justify-center shrink-0 border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer',
            task.completed
              ? 'bg-zinc-400 border-zinc-400 text-white hover:bg-zinc-500 hover:border-zinc-500'
              : 'hover:bg-zinc-100/80'
          )}
        >
          {task.completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
        </button>

        {/* Task Title and Description */}
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              'text-sm block truncate text-zinc-800 font-normal transition-colors',
              task.completed && 'line-through text-zinc-400'
            )}
          >
            {task.title}
          </span>
          {task.description && (
            <span
              className={cn(
                'text-xs text-zinc-400 block truncate mt-0.5',
                task.completed && 'line-through text-zinc-300'
              )}
            >
              {task.description}
            </span>
          )}
        </div>
      </div>

      {/* Tags and Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Tag chips */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {task.tags.map((tag) => (
              <span
                key={tag.id}
                style={{
                  backgroundColor: `${tag.color}15`,
                  color: tag.color,
                  borderColor: `${tag.color}30`,
                }}
                className="text-[11px] font-medium px-2 py-0.5 rounded-full border leading-tight"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Delete Button */}
        {onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            aria-label="Delete task"
            className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-zinc-400 hover:text-red-600 hover:bg-zinc-100 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
