'use client'

import { useState, useMemo } from 'react'
import { MapPin, X, Search } from 'lucide-react'

// Static suggestion list so the picker works without a Places API key.
// Swap SUGGESTED_LOCATIONS for a real geocoding lookup later if needed.
const SUGGESTED_LOCATIONS = [
  'New Delhi, India', 'Mumbai, India', 'Bengaluru, India', 'Patna, India',
  'New York, USA', 'London, UK', 'Dubai, UAE', 'Singapore',
]

interface LocationPickerProps {
  value: string | null
  onChange: (location: string | null) => void
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SUGGESTED_LOCATIONS
    return SUGGESTED_LOCATIONS.filter((loc) => loc.toLowerCase().includes(q))
  }, [query])

  const handleSelect = (location: string) => {
    onChange(location)
    setQuery('')
    setIsOpen(false)
  }

  const handleCustomSubmit = () => {
    if (query.trim()) {
      onChange(query.trim())
      setQuery('')
      setIsOpen(false)
    }
  }

  return (
    <div className="relative inline-block">
      {value ? (
        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
          <MapPin className="w-3 h-3" />
          <span>{value}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="hover:text-destructive transition-colors"
            title="Remove location"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen((prev) => !prev)
          }}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
        >
          <MapPin className="w-3 h-3" />
          Add location
        </button>
      )}

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-20 p-2">
            <div className="flex items-center gap-2 px-2 py-1.5 border border-border rounded-md bg-background">
              <Search className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                placeholder="Search or type a location"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="mt-2 max-h-40 overflow-y-auto space-y-0.5">
              {filtered.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => handleSelect(loc)}
                  className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
                >
                  {loc}
                </button>
              ))}
              {query.trim() && !filtered.some((l) => l.toLowerCase() === query.trim().toLowerCase()) && (
                <button
                  type="button"
                  onClick={handleCustomSubmit}
                  className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-primary"
                >
                  Use "{query.trim()}"
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}