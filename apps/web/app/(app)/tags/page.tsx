'use client';

import React from 'react';
import { Tag } from 'lucide-react';
import { TagManager } from '@/components/tags';

export default function TagsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
          <Tag className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Tags</h1>
          <p className="text-xs text-zinc-500">
            Create, manage, and color-code tags to categorize tasks across projects
          </p>
        </div>
      </div>

      {/* Tag Management System */}
      <TagManager />
    </div>
  );
}
