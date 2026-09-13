'use client';

import { useEffect, useState } from 'react';
import { X, RotateCcw, Save, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/components/features/RichTextEditor';
import { uploadPostImage } from '@/lib/supabase/storage';
import { LinkedinIcon, InstagramIcon, FacebookIcon } from '@/components/features/SocialIcons';
import { AtSign, MapPin, MessageSquare } from 'lucide-react';

export interface PlatformOverrideValue {
  html: string;
  text: string;
  mediaUrls: string[];
}

const platformMeta: Record<string, { label: string; icon: any; bg: string }> = {
  facebook: { label: 'Facebook', icon: FacebookIcon, bg: '#1877F2' },
  instagram: {
    label: 'Instagram',
    icon: InstagramIcon,
    bg: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%)',
  },
  linkedin: { label: 'LinkedIn', icon: LinkedinIcon, bg: '#0A66C2' },
  threads: { label: 'Threads', icon: AtSign, bg: '#2b2b2b' },
  google_business: { label: 'Google Business', icon: MapPin, bg: '#1A73E8' },
  google_chat: { label: 'Google Chat', icon: MessageSquare, bg: '#00897B' },
};

interface PlatformOverrideEditorProps {
  open: boolean;
  platform: string;
  userId: string;
  charLimit: number;
  /** The current common/base post — used as the starting point for a new override. */
  commonValue: PlatformOverrideValue;
  /** Existing override for this platform, if the user already customized it. */
  existingOverride: PlatformOverrideValue | null;
  requiresImage?: boolean;
  onClose: () => void;
  onSave: (platform: string, value: PlatformOverrideValue) => void;
  onReset: (platform: string) => void;
}

export function PlatformOverrideEditor({
  open,
  platform,
  userId,
  charLimit,
  commonValue,
  existingOverride,
  requiresImage,
  onClose,
  onSave,
  onReset,
}: PlatformOverrideEditorProps) {
  const [html, setHtml] = useState('');
  const [text, setText] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  // Re-seed local state every time the modal is opened for a (possibly
  // different) platform — either from the existing override, or from the
  // common post as a starting point.
  useEffect(() => {
    if (!open) return;
    const seed = existingOverride ?? commonValue;
    setHtml(seed.html);
    setText(seed.text);
    setMediaUrls(seed.mediaUrls);
    setError('');
  }, [open, platform]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const meta = platformMeta[platform];
  const Icon = meta?.icon;

  const handleImageUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setError('');
      const url = await uploadPostImage(file, userId);
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

  const handleSave = () => {
    if (!text.trim()) {
      setError('Please write something for this platform');
      return;
    }
    if (requiresImage && mediaUrls.length === 0) {
      setError(`${meta?.label ?? platform} requires at least one image`);
      return;
    }
    onSave(platform, { html, text, mediaUrls });
    onClose();
  };

  const handleReset = () => {
    onReset(platform);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-xl bg-card border border-border rounded-lg shadow-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: meta?.bg }}
            >
              {Icon && <Icon className="w-4 h-4 text-white" />}
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">
                Customize for {meta?.label ?? platform}
              </div>
              <div className="text-xs text-muted-foreground">
                Only affects this platform — the common post stays the same everywhere else
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {existingOverride && (
            <div className="flex items-center justify-between text-xs bg-amber-100 border border-amber-300 text-amber-800 rounded-lg px-3 py-2">
              <span>This platform is currently using a custom version, not the common post.</span>
            </div>
          )}

          <RichTextEditor
            content={html}
            onChange={(newHtml, newText) => {
              setHtml(newHtml);
              setText(newText);
            }}
            placeholder={`Write something just for ${meta?.label ?? platform}...`}
            maxLength={charLimit}
            mediaUrls={mediaUrls}
            onImageUpload={handleImageUpload}
            onRemoveImage={handleRemoveImage}
            isUploadingImage={isUploading}
            availablePlatforms={[platform]}
            selectedPlatforms={[platform]}
            imageHint={requiresImage && mediaUrls.length === 0 ? 'required' : undefined}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={handleReset}
            disabled={!existingOverride}
            className="gap-1.5 text-muted-foreground hover:text-destructive disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to common post
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isUploading} className="gap-1.5">
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save for {meta?.label ?? platform}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}