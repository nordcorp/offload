'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useProjects } from '@/hooks/use-projects';
import { Folder, Loader2 } from 'lucide-react';

export default function ProjectPage() {
  const params = useParams();
  const projectId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const { projects, isLoading } = useProjects();

  const project = projects.find((p) => p.id === projectId);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
        <span className="text-sm text-zinc-500">Loading project...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
          style={{ backgroundColor: project?.color || '#3b82f6' }}
        >
          <Folder className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">
            {project?.name || 'Project'}
          </h1>
          <p className="text-xs text-zinc-500">Manage tasks for this project</p>
        </div>
      </div>

      <div className="text-center py-16 border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
        <Folder className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
        <h2 className="text-base font-semibold text-zinc-900">No tasks in this project</h2>
        <p className="text-sm text-zinc-500 max-w-sm mx-auto mt-1">
          Tasks assigned to {project?.name || 'this project'} will appear here.
        </p>
      </div>
    </div>
  );
}
