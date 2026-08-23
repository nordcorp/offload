'use client';

import React, { useState } from 'react';
import {
  Tag as TagIcon,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  Check,
  Palette,
  RefreshCw,
  Search,
} from 'lucide-react';
import type { Tag } from '@offload/shared';
import { useTags } from '@/hooks/use-tags';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const PRESET_COLORS = [
  { hex: '#ef4444', label: 'Red' },
  { hex: '#f97316', label: 'Orange' },
  { hex: '#eab308', label: 'Yellow' },
  { hex: '#10b981', label: 'Emerald' },
  { hex: '#06b6d4', label: 'Cyan' },
  { hex: '#3b82f6', label: 'Blue' },
  { hex: '#8b5cf6', label: 'Purple' },
  { hex: '#ec4899', label: 'Pink' },
];

export function TagManager() {
  const { tags, isLoading, error, createTag, deleteTag, refetch } = useTags();

  // Create form state
  const [tagName, setTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[5].hex); // Default blue
  const [customHex, setCustomHex] = useState(PRESET_COLORS[5].hex);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Search filter for tag list
  const [searchQuery, setSearchQuery] = useState('');

  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Validate 6-digit hex format
  const isValidHex = (hex: string) => /^#[0-9a-fA-F]{6}$/.test(hex);

  const handlePresetSelect = (hex: string) => {
    setSelectedColor(hex);
    setCustomHex(hex);
    setFormError(null);
  };

  const handleCustomHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.trim();
    if (!val.startsWith('#')) {
      val = `#${val}`;
    }
    setCustomHex(val);
    if (isValidHex(val)) {
      setSelectedColor(val);
      setFormError(null);
    }
  };

  const handleNativeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomHex(val);
    setSelectedColor(val);
    setFormError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = tagName.trim();

    if (!trimmedName) {
      setFormError('Please enter a tag name');
      return;
    }

    if (!isValidHex(selectedColor)) {
      setFormError('Please select or enter a valid hex color (#RRGGBB)');
      return;
    }

    // Check if duplicate tag name exists
    const duplicate = tags.find(
      (t) => t.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      setFormError(`A tag named "${duplicate.name}" already exists`);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await createTag({
        name: trimmedName,
        color: selectedColor.toLowerCase(),
      });
      setTagName('');
      setFormError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create tag';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (tag: Tag) => {
    setIsDeletingId(tag.id);
    try {
      await deleteTag(tag.id);
      setConfirmDeleteId(null);
    } catch {
      // Error handled by hook
    } finally {
      setIsDeletingId(null);
    }
  };

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            className="shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Create Tag Form Card */}
        <div className="lg:col-span-5 bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">Create New Tag</h2>
              <p className="text-xs text-zinc-500">Add a tag to categorize your tasks</p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="space-y-5">
            {/* Tag Name Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="tag-name-input"
                className="text-xs font-semibold text-zinc-600 uppercase tracking-wider block"
              >
                Tag Name
              </label>
              <input
                id="tag-name-input"
                type="text"
                value={tagName}
                onChange={(e) => {
                  setTagName(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="e.g. Work, Urgent, Bug, Personal"
                maxLength={50}
                autoFocus
                disabled={isSubmitting}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50 hover:bg-zinc-50/90 focus:bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
              />
            </div>

            {/* Color Selection */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider block">
                  Color
                </label>
                <span className="text-[11px] font-mono font-medium text-zinc-500 uppercase">
                  {selectedColor}
                </span>
              </div>

              {/* Preset Color Swatches */}
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {PRESET_COLORS.map((color) => {
                  const isSelected =
                    selectedColor.toLowerCase() === color.hex.toLowerCase();
                  return (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => handlePresetSelect(color.hex)}
                      aria-label={`Select ${color.label} color`}
                      style={{ backgroundColor: color.hex }}
                      className={cn(
                        'h-9 rounded-xl transition-all cursor-pointer flex items-center justify-center relative shadow-2xs',
                        isSelected
                          ? 'ring-2 ring-offset-2 ring-zinc-900 scale-105 shadow-sm'
                          : 'hover:scale-105 opacity-85 hover:opacity-100'
                      )}
                    >
                      {isSelected && (
                        <Check className="w-4 h-4 text-white stroke-[3] drop-shadow-xs" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom Hex Input & HTML Color Picker */}
              <div className="pt-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex items-center">
                    <input
                      type="color"
                      id="native-color-picker"
                      value={isValidHex(customHex) ? customHex : '#3b82f6'}
                      onChange={handleNativeColorChange}
                      aria-label="Pick custom color"
                      className="w-9 h-9 rounded-xl border border-zinc-200 cursor-pointer p-0.5 bg-white shadow-2xs overflow-hidden"
                    />
                  </div>

                  <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                      <Palette className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={customHex}
                      onChange={handleCustomHexChange}
                      placeholder="#3b82f6"
                      maxLength={7}
                      disabled={isSubmitting}
                      className={cn(
                        'w-full text-xs font-mono pl-8 pr-3 py-2 rounded-xl border bg-zinc-50/50 hover:bg-zinc-50/90 focus:bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none transition-all shadow-2xs',
                        !isValidHex(customHex) && customHex.length > 0
                          ? 'border-amber-400 focus:ring-2 focus:ring-amber-400/20'
                          : 'border-zinc-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Live Tag Badge Preview */}
            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1.5">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Preview
              </span>
              <div className="flex items-center gap-2">
                <span
                  style={{
                    backgroundColor: `${isValidHex(selectedColor) ? selectedColor : '#3b82f6'}18`,
                    color: isValidHex(selectedColor) ? selectedColor : '#3b82f6',
                    borderColor: `${isValidHex(selectedColor) ? selectedColor : '#3b82f6'}35`,
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold shadow-2xs transition-all"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: isValidHex(selectedColor) ? selectedColor : '#3b82f6',
                    }}
                  />
                  <span>{tagName.trim() || 'Sample Tag'}</span>
                </span>
              </div>
            </div>

            {/* Error Message */}
            {formError && (
              <p className="text-xs text-red-600 font-medium">{formError}</p>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!tagName.trim() || isSubmitting}
              isLoading={isSubmitting}
              className="w-full py-2.5 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create Tag
            </Button>
          </form>
        </div>

        {/* Right Column: Existing Tags List Card */}
        <div className="lg:col-span-7 bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          {/* Header with Search & Count */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center font-bold text-xs">
                <TagIcon className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-base font-bold text-zinc-900">Existing Tags</h2>
              {tags.length > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                  {tags.length}
                </span>
              )}
            </div>

            {/* Tag Search Input */}
            {tags.length > 3 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter tags..."
                  className="text-xs pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-white focus:bg-white text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-full sm:w-44"
                />
              </div>
            )}
          </div>

          {/* Tag List Body */}
          {isLoading && tags.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
              <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-600" />
              <span className="text-xs font-medium">Loading tags...</span>
            </div>
          ) : tags.length === 0 ? (
            <div className="text-center py-14 px-4 border-2 border-dashed border-zinc-200 rounded-xl bg-zinc-50/50 select-none">
              <TagIcon className="w-10 h-10 text-zinc-300 mx-auto mb-2.5" />
              <h3 className="text-sm font-semibold text-zinc-800">No tags created yet</h3>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-1">
                Create your first tag using the form to organize and label tasks across your workspace.
              </p>
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="text-center py-10 px-4 border border-dashed border-zinc-200 rounded-xl text-zinc-500">
              <p className="text-xs">No tags matching &ldquo;{searchQuery}&rdquo;</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-blue-600 hover:underline mt-1 font-medium cursor-pointer"
              >
                Clear filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredTags.map((tag) => {
                const isConfirming = confirmDeleteId === tag.id;
                const isDeleting = isDeletingId === tag.id;

                return (
                  <div
                    key={tag.id}
                    className={cn(
                      'group flex items-center justify-between p-3 rounded-xl border transition-all select-none',
                      isConfirming
                        ? 'border-red-300 bg-red-50/40 ring-1 ring-red-300'
                        : 'border-zinc-200/90 bg-white hover:border-zinc-300 hover:shadow-2xs'
                    )}
                  >
                    {isConfirming ? (
                      /* Delete Confirmation Row */
                      <div className="flex items-center justify-between w-full gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-red-900 truncate">
                            Delete &ldquo;{tag.name}&rdquo;?
                          </p>
                          <p className="text-[10px] text-red-600 truncate">
                            Will unassign from tasks
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handleDelete(tag)}
                            className="px-2.5 py-1 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer shadow-2xs"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              'Delete'
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Standard Tag Row */
                      <>
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span
                            style={{
                              backgroundColor: `${tag.color}18`,
                              color: tag.color,
                              borderColor: `${tag.color}35`,
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold truncate shadow-2xs"
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className="truncate">{tag.name}</span>
                          </span>

                          <span className="text-[10px] font-mono text-zinc-400 hidden sm:inline-block uppercase">
                            {tag.color}
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(tag.id)}
                            aria-label={`Delete tag ${tag.name}`}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
