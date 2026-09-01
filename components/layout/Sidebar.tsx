'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/store/AuthContext';
import {
  LayoutDashboard,
  PenSquare,
  Users2,
  History,
  Settings,
  LogOut,
  PanelLeftOpen,
  PanelLeftClose,
} from 'lucide-react';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/compose', label: 'Compose', icon: PenSquare },
  { href: '/accounts', label: 'Accounts', icon: Users2 },
  { href: '/history', label: 'History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  // Collapsed (narrow, icons-only) by default.
  const [collapsed, setCollapsed] = useState(true);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <aside
      className={`hidden md:flex md:flex-col shrink-0 h-screen sticky top-0 border-r border-border bg-card transition-all duration-200 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo */}
      <Link
        href="/dashboard"
        className={`flex items-center gap-2.5 h-20 border-b border-border shrink-0 ${
          collapsed ? 'justify-center px-0' : 'px-6'
        }`}
      >
        <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden ring-1 ring-border bg-card shrink-0">
          <img src="/image/logo.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        {!collapsed && (
          <span className="text-lg font-semibold text-foreground tracking-tight">SocialHub</span>
        )}
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV_LINKS.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || pathname?.startsWith(link.href + '/');
          return (
            <Link
              key={link.href}
              href={link.href}
              title={collapsed ? link.label : undefined}
              className={`flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                collapsed ? 'justify-center px-0' : 'px-3'
              } ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && link.label}
            </Link>
          );
        })}
      </nav>

      {/* Collapse/expand toggle — above Logout */}
      <div className="px-3 pt-3 border-t border-border shrink-0">
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`w-full flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ${
            collapsed ? 'justify-center px-0' : 'px-3'
          }`}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4 shrink-0" />
          ) : (
            <PanelLeftClose className="w-4 h-4 shrink-0" />
          )}
          {!collapsed && 'Collapse'}
        </button>
      </div>

      {/* Logout — bottom */}
      <div className="p-3 border-t border-border shrink-0">
        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className={`w-full flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors ${
            collapsed ? 'justify-center px-0' : 'px-3'
          }`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && 'Logout'}
        </button>
      </div>
    </aside>
  );
}