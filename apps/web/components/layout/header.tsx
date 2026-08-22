'use client';

import React from 'react';
import Link from 'next/link';
import { Menu, LogOut, CheckSquare } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onToggleSidebar?: () => void;
  className?: string;
}

export function Header({ onToggleSidebar, className }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header
      className={cn(
        'h-14 border-b border-zinc-200 bg-white px-4 flex items-center justify-between shrink-0 select-none z-20',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="p-2 rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 lg:hidden focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand Logo & Name */}
        <Link
          href="/inbox"
          className="flex items-center gap-2.5 font-bold text-lg text-zinc-900 tracking-tight"
        >
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <CheckSquare className="w-4 h-4" />
          </div>
          <span>Offload</span>
        </Link>
      </div>

      {/* User Info & Actions */}
      <div className="flex items-center gap-3">
        {user && (
          <span className="text-sm text-zinc-600 hidden sm:inline-block">
            <span className="font-medium text-zinc-900">{user.name || user.email}</span>
          </span>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => logout()}
          className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-900"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
}
