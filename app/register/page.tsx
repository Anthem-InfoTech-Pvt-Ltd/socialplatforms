'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/store/AuthContext';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Mail, Lock, User, Loader2, AlertCircle, Check, X } from 'lucide-react';

const APP_NAME = 'SocialPosts';

const fieldWrap =
  'flex items-center gap-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-3.5 py-3 transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20';
const labelCls = 'mb-1.5 block text-sm font-medium text-slate-900 dark:text-slate-100';
const inputCls =
  'auth-input w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none';
const iconCls = 'shrink-0 text-slate-400';
const eyeBtn =
  'shrink-0 rounded text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50';

const STRENGTH = [
  { label: 'Too weak', bar: 'bg-red-500', text: 'text-red-500' },
  { label: 'Weak', bar: 'bg-orange-500', text: 'text-orange-500' },
  { label: 'Okay', bar: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400' },
  { label: 'Good', bar: 'bg-lime-500', text: 'text-lime-600 dark:text-lime-400' },
  { label: 'Strong', bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const clearError = () => error && setError('');

  const score = useMemo(() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 10) s++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) s++;
    if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) s++;
    return s;
  }, [password]);

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
      await register(email.trim(), name.trim(), password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
            Connect your social accounts and post to all of them in one go.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/90 dark:bg-white/[0.05] p-7 shadow-xl shadow-slate-300/40 dark:shadow-black/30 backdrop-blur">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Create your account</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Start posting to all your social accounts
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className={labelCls}>Full Name</label>
              <div className={fieldWrap}>
                <User size={16} className={iconCls} />
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  autoFocus
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearError();
                  }}
                  className={inputCls}
                  placeholder="Enter your name"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className={labelCls}>Email</label>
              <div className={fieldWrap}>
                <Mail size={16} className={iconCls} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearError();
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
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearError();
                  }}
                  className={inputCls}
                  placeholder="At least 6 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className={eyeBtn}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {password && (
                <div className="mt-2" aria-live="polite">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${i <= score ? STRENGTH[score].bar : 'bg-slate-200 dark:bg-white/10'
                          }`}
                      />
                    ))}
                  </div>
                  <p className={`mt-1 text-xs ${STRENGTH[score].text}`}>{STRENGTH[score].label}</p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirm" className={labelCls}>Confirm Password</label>
              <div className={fieldWrap}>
                <Lock size={16} className={iconCls} />
                <input
                  id="confirm"
                  name="confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearError();
                  }}
                  className={inputCls}
                  placeholder="Re-enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((p) => !p)}
                  className={eyeBtn}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {confirmPassword && (
                <p
                  className={`mt-1.5 flex items-center gap-1 text-xs ${password === confirmPassword
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-500 dark:text-red-400'
                    }`}
                  aria-live="polite"
                >
                  {password === confirmPassword ? (
                    <><Check size={12} /> Passwords match</>
                  ) : (
                    <><X size={12} /> Passwords don&apos;t match</>
                  )}
                </p>
              )}
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-2.5">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !name || !email || !password || !confirmPassword}
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Creating your account...
                </span>
              ) : (
                'Sign Up'
              )}
            </Button>

            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              By signing up, you agree to our{' '}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-slate-900 dark:hover:text-white">
                Privacy Policy
              </Link>
              .
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
              Sign In
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