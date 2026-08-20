'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/AuthContext';
import { useAccounts } from '@/store/AccountsContext';
import { usePosts } from '@/store/PostsContext';
// import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/components/features/RichTextEditor';
import { LocationPicker } from '@/components/features/LocationPicker';
import { uploadPostImage } from '@/lib/supabase/storage';
import { LinkedinIcon, InstagramIcon, FacebookIcon } from '@/components/features/SocialIcons';
import {
  StickyNote,
  CheckCircle2,
  AlertCircle,
  Send,
  FileText,
  Users2,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';

const platformLimits: Record<string, number> = {
  facebook: 1000,
  instagram: 1000,
  linkedin: 1000,
}

const platformMeta: Record<string, { label: string; icon: typeof LinkedinIcon; bg: string; ring: string }> = {
  facebook: { label: 'Facebook', icon: FacebookIcon, bg: '#1877F2', ring: 'rgba(24,119,242,0.35)' },
  instagram: {
    label: 'Instagram',
    icon: InstagramIcon,
    bg: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%)',
    ring: 'rgba(214,36,159,0.35)',
  },
  linkedin: { label: 'LinkedIn', icon: LinkedinIcon, bg: '#0A66C2', ring: 'rgba(10,102,194,0.35)' },
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

  // Location + internal notes
  const [location, setLocation] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [internalNotes, setInternalNotes] = useState('');

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

  // Covers the default platforms selected on page load (before any toggle
  // click has run): once accounts finish loading, auto-select the accounts
  // for those platforms too. Only fires while nothing has been picked yet,
  // so it never overrides a manual selection made afterward.
  useEffect(() => {
    if (accounts.length === 0) return;
    setSelectedAccounts((prev) => {
      if (prev.length > 0) return prev;
      return accounts
        .filter((a) => selectedPlatforms.includes(a.platform))
        .map((a) => a.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  const handleTogglePlatform = (platform: string) => {
    const wasSelected = selectedPlatforms.includes(platform);

    setSelectedPlatforms((prev) =>
      wasSelected
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );

    // Selecting a platform also selects its connected account(s) by default —
    // most users have one account per platform, so this avoids Publish staying
    // disabled just because the account chip wasn't separately clicked.
    // Deselecting the platform removes those accounts from the selection too.
    const platformAccountIds = accounts
      .filter((a) => a.platform === platform)
      .map((a) => a.id);

    setSelectedAccounts((prev) =>
      wasSelected
        ? prev.filter((id) => !platformAccountIds.includes(id))
        : Array.from(new Set([...prev, ...platformAccountIds]))
    );
  };

  const handleToggleAccount = (accountId: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(accountId)
        ? prev.filter((a) => a !== accountId)
        : [...prev, accountId]
    );
  };

  const handleImageSelected = async (file: File) => {
    if (!user) return;

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
    }
  };

  const handleImageEdited = async (sourceUrl: string, file: File) => {
    if (!user) return;

    try {
      setIsUploading(true);
      setError('');
      const newUrl = await uploadPostImage(file, user.id);
      setMediaUrls((prev) => prev.map((u) => (u === sourceUrl ? newUrl : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save edited image');
    } finally {
      setIsUploading(false);
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
      await createPost(
        user.id,
        contentText,
        selectedPlatforms,
        mediaUrls,
        location ?? undefined,
        internalNotes.trim() || undefined
      );
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
      const post = await createPost(
        user.id,
        contentText,
        selectedPlatforms,
        mediaUrls,
        location ?? undefined,
        internalNotes.trim() || undefined
      );
      await publishPost(post.id, selectedAccounts);
      setSuccess('Post published successfully!');
      setContentHtml('');
      setContentText('');
      setSelectedAccounts([]);
      setMediaUrls([]);
      setLocation(null);
      setInternalNotes('');
      setShowNotes(false);
      setTimeout(() => router.push('/history'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish post');
    } finally {
      setIsPublishing(false);
    }
  };

  if (authLoading) {
    return (
      <AppShell>
        <div />
      </AppShell>
    );
  }

  if (!isAuthenticated) return null;

  const accountsByPlatform: { [key: string]: typeof accounts } = {};
  selectedPlatforms.forEach((platform) => {
    accountsByPlatform[platform] = accounts.filter((a) => a.platform === platform);
  });

  return (
    <div className="min-h-screen bg-background">
      <AppShell>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                  Create Post
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Write once, publish everywhere it matters
                </p>
              </div>
            </div>

            {/* Inline status pill */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border rounded-full px-3 py-1.5 self-start sm:self-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              {accounts.length} account{accounts.length === 1 ? '' : 's'} connected
            </div>
          </div>

          {/* Alerts */}
          {(error || success) && (
            <div className="mb-6">
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 bg-destructive/10 border border-destructive/30 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
              {success && (
                <div className="flex items-start gap-2.5 p-3.5 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-green-500">{success}</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Composer */}
            <div className="lg:col-span-2 space-y-6">

              {/* Composer card */}
              <div className="bg-card border border-border rounded-2xl">
                <div className="px-5 sm:px-6 pt-5 pb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Post content</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* <LocationPicker value={location} onChange={setLocation} /> */}
                    {/* <button
                    type="button"
                    onClick={() => setShowNotes((prev) => !prev)}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-colors ${showNotes || internalNotes
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                        : 'border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary'
                      }`}
                    title="Internal note (not published)"
                  >
                    <StickyNote className="w-3 h-3" />
                    Notes{internalNotes ? ' •' : ''}
                  </button> */}
                  </div>
                </div>

                <div className="px-5 sm:px-6 pb-6 pt-3 space-y-4">
                  {showNotes && (
                    <textarea
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      placeholder="Internal note for your team — never sent to Facebook, Instagram, or LinkedIn"
                      rows={2}
                      className="w-full text-sm px-3.5 py-2.5 border border-amber-500/30 bg-amber-500/5 rounded-xl outline-none focus:border-amber-500/60 placeholder:text-muted-foreground/50 resize-none"
                    />
                  )}

                  <RichTextEditor
                    content={contentHtml}
                    onChange={(html, text) => {
                      setContentHtml(html);
                      setContentText(text);
                    }}
                    placeholder="What's on your mind? Share with your followers..."
                    maxLength={activeLimit}
                    mediaUrls={mediaUrls}
                    onImageUpload={handleImageSelected}
                    onEditImage={handleImageEdited}
                    onRemoveImage={handleRemoveImage}
                    isUploadingImage={isUploading}
                    availablePlatforms={['facebook', 'instagram', 'linkedin']}
                    selectedPlatforms={selectedPlatforms}
                    imageHint={selectedPlatforms.includes('instagram') ? 'required for Instagram' : undefined}
                  />

                  {selectedPlatforms.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Limit: {activeLimit.toLocaleString()} characters
                      {selectedPlatforms.length > 1 && ` — lowest across your selected platforms`}
                    </p>
                  )}
                </div>
              </div>

              {/* Platforms + accounts, merged into one card per platform */}
              <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Platforms & accounts</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                  {(['linkedin', 'instagram', 'facebook'] as const).map((platform) => {
                    const meta = platformMeta[platform];
                    const Icon = meta.icon;
                    const isSelected = selectedPlatforms.includes(platform);
                    const platformAccounts = accounts.filter((a) => a.platform === platform);

                    return (
                      <div
                        key={platform}
                        style={isSelected ? { boxShadow: `0 0 0 2px ${meta.ring}` } : undefined}
                        className={`rounded-xl border transition-colors ${isSelected ? 'border-transparent' : 'border-border'
                          }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleTogglePlatform(platform)}
                          className={`w-full flex items-center justify-between p-4 text-left rounded-xl transition-colors ${isSelected ? 'bg-card' : 'bg-background hover:bg-muted/30'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: meta.bg }}
                            >
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground">{meta.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {platformLimits[platform].toLocaleString()} chars
                              </div>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                        </button>

                        {isSelected && (
                          <div className="px-4 pb-4 pt-1">
                            {platformAccounts.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {platformAccounts.map((account) => {
                                  const isChecked = selectedAccounts.includes(account.id);
                                  return (
                                    <button
                                      key={account.id}
                                      type="button"
                                      onClick={() => handleToggleAccount(account.id)}
                                      className={`flex items-center gap-2 text-xs pl-1.5 pr-3 py-1.5 rounded-full border transition-colors ${isChecked
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-background border-border text-muted-foreground hover:border-primary/40'
                                        }`}
                                    >
                                      <span
                                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${isChecked ? 'bg-white/20' : 'bg-muted text-muted-foreground'
                                          }`}
                                      >
                                        {account.accountName.slice(0, 1).toUpperCase()}
                                      </span>
                                      {account.accountName}
                                      {isChecked && <CheckCircle2 className="w-3 h-3" />}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-amber-500">
                                No account connected.{' '}
                                <a href="/accounts" className="underline font-medium">Connect one</a>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
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
                  className="flex-1 h-11 border-primary text-primary hover:bg-primary/10"
                >
                  Save as Draft
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={isPublishing || postsLoading || selectedAccounts.length === 0}
                  className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Publish Now
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Tips */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Tips</h3>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex gap-2"><span className="text-primary">•</span>Keep posts concise and engaging</li>
                  <li className="flex gap-2"><span className="text-primary">•</span>Use relevant hashtags</li>
                  <li className="flex gap-2"><span className="text-primary">•</span>Bold key points for emphasis</li>
                  <li className="flex gap-2"><span className="text-primary">•</span>Images boost engagement 3x</li>
                  <li className="flex gap-2"><span className="text-primary">•</span>Schedule for optimal timing</li>
                </ul>
              </div>

              {/* Connected Accounts */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Connected accounts</h3>
                {accounts.length > 0 ? (
                  <div className="space-y-2.5">
                    {accounts.map((account) => {
                      const Icon = platformMeta[account.platform]?.icon;
                      return (
                        <div key={account.id} className="flex items-center gap-2.5">
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                            style={{ background: platformMeta[account.platform]?.bg }}
                          >
                            {Icon && <Icon className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {account.accountName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No accounts connected</p>
                )}
              </div>
            </div>
          </div>
        </main>

      </AppShell>
    </div>
  );
}