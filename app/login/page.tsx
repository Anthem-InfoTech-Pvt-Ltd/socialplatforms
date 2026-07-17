'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/AuthContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B0C1B] flex items-center justify-center px-4">
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none absolute -top-40 -left-32 h-96 w-96 rounded-full bg-[#6D5EF5] opacity-30 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-[#F45B9C] opacity-20 blur-[120px]" />

      {/* Connection-node background pattern */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.15]"
        aria-hidden="true"
      >
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1.5" fill="#8B8DFF" />
            <line x1="1" y1="1" x2="60" y2="1" stroke="#8B8DFF" strokeWidth="0.5" opacity="0.3" />
            <line x1="1" y1="1" x2="1" y2="60" stroke="#8B8DFF" strokeWidth="0.5" opacity="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      <div className="relative w-full max-w-md">
        {/* Logo + heading */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7C6FF0] to-[#F45B9C] shadow-[0_0_40px_-8px_rgba(124,111,240,0.6)]">
            <span className="text-2xl font-bold text-white">S</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-[#9295B8]">
            Sign in to pick up where you left off
          </p>
        </div>

        {/* Glass card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#9295B8]">
                Email
              </label>
              <div
                className={`flex items-center gap-2.5 rounded-xl border bg-white/[0.03] px-3.5 py-2.5 transition-colors ${
                  focused === 'email'
                    ? 'border-[#7C6FF0]/60 ring-2 ring-[#7C6FF0]/20'
                    : 'border-white/10'
                }`}
              >
                <Mail size={16} className="shrink-0 text-[#9295B8]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  className="w-full bg-transparent text-sm text-white placeholder:text-[#6B6E8F] focus:outline-none"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#9295B8]">
                Password
              </label>
              <div
                className={`flex items-center gap-2.5 rounded-xl border bg-white/[0.03] px-3.5 py-2.5 transition-colors ${
                  focused === 'password'
                    ? 'border-[#7C6FF0]/60 ring-2 ring-[#7C6FF0]/20'
                    : 'border-white/10'
                }`}
              >
                <Lock size={16} className="shrink-0 text-[#9295B8]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  className="w-full bg-transparent text-sm text-white placeholder:text-[#6B6E8F] focus:outline-none"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="shrink-0 text-[#9295B8] transition-colors hover:text-white"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-[#7C6FF0] to-[#F45B9C] py-2.5 font-medium text-white shadow-lg shadow-[#7C6FF0]/20 transition-transform hover:scale-[1.02] hover:from-[#8B7FFF] hover:to-[#FF6FAD] active:scale-[0.98]"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-[#9295B8]">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium text-[#A79BFF] hover:text-white transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}