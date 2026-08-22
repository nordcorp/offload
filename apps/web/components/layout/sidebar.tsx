'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Inbox,
  LayoutGrid,
  Tag,
  Plus,
  Trash2,
  Folder,
  Loader2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjects } from '@/hooks/use-projects';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  onNavigate?: () => void;
  className?: string;
}

const PRESET_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
];

export function Sidebar({ onNavigate, className }: SidebarProps) {
  const pathname = usePathname();
  const { projects, isLoading, createProject, deleteProject } = useProjects();

  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[5]); // Default blue
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const mainNavItems = [
    { href: '/inbox', label: 'Inbox', icon: Inbox },
    { href: '/matrix', label: 'Matrix', icon: LayoutGrid },
    { href: '/tags', label: 'Tags', icon: Tag },
  ];

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setIsSubmitting(true);
    setCreateError(null);
    try {
      await createProject({
        name: newProjectName.trim(),
        color: selectedColor,
      });
      setNewProjectName('');
      setSelectedColor(PRESET_COLORS[5]);
      setIsCreating(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create project';
      setCreateError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this project?')) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteProject(id);
    } catch {
      // Failed to delete
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-zinc-50 border-r border-zinc-200 select-none',
        className
      )}
    >
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Main Navigation */}
        <nav className="space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0',
                    isActive ? 'text-blue-600' : 'text-zinc-500'
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Projects Section */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Projects
            </span>
            <button
              type="button"
              onClick={() => setIsCreating((prev) => !prev)}
              aria-label="Add project"
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors"
            >
              {isCreating ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>

          {/* Inline Project Creation Form */}
          {isCreating && (
            <form
              onSubmit={handleCreateProject}
              className="p-3 mb-2 bg-white rounded-xl border border-zinc-200 shadow-xs space-y-3"
            >
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name"
                autoFocus
                maxLength={100}
                className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />

              {/* Color Picker Palette */}
              <div>
                <span className="block text-xs text-zinc-500 mb-1.5">Color</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                      className={cn(
                        'w-5 h-5 rounded-full transition-transform cursor-pointer',
                        selectedColor === color
                          ? 'ring-2 ring-offset-2 ring-zinc-800 scale-110'
                          : 'hover:scale-105 opacity-80 hover:opacity-100'
                      )}
                    />
                  ))}
                </div>
              </div>

              {createError && (
                <p className="text-xs text-red-600 font-medium">{createError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsCreating(false);
                    setNewProjectName('');
                    setCreateError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSubmitting}
                  disabled={!newProjectName.trim() || isSubmitting}
                >
                  Add Project
                </Button>
              </div>
            </form>
          )}

          {/* Projects List */}
          <div className="space-y-0.5">
            {isLoading ? (
              <div className="flex items-center justify-center py-4 text-zinc-400">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-xs">Loading projects...</span>
              </div>
            ) : projects.length === 0 ? (
              <div className="px-3 py-3 text-xs text-zinc-400 flex items-center gap-2">
                <Folder className="w-3.5 h-3.5 shrink-0 text-zinc-300" />
                <span>No projects yet</span>
              </div>
            ) : (
              projects.map((project) => {
                const isActive = pathname === `/projects/${project.id}`;
                const taskCount = project._count?.tasks ?? 0;
                const isDeleting = deletingId === project.id;

                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    onClick={onNavigate}
                    className={cn(
                      'group flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="truncate">{project.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {taskCount > 0 && (
                        <span
                          className={cn(
                            'text-xs px-1.5 py-0.5 rounded-full',
                            isActive
                              ? 'bg-blue-200/70 text-blue-800'
                              : 'bg-zinc-200/70 text-zinc-600 group-hover:bg-zinc-200'
                          )}
                        >
                          {taskCount}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteProject(e, project.id)}
                        disabled={isDeleting}
                        aria-label={`Delete ${project.name}`}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-200 text-zinc-400 hover:text-red-600 transition-opacity"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
