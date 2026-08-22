import React from 'react';
import { CheckSquare } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-zinc-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
            <CheckSquare className="w-5 h-5" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-zinc-900">Offload</span>
        </Link>
        <p className="mt-2 text-sm text-zinc-500">
          Focus on what is important and urgent.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-zinc-200/80 rounded-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}
