'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/AuthContext';
import { useAccounts } from '@/store/AccountsContext';
import { usePosts } from '@/store/PostsContext';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';

export default function ComposePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { accounts, loadAccounts, isLoading: accountsLoading } = useAccounts();
  const { createPost, publishPost, isLoading: postsLoading } = usePosts();
  const [content, setContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook']);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
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

  const handleTogglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleToggleAccount = (accountId: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(accountId)
        ? prev.filter((a) => a !== accountId)
        : [...prev, accountId]
    );
  };

  const handleSaveDraft = async () => {
    if (!user || !content.trim()) {
      setError('Please write something');
      return;
    }

    try {
      setError('');
      setSuccess('');
      await createPost(user.id, content, selectedPlatforms);
      setSuccess('Draft saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    }
  };

  const handlePublish = async () => {
    if (!user || !content.trim()) {
      setError('Please write something');
      return;
    }

    if (selectedAccounts.length === 0) {
      setError('Please select at least one account');
      return;
    }

    try {
      setError('');
      setSuccess('');
      setIsPublishing(true);
      const post = await createPost(user.id, content, selectedPlatforms);
      await publishPost(post.id, selectedAccounts);
      setSuccess('Post published successfully!');
      setContent('');
      setSelectedAccounts([]);
      setTimeout(() => router.push('/history'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish post');
    } finally {
      setIsPublishing(false);
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

  const accountsByPlatform: { [key: string]: typeof accounts } = {};
  selectedPlatforms.forEach((platform) => {
    accountsByPlatform[platform] = accounts.filter((a) => a.platform === platform);
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Create Post</h1>
          <p className="text-muted-foreground">Write and publish to your social accounts</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Composer */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              {/* Content Area */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Post Content
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's on your mind? Share with your followers..."
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={6}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {content.length} characters
                </p>
              </div>

              {/* Alerts */}
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-sm text-green-500">{success}</p>
                </div>
              )}

              {/* Platform Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Platforms
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['facebook', 'instagram', 'linkedin'].map((platform) => (
                    <button
                      key={platform}
                      onClick={() => handleTogglePlatform(platform)}
                      className={`p-3 border rounded-lg transition-all ${
                        selectedPlatforms.includes(platform)
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-background border-border text-muted-foreground hover:border-border/80'
                      }`}
                    >
                      <div className="text-sm font-medium capitalize">{platform}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Selection */}
              {selectedPlatforms.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Select Accounts to Publish
                  </label>
                  <div className="space-y-4">
                    {Object.entries(accountsByPlatform).map(([platform, platformAccounts]) =>
                      platformAccounts.length > 0 ? (
                        <div key={platform} className="mb-4">
                          <p className="text-xs font-semibold text-muted-foreground capitalize mb-2">
                            {platform}
                          </p>
                          <div className="space-y-2">
                            {platformAccounts.map((account) => (
                              <label
                                key={account.id}
                                className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-card/50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedAccounts.includes(account.id)}
                                  onChange={() => handleToggleAccount(account.id)}
                                  className="w-4 h-4 rounded border-border"
                                />
                                <span className="text-sm text-foreground">
                                  {account.accountName}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ) : null
                    )}
                  </div>

                  {selectedPlatforms.length > 0 &&
                    Object.values(accountsByPlatform).every((acc) => acc.length === 0) && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <p className="text-sm text-amber-500">
                          No accounts connected for selected platforms.{' '}
                          <a href="/accounts" className="underline">
                            Connect accounts
                          </a>
                        </p>
                      </div>
                    )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSaveDraft}
                  disabled={isPublishing || postsLoading}
                  variant="outline"
                  className="flex-1 border-primary text-primary hover:bg-primary/10"
                >
                  Save as Draft
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={isPublishing || postsLoading || selectedAccounts.length === 0}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isPublishing ? 'Publishing...' : 'Publish Now'}
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Preview */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-3">Preview</h3>
              <div className="bg-background border border-border rounded-lg p-3 min-h-24">
                <p className="text-sm text-foreground break-words">{content || '...'}</p>
              </div>
            </div>

            {/* Info */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-3">Tips</h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>✓ Keep posts concise and engaging</li>
                <li>✓ Use relevant hashtags</li>
                <li>✓ Schedule posts for optimal engagement</li>
                <li>✓ Engage with comments quickly</li>
              </ul>
            </div>

            {/* Accounts Status */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-3">Connected Accounts</h3>
              {accounts.length > 0 ? (
                <div className="space-y-2">
                  {accounts.map((account) => (
                    <div key={account.id} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-xs text-muted-foreground">
                        {account.accountName}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No accounts connected</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
