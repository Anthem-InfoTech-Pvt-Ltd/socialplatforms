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
import { ImagePlus, X, Check, AlertTriangle, CircleCheck, Link2 } from 'lucide-react';
import { LinkedinIcon, InstagramIcon, FacebookIcon } from '@/components/features/SocialIcons';

const platformLimits: Record<string, number> = {
  facebook: 1000,
  instagram: 1000,
  linkedin: 1000,
}

const platformMeta: Record<string, { label: string; icon: typeof LinkedinIcon }> = {
  linkedin: { label: 'LinkedIn', icon: LinkedinIcon },
  instagram: { label: 'Instagram', icon: InstagramIcon },
  facebook: { label: 'Facebook', icon: FacebookIcon },
}

export default function ComposePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { accounts, loadAccounts, isLoading: accountsLoading } = useAccounts();
  const { createPost, publishPost, isLoading: postsLoading } = usePosts();
  const [contentHtml, setContentHtml] = useState('');
  const [contentText, setContentText] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['linkedin', 'instagram', 'facebook']);
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

  // Each platform has a single connected account — keep it selected automatically
  // whenever the platform itself is selected, so there's no separate account step.
  useEffect(() => {
    setSelectedAccounts(
      accounts.filter((a) => selectedPlatforms.includes(a.platform)).map((a) => a.id)
    );
  }, [selectedPlatforms, accounts]);

  const handleTogglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
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
      const response = await publishPost(post.id, selectedAccounts);

      // publishPost se aane wale results array mein har account/platform ka
      // alag-alag success/error hota hai — isko ignore mat karo, warna
      // "Facebook pe chala gaya, Instagram pe fail hua" jaisa case silently
      // "Post published successfully!" dikha dega.
      const results: Array<{ platform: string; success: boolean; error?: string }> =
        response?.results ?? [];

      const failed = results.filter((r) => !r.success);
      const succeeded = results.filter((r) => r.success);

      if (failed.length === 0) {
        setSuccess('Post published successfully!');
      } else if (succeeded.length === 0) {
        setError(
          failed
            .map((f) => `${f.platform ?? 'Unknown'}: ${f.error ?? 'Failed'}`)
            .join(' | ')
        );
      } else {
        // Partial success — kuch platform pe gaya, kuch pe nahi
        setSuccess(`Published to: ${succeeded.map((s) => s.platform).join(', ')}`);
        setError(
          failed
            .map((f) => `${f.platform ?? 'Unknown'} failed: ${f.error ?? 'Unknown error'}`)
            .join(' | ')
        );
      }

      setContentHtml('');
      setContentText('');
      setSelectedAccounts([]);
      setMediaUrls([]);

      if (failed.length === 0) {
        setTimeout(() => router.push('/history'), 2000);
      }
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

  // One connected account per platform — shown inline in the platform card.
  const accountByPlatform: Record<string, (typeof accounts)[number] | undefined> = {};
  (['linkedin', 'instagram', 'facebook'] as const).forEach((platform) => {
    accountByPlatform[platform] = accounts.find((a) => a.platform === platform);
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-1.5">Create post</h1>
          <p className="text-muted-foreground">Write once, publish everywhere — pick your platforms and go.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Composer */}
          <div className="lg:col-span-2 space-y-6">

            {/* Content card */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Post content</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedPlatforms.length > 0
                    ? `Character limit follows the strictest of your selected platforms (${activeLimit.toLocaleString()} chars)`
                    : 'Select a platform below to see its character limit'}
                </p>
              </div>

              <RichTextEditor
                content={contentHtml}
                onChange={(html, text) => {
                  setContentHtml(html);
                  setContentText(text);
                }}
                placeholder="What's on your mind? Share with your followers..."
                maxLength={activeLimit}
              />

              {/* Alerts */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
              {success && (
                <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <CircleCheck className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-green-500">{success}</p>
                </div>
              )}
            </div>

            {/* Platform Selection card */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Platforms</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Choose where this post should go out.</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(['linkedin', 'instagram', 'facebook'] as const).map((platform) => {
                  const isSelected = selectedPlatforms.includes(platform);
                  const Icon = platformMeta[platform].icon;
                  const account = accountByPlatform[platform];
                  return (
                    <button
                      key={platform}
                      onClick={() => handleTogglePlatform(platform)}
                      className={`relative p-4 border rounded-xl text-left transition-all ${
                        isSelected
                          ? 'bg-primary/10 border-primary text-primary ring-1 ring-primary/20'
                          : 'bg-background border-border text-muted-foreground hover:border-border/80 hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-primary ml-auto" />
                        )}
                      </div>
                      <div className="text-sm font-medium text-foreground">{platformMeta[platform].label}</div>
                      <div className={`text-xs mt-0.5 truncate ${account ? 'opacity-70' : 'text-amber-500'}`}>
                        {account ? account.accountName : 'Not connected'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleSaveDraft}
                disabled={isPublishing || postsLoading}
                variant="outline"
                className="flex-1 border-primary text-primary hover:bg-primary/10 h-11"
              >
                Save as draft
              </Button>
              <Button
                onClick={handlePublish}
                disabled={isPublishing || postsLoading || selectedAccounts.length === 0}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground h-11"
              >
                {isPublishing ? 'Publishing…' : 'Publish now'}
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Image */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-foreground">Image</h3>
                {mediaUrls.length > 0 && (
                  <span className="text-xs text-muted-foreground">Added</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {selectedPlatforms.includes('instagram')
                  ? 'Required for Instagram.'
                  : 'Optional — an image boosts engagement.'}
              </p>

              {mediaUrls.length > 0 ? (
                <div className="relative aspect-square group max-w-[140px]">
                  <img
                    src={mediaUrls[0]}
                    alt="upload"
                    className="w-full h-full object-cover rounded-lg border border-border"
                  />
                  <button
                    onClick={() => handleRemoveImage(mediaUrls[0])}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                    aria-label="Remove image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="aspect-square max-w-[140px] w-full border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors text-xs disabled:opacity-50"
                >
                  <ImagePlus className="w-5 h-5" />
                  <span>{isUploading ? 'Uploading…' : 'Add image'}</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground/70 mt-3">JPG or PNG, up to 5MB.</p>
            </div>

            {/* Tips */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Tips for better reach</h3>
              <ul className="space-y-2.5 text-xs text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Keep posts concise and engaging</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Use relevant hashtags</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Bold key points for emphasis</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Images boost engagement 3x</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Schedule for optimal timing</span>
                </li>
              </ul>
            </div>

            {/* Connected Accounts */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Connected accounts</h3>
                <span className="text-xs text-muted-foreground">{accounts.length}</span>
              </div>
              {accounts.length > 0 ? (
                <div className="space-y-3">
                  {accounts.map((account) => (
                    <div key={account.id} className="flex items-center gap-2.5">
                      <div className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
                      <span className="text-xs text-foreground capitalize truncate">
                        {account.platform}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        — {account.accountName}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Link2 className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground mb-2">No accounts connected yet</p>
                  <a href="/accounts" className="text-xs text-primary underline font-medium">
                    Connect an account
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}