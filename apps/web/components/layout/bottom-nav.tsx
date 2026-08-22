'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Inbox, LayoutGrid, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  className?: string;
}

export function BottomNav({ className }: BottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/inbox', label: 'Inbox', icon: Inbox },
    { href: '/matrix', label: 'Matrix', icon: LayoutGrid },
    { href: '/tags', label: 'Tags', icon: Tag },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className={cn(
        'lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-zinc-200 flex items-center justify-around px-2 z-30 select-none pb-[env(safe-area-inset-bottom)]',
        className
      )}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-lg text-xs transition-colors',
              isActive
                ? 'text-blue-600 font-semibold'
                : 'text-zinc-500 hover:text-zinc-900 active:text-zinc-900'
            )}
          >
            <Icon
              className={cn(
                'w-5 h-5 mb-1 transition-transform',
                isActive ? 'scale-110' : ''
              )}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
