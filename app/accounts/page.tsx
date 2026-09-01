'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/AuthContext';
import { useAccounts } from '@/store/AccountsContext';
import { Button } from '@/components/ui/button';
import { SocialAccount } from '@/types';
import { LinkedinIcon, InstagramIcon, FacebookIcon } from '@/components/features/SocialIcons';
// TODO: replace these with dedicated brand SVGs in SocialIcons.tsx once you have them —
// AtSign/Building2/MessageSquare from lucide-react are just placeholders for now.
import { AtSign, Building2, MessageSquare } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';

const platformMeta: Record<string, { label: string; icon: typeof LinkedinIcon; bg: string }> = {
  facebook: { label: 'Facebook', icon: FacebookIcon, bg: '#1877F2' },
  instagram: {
    label: 'Instagram',
    icon: InstagramIcon,
    bg: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%)',
  },
  linkedin: { label: 'LinkedIn', icon: LinkedinIcon, bg: '#0A66C2' },
  threads: { label: 'Threads', icon: AtSign, bg: '#000000' },
  google_business: { label: 'Google Business Profile', icon: Building2, bg: '#4285F4' },
  google_chat: { label: 'Google Chat', icon: MessageSquare, bg: '#00897B' },
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

  // Google Chat connect form state — no OAuth redirect, just a webhook URL
  const [showChatForm, setShowChatForm] = useState(false);
  const [chatLabel, setChatLabel] = useState('');
  const [chatWebhookUrl, setChatWebhookUrl] = useState('');
  const [savingChat, setSavingChat] = useState(false);

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

  const handleConnect = (
    platform: 'facebook' | 'instagram' | 'linkedin' | 'threads' | 'google_business' | 'google_chat'
  ) => {
    // Google Chat has no OAuth flow — it's just a webhook URL, so open the
    // inline form instead of redirecting anywhere.
    if (platform === 'google_chat') {
      setShowChatForm(true);
      setError('');
      setSuccess('');
      return;
    }

    // Multiple accounts per platform are allowed — the OAuth callback routes
    // already upsert on (user_id, account_id), so a second account for the
    // same platform is saved as its own row instead of overwriting the first.
    // We just redirect into the same OAuth flow again; whichever account the
    // user picks/logs into on the provider's side gets added.
    setConnecting(platform);
    if (platform === 'facebook') {
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
    if (platform === 'threads') {
      window.location.href = '/api/auth/threads'
      return
    }
    if (platform === 'google_business') {
      window.location.href = '/api/auth/google-business'
      return
    }
  }

  const handleSaveChatWebhook = async () => {
    if (!user) return;
    if (!chatWebhookUrl.trim()) {
      setError('Please paste the Google Chat webhook URL');
      return;
    }

    try {
      setSavingChat(true);
      setError('');
      setSuccess('');

      const res = await fetch('/api/accounts/google-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          label: chatLabel,
          webhookUrl: chatWebhookUrl.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save Google Chat space');
      }

      setSuccess('Google Chat space connected successfully');
      setChatLabel('');
      setChatWebhookUrl('');
      setShowChatForm(false);
      await loadAccounts(user.id);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Google Chat');
    } finally {
      setSavingChat(false);
    }
  };

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
      <AppShell>
        <div />
      </AppShell>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const platforms: Array<'facebook' | 'instagram' | 'linkedin' | 'threads' | 'google_business' | 'google_chat'> = [
    'facebook',
    'instagram',
    'linkedin',
    'threads',
    'google_business',
    'google_chat',
  ];
  const accountCountByPlatform = accounts.reduce<Record<string, number>>((acc, a) => {
    acc[a.platform] = (acc[a.platform] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <AppShell>

        <main className=" mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

          {/* Google Chat connect form — inline, opens when the card is clicked */}
          {showChatForm && (
            <div className="mb-8 bg-card border border-border rounded-lg p-6">
              <h3 className="font-semibold text-foreground mb-1">Connect a Google Chat Space</h3>
              <p className="text-sm text-muted-foreground mb-4">
                In your Google Chat space: Space name → Apps and integrations → Add webhooks.
                Paste the generated webhook URL below.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Label (e.g. "Anthem Small Projects")
                  </label>
                  <input
                    type="text"
                    value={chatLabel}
                    onChange={(e) => setChatLabel(e.target.value)}
                    placeholder="Space label"
                    className="w-full text-sm px-3.5 py-2.5 border border-border bg-background rounded-lg outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Webhook URL
                  </label>
                  <input
                    type="text"
                    value={chatWebhookUrl}
                    onChange={(e) => setChatWebhookUrl(e.target.value)}
                    placeholder="https://chat.googleapis.com/v1/spaces/..."
                    className="w-full text-sm px-3.5 py-2.5 border border-border bg-background rounded-lg outline-none focus:border-primary"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <Button
                    onClick={handleSaveChatWebhook}
                    disabled={savingChat}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {savingChat ? 'Saving...' : 'Save Space'}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowChatForm(false);
                      setChatLabel('');
                      setChatWebhookUrl('');
                    }}
                    variant="ghost"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Available Platforms */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4">
              Connect a Platform
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {platforms.map((platform) => {
                const count = accountCountByPlatform[platform] ?? 0;
                const isConnected = count > 0;
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
                      {isConnected
                        ? `${count} account${count === 1 ? '' : 's'} connected`
                        : 'Not connected yet'}
                    </p>
                    <Button
                      onClick={() => handleConnect(platform)}
                      disabled={connecting === platform || isLoading}
                      className={
                        isConnected
                          ? 'bg-primary/10 text-primary border border-primary hover:bg-primary/20'
                          : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                      }
                    >
                      {connecting === platform
                        ? 'Connecting...'
                        : isConnected
                          ? 'Add another account'
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

      </AppShell>
    </div>
  );
}