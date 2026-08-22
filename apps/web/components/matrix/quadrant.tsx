'use client';

import React, { useState } from 'react';
import {
  Flame,
  Calendar,
  Users,
  MinusCircle,
  Plus,
  Check,
  Trash2,
  GripVertical,
  Loader2,
} from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task, QuadrantKey } from '@offload/shared';
import { PRIORITY_COLORS, QUADRANT_LABELS } from '@offload/shared';
import { cn } from '@/lib/utils';

export interface QuadrantProps {
  quadrantKey: QuadrantKey;
  tasks: Task[];
  onAddTask: (title: string, quadrant: QuadrantKey) => Promise<unknown> | void;
  onSelectTask?: (task: Task) => void;
  onToggleTask?: (id: string, completed: boolean) => void;
  onDeleteTask?: (id: string) => void;
  className?: string;
}

export interface MatrixTaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
  onToggle?: (id: string, completed: boolean) => void;
  onDelete?: (id: string) => void;
  isDragOverlay?: boolean;
}

export const QUADRANT_CONFIGS: Record<
  QuadrantKey,
  {
    title: string;
    subtitle: string;
    roman: string;
    icon: React.ElementType;
    theme: {
      container: string;
      headerBg: string;
      headerText: string;
      headerSubtext: string;
      iconBg: string;
      iconColor: string;
      badge: string;
      activeOver: string;
      emptyBorder: string;
      quickAddFocus: string;
      quickAddButton: string;
    };
  }
> = {
  urgent_important: {
    title: QUADRANT_LABELS.urgent_important,
    subtitle: 'Urgent & Important',
    roman: 'Q1',
    icon: Flame,
    theme: {
      container: 'border-red-200/90 bg-red-50/20 shadow-xs',
      headerBg: 'bg-red-100/70 border-b border-red-200/80',
      headerText: 'text-red-950',
      headerSubtext: 'text-red-700/80',
      iconBg: 'bg-red-200/80 text-red-700',
      iconColor: 'text-red-700',
      badge: 'bg-red-200/70 text-red-800 border-red-300',
      activeOver: 'ring-2 ring-red-400 bg-red-100/40 border-red-300',
      emptyBorder: 'border-red-200/70 text-red-500/70',
      quickAddFocus: 'focus-within:border-red-400 focus-within:ring-red-400/20',
      quickAddButton: 'text-red-700 hover:bg-red-100/80',
    },
  },
  not_urgent_important: {
    title: QUADRANT_LABELS.not_urgent_important,
    subtitle: 'Not Urgent & Important',
    roman: 'Q2',
    icon: Calendar,
    theme: {
      container: 'border-blue-200/90 bg-blue-50/20 shadow-xs',
      headerBg: 'bg-blue-100/70 border-b border-blue-200/80',
      headerText: 'text-blue-950',
      headerSubtext: 'text-blue-700/80',
      iconBg: 'bg-blue-200/80 text-blue-700',
      iconColor: 'text-blue-700',
      badge: 'bg-blue-200/70 text-blue-800 border-blue-300',
      activeOver: 'ring-2 ring-blue-400 bg-blue-100/40 border-blue-300',
      emptyBorder: 'border-blue-200/70 text-blue-500/70',
      quickAddFocus: 'focus-within:border-blue-400 focus-within:ring-blue-400/20',
      quickAddButton: 'text-blue-700 hover:bg-blue-100/80',
    },
  },
  urgent_not_important: {
    title: QUADRANT_LABELS.urgent_not_important,
    subtitle: 'Urgent & Not Important',
    roman: 'Q3',
    icon: Users,
    theme: {
      container: 'border-amber-200/90 bg-amber-50/20 shadow-xs',
      headerBg: 'bg-amber-100/70 border-b border-amber-200/80',
      headerText: 'text-amber-950',
      headerSubtext: 'text-amber-700/80',
      iconBg: 'bg-amber-200/80 text-amber-700',
      iconColor: 'text-amber-700',
      badge: 'bg-amber-200/70 text-amber-800 border-amber-300',
      activeOver: 'ring-2 ring-amber-400 bg-amber-100/40 border-amber-300',
      emptyBorder: 'border-amber-200/70 text-amber-500/70',
      quickAddFocus: 'focus-within:border-amber-400 focus-within:ring-amber-400/20',
      quickAddButton: 'text-amber-700 hover:bg-amber-100/80',
    },
  },
  not_urgent_not_important: {
    title: QUADRANT_LABELS.not_urgent_not_important,
    subtitle: 'Not Urgent & Not Important',
    roman: 'Q4',
    icon: MinusCircle,
    theme: {
      container: 'border-zinc-200/90 bg-zinc-50/40 shadow-xs',
      headerBg: 'bg-zinc-100/90 border-b border-zinc-200/80',
      headerText: 'text-zinc-900',
      headerSubtext: 'text-zinc-600',
      iconBg: 'bg-zinc-200 text-zinc-700',
      iconColor: 'text-zinc-700',
      badge: 'bg-zinc-200 text-zinc-700 border-zinc-300',
      activeOver: 'ring-2 ring-zinc-400 bg-zinc-100/60 border-zinc-300',
      emptyBorder: 'border-zinc-200 text-zinc-400',
      quickAddFocus: 'focus-within:border-zinc-400 focus-within:ring-zinc-400/20',
      quickAddButton: 'text-zinc-700 hover:bg-zinc-200/70',
    },
  },
};

