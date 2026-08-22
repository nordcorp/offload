'use client';

import React from 'react';
import { Tag } from 'lucide-react';

export default function TagsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
          <Tag className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Tags</h1>
          <p className="text-xs text-zinc-500">Organize and filter your tasks across projects</p>
        </div>
      </div>

      <div className="text-center py-16 border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
        <Tag className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
        <h2 className="text-base font-semibold text-zinc-900">No tags created yet</h2>
        <p className="text-sm text-zinc-500 max-w-sm mx-auto mt-1">
          Create tags to categorize and label your tasks.
        </p>
      </div>
    </div>
  );
}
