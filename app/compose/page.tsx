'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/AuthContext';
import { useAccounts } from '@/store/AccountsContext';
import { usePosts } from '@/store/PostsContext';
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
  AtSign,
  MapPin,
  MessageSquare,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';

const platformLimits: Record<string, number> = {
  facebook: 1000,
  instagram: 1000,
  linkedin: 1000,
  threads: 500,
  google_business: 1500,
  google_chat: 4096,
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
  threads: { label: 'Threads', icon: AtSign, bg: '#2b2b2b', ring: 'rgba(0,0,0,0.3)' },
  google_business: { label: 'Google Business', icon: MapPin, bg: '#1A73E8', ring: 'rgba(26,115,232,0.35)' },
  google_chat: { label: 'Google Chat', icon: MessageSquare, bg: '#00897B', ring: 'rgba(0,137,123,0.35)' },
}

const ALL_PLATFORMS = ['linkedin', 'instagram', 'facebook', 'threads', 'google_business', 'google_chat'] as const;

// NOTE: This page now follows the site's shared shadcn theme tokens
// (bg-background, bg-card, border-border, text-foreground, text-primary, etc.)
// instead of hardcoded plum/paper hex colors, so it stays visually consistent
// with the rest of the app (see /accounts page for reference).

export default function ComposePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { accounts, loadAccounts, isLoading: accountsLoading } = useAccounts();
  const { createPost, publishPost, isLoading: postsLoading } = usePosts();
  const [contentHtml, setContentHtml] = useState('');
  const [contentText, setContentText] = useState('');
  // Nothing selected by default — the user picks which platform(s) and
  // account(s) to publish to explicitly.
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  // Which platform cards are expanded to show their connected accounts.
  // Kept separate from "selected" so a platform with many accounts can be
  // collapsed back down to save space without deselecting it.
  const [expandedPlatforms, setExpandedPlatforms] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [location, setLocation] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [internalNotes, setInternalNotes] = useState('');

  const [showImageRequirement, setShowImageRequirement] = useState(false);

  const [previewPlatform, setPreviewPlatform] = useState<string>('linkedin');

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

  useEffect(() => {
    if (selectedPlatforms.length === 0) return;
    if (!selectedPlatforms.includes(previewPlatform)) {
      setPreviewPlatform(selectedPlatforms[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlatforms]);

  useEffect(() => {
    if (mediaUrls.length > 0 || !selectedPlatforms.includes('instagram')) {
      setShowImageRequirement(false);
    }
  }, [mediaUrls, selectedPlatforms]);

  const handleTogglePlatform = (platform: string) => {
    const wasSelected = selectedPlatforms.includes(platform);

    setSelectedPlatforms((prev) =>
      wasSelected
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );

    const platformAccountIds = accounts
      .filter((a) => a.platform === platform)
      .map((a) => a.id);

    setSelectedAccounts((prev) =>
      wasSelected
        ? prev.filter((id) => !platformAccountIds.includes(id))
        : Array.from(new Set([...prev, ...platformAccountIds]))
    );

    // Auto-expand when selecting so accounts are visible right away;
    // auto-collapse when deselecting to keep the panel tidy.
    setExpandedPlatforms((prev) =>
      wasSelected
        ? prev.filter((p) => p !== platform)
        : Array.from(new Set([...prev, platform]))
    );
  };

  const handleToggleExpand = (platform: string) => {
    setExpandedPlatforms((prev) =>
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

  const handleSelectAllPlatforms = () => {
    const allSelected = ALL_PLATFORMS.every((p) => selectedPlatforms.includes(p));
    if (allSelected) {
      setSelectedPlatforms([]);
      setSelectedAccounts([]);
      setExpandedPlatforms([]);
    } else {
      setSelectedPlatforms([...ALL_PLATFORMS]);
      setSelectedAccounts(accounts.map((a) => a.id));
      setExpandedPlatforms([...ALL_PLATFORMS]);
    }
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
      setShowImageRequirement(true);
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
      setSelectedPlatforms([]);
      setSelectedAccounts([]);
      setExpandedPlatforms([]);
      setMediaUrls([]);
      setLocation(null);
      setInternalNotes('');
      setShowNotes(false);
      setShowImageRequirement(false);
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

  const previewAccount = accounts.find(
    (a) => a.platform === previewPlatform && selectedAccounts.includes(a.id)
  ) ?? accounts.find((a) => a.platform === previewPlatform);
  const PreviewIcon = platformMeta[previewPlatform]?.icon;

  return (
    <div className="min-h-screen bg-background">
      <AppShell>
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 pb-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                  Create Post
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Write once, publish everywhere it matters
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border rounded-full px-3 py-1.5 self-start sm:self-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              {accounts.length} account{accounts.length === 1 ? '' : 's'} connected
            </div>
          </div>

          {/* Alerts */}
          {(error || success) && (
            <div className="mb-6">
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
              {success && (
                <div className="flex items-start gap-2.5 p-3.5 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-green-500">{success}</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr_0.85fr] gap-6 items-start">
            {/* ===== Compose ===== */}
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-lg shadow-sm">
                <div className="px-5 sm:px-6 pt-5 pb-1 flex items-center justify-between border-b border-border">
                  <div className="flex items-center gap-2 pb-3">
                    <FileText className="w-4 h-4 text-primary/70" />
                    <span className="text-sm font-medium text-foreground">Post content</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNotes((prev) => !prev)}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 mb-3 rounded-full border transition-colors ${
                      showNotes || internalNotes
                        ? 'bg-amber-100 border-amber-300 text-amber-800'
                        : 'border-dashed border-primary/25 text-muted-foreground hover:border-primary/50 hover:text-primary'
                    }`}
                    title="Internal note (not published)"
                  >
                    <StickyNote className="w-3 h-3" />
                    Notes{internalNotes ? ' •' : ''}
                  </button>
                </div>

                <div className="px-5 sm:px-6 pb-6 pt-4 space-y-4">
                  {showNotes && (
                    <textarea
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      placeholder="Internal note for your team — never sent to Facebook, Instagram, LinkedIn, Threads, Google Business, or Google Chat"
                      rows={2}
                      className="w-full text-sm px-3.5 py-2.5 border border-amber-300 bg-amber-50 rounded-lg outline-none focus:border-amber-500 placeholder:text-amber-700/40 resize-none"
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
                    availablePlatforms={[...ALL_PLATFORMS]}
                    selectedPlatforms={selectedPlatforms}
                    imageHint={showImageRequirement ? 'required for Instagram' : undefined}
                  />

                  {selectedPlatforms.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Limit: {activeLimit.toLocaleString()} characters
                      {selectedPlatforms.length > 1 && ` — lowest across your selected platforms`}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={handleSaveDraft}
                  disabled={isPublishing || postsLoading}
                  variant="outline"
                  className="flex-1 h-11 rounded-lg border-primary text-primary hover:bg-primary/5"
                >
                  Save as Draft
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={isPublishing || postsLoading || selectedAccounts.length === 0}
                  className="flex-1 h-11 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
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

            {/* ===== Preview ===== */}
            <div className="bg-card border border-border rounded-lg xl:sticky xl:top-6">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary/70" />
                  <span className="text-sm font-medium text-foreground">Preview</span>
                </div>
              </div>

              {selectedPlatforms.length > 0 && (
                <div className="flex items-center gap-1.5 px-5 pt-3 pb-1 flex-wrap">
                  {selectedPlatforms.map((platform) => {
                    const meta = platformMeta[platform];
                    const Icon = meta.icon;
                    const isActive = previewPlatform === platform;
                    return (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => setPreviewPlatform(platform)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          isActive ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'opacity-50 hover:opacity-100'
                        }`}
                        style={{ background: meta.bg }}
                        title={meta.label}
                      >
                        <Icon className="w-4 h-4 text-white" />
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="p-5">
                {selectedPlatforms.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">
                    Select a platform to preview your post
                  </p>
                ) : (
                  <div className="border border-border rounded-lg overflow-hidden bg-muted/20">
                    <div className="flex items-center gap-2.5 p-3.5">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
                        {(previewAccount?.accountName ?? user?.name ?? 'U').slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground truncate">
                          {previewAccount?.accountName ?? user?.name ?? 'Your account'}
                        </div>
                        <div className="text-[11px] text-muted-foreground">Just now</div>
                      </div>
                      {PreviewIcon && (
                        <span className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-muted text-muted-foreground shrink-0">
                          <PreviewIcon className="w-3 h-3" />
                          {platformMeta[previewPlatform]?.label}
                        </span>
                      )}
                    </div>

                    <div className="px-3.5 pb-3.5 text-sm text-foreground whitespace-pre-wrap break-words min-h-[60px]">
                      {contentText.trim() ? contentText : (
                        <span className="text-muted-foreground/70">Your post will appear here...</span>
                      )}
                    </div>

                    {mediaUrls.length > 0 && (
                      <img
                        src={mediaUrls[0]}
                        alt="Post preview"
                        className="w-full max-h-72 object-cover"
                      />
                    )}

                    <div className="flex items-center justify-around px-3.5 py-2.5 border-t border-border text-xs text-muted-foreground">
                      <span>Like</span>
                      <span>Comment</span>
                      <span>Share</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ===== Platforms & Accounts ===== */}
            <div className="bg-card border border-border rounded-lg flex flex-col max-h-[calc(100vh-8rem)] xl:sticky xl:top-6">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between shrink-0 border-b border-border">
                <div className="flex items-center gap-2">
                  <Users2 className="w-4 h-4 text-primary/70" />
                  <span className="text-sm font-medium text-foreground">Platforms & accounts</span>
                </div>
                <button
                  type="button"
                  onClick={handleSelectAllPlatforms}
                  className="text-xs font-medium text-primary hover:underline shrink-0"
                >
                  {ALL_PLATFORMS.every((p) => selectedPlatforms.includes(p)) ? 'Clear all' : 'Select all'}
                </button>
              </div>

              <div className="overflow-y-auto p-4 space-y-3">
                {ALL_PLATFORMS.map((platform) => {
                  const meta = platformMeta[platform];
                  const Icon = meta.icon;
                  const isSelected = selectedPlatforms.includes(platform);
                  const isExpanded = expandedPlatforms.includes(platform);
                  const platformAccounts = accounts.filter((a) => a.platform === platform);

                  return (
                    <div
                      key={platform}
                      style={isSelected ? { boxShadow: `0 0 0 2px ${meta.ring}` } : undefined}
                      className={`rounded-lg border transition-colors ${
                        isSelected ? 'border-transparent bg-muted/20' : 'border-border'
                      }`}
                    >
                      <div
                        className={`w-full flex items-center justify-between p-3.5 rounded-lg transition-colors ${
                          isSelected ? '' : 'hover:bg-muted/20'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleTogglePlatform(platform)}
                          className="flex items-center gap-2.5 min-w-0 text-left flex-1"
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: meta.bg }}
                          >
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{meta.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {platformAccounts.length > 0
                                ? `${platformAccounts.length} account${platformAccounts.length === 1 ? '' : 's'} • ${platformLimits[platform].toLocaleString()} chars`
                                : `${platformLimits[platform].toLocaleString()} chars`}
                            </div>
                          </div>
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                          {isSelected && platformAccounts.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleToggleExpand(platform)}
                              className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title={isExpanded ? 'Collapse accounts' : 'Expand accounts'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {isSelected && (isExpanded || platformAccounts.length === 0) && (
                        <div className="px-3.5 pb-3.5 pt-1">
                          {platformAccounts.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {platformAccounts.map((account) => {
                                const isChecked = selectedAccounts.includes(account.id);
                                return (
                                  <button
                                    key={account.id}
                                    type="button"
                                    onClick={() => handleToggleAccount(account.id)}
                                    className={`flex items-center gap-2 text-xs pl-1.5 pr-3 py-1.5 rounded-full border transition-colors ${
                                      isChecked
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-background border-border text-muted-foreground hover:border-primary/40'
                                    }`}
                                  >
                                    <span
                                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                                        isChecked ? 'bg-white/20' : 'bg-muted text-muted-foreground'
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
                            <p className="text-xs text-amber-700">
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
          </div>
        </main>
      </AppShell>
    </div>
  );
}