'use client'

import { useEffect, useRef, useState } from 'react'
import { Bookmark, Plus, ChevronLeft, Trash2, Pencil, Loader2, Search, Tag } from 'lucide-react'
import { useAuth } from '@/store/AuthContext'
import { EmojiPicker } from './EmojiPicker'
import { HashtagSuggestions } from './HashtagSuggestions'

interface SavedTextItem {
  id: string
  title: string | null
  content: string
  tags: string[]
  created_at: string
}

interface SavedTextsProps {
  /** Insert the chosen saved text at the editor's current cursor position */
  onInsert: (text: string) => void
}

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

export function SavedTexts({ onInsert }: SavedTextsProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<'list' | 'form'>('list')
  const [items, setItems] = useState<SavedTextItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [showTagMenu, setShowTagMenu] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formTags, setFormTags] = useState('')
  const [formContent, setFormContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const contentRef = useRef<HTMLTextAreaElement>(null)

  const loadSavedTexts = async () => {
    if (!user) return
    try {
      setIsLoading(true)
      setError('')
      const res = await fetch(`/api/saved-texts?userId=${user.id}`)
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to load saved texts')
      setItems(data.savedTexts ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load saved texts')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) loadSavedTexts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const openNewForm = () => {
    setEditingId(null)
    setFormTitle('')
    setFormTags('')
    setFormContent('')
    setError('')
    setView('form')
  }

  const openEditForm = (item: SavedTextItem) => {
    setEditingId(item.id)
    setFormTitle(item.title ?? '')
    setFormTags((item.tags ?? []).join(', '))
    setFormContent(item.content)
    setError('')
    setView('form')
  }

  // Used by the emoji/hashtag tools inside the "New text" form — inserts at
  // the textarea's current cursor position rather than at the end.
  const insertIntoForm = (text: string) => {
    const el = contentRef.current
    if (!el) {
      setFormContent((prev) => prev + text)
      return
    }
    const start = el.selectionStart ?? formContent.length
    const end = el.selectionEnd ?? formContent.length
    const next = formContent.slice(0, start) + text + formContent.slice(end)
    setFormContent(next)
    requestAnimationFrame(() => {
      el.focus()
      const cursor = start + text.length
      el.setSelectionRange(cursor, cursor)
    })
  }

  const handleSave = async () => {
    if (!user) return
    if (!formContent.trim()) {
      setError('Write a description for this saved text')
      return
    }
    try {
      setIsSaving(true)
      setError('')
      const body = {
        userId: user.id,
        title: formTitle,
        content: formContent,
        tags: parseTags(formTags),
      }
      const res = await fetch(
        editingId ? `/api/saved-texts/${editingId}` : '/api/saved-texts',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to save text')

      if (editingId) {
        setItems((prev) => prev.map((i) => (i.id === editingId ? data.savedText : i)))
      } else {
        setItems((prev) => [data.savedText, ...prev])
      }
      setView('list')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save text')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const previous = items
    setItems((prev) => prev.filter((i) => i.id !== id))
    try {
      const res = await fetch(`/api/saved-texts/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to delete')
    } catch {
      setItems(previous)
      setError('Failed to delete saved text')
    }
  }

  const allTags = Array.from(new Set(items.flatMap((i) => i.tags ?? [])))

  const filteredItems = items.filter((item) => {
    const q = search.trim().toLowerCase()
    const matchesSearch =
      !q ||
      item.title?.toLowerCase().includes(q) ||
      item.content.toLowerCase().includes(q)
    const matchesTag = !tagFilter || (item.tags ?? []).includes(tagFilter)
    return matchesSearch && matchesTag
  })

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setView('list')
          setIsOpen((prev) => !prev)
        }}
        className={`flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors ${
          isOpen ? 'bg-muted text-foreground' : ''
        }`}
        title="Saved texts"
      >
        <Bookmark className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          <div
            className="absolute bottom-full left-0 mb-2 w-96 max-h-[28rem] overflow-y-auto bg-card border border-border rounded-lg shadow-lg z-20"
            onClick={(e) => e.stopPropagation()}
          >
            {view === 'list' ? (
              <div className="p-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 border border-border rounded-md bg-background">
                    <Search className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                    />
                  </div>

                  {allTags.length > 0 && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowTagMenu((prev) => !prev)}
                        className={`flex items-center justify-center w-8 h-8 rounded-md border transition-colors ${
                          tagFilter
                            ? 'border-primary text-primary bg-primary/5'
                            : 'border-border text-muted-foreground hover:bg-muted'
                        }`}
                        title="Filter by tag"
                      >
                        <Tag className="w-3.5 h-3.5" />
                      </button>
                      {showTagMenu && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-md shadow-lg z-30 p-1 max-h-40 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setTagFilter(null)
                              setShowTagMenu(false)
                            }}
                            className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted"
                          >
                            All tags
                          </button>
                          {allTags.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => {
                                setTagFilter(tag)
                                setShowTagMenu(false)
                              }}
                              className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted ${
                                tagFilter === tag ? 'text-primary font-medium' : ''
                              }`}
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={openNewForm}
                    className="flex items-center justify-center w-8 h-8 rounded-md bg-foreground text-background hover:opacity-90 transition-opacity shrink-0"
                    title="New saved text"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {error && <p className="text-xs text-destructive">{error}</p>}

                <div className="space-y-1.5">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-6 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 border border-border rounded-md hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onInsert(`${item.content} `)
                              setIsOpen(false)
                            }}
                            className="flex-1 text-left min-w-0"
                          >
                            {item.title && (
                              <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                            )}
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.content}</p>
                          </button>
                          <div className="flex items-center gap-2 shrink-0 pt-0.5">
                            <button
                              type="button"
                              onClick={() => openEditForm(item)}
                              className="text-gray-500 hover:text-gray-600 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="text-gray-500 hover:text-destructive transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {item.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {item.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      No saved texts yet — tap + to add one
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setView('list')}
                    className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <p className="text-sm font-semibold text-foreground">
                    {editingId ? 'Edit text' : 'New text'}
                  </p>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="text-xs font-medium px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  >
                    {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                    Save
                  </button>
                </div>

                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full text-sm px-3 py-2 border border-border rounded-md bg-background outline-none focus:border-primary/60"
                />

                <input
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="Tags (comma separated)"
                  className="w-full text-sm px-3 py-2 border border-border rounded-md bg-background outline-none focus:border-primary/60"
                />

                <div className="border border-border rounded-md bg-background overflow-hidden">
                  <textarea
                    ref={contentRef}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Description"
                    rows={5}
                    className="w-full text-sm px-3 py-2 outline-none resize-none placeholder:text-muted-foreground/50"
                  />
                  <div className="flex items-center gap-1 px-2 py-1.5 border-t border-border/60">
                    <EmojiPicker onSelect={insertIntoForm} />
                    <HashtagSuggestions onSelect={insertIntoForm} />
                  </div>
                </div>

                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}