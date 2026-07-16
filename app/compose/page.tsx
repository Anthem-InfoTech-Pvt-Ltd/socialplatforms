'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/AuthContext';
import { useAccounts } from '@/store/AccountsContext';
import { usePosts } from '@/store/PostsContext';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/components/features/RichTextEditor';
import { uploadPostImage } from '@/lib/supabase/storage';

const platformLimits: Record<string, number> = {
  facebook: 1000,
  instagram: 1000,
  linkedin: 1000,
}

export default function ComposePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { accounts, loadAccounts, isLoading: accountsLoading } = useAccounts();
  const { createPost, publishPost, isLoading: postsLoading } = usePosts();
  const [contentHtml, setContentHtml] = useState('');
  const [contentText, setContentText] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['linkedin']);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Image upload state
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeLimit = selectedPlatforms.length > 0
    ? Math.min(...selectedPlatforms.map(p => platformLimits[p] ?? 3000))
    : 3000;

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      return;
    }

    try {
      setIsUploading(true);
      setError('');
      const url = await uploadPostImage(file, user.id);
      setMediaUrls((prev) => [...prev, url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (url: string) => {
    setMediaUrls((prev) => prev.filter((u) => u !== url));
  };

  const handleSaveDraft = async () => {
    if (!user || !contentText.trim()) {
      setError('Please write something');
      return;
    }
    try {
      setError('');
      setSuccess('');
      await createPost(user.id, contentText, selectedPlatforms, mediaUrls);
      setSuccess('Draft saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    }
  };

  const handlePublish = async () => {
    if (!user || !contentText.trim()) {
      setError('Please write something');
      return;
    }
    if (selectedPlatforms.includes('instagram') && mediaUrls.length === 0) {
      setError('Instagram requires at least one image');
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
      const post = await createPost(user.id, contentText, selectedPlatforms, mediaUrls);
      await publishPost(post.id, selectedAccounts);
      setSuccess('Post published successfully!');
      setContentHtml('');
      setContentText('');
      setSelectedAccounts([]);
      setMediaUrls([]);
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

  if (!isAuthenticated) return null;

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

              {/* Rich Text Editor */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Post Content
                </label>
                <RichTextEditor
                  content={contentHtml}
                  onChange={(html, text) => {
                    setContentHtml(html);
                    setContentText(text);
                  }}
                  placeholder="What's on your mind? Share with your followers..."
                  maxLength={activeLimit}
                />
                {selectedPlatforms.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Limit: {activeLimit.toLocaleString()} chars
                    {selectedPlatforms.length > 1 && ` (lowest of selected platforms)`}
                  </p>
                )}
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Image
                  {selectedPlatforms.includes('instagram') && (
                    <span className="text-destructive text-xs ml-2">*required for Instagram</span>
                  )}
                </label>
                <div className="flex flex-wrap gap-3">
                  {mediaUrls.map((url) => (
                    <div key={url} className="relative w-20 h-20">
                      <img
                        src={url}
                        alt="upload"
                        className="w-20 h-20 object-cover rounded-lg border border-border"
                      />
                      <button
                        onClick={() => handleRemoveImage(url)}
                        className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground hover:border-primary text-xs disabled:opacity-50"
                  >
                    {isUploading ? '...' : '+ Add'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
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
                  {(['linkedin', 'instagram', 'facebook'] as const).map((platform) => (
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
                      <div className="text-xs mt-1 opacity-60">
                        {platformLimits[platform].toLocaleString()} chars
                      </div>
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

                  {Object.values(accountsByPlatform).every((acc) => acc.length === 0) && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <p className="text-sm text-amber-500">
                        No accounts connected for selected platforms.{' '}
                        <a href="/accounts" className="underline">Connect accounts</a>
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
              <div
                className="bg-background border border-border rounded-lg p-3 min-h-24 text-sm text-foreground prose prose-sm max-w-none
                  [&_strong]:font-bold [&_em]:italic [&_ul]:list-disc [&_ul]:pl-4
                  [&_ol]:list-decimal [&_ol]:pl-4 [&_blockquote]:border-l-4
                  [&_blockquote]:border-primary [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground
                  [&_img]:max-w-full [&_img]:rounded [&_h2]:font-bold [&_h2]:text-base"
                dangerouslySetInnerHTML={{ __html: contentHtml || '<p class="text-muted-foreground">...</p>' }}
              />
              {mediaUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {mediaUrls.map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt="preview"
                      className="w-16 h-16 object-cover rounded border border-border"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-3">Tips</h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>✓ Keep posts concise and engaging</li>
                <li>✓ Use relevant hashtags</li>
                <li>✓ Bold key points for emphasis</li>
                <li>✓ Images boost engagement 3x</li>
                <li>✓ Schedule for optimal timing</li>
              </ul>
            </div>

            {/* Connected Accounts */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-3">Connected Accounts</h3>
              {accounts.length > 0 ? (
                <div className="space-y-2">
                  {accounts.map((account) => (
                    <div key={account.id} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-xs text-muted-foreground capitalize">
                        {account.platform} — {account.accountName}
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