'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/store/AuthContext';
import Link from 'next/link';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/compose', label: 'Compose' },
  { href: '/accounts', label: 'Accounts' },
  { href: '/history', label: 'History' },
  { href: '/analytics', label: 'Analytics' },
];

export function Header() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="flex items-center justify-between px-20 h-20">
        {/* Logo */}
       <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
  <div className="w-11 h-11 rounded-full flex items-center justify-center overflow-hidden ring-1 ring-border shadow-sm bg-card">
    <img
      src="/image/logo.png"
      alt="Logo"
      className="w-full h-full object-contain"
    />
  </div>
  <span className="text-2xl font-semibold text-foreground tracking-tight hidden sm:inline">
    SocialHub
  </span>
</Link>

        {/* Nav — text only */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Profile */}
        <div className="flex items-center gap-4">
          {user && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <img
                  src={user.avatar?.trim() || '/image/user.png'}
                  alt={user.name}
                  className="w-9 h-9 rounded-full bg-muted object-cover border border-border"
                  onError={(e) => {
                    e.currentTarget.src = '/image/user.png';
                  }}
                />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user?.role?.replace('_', ' ') ?? 'user'}
                    </p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      className="block px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      Settings
                    </Link>
                  </div>
                  <div className="py-1 border-t border-border">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}