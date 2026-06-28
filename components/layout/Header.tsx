'use client';

import { useAuth } from '@/store/AuthContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">S</span>
          </div>
          <span className="text-xl font-bold text-foreground hidden sm:inline">
            SocialHub
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link
            href="/dashboard"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/compose"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md transition-colors"
          >
            Compose
          </Link>
          <Link
            href="/accounts"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md transition-colors"
          >
            Accounts
          </Link>
          <Link
            href="/history"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md transition-colors"
          >
            History
          </Link>
          <Link
            href="/analytics"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md transition-colors"
          >
            Analytics
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user?.role?.replace('_', ' ') ?? 'user'}
                </p>
              </div>
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-full bg-muted"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-muted-foreground hover:text-foreground"
              >
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
