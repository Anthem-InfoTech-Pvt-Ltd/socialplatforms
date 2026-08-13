'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/store/AuthContext';
import Link from 'next/link';
import { User, Settings, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export function TopBar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const openMenu = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setMenuOpen(true);
  };

  const scheduleCloseMenu = () => {
    closeTimerRef.current = setTimeout(() => setMenuOpen(false), 200);
  };

  return (
    <header className="border-b border-border bg-card sticky top-0 z-40">
      <div className="flex items-center justify-end gap-3 px-6 h-20">
        <ThemeToggle />

        {user && (
          <div
            className="relative"
            ref={menuRef}
            onMouseEnter={openMenu}
            onMouseLeave={scheduleCloseMenu}
          >
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <img
                src={user.avatar?.trim() || '/image/user.png'}
                alt={user.name}
                className="w-9 h-9 rounded-full bg-muted object-cover border border-border"
                onError={(e) => { e.currentTarget.src = '/image/user.png'; }}
              />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                  <img
                    src={user.avatar?.trim() || '/image/user.png'}
                    alt={user.name}
                    className="w-9 h-9 rounded-full bg-muted object-cover border border-border shrink-0"
                    onError={(e) => { e.currentTarget.src = '/image/user.png'; }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user?.role?.replace('_', ' ') ?? 'user'}
                    </p>
                  </div>
                </div>
                <div className="py-1">
                  <Link href="/profile" className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors" onClick={() => setMenuOpen(false)}>
                    <User className="w-4 h-4 text-muted-foreground" />
                    Profile
                  </Link>
                  <Link href="/settings" className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors" onClick={() => setMenuOpen(false)}>
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    Settings
                  </Link>
                </div>
                <div className="py-1 border-t border-border">
                  <button
                    onClick={() => { setMenuOpen(false); logout(); }}
                    className="w-full flex items-center gap-2.5 text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}