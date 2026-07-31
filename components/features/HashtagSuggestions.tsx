'use client'

import { useState, useMemo } from 'react'
import { Hash, Search } from 'lucide-react'

// Curated "popular" starter list. Swap this for a real trends API later —
// the component only needs an array of lowercase tags (no '#').
const POPULAR_HASHTAGS = [
  'marketing', 'socialmedia', 'digitalmarketing', 'branding', 'contentcreator',
  'smallbusiness', 'entrepreneur', 'startup', 'marketingtips', 'growth',
  'instagood', 'trending', 'motivation', 'business', 'design',
  'tech', 'innovation', 'productivity', 'sale', 'newpost',
]

interface HashtagSuggestionsProps {
  onSelect: (hashtag: string) => void
}

export function HashtagSuggestions({ onSelect }: HashtagSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q
      ? POPULAR_HASHTAGS.filter((tag) => tag.includes(q))
      : POPULAR_HASHTAGS
    return base.slice(0, 12)
  }, [query])

  const handleSelect = (tag: string) => {
    onSelect(`#${tag} `)
    setQuery('')
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen((prev) => !prev)
        }}
        className={`flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors ${
          isOpen ? 'bg-muted text-foreground' : ''
        }`}
        title="Search hashtags"
      >
        <Hash className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          <div className="absolute bottom-full left-0 mb-2 w-72 bg-card border border-border rounded-lg shadow-lg z-20 p-2">
            <div className="flex items-center gap-2 px-2 py-1.5 border border-border rounded-md bg-background">
              <Search className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for popular hashtags"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2 max-h-40 overflow-y-auto">
              {filtered.length > 0 ? (
                filtered.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSelect(tag)}
                    className="text-xs px-2 py-1 rounded-full bg-muted text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    #{tag}
                  </button>
                ))
              ) : (
                <p className="text-xs text-muted-foreground px-1 py-1">No matching hashtags</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}