'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { AlertTriangle, Loader2, X, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectsProvider } from '@/hooks/use-projects';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, authError, retryAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user && !authError) {
      router.replace('/login');
    }
  }, [user, isLoading, authError, router]);

  // Close mobile drawer on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Handle escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium text-zinc-500">Loading Offload...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold text-zinc-900">Session check unavailable</h1>
          <p className="mt-2 text-sm text-zinc-600">{authError}</p>
          <button
            type="button"
            onClick={() => void retryAuth()}
            className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ProjectsProvider>
      <div className="flex h-screen flex-col bg-zinc-50 overflow-hidden">
        {/* Top Application Header */}
        <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

        {/* Main Body Shell */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Desktop Sidebar */}
          <Sidebar className="hidden lg:block w-64 shrink-0" />

          {/* Mobile Slide-Over Drawer */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}

          <div
            className={cn(
              'fixed inset-y-0 left-0 w-72 max-w-[80vw] bg-white z-50 shadow-2xl flex flex-col transition-transform duration-200 ease-in-out lg:hidden',
              sidebarOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
            )}
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-200 shrink-0">
              <div className="flex items-center gap-2 font-bold text-zinc-900">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <span>Offload</span>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close menu"
                className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Sidebar onNavigate={() => setSidebarOpen(false)} className="border-r-0 h-full" />
            </div>
          </div>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto bg-white pb-16 lg:pb-0">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </div>
    </ProjectsProvider>
  );
}
