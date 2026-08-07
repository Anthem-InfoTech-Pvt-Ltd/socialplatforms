'use client'

import { useState } from 'react'
import {
  Sparkles,
  Loader2,
  ChevronLeft,
  X,
  Hash,
  Smile,
  Briefcase,
  Coffee,
  Laugh,
  Rocket,
  RefreshCw,
  Check,
  Wand2,
} from 'lucide-react'
import { FacebookIcon, InstagramIcon, LinkedinIcon } from './SocialIcons'

interface AIPostGeneratorProps {
  onInsert: (html: string) => void
  availablePlatforms: string[]
  defaultSelected?: string[]
}

interface Variant {
  text: string
  platform?: string
}

const PLATFORM_META: Record<string, { label: string; icon: typeof FacebookIcon; bg: string; limit: number }> = {
  facebook: { label: 'Facebook', icon: FacebookIcon, bg: '#1877F2', limit: 1000 },
  instagram: {
    label: 'Instagram',
    icon: InstagramIcon,
    bg: 'linear-gradient(135deg, #fd5949, #d6249f, #285aeb)',
    limit: 1000,
  },
  linkedin: { label: 'LinkedIn', icon: LinkedinIcon, bg: '#0A66C2', limit: 1000 },
}

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional', icon: Briefcase },
  { value: 'casual', label: 'Casual', icon: Coffee },
  { value: 'funny', label: 'Funny', icon: Laugh },
  { value: 'inspirational', label: 'Inspirational', icon: Rocket },
]

function textToHtml(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((block) => `<p>${block.split('\n').join('<br>')}</p>`)
    .join('')
}

export function AIPostGenerator({ onInsert, availablePlatforms, defaultSelected }: AIPostGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<'form' | 'results'>('form')
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState('professional')
  const [includeHashtags, setIncludeHashtags] = useState(true)
  const [includeEmoji, setIncludeEmoji] = useState(true)
  const [platforms, setPlatforms] = useState<string[]>(defaultSelected?.length ? defaultSelected : availablePlatforms)
  const [perPlatform, setPerPlatform] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [variants, setVariants] = useState<Variant[]>([])
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))
  }

  const generate = async () => {
    if (!topic.trim()) return setError('Topic likho pehle')
    if (platforms.length === 0) return setError('Kam se kam ek platform select karo')
    try {
      setIsLoading(true)
      setError('')
      const res = await fetch('/api/ai/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic, tone, includeHashtags, includeEmoji, platforms,
          perPlatform: perPlatform && platforms.length > 1,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Generation failed')
      setVariants(data.variants)
      setView('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUse = (text: string) => {
    onInsert(textToHtml(text))
    close()
  }

  const handleCopy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 1500)
    } catch {
      // ignore — "Use" still works without clipboard permission
    }
  }

  const close = () => {
    setIsOpen(false)
    setView('form')
    setTopic('')
    setVariants([])
    setError('')
  }

  const strictestLimit = platforms.length > 0
    ? Math.min(...platforms.map((p) => PLATFORM_META[p]?.limit ?? 1000))
    : 1000

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setIsOpen(true) }}
        className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
        title="Generate with AI"
      >
        <Sparkles className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="w-full max-w-3xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative shrink-0 px-5 py-4 border-b border-border/60 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
                  <Wand2 className="w-4.5 h-4.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">AI Post Generator</p>
                  <p className="text-[11px] text-muted-foreground">Powered by Claude</p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="ml-auto w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {view === 'form' ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">
                      What's this post about?
                    </label>
                    <textarea
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. Announcing our new dashboard update with faster loading times"
                      rows={4}
                      autoFocus
                      className="w-full text-sm px-3.5 py-3 border border-border rounded-xl bg-background outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 resize-none placeholder:text-muted-foreground/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Platforms</label>
                    <div className="grid grid-cols-3 gap-2">
                      {availablePlatforms.map((p) => {
                        const meta = PLATFORM_META[p]
                        if (!meta) return null
                        const Icon = meta.icon
                        const selected = platforms.includes(p)
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => togglePlatform(p)}
                            className={`relative flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all ${
                              selected
                                ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                                : 'border-border hover:border-primary/30 hover:bg-muted/40'
                            }`}
                          >
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: meta.bg }}
                            >
                              <Icon className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="text-[11px] font-medium text-foreground">{meta.label}</span>
                            {selected && (
                              <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center">
                                <Check className="w-2 h-2 text-primary-foreground" />
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {platforms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPerPlatform((p) => !p)}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-border hover:border-primary/30 transition-colors text-left"
                    >
                      <div
                        className={`w-8 h-4.5 rounded-full flex items-center px-0.5 shrink-0 transition-colors ${
                          perPlatform ? 'bg-primary justify-end' : 'bg-muted justify-start'
                        }`}
                      >
                        <div className="w-3.5 h-3.5 rounded-full bg-white shadow-sm" />
                      </div>
                      <span className="text-[11px] text-muted-foreground leading-tight">
                        Tailor a separate version per platform, instead of one caption for all
                      </span>
                    </button>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Tone</label>
                    <div className="grid grid-cols-2 gap-2">
                      {TONE_OPTIONS.map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setTone(value)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
                            tone === value
                              ? 'border-primary/40 bg-primary/5 text-primary'
                              : 'border-border text-muted-foreground hover:border-primary/30 hover:bg-muted/40'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIncludeHashtags((v) => !v)}
                      className={`flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
                        includeHashtags
                          ? 'border-primary/40 bg-primary/5 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/30'
                      }`}
                    >
                      <Hash className="w-3 h-3" />
                      Hashtags
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncludeEmoji((v) => !v)}
                      className={`flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
                        includeEmoji
                          ? 'border-primary/40 bg-primary/5 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/30'
                      }`}
                    >
                      <Smile className="w-3 h-3" />
                      Emoji
                    </button>
                  </div>

                  {error && (
                    <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setView('form')}
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={generate}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                      Regenerate
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {variants.map((v, i) => {
                      const meta = v.platform ? PLATFORM_META[v.platform] : null
                      const Icon = meta?.icon
                      const overLimit = v.text.length > strictestLimit
                      return (
                        <div
                          key={i}
                          className="group border border-border rounded-xl p-3.5 hover:border-primary/40 hover:bg-primary/[0.03] transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            {meta && Icon ? (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-foreground">
                                <span
                                  className="w-4 h-4 rounded flex items-center justify-center"
                                  style={{ background: meta.bg }}
                                >
                                  <Icon className="w-2.5 h-2.5 text-white" />
                                </span>
                                {meta.label}
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-muted-foreground">Variant {i + 1}</span>
                            )}
                            <span className={`text-[10px] tabular-nums ${overLimit ? 'text-destructive font-medium' : 'text-muted-foreground/60'}`}>
                              {v.text.length.toLocaleString()} / {strictestLimit.toLocaleString()}
                            </span>
                          </div>

                          <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap line-clamp-6">
                            {v.text}
                          </p>

                          <div className="flex items-center gap-2 mt-3">
                            <button
                              type="button"
                              onClick={() => handleUse(v.text)}
                              className="flex-1 text-[11px] font-medium py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                              Use this
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(v.text, i)}
                              className="text-[11px] font-medium px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
                            >
                              {copiedIdx === i ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {error && (
                    <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {view === 'form' && (
              <div className="shrink-0 px-5 py-3.5 border-t border-border/60 bg-muted/20">
                <button
                  type="button"
                  onClick={generate}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate captions
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}