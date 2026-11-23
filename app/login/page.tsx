'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/store/AuthContext';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

const APP_NAME = 'SocialPosts';

const fieldWrap =
  'flex items-center gap-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-3.5 py-3 transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20';
const labelCls = 'mb-1.5 block text-sm font-medium text-slate-900 dark:text-slate-100';
const inputCls =
  'auth-input w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none';
const iconCls = 'shrink-0 text-slate-400';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email.trim(), password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 dark:from-[#0B0F1B] dark:via-[#0F1526] dark:to-[#111A33] flex flex-col items-center justify-center px-4 py-10">
      <div className="auth-enter w-full max-w-md">
        {/* Logo + heading */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3">
            <Image src="/image/logo.png" alt={`${APP_NAME} logo`} width={44} height={44} priority className="h-11 w-11 object-contain" />
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{APP_NAME}</h1>
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            Write one post and publish it to all your social accounts, or just the ones you choose.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/90 dark:bg-white/[0.05] p-7 shadow-xl shadow-slate-300/40 dark:shadow-black/30 backdrop-blur">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Welcome back</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Sign in to manage your accounts and publish posts
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className={labelCls}>Email</label>
              <div className={fieldWrap}>
                <Mail size={16} className={iconCls} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  className={inputCls}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className={labelCls}>Password</label>
              <div className={fieldWrap}>
                <Lock size={16} className={iconCls} />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  onKeyUp={(e) => setCapsOn(e.getModifierState('CapsLock'))}
                  onBlur={() => setCapsOn(false)}
                  className={inputCls}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="shrink-0 rounded text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {capsOn && <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">Caps Lock is on</p>}
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-2.5">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
              Sign Up
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-500 dark:text-slate-500">
          © {new Date().getFullYear()} Anthem Infotech Private Limited. All rights reserved.
        </p>
      </div>
    </div>
  );
}
