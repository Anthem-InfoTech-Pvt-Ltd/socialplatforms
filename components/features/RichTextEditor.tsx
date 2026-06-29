'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { useRef } from 'react'

interface RichTextEditorProps {
  content: string
  onChange: (html: string, text: string) => void
  placeholder?: string
  maxLength?: number
}

export function RichTextEditor({ content, onChange, placeholder = "What's on your mind?", maxLength = 3000 }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder }),
      CharacterCount.configure({ limit: maxLength }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML(), editor.getText())
    },
  })

  if (!editor) return null

  const addImage = () => fileInputRef.current?.click()

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const src = event.target?.result as string
      editor.chain().focus().setImage({ src }).run()
    }
    reader.readAsDataURL(file)
  }

  const charCount = editor.storage.characterCount.characters()
  const percentage = Math.round((charCount / maxLength) * 100)

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border bg-card">
        {/* Text Style */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded text-sm font-bold transition-colors ${editor.isActive('bold') ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}`}
          title="Bold"
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded text-sm italic transition-colors ${editor.isActive('italic') ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}`}
          title="Italic"
        >
          I
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 rounded text-sm line-through transition-colors ${editor.isActive('strike') ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}`}
          title="Strikethrough"
        >
          S
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Lists */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded text-sm transition-colors ${editor.isActive('bulletList') ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}`}
          title="Bullet List"
        >
          • List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded text-sm transition-colors ${editor.isActive('orderedList') ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}`}
          title="Numbered List"
        >
          1. List
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Headings */}
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded text-sm font-semibold transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}`}
          title="Heading"
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded text-sm transition-colors ${editor.isActive('blockquote') ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}`}
          title="Quote"
        >
          ❝
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Media */}
        <button
          onClick={addImage}
          className="p-2 rounded text-sm transition-colors text-foreground hover:bg-muted"
          title="Add Image"
        >
          🖼 Image
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Clear */}
        <button
          onClick={() => editor.chain().focus().clearContent().run()}
          className="p-2 rounded text-sm transition-colors text-destructive hover:bg-destructive/10"
          title="Clear"
        >
          Clear
        </button>
      </div>

      {/* Editor Content */}
      <EditorContent
        editor={editor}
        className="min-h-[160px] max-h-[400px] overflow-y-auto p-4 prose prose-sm max-w-none
          [&_.ProseMirror]:outline-none
          [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]
          [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground
          [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none
          [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left
          [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0
          [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-lg [&_.ProseMirror_img]:my-2
          [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-primary
          [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:text-muted-foreground
          [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-4
          [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-4
          [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mb-2
          [&_.ProseMirror_strong]:font-bold [&_.ProseMirror_em]:italic"
      />

      {/* Character Count */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-card">
        <span className="text-xs text-muted-foreground">
          Supports bold, italic, lists, images
        </span>
        <span className={`text-xs font-medium ${percentage > 90 ? 'text-destructive' : 'text-muted-foreground'}`}>
          {charCount} / {maxLength}
        </span>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  )
}