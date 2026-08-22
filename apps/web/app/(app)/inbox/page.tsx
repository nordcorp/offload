'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Inbox, LogOut } from 'lucide-react';

export default function InboxPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Inbox className="w-4 h-4" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900">Inbox</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-600">
            Welcome, <span className="font-medium text-zinc-900">{user?.name || user?.email}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout()}
            className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-900"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center py-16 border-2 border-dashed border-zinc-200 rounded-2xl">
          <Inbox className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-zinc-900">Your inbox is clear</h2>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto mt-1">
            Tasks without an assigned project will appear here.
          </p>
        </div>
      </main>
    </div>
  );
}
