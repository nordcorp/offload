'use client';

import React, { useState } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { MatrixResponse, Task, QuadrantKey } from '@offload/shared';
import { Quadrant, MatrixTaskCard } from './quadrant';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EisenhowerMatrixProps {
  matrix: MatrixResponse;
  onMoveTask: (taskId: string, targetQuadrant: QuadrantKey) => Promise<void> | void;
  onAddTask: (title: string, quadrant: QuadrantKey) => Promise<unknown> | void;
  onSelectTask?: (task: Task) => void;
  onToggleTask?: (id: string, completed: boolean) => void;
  onDeleteTask?: (id: string) => void;
  isLoading?: boolean;
  className?: string;
}

const QUADRANTS: QuadrantKey[] = [
  'urgent_important',
  'not_urgent_important',
  'urgent_not_important',
  'not_urgent_not_important',
];

export function EisenhowerMatrix({
  matrix,
  onMoveTask,
  onAddTask,
  onSelectTask,
  onToggleTask,
  onDeleteTask,
  isLoading = false,
  className,
}: EisenhowerMatrixProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findTaskById = (id: string): { task: Task; quadrant: QuadrantKey } | null => {
    for (const qKey of QUADRANTS) {
      const taskList = matrix[qKey] || [];
      const found = taskList.find((t) => t.id === id);
      if (found) {
        return { task: found, quadrant: qKey };
      }
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = String(event.active.id);
    const found = findTaskById(activeId);
    if (found) {
      setActiveTask(found.task);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const source = findTaskById(activeId);
    if (!source) return;

    // Check if dropped directly onto a quadrant or over another task
    let targetQuadrant: QuadrantKey | null = null;
    if (QUADRANTS.includes(overId as QuadrantKey)) {
      targetQuadrant = overId as QuadrantKey;
    } else {
      const overTarget = findTaskById(overId);
      if (overTarget) {
        targetQuadrant = overTarget.quadrant;
      }
    }

    if (targetQuadrant && targetQuadrant !== source.quadrant) {
      onMoveTask(activeId, targetQuadrant);
    }
  };

  const handleDragCancel = () => {
    setActiveTask(null);
  };

  const totalTasks =
    (matrix.urgent_important?.length || 0) +
    (matrix.not_urgent_important?.length || 0) +
    (matrix.urgent_not_important?.length || 0) +
    (matrix.not_urgent_not_important?.length || 0);

  if (isLoading && totalTasks === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-600" />
        <span className="text-sm font-medium">Loading matrix...</span>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className={cn('space-y-4', className)}>
        {/* Matrix Grid: Responsive 1 col on mobile, 2x2 grid on md+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
          {/* Q1: Urgent & Important (Do First) */}
          <Quadrant
            quadrantKey="urgent_important"
            tasks={matrix.urgent_important || []}
            onAddTask={onAddTask}
            onSelectTask={onSelectTask}
            onToggleTask={onToggleTask}
            onDeleteTask={onDeleteTask}
          />

          {/* Q2: Not Urgent & Important (Schedule) */}
          <Quadrant
            quadrantKey="not_urgent_important"
            tasks={matrix.not_urgent_important || []}
            onAddTask={onAddTask}
            onSelectTask={onSelectTask}
            onToggleTask={onToggleTask}
            onDeleteTask={onDeleteTask}
          />

          {/* Q3: Urgent & Not Important (Delegate) */}
          <Quadrant
            quadrantKey="urgent_not_important"
            tasks={matrix.urgent_not_important || []}
            onAddTask={onAddTask}
            onSelectTask={onSelectTask}
            onToggleTask={onToggleTask}
            onDeleteTask={onDeleteTask}
          />

          {/* Q4: Not Urgent & Not Important (Eliminate) */}
          <Quadrant
            quadrantKey="not_urgent_not_important"
            tasks={matrix.not_urgent_not_important || []}
            onAddTask={onAddTask}
            onSelectTask={onSelectTask}
            onToggleTask={onToggleTask}
            onDeleteTask={onDeleteTask}
          />
        </div>

        {/* Drag Overlay for smooth dragging preview */}
        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div className="w-[300px] max-w-full">
              <MatrixTaskCard task={activeTask} isDragOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
