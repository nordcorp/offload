'use client';

import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AddTaskInputProps {
  onAdd: (title: string) => Promise<unknown> | void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export function AddTaskInput({
  onAdd,
  placeholder = 'Add a task... Press Enter to save',
  disabled = false,
  className,
  autoFocus = false,
}: AddTaskInputProps) {
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isSubmitting || disabled) return;

    setIsSubmitting(true);
    try {
      await onAdd(trimmedTitle);
      setTitle('');
    } catch {
      // Error handled by parent / hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-dashed border-zinc-300 bg-white/80 hover:bg-white hover:border-zinc-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white transition-all shadow-2xs',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
    >
      <button
        type="submit"
        disabled={!title.trim() || isSubmitting || disabled}
        aria-label="Add task"
        className={cn(
          'w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-zinc-400 transition-colors',
          title.trim() && !isSubmitting && 'text-blue-600 hover:bg-blue-50 cursor-pointer'
        )}
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
      </button>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isSubmitting || disabled}
        autoFocus={autoFocus}
        maxLength={500}
        className="w-full text-sm text-zinc-900 placeholder:text-zinc-400 bg-transparent border-none outline-none focus:ring-0 focus:outline-none p-0"
      />

      {title.trim() && (
        <button
          type="submit"
          disabled={isSubmitting || disabled}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-0.5 rounded-md hover:bg-blue-50 transition-colors shrink-0 cursor-pointer"
        >
          {isSubmitting ? 'Adding...' : 'Add'}
        </button>
      )}
    </form>
  );
}
