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
import { AIPostGenerator } from './AIPostGenerator'

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

  availablePlatforms: string[]
selectedPlatforms?: string[]
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
  availablePlatforms,
  selectedPlatforms,
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
          <AIPostGenerator
  onInsert={insertAtCursor}
  availablePlatforms={availablePlatforms}
  defaultSelected={selectedPlatforms}
/>

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