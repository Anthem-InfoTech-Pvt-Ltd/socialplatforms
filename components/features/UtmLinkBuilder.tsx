'use client'

import { useState, useMemo } from 'react'
import { Link2 } from 'lucide-react'

interface UtmLinkBuilderProps {
  onInsert: (html: string) => void
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function UtmLinkBuilder({ onInsert }: UtmLinkBuilderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [displayText, setDisplayText] = useState('')

  const normalizedUrl = useMemo(() => {
    if (!url.trim()) return ''
    try {
      return new URL(url.trim()).toString()
    } catch {
      try {
        return new URL(`https://${url.trim()}`).toString()
      } catch {
        return ''
      }
    }
  }, [url])

  const handleInsert = () => {
    if (!normalizedUrl) return
    const text = displayText.trim() || normalizedUrl
    const html = `<a href="${escapeHtml(normalizedUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a> `
    onInsert(html)
    setUrl('')
    setDisplayText('')
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
        title="Insert link"
      >
        <Link2 className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          <div
            className="absolute bottom-full left-0 mb-2 w-72 bg-card border border-border rounded-lg shadow-lg z-20 p-3 space-y-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-foreground">Insert link</p>

            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">URL</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yoursite.com"
                className="w-full text-sm px-2 py-1.5 border border-border rounded-md bg-background outline-none focus:border-primary/60"
              />
            </div>

            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">Display text</label>
              <input
                value={displayText}
                onChange={(e) => setDisplayText(e.target.value)}
                placeholder="Click here"
                className="w-full text-sm px-2 py-1.5 border border-border rounded-md bg-background outline-none focus:border-primary/60"
              />
            </div>

            <button
              type="button"
              onClick={handleInsert}
              disabled={!normalizedUrl}
              className="w-full text-xs py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              Insert into post
            </button>
          </div>
        </>
      )}
    </div>
  )
}