export function MatrixTaskCard({
  task,
  onClick,
  onToggle,
  onDelete,
  isDragOverlay = false,
}: MatrixTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: isDragOverlay || task.completed,
  });

  const style: React.CSSProperties = isDragOverlay
    ? {}
    : {
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
        'group flex flex-col gap-1.5 p-3 rounded-xl border border-zinc-200/90 bg-white hover:border-zinc-300 hover:shadow-xs transition-all cursor-pointer select-none text-left',
        task.completed && 'bg-zinc-50/70 border-zinc-200/60 opacity-60',
        isDragging && 'opacity-40 ring-2 ring-blue-500/20 z-50 bg-zinc-50',
        isDragOverlay && 'shadow-xl ring-2 ring-blue-500/40 bg-white rotate-1 scale-[1.02] cursor-grabbing'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {/* Subtle Drag Handle Icon */}
          {!isDragOverlay && !task.completed && (
            <span
              aria-hidden="true"
              className="text-zinc-300 group-hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0 mt-0.5 -ml-1"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </span>
          )}

          {/* Checkbox */}
          <button
            type="button"
            role="checkbox"
            aria-checked={task.completed}
            aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
            onClick={handleToggle}
            style={{
              borderColor: task.completed ? undefined : priorityColor,
            }}
            className={cn(
              'w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer',
              task.completed
                ? 'bg-zinc-400 border-zinc-400 text-white'
                : 'hover:bg-zinc-100/80 bg-white'
            )}
          >
            {task.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
          </button>

          {/* Title */}
          <div className="min-w-0 flex-1">
            <span
              className={cn(
                'text-xs font-medium text-zinc-900 block break-words leading-snug',
                task.completed && 'line-through text-zinc-400'
              )}
            >
              {task.title}
            </span>
            {task.description && (
              <p
                className={cn(
                  'text-[11px] text-zinc-500 line-clamp-2 mt-0.5 leading-tight',
                  task.completed && 'line-through text-zinc-400'
                )}
              >
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* Delete Quick Button */}
        {onDelete && !isDragOverlay && (
          <button
            type="button"
            onClick={handleDelete}
            aria-label="Delete task"
            className="opacity-0 group-hover:opacity-100 p-1 -mr-1 -mt-0.5 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Footer tags and priority */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-zinc-100/70 mt-0.5">
          {task.tags.map((tag) => (
            <span
              key={tag.id}
              style={{
                backgroundColor: `${tag.color}15`,
                color: tag.color,
                borderColor: `${tag.color}30`,
              }}
              className="text-[10px] font-medium px-1.5 py-0.2 rounded-full border leading-tight"
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function Quadrant({
  quadrantKey,
  tasks,
  onAddTask,
  onSelectTask,
  onToggleTask,
  onDeleteTask,
  className,
}: QuadrantProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: quadrantKey,
  });

  const config = QUADRANT_CONFIGS[quadrantKey];
  const IconComponent = config.icon;

  const [newTitle, setNewTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddTask(trimmed, quadrantKey);
      setNewTitle('');
    } catch {
      // Handled by hook/parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-2xl border transition-all duration-150 overflow-hidden min-h-[380px]',
        config.theme.container,
        isOver && config.theme.activeOver,
        className
      )}
    >
      {/* Quadrant Header */}
      <div
        className={cn(
          'px-4 py-3.5 flex items-center justify-between gap-3 shrink-0 select-none',
          config.theme.headerBg
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs',
              config.theme.iconBg
            )}
          >
            <IconComponent className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">
                {config.roman}
              </span>
              <h2 className={cn('text-sm font-bold truncate', config.theme.headerText)}>
                {config.title}
              </h2>
            </div>
            <p className={cn('text-[11px] font-medium truncate', config.theme.headerSubtext)}>
              {config.subtitle}
            </p>
          </div>
        </div>

        <span
          className={cn(
            'text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0',
            config.theme.badge
          )}
        >
          {tasks.length}
        </span>
      </div>

      {/* Task List / Drop Zone */}
      <div className="flex-1 p-3 flex flex-col gap-2 overflow-y-auto max-h-[500px]">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <MatrixTaskCard
                key={task.id}
                task={task}
                onClick={onSelectTask}
                onToggle={onToggleTask}
                onDelete={onDeleteTask}
              />
            ))
          ) : (
            <div
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed rounded-xl text-center select-none min-h-[140px]',
                config.theme.emptyBorder
              )}
            >
              <p className="text-xs font-medium opacity-80">No tasks in this quadrant</p>
              <p className="text-[11px] opacity-60 mt-0.5">Drag tasks here or add one below</p>
            </div>
          )}
        </SortableContext>
      </div>

      {/* Inline Quick Add Input */}
      <div className="p-3 pt-0 shrink-0">
        <form
          onSubmit={handleQuickAdd}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200/90 bg-white/90 focus-within:bg-white focus-within:ring-2 transition-all shadow-2xs',
            config.theme.quickAddFocus
          )}
        >
          <button
            type="submit"
            disabled={!newTitle.trim() || isSubmitting}
            aria-label={`Add task to ${config.title}`}
            className={cn(
              'w-4 h-4 rounded flex items-center justify-center shrink-0 text-zinc-400 transition-colors',
              newTitle.trim() && !isSubmitting && 'text-zinc-800 cursor-pointer'
            )}
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
          </button>

          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={`Add to ${config.title}...`}
            disabled={isSubmitting}
            maxLength={500}
            className="w-full text-xs text-zinc-900 placeholder:text-zinc-400 bg-transparent border-none outline-none focus:ring-0 focus:outline-none p-0"
          />

          {newTitle.trim() && (
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'text-[11px] font-semibold px-2 py-0.5 rounded-md transition-colors shrink-0 cursor-pointer',
                config.theme.quickAddButton
              )}
            >
              {isSubmitting ? 'Adding...' : 'Add'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
