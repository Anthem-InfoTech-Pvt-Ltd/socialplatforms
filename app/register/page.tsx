'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/AuthContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState<'name' | 'email' | 'password' | 'confirm' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      await register(email, name, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  const fieldClasses = (field: typeof focused extends infer T ? T : never) =>
    `flex items-center gap-2.5 rounded-xl border bg-white dark:bg-white/[0.03] px-3.5 py-2.5 transition-colors ${
      focused === field
        ? 'border-[#2B4C7E]/60 ring-2 ring-[#2B4C7E]/20'
        : 'border-slate-200 dark:border-white/10'
    }`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-[#0B0F1B] flex items-center justify-center px-4">
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none absolute -top-40 -left-32 h-96 w-96 rounded-full bg-[#2B4C7E] opacity-40 dark:opacity-30 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-[#3AA6C4] opacity-30 dark:opacity-20 blur-[120px]" />

      {/* Connection-node background pattern */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12] dark:opacity-[0.15]"
        aria-hidden="true"
      >
        <defs>
          <pattern id="grid-register" width="60" height="60" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1.5" className="fill-slate-500 dark:fill-[#8B9DFF]" />
            <line x1="1" y1="1" x2="60" y2="1" className="stroke-slate-500 dark:stroke-[#8B9DFF]" strokeWidth="0.5" opacity="0.3" />
            <line x1="1" y1="1" x2="1" y2="60" className="stroke-slate-500 dark:stroke-[#8B9DFF]" strokeWidth="0.5" opacity="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-register)" />
      </svg>

      <div className="relative w-full max-w-md">
        {/* Logo + heading */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2B4C7E] to-[#3AA6C4] shadow-[0_0_40px_-8px_rgba(43,76,126,0.5)]">
            <span className="text-2xl font-bold text-white">S</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Create account
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-[#9295B8]">
            Join SocialHub and manage all your social media
          </p>
        </div>

        {/* Glass card */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] p-7 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-[#9295B8]">
                Full Name
              </label>
              <div className={fieldClasses('name')}>
                <User size={16} className="shrink-0 text-slate-400 dark:text-[#9295B8]" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => setFocused('name')}
                  onBlur={() => setFocused(null)}
                  className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#6B6E8F] focus:outline-none"
                  placeholder="Enter your name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-[#9295B8]">
                Email
              </label>
              <div className={fieldClasses('email')}>
                <Mail size={16} className="shrink-0 text-slate-400 dark:text-[#9295B8]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#6B6E8F] focus:outline-none"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-[#9295B8]">
                Password
              </label>
              <div className={fieldClasses('password')}>
                <Lock size={16} className="shrink-0 text-slate-400 dark:text-[#9295B8]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#6B6E8F] focus:outline-none"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="shrink-0 text-slate-400 dark:text-[#9295B8] transition-colors hover:text-slate-700 dark:hover:text-white"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-[#9295B8]">
                Confirm Password
              </label>
              <div className={fieldClasses('confirm')}>
                <Lock size={16} className="shrink-0 text-slate-400 dark:text-[#9295B8]" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setFocused('confirm')}
                  onBlur={() => setFocused(null)}
                  className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#6B6E8F] focus:outline-none"
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="shrink-0 text-slate-400 dark:text-[#9295B8] transition-colors hover:text-slate-700 dark:hover:text-white"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5">
                <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-[#2B4C7E] to-[#3AA6C4] py-2.5 font-medium text-white shadow-lg shadow-[#2B4C7E]/20 transition-transform hover:scale-[1.02] hover:from-[#375D96] hover:to-[#4EBBDA] active:scale-[0.98]"
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500 dark:text-[#9295B8]">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-[#2B4C7E] dark:text-[#7FB4E8] hover:text-slate-900 dark:hover:text-white transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}