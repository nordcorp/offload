'use client';

import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { QUADRANT_LABELS } from '@offload/shared';

export default function MatrixPage() {
  const quadrants = [
    {
      key: 'urgent_important',
      label: QUADRANT_LABELS.urgent_important,
      subtitle: 'Urgent & Important',
      bgClass: 'bg-red-50/50 border-red-200 text-red-700',
    },
    {
      key: 'not_urgent_important',
      label: QUADRANT_LABELS.not_urgent_important,
      subtitle: 'Not Urgent & Important',
      bgClass: 'bg-blue-50/50 border-blue-200 text-blue-700',
    },
    {
      key: 'urgent_not_important',
      label: QUADRANT_LABELS.urgent_not_important,
      subtitle: 'Urgent & Not Important',
      bgClass: 'bg-amber-50/50 border-amber-200 text-amber-700',
    },
    {
      key: 'not_urgent_not_important',
      label: QUADRANT_LABELS.not_urgent_not_important,
      subtitle: 'Not Urgent & Not Important',
      bgClass: 'bg-zinc-50 border-zinc-200 text-zinc-700',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
          <LayoutGrid className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Eisenhower Matrix</h1>
          <p className="text-xs text-zinc-500">Prioritize tasks based on urgency and importance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[500px]">
        {quadrants.map((q) => (
          <div
            key={q.key}
            className={`p-5 rounded-2xl border ${q.bgClass} flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-base">{q.label}</h2>
                <span className="text-xs font-medium opacity-75">{q.subtitle}</span>
              </div>
            </div>
            <div className="py-12 text-center text-xs opacity-60">
              Tasks will appear here
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
