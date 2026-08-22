'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import {
  X,
  Trash2,
  Check,
  Plus,
  Flame,
  Star,
  Tag as TagIcon,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import type { Task, Tag, UpdateTaskInput, Priority } from '@offload/shared';
import { PRIORITY_COLORS, QUADRANT_LABELS } from '@offload/shared';
import { cn } from '@/lib/utils';
import { useTags } from '@/hooks/use-tags';

export interface TaskDetailProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (id: string, input: UpdateTaskInput) => Promise<Task | unknown> | void;
  onDelete?: (id: string) => Promise<void> | void;
  availableTags?: Tag[];
  onToggleTag?: (taskId: string, tag: Tag, isAssigned: boolean) => Promise<void> | void;
  className?: string;
}

const PRIORITY_OPTIONS: { priority: Priority; label: string; shortLabel: string }[] = [
  { priority: 1, label: 'Priority 1 (Urgent)', shortLabel: 'P1' },
  { priority: 2, label: 'Priority 2 (High)', shortLabel: 'P2' },
  { priority: 3, label: 'Priority 3 (Medium)', shortLabel: 'P3' },
  { priority: 4, label: 'Priority 4 (Low)', shortLabel: 'P4' },
];

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function TaskDetail({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  availableTags: propsAvailableTags,
  onToggleTag,
  className,
}: TaskDetailProps) {
  const { tags: fetchedTags, assignTag: hookAssignTag, unassignTag: hookUnassignTag } = useTags();
  const allTags = propsAvailableTags || fetchedTags;

  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [, startTransition] = useTransition();

  // Sync state whenever active task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setIsConfirmingDelete(false);
    }
  }, [task?.id, task?.title, task?.description]);

  // Handle ESC key to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isConfirmingDelete) {
          setIsConfirmingDelete(false);
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isConfirmingDelete, onClose]);

  if (!isOpen || !task) {
    return null;
  }

  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS[4];

  // Quadrant metadata
  const isUrgent = task.urgent;
  const isImportant = task.important;

  let quadrantKey: keyof typeof QUADRANT_LABELS = 'not_urgent_not_important';
  let quadrantBadgeColor = 'bg-zinc-100 text-zinc-700 border-zinc-200';
  let quadrantNumber = 'IV';

  if (isUrgent && isImportant) {
    quadrantKey = 'urgent_important';
    quadrantBadgeColor = 'bg-red-50 text-red-700 border-red-200';
    quadrantNumber = 'I';
  } else if (!isUrgent && isImportant) {
    quadrantKey = 'not_urgent_important';
    quadrantBadgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
    quadrantNumber = 'II';
  } else if (isUrgent && !isImportant) {
    quadrantKey = 'urgent_not_important';
    quadrantBadgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
    quadrantNumber = 'III';
  }

  const quadrantLabel = QUADRANT_LABELS[quadrantKey];

  // Title save handler
  const handleTitleBlur = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(task.title);
      return;
    }
    if (trimmed !== task.title) {
      onUpdate?.(task.id, { title: trimmed });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  // Description save handler
  const handleDescriptionBlur = () => {
    const trimmed = description.trim();
    const currentVal = task.description || '';
    if (trimmed !== currentVal) {
      onUpdate?.(task.id, { description: trimmed || null });
    }
  };

  // Priority change handler
  const handlePriorityChange = (newPriority: Priority) => {
    if (task.priority !== newPriority) {
      onUpdate?.(task.id, { priority: newPriority });
    }
  };

  // Urgent toggle
  const handleToggleUrgent = () => {
    onUpdate?.(task.id, { urgent: !task.urgent });
  };

  // Important toggle
  const handleToggleImportant = () => {
    onUpdate?.(task.id, { important: !task.important });
  };

  // Completion toggle
  const handleToggleCompletion = () => {
    onUpdate?.(task.id, { completed: !task.completed });
  };

  // Tag toggle handler
  const handleTagClick = async (tag: Tag) => {
    const isAssigned = task.tags?.some((t) => t.id === tag.id) ?? false;
    if (onToggleTag) {
      await onToggleTag(task.id, tag, isAssigned);
    } else {
      if (isAssigned) {
        await hookUnassignTag(task.id, tag.id);
      } else {
        await hookAssignTag(task.id, tag.id);
      }
    }
  };

  // Delete handler
  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await onDelete?.(task.id);
      onClose();
    } catch {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40 lg:hidden transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Detail Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-full sm:max-w-md lg:w-96 bg-white border-l border-zinc-200 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out',
          className
        )}
      >
        {/* Top Action Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              role="checkbox"
              aria-checked={task.completed}
              aria-label={task.completed ? 'Mark task as incomplete' : 'Mark task as complete'}
              onClick={handleToggleCompletion}
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
            <span
              className={cn(
                'text-xs font-medium',
                task.completed ? 'text-zinc-500' : 'text-zinc-700'
              )}
            >
              {task.completed ? 'Completed' : 'Mark Complete'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              aria-label="Delete task"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close task details"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Banner */}
        {isConfirmingDelete && (
          <div className="bg-red-50/90 border-b border-red-200 px-5 py-3 shrink-0 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <div className="flex-1 text-xs text-red-900">
              <p className="font-semibold">Delete this task?</p>
              <p className="text-red-700 mt-0.5">This action cannot be undone.</p>
              <div className="flex items-center gap-2 mt-2.5">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteConfirm}
                  className="px-2.5 py-1 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-white/80 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Title Input */}
          <div>
            <label htmlFor="task-detail-title" className="sr-only">
              Task title
            </label>
            <input
              id="task-detail-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              placeholder="Task title"
              className={cn(
                'w-full text-base font-semibold text-zinc-900 bg-transparent border-0 border-b border-transparent focus:border-zinc-300 focus:outline-none transition-colors py-1 px-0 placeholder-zinc-300',
                task.completed && 'line-through text-zinc-400'
              )}
            />
          </div>

          {/* Description Textarea */}
          <div className="space-y-1.5">
            <label
              htmlFor="task-detail-description"
              className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block"
            >
              Description
            </label>
            <textarea
              id="task-detail-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              placeholder="Add details..."
              className="w-full text-sm text-zinc-800 bg-zinc-50/50 hover:bg-zinc-50/90 focus:bg-white border border-zinc-200 rounded-xl p-3 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y min-h-[90px]"
            />
          </div>

          {/* Priority Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
              Priority
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {PRIORITY_OPTIONS.map((opt) => {
                const isSelected = task.priority === opt.priority;
                const optColor = PRIORITY_COLORS[opt.priority];
                return (
                  <button
                    key={opt.priority}
                    type="button"
                    onClick={() => handlePriorityChange(opt.priority)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-xs font-medium transition-all cursor-pointer select-none',
                      isSelected
                        ? 'border-zinc-400 bg-zinc-900 text-white shadow-xs'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
                    )}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: optColor }}
                    />
                    <span>{opt.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Eisenhower Matrix Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                Eisenhower Matrix
              </label>
              <span
                className={cn(
                  'text-[11px] font-medium px-2 py-0.5 rounded-full border',
                  quadrantBadgeColor
                )}
              >
                Q{quadrantNumber}: {quadrantLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Urgent Toggle Button */}
              <button
                type="button"
                onClick={handleToggleUrgent}
                className={cn(
                  'flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer select-none',
                  task.urgent
                    ? 'bg-red-50/80 border-red-200 text-red-800'
                    : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                )}
              >
                <div className="flex items-center gap-2">
                  <Flame
                    className={cn('w-4 h-4', task.urgent ? 'text-red-500 fill-red-500/20' : 'text-zinc-400')}
                  />
                  <span>Urgent</span>
                </div>
                <div
                  className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                    task.urgent
                      ? 'bg-red-500 border-red-500 text-white'
                      : 'border-zinc-300 bg-white'
                  )}
                >
                  {task.urgent && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>

              {/* Important Toggle Button */}
              <button
                type="button"
                onClick={handleToggleImportant}
                className={cn(
                  'flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer select-none',
                  task.important
                    ? 'bg-blue-50/80 border-blue-200 text-blue-800'
                    : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                )}
              >
                <div className="flex items-center gap-2">
                  <Star
                    className={cn('w-4 h-4', task.important ? 'text-blue-500 fill-blue-500/20' : 'text-zinc-400')}
                  />
                  <span>Important</span>
                </div>
                <div
                  className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                    task.important
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'border-zinc-300 bg-white'
                  )}
                >
                  {task.important && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            </div>
          </div>

          {/* Tags Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5 text-zinc-400" />
                <span>Tags</span>
              </label>
              {task.tags && task.tags.length > 0 && (
                <span className="text-[11px] text-zinc-400">
                  {task.tags.length} assigned
                </span>
              )}
            </div>

            {allTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => {
                  const isAssigned = task.tags?.some((t) => t.id === tag.id) ?? false;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagClick(tag)}
                      style={{
                        backgroundColor: isAssigned ? `${tag.color}20` : 'transparent',
                        borderColor: isAssigned ? tag.color : `${tag.color}40`,
                        color: isAssigned ? tag.color : '#71717a',
                      }}
                      className={cn(
                        'group flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all cursor-pointer select-none',
                        isAssigned
                          ? 'font-semibold shadow-2xs'
                          : 'hover:border-zinc-400 hover:text-zinc-800'
                      )}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span>{tag.name}</span>
                      {isAssigned ? (
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      ) : (
                        <Plus className="w-3 h-3 opacity-40 group-hover:opacity-100" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic">
                No tags created yet. Create tags in the Tags section.
              </p>
            )}
          </div>
        </div>

        {/* Footer with Timestamps */}
        <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50/50 shrink-0 text-[11px] text-zinc-400 space-y-1">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>Created {formatDate(task.createdAt)}</span>
          </div>
          {task.completed && task.completedAt && (
            <div className="flex items-center gap-1.5 text-green-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completed {formatDate(task.completedAt)}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
