'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { Eraser } from 'lucide-react'

interface RichTextEditorProps {
  content: string
  onChange: (html: string, text: string) => void
  placeholder?: string
  maxLength?: number
}

export function RichTextEditor({ content, onChange, placeholder = "What's on your mind?", maxLength = 3000 }: RichTextEditorProps) {
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

  return (
    <div
      className={`border rounded-xl overflow-hidden bg-background shadow-sm transition-all ${
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

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/60 bg-muted/20">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            editor.commands.clearContent()
          }}
          disabled={charCount === 0}
          className="flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-destructive disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <Eraser className="w-3.5 h-3.5" />
          Clear
        </button>

        <div className="flex items-center gap-3">
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