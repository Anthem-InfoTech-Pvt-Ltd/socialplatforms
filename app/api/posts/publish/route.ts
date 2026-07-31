// app/api/posts/publish/route.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

const INSTAGRAM_CAPTION_LIMIT = 2200

// Helper function — Convert HTML to plain text
function htmlToPlainText(html: string): string {
  return html
    // Links inserted via the "Insert link" tool show custom display text in the
    // editor, but FB/IG/LinkedIn captions are plain text — so keep both the
    // text and the actual URL, or the link would silently vanish on publish.
    .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, (_, href, text) =>
      text.trim() === href.trim() ? href : `${text} (${href})`
    )
    .replace(/<strong>(.*?)<\/strong>/gi, '*$1*')
    .replace(/<em>(.*?)<\/em>/gi, '_$1_')
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n$1\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '\n• $1')
    .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (_, content) => {
      let i = 1
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `\n${i++}. $1`)
    })
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '\n"$1"\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gis, '$1\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Extract image URLs from HTML — handles both single and double quoted src attrs
function extractImageUrls(html: string): string[] {
  const matches = html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)
  return [...matches]
    .map(match => match[1])
    .filter(url => url.startsWith('http')) // data: URLs (base64) can't be used by FB/IG/LinkedIn APIs — they need a public URL
}

