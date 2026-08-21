export const PRIORITY_COLORS = {
  1: '#ef4444', // red
  2: '#f97316', // orange
  3: '#3b82f6', // blue
  4: '#9ca3af', // gray
} as const;

export const QUADRANT_LABELS = {
  urgent_important: 'Do First',
  not_urgent_important: 'Schedule',
  urgent_not_important: 'Delegate',
  not_urgent_not_important: 'Eliminate',
} as const;

export type Priority = 1 | 2 | 3 | 4;
export type QuadrantKey = keyof typeof QUADRANT_LABELS;
