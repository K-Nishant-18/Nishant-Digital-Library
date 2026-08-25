import { redirect } from 'next/navigation';
import { BookOpen, Lock } from 'lucide-react';
import { loginAction } from './actions';
import { isAuthenticated } from '@/lib/auth';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAuthenticated()) redirect('/');
  const { error } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0b0c0d] px-4">
      <div className="w-full max-w-sm bg-slate-900/80 border border-white/10 rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/my-logo.png" alt="My Library" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen size={18} className="text-amber-500" /> My Library
          </h1>
          <p className="text-xs text-slate-400">A private command center. Sign in to continue.</p>
        </div>

        {error && (
          <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-center">
            Incorrect password. Please try again.
          </div>
        )}

        <form action={loginAction} className="space-y-4">
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              name="password"
              type="password"
              required
              autoFocus
              placeholder="Password"
              className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
          >
            Sign In
          </button>
        </form>

        <p className="text-[11px] text-slate-500 text-center">
          Session lasts 30 days on this device.
        </p>
      </div>
    </main>
  );
}
