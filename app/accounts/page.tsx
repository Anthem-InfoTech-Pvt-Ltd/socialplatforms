'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/AuthContext';
import { useAccounts } from '@/store/AccountsContext';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { SocialAccount } from '@/types';
import { LinkedinIcon, InstagramIcon, FacebookIcon } from '@/components/features/SocialIcons';

const platformMeta: Record<string, { label: string; icon: typeof LinkedinIcon; bg: string }> = {
  facebook: { label: 'Facebook', icon: FacebookIcon, bg: '#1877F2' },
  instagram: {
    label: 'Instagram',
    icon: InstagramIcon,
    bg: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%)',
  },
  linkedin: { label: 'LinkedIn', icon: LinkedinIcon, bg: '#0A66C2' },
}

export default function AccountsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    accounts,
    loadAccounts,
    connectAccount,
    disconnectAccount,
    isLoading,
  } = useAccounts();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadAccounts(user.id);
    }
  }, [user, loadAccounts]);

  const handleConnect = (platform: 'facebook' | 'instagram' | 'linkedin') => {
    // Each platform can only have a single connected account.
    if (connectedPlatforms.has(platform)) return;

    if (platform === 'facebook') {
      // Mock insert nahi — real OAuth redirect
      window.location.href = '/api/auth/facebook'
      return
    }
    if (platform === 'linkedin') {
      window.location.href = '/api/auth/linkedin'
      return
    }
    if (platform === 'instagram') {
      window.location.href = '/api/auth/instagram'
      return
    }
  }

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return;

    setError('');
    setSuccess('');

    try {
      await disconnectAccount(accountId);
      setSuccess('Account disconnected successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to disconnect account'
      );
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const platforms: Array<'facebook' | 'instagram' | 'linkedin'> = [
    'facebook',
    'instagram',
    'linkedin',
  ];
  const connectedPlatforms = new Set(accounts.map((a) => a.platform));

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Social Accounts
          </h1>
          <p className="text-muted-foreground">
            Connect and manage your social media accounts
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-sm text-green-500">{success}</p>
          </div>
        )}

        {/* Available Platforms */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4">
            Connect a Platform
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {platforms.map((platform) => {
              const isConnected = connectedPlatforms.has(platform);
              const Icon = platformMeta[platform].icon;
              return (
                <div
                  key={platform}
                  className="bg-card border border-border rounded-lg p-6 flex flex-col items-center text-center"
                >
                  <div
                    className="w-16 h-16 rounded-lg flex items-center justify-center mb-4"
                    style={{ background: platformMeta[platform].bg }}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-semibold text-foreground capitalize mb-2">
                    {platformMeta[platform].label}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {isConnected ? 'Account connected' : 'Not connected yet'}
                  </p>
                  <Button
                    onClick={() =>
                      handleConnect(platform as 'facebook' | 'instagram' | 'linkedin')
                    }
                    disabled={isConnected || connecting === platform || isLoading}
                    className={
                      isConnected
                        ? 'bg-green-600 text-white opacity-80 cursor-default hover:bg-green-600'
                        : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                    }
                  >
                    {connecting === platform
                      ? 'Connecting...'
                      : isConnected
                        ? 'Connected'
                        : 'Connect'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Connected Accounts */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">
            Connected Accounts
          </h2>
          {accounts.length > 0 ? (
            <div className="space-y-4">
              {accounts.map((account) => {
                const Icon = platformMeta[account.platform]?.icon;
                return (
                  <div
                    key={account.id}
                    className="bg-card border border-border rounded-lg p-6 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          background: Icon
                            ? platformMeta[account.platform]?.bg
                            : undefined,
                        }}
                      >
                        {Icon && <Icon className="w-5 h-5 text-white" />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {account.accountName}
                        </h3>
                        <p className="text-sm text-muted-foreground capitalize">
                          {platformMeta[account.platform]?.label ?? account.platform}
                        </p>
                        <p className="text-xs text-green-500 mt-1">✓ Connected</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDisconnect(account.id)}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                    >
                      Disconnect
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground mb-4">
                No accounts connected yet. Connect a platform above to get started.
              </p>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-card border border-border rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-4">Why Connect Accounts?</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>✓ Publish to multiple platforms at once</li>
            <li>✓ Track engagement across all accounts</li>
            <li>✓ Schedule posts in advance</li>
            <li>✓ Centralize your social media management</li>
          </ul>
        </div>
      </main>
    </div>
  );
}