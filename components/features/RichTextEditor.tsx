'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'

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

  return (
    <div className={`border rounded-xl overflow-hidden bg-background transition-all ${
      isAtLimit
        ? 'border-destructive ring-1 ring-destructive/20'
        : 'border-border focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10'
    }`}>
      <EditorContent
        editor={editor}
        className="
          [&_.ProseMirror]:outline-none
          [&_.ProseMirror]:p-4
          [&_.ProseMirror]:min-h-[200px]
          [&_.ProseMirror]:max-h-[360px]
          [&_.ProseMirror]:overflow-y-auto
          [&_.ProseMirror]:text-sm
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
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/50 bg-muted/10">
        <button
          type="button"
          onClick={() => editor.commands.clearContent()}
          className="text-xs text-muted-foreground/60 hover:text-destructive transition-colors"
        >
          Clear
        </button>
        <div className="flex items-center gap-2.5">
          {isNearLimit && (
            <span className={`text-xs ${isAtLimit ? 'text-destructive font-medium' : 'text-amber-500'}`}>
              {isAtLimit ? 'Limit reached' : `${maxLength - charCount} left`}
            </span>
          )}
          <div className="w-20 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isAtLimit ? 'bg-destructive' : isNearLimit ? 'bg-amber-500' : 'bg-primary/40'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <span className={`text-xs tabular-nums ${
            isAtLimit ? 'text-destructive font-medium' : 'text-muted-foreground/50'
          }`}>
            {charCount.toLocaleString()} / {maxLength.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}