export async function POST(request: Request) {
  const { postId, accountIds } = await request.json()

  const supabase = await createServerSupabaseClient()

  // Fetch post
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single()

  if (postError || !post) {
    return Response.json(
      { success: false, error: 'Post not found' },
      { status: 404 }
    )
  }

  let plainText = htmlToPlainText(post.content)

  // Optional location tag (posts.location) — only appended if the column
  // exists and has a value, so posts without it behave exactly as before.
  if (post.location) {
    plainText = `${plainText}\n\n📍 ${post.location}`
  }

  // Images upload karke alag se 'media_urls' column mein store hote hain (compose page
  // ke upload button se), HTML content ke andar <img> tag ke roop mein nahi aate.
  // Isliye pehle wahi column check karo; agar kisi purane post mein content ke andar
  // hi <img> tag ho (paste kiya hua), toh fallback ke roop mein wahan se bhi nikaal lo.
  //
  // NOTE: agar tumhare Supabase schema mein column ka naam 'media_urls' nahi hai
  // (jaise 'image_urls' ya 'media'), toh yahan wahi naam use karo.
  const storedMediaUrls: string[] = Array.isArray(post.media_urls) ? post.media_urls : []
  const imageUrls = storedMediaUrls.length > 0
    ? storedMediaUrls
    : extractImageUrls(post.content)

  console.log('Plain Text:', plainText)
  console.log('Plain Text length:', plainText.length)
  console.log('Images:', imageUrls)

  const results = []

  for (const accountId of accountIds) {
    const { data: account } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('id', accountId)
      .single()

    if (!account) {
      results.push({
        accountId,
        platform: null,
        success: false,
        error: 'Account not found',
      })
      continue
    }

    try {
      let platformPostId: string | null = null

      // ==========================
      // FACEBOOK
      // ==========================
      if (account.platform === 'facebook') {
        let res

        if (imageUrls.length > 0) {
          // Publish image post
          res = await fetch(
            `https://graph.facebook.com/v18.0/${account.account_id}/photos`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                url: imageUrls[0],
                caption: plainText,
                access_token: account.access_token,
              }),
            }
          )
        } else {
          // Publish text post
          res = await fetch(
            `https://graph.facebook.com/v18.0/${account.account_id}/feed`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: plainText,
                access_token: account.access_token,
              }),
            }
          )
        }

        const data = await res.json()

        console.log(
          'Facebook post result:',
          JSON.stringify(data, null, 2)
        )

        if (!res.ok || data.error) {
          throw new Error(
            data.error?.message || 'Facebook publish failed'
          )
        }

        platformPostId = data.post_id || data.id
      }

      // ==========================
      // INSTAGRAM
      // ==========================
      if (account.platform === 'instagram') {
        // Instagram Graph API has no text-only feed post — an image (or video) is required
        if (imageUrls.length === 0) {
          throw new Error(
            'Instagram requires at least one image — text-only posts are not supported'
          )
        }

        // Instagram caption hard limit is 2,200 characters. Facebook doesn't enforce
        // this, so a long post can silently succeed on FB but fail on IG's container
        // creation step. Trim it here so the request never gets rejected for length,
        // and log a warning so we know it happened.
        let igCaption = plainText
        if (igCaption.length > INSTAGRAM_CAPTION_LIMIT) {
          console.warn(
            `Instagram caption too long (${igCaption.length} chars) — truncating to ${INSTAGRAM_CAPTION_LIMIT}`
          )
          igCaption = igCaption.slice(0, INSTAGRAM_CAPTION_LIMIT - 1) + '…'
        }

        // Step 1: create a media container
        const containerRes = await fetch(
          `https://graph.facebook.com/v18.0/${account.account_id}/media`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image_url: imageUrls[0],
              caption: igCaption,
              access_token: account.access_token,
            }),
          }
        )

        const containerData = await containerRes.json()

        console.log(
          'Instagram container result:',
          JSON.stringify(containerData, null, 2)
        )

        if (!containerRes.ok || containerData.error) {
          throw new Error(
            containerData.error?.message
              || containerData.error?.error_user_msg
              || 'Instagram container creation failed'
          )
        }

        // Step 2: publish the container
        const publishRes = await fetch(
          `https://graph.facebook.com/v18.0/${account.account_id}/media_publish`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              creation_id: containerData.id,
              access_token: account.access_token,
            }),
          }
        )

        const publishData = await publishRes.json()

        console.log(
          'Instagram publish result:',
          JSON.stringify(publishData, null, 2)
        )

        if (!publishRes.ok || publishData.error) {
          throw new Error(
            publishData.error?.message
              || publishData.error?.error_user_msg
              || 'Instagram publish failed'
          )
        }

        platformPostId = publishData.id
      }

      // ==========================
      // LINKEDIN
      // ==========================
      if (account.platform === 'linkedin') {
        const res = await fetch(
          'https://api.linkedin.com/v2/ugcPosts',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${account.access_token}`,
              'Content-Type': 'application/json',
              'X-Restli-Protocol-Version': '2.0.0',
            },
            body: JSON.stringify({
              author: `urn:li:person:${account.account_id}`,
              lifecycleState: 'PUBLISHED',
              specificContent: {
                'com.linkedin.ugc.ShareContent': {
                  shareCommentary: {
                    text: plainText,
                  },
                  shareMediaCategory: 'NONE',
                },
              },
              visibility: {
                'com.linkedin.ugc.MemberNetworkVisibility':
                  'PUBLIC',
              },
            }),
          }
        )

        const data = await res.json()

        console.log(
          'LinkedIn post result:',
          JSON.stringify(data, null, 2)
        )

        if (!res.ok || data.serviceErrorCode) {
          throw new Error(
            data.message || 'LinkedIn publish failed'
          )
        }

        platformPostId = data.id
      }

      // Save engagement
      await supabase.from('post_engagements').insert({
        post_id: postId,
        platform: account.platform,
        platform_post_id: platformPostId,
      })

      results.push({
        accountId,
        platform: account.platform,
        success: true,
        platformPostId,
      })
    } catch (err) {
      console.error(`Publish failed for account ${accountId} (${account.platform}):`, err)

      results.push({
        accountId,
        platform: account.platform,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // Update post status
  await supabase
    .from('posts')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', postId)

  const allFailed = results.length > 0 && results.every((r) => !r.success)

  return Response.json({
    success: !allFailed,
    results,
  })
}


'use client'

import { useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Link from '@tiptap/extension-link'
import { Eraser, ImagePlus, Loader2, X } from 'lucide-react'
import { EmojiPicker } from './EmojiPicker'
import { HashtagSuggestions } from './HashtagSuggestions'
import { UtmLinkBuilder } from './UtmLinkBuilder'
import { SavedTexts } from './SavedTexts'

interface RichTextEditorProps {
  content: string
  onChange: (html: string, text: string) => void
  placeholder?: string
  maxLength?: number
  // Image attachment — lives in the same toolbar row as emoji/hashtag/link/saved texts.
  // Upload logic (validation, Supabase call, setMediaUrls) stays in the parent; this
  // component just triggers the file picker and renders the toolbar icon + thumbnails.
  mediaUrls?: string[]
  onImageUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveImage?: (url: string) => void
  isUploadingImage?: boolean
  imageHint?: string
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "What's on your mind?",
  maxLength = 3000,
  mediaUrls = [],
  onImageUpload,
  onRemoveImage,
  isUploadingImage = false,
  imageHint,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bold: false,
        italic: false,
        strike: false,
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Placeholder.configure({ placeholder }),
      CharacterCount.configure({ limit: maxLength }),
      // Lets the "Insert link" tool show custom display text instead of the raw
      // URL, and makes it clickable (opens in a new tab) both while editing
      // and wherever this HTML is rendered (e.g. the Preview panel).
      Link.configure({
        openOnClick: true,
        autolink: true,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'text-primary underline underline-offset-2 cursor-pointer',
        },
      }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML(), editor.getText())
    },
  })

  if (!editor) return null

  const charCount = editor.storage.characterCount.characters()
  const percentage = Math.round((charCount / maxLength) * 100)
  const isNearLimit = percentage > 80
  const isAtLimit = percentage >= 100

  // Circular progress geometry
  const radius = 9
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (Math.min(percentage, 100) / 100) * circumference

  // Insert plain text (or a small HTML fragment, e.g. a link) at the current
  // cursor position, then refocus the editor.
  const insertAtCursor = (content: string) => {
    editor.chain().focus().insertContent(content).run()
  }

  return (
    <div
      className={`border rounded-xl bg-background shadow-sm transition-all ${
        isAtLimit
          ? 'border-destructive ring-1 ring-destructive/20'
          : 'border-border focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10'
      }`}
      onClick={() => editor.commands.focus()}
    >
      <EditorContent
        editor={editor}
        className="
          [&_.ProseMirror]:outline-none
          [&_.ProseMirror]:p-4
          [&_.ProseMirror]:min-h-[220px]
          [&_.ProseMirror]:max-h-[380px]
          [&_.ProseMirror]:overflow-y-auto
          [&_.ProseMirror]:text-[15px]
          [&_.ProseMirror]:leading-relaxed
          [&_.ProseMirror]:text-foreground
          [&_.ProseMirror_p]:mb-2
          [&_.ProseMirror_p:last-child]:mb-0
          [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]
          [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground/50
          [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none
          [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left
          [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0
        "
      />

      {/* Attached image thumbnails — shown inside the editor, right above the toolbar */}
      {mediaUrls.length > 0 && (
        <div
          className="flex flex-wrap gap-2 px-4 pb-3 pt-1 border-t border-border/60"
          onClick={(e) => e.stopPropagation()}
        >
          {mediaUrls.map((url) => (
            <div key={url} className="group relative w-14 h-14 rounded-lg overflow-hidden border border-border shrink-0">
              <img src={url} alt="attached" className="w-full h-full object-cover" />
              {onRemoveImage && (
                <button
                  type="button"
                  onClick={() => onRemoveImage(url)}
                  className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer / toolbar */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-t border-border/60 bg-muted/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              editor.commands.clearContent()
            }}
            disabled={charCount === 0}
            className="flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-destructive disabled:opacity-40 disabled:pointer-events-none transition-colors mr-1.5 pr-1.5 border-r border-border/60"
            title="Clear content"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>

          <EmojiPicker onSelect={insertAtCursor} />
          <HashtagSuggestions onSelect={insertAtCursor} />
          <UtmLinkBuilder onInsert={insertAtCursor} />
          <SavedTexts onInsert={insertAtCursor} />

          {onImageUpload && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                title={imageHint ? `Add image (${imageHint})` : 'Add image'}
              >
                {isUploadingImage ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ImagePlus className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  onImageUpload(e)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="hidden"
              />
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {imageHint && (
            <span className="text-[11px] font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
              {imageHint}
            </span>
          )}

          {isNearLimit && (
            <span className={`text-xs ${isAtLimit ? 'text-destructive font-medium' : 'text-amber-500'}`}>
              {isAtLimit ? 'Limit reached' : `${maxLength - charCount} left`}
            </span>
          )}

          {/* Circular progress ring */}
          <div className="relative w-6 h-6 shrink-0">
            <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="12"
                r={radius}
                fill="none"
                strokeWidth="2.5"
                className="stroke-muted"
              />
              <circle
                cx="12"
                cy="12"
                r={radius}
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className={`transition-all duration-300 ${
                  isAtLimit ? 'stroke-destructive' : isNearLimit ? 'stroke-amber-500' : 'stroke-primary/60'
                }`}
              />
            </svg>
          </div>

          <span className={`text-xs tabular-nums ${
            isAtLimit ? 'text-destructive font-medium' : 'text-muted-foreground/60'
          }`}>
            {charCount.toLocaleString()} / {maxLength.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}


'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/AuthContext';
import { useAccounts } from '@/store/AccountsContext';
import { usePosts } from '@/store/PostsContext';
import { Header } from '@/components/layout/Header';
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
                  <LocationPicker value={location} onChange={setLocation} />
                  <button
                    type="button"
                    onClick={() => setShowNotes((prev) => !prev)}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                      showNotes || internalNotes
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                        : 'border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary'
                    }`}
                    title="Internal note (not published)"
                  >
                    <StickyNote className="w-3 h-3" />
                    Notes{internalNotes ? ' •' : ''}
                  </button>
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
                  onImageUpload={handleImageUpload}
                  onRemoveImage={handleRemoveImage}
                  isUploadingImage={isUploading}
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
                      className={`rounded-xl border transition-colors ${
                        isSelected ? 'border-transparent' : 'border-border'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleTogglePlatform(platform)}
                        className={`w-full flex items-center justify-between p-4 text-left rounded-xl transition-colors ${
                          isSelected ? 'bg-card' : 'bg-background hover:bg-muted/30'
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
    </div>
  );
}