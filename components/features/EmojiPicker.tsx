'use client'

import { useEffect, useMemo, useState } from 'react'
import { Smile, Search, Clock } from 'lucide-react'

const RECENTS_KEY = 'composer:recent-emojis'
const MAX_RECENTS = 21

const EMOJI_CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: 'Smileys',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
      '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
      '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
      '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
      '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
      '🥵', '🥶', '😵', '🤯', '🥳', '😎', '🤓', '🧐', '😕', '😟',
      '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰',
      '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😤',
      '😡', '😠', '🤬', '😈', '👿', '💀', '👻', '👽', '🤖', '💩',
    ],
  },
  {
    label: 'Gestures',
    icon: '👋',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
      '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍',
      '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝',
      '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂',
      '👃', '🧠', '🫀', '👀', '👁️', '👅', '👄',
    ],
  },
  {
    label: 'Hearts',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️',
      '💯', '💢', '💥', '💫', '💦', '💨', '💬', '💭', '💤',
    ],
  },
  {
    label: 'Animals',
    icon: '🐶',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
      '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🐧',
      '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄',
      '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🐢', '🐍', '🦎',
      '🦖', '🐙', '🦑', '🦐', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳',
      '🐋', '🦈', '🐊', '🐆', '🦓', '🦍', '🐘', '🦛', '🦏', '🐪',
      '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐑', '🐐',
      '🌵', '🌲', '🌳', '🌴', '🌱', '🌿', '☘️', '🍀', '🎋', '🎍',
      '🌷', '🌹', '🌻', '🌼', '🌸', '💐', '🍁', '🍂', '🍃',
    ],
  },
  {
    label: 'Food',
    icon: '🍕',
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐',
      '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑',
      '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅',
      '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳',
      '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟',
      '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘',
      '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍤', '🍙', '🍚',
      '🍘', '🍥', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁',
      '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '☕',
      '🍵', '🧃', '🥤', '🧋', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸',
      '🍹', '🧉', '🍾',
    ],
  },
  {
    label: 'Activities',
    icon: '⚽',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
      '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳',
      '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷',
      '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤸', '🤺', '🤾',
      '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴',
      '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🎗️', '🎫', '🎟️', '🎪',
      '🤹', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁',
      '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮',
      '🎰', '🧩',
    ],
  },
  {
    label: 'Travel',
    icon: '✈️',
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
      '🛻', '🚚', '🚛', '🚜', '🛵', '🏍️', '🛺', '🚲', '🛴', '🚨',
      '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞',
      '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️',
      '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁', '🛶', '⛵',
      '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '⛽', '🚧', '🚦', '🚥',
      '🗺️', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲',
      '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺',
      '🏠', '🏡', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪',
      '🏫', '🏩', '💒', '🏛️', '⛪', '🕌', '🕍', '🛕', '🕋', '⛩️',
      '🌅', '🌄', '🌆', '🌇', '🌉', '🌌', '🎆', '🎇', '🌠',
    ],
  },
  {
    label: 'Objects',
    icon: '💡',
    emojis: [
      '⌚', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '💽', '💾', '💿',
      '📀', '🎥', '🎞️', '📽️', '📺', '📷', '📸', '📹', '📼', '🔍',
      '🔎', '🕯️', '💡', '🔦', '🏮', '🪔', '📔', '📕', '📖', '📗',
      '📘', '📙', '📚', '📓', '📒', '📃', '📜', '📄', '📰', '🗞️',
      '📑', '🔖', '🏷️', '💰', '🪙', '💴', '💵', '💶', '💷', '💸',
      '💳', '🧾', '💹', '✉️', '📧', '📨', '📩', '📤', '📥', '📦',
      '📫', '📪', '📬', '📭', '📮', '🗳️', '✏️', '✒️', '🖋️', '🖊️',
      '🖌️', '🖍️', '📝', '💼', '📁', '📂', '🗂️', '📅', '📆', '🗒️',
      '🗓️', '📇', '📈', '📉', '📊', '📋', '📌', '📍', '📎', '🖇️',
      '📏', '📐', '✂️', '🗃️', '🗄️', '🗑️', '🔒', '🔓', '🔑', '🗝️',
      '🔨', '🪓', '⛏️', '⚒️', '🛠️', '🗡️', '⚔️', '🔫', '🏹', '🛡️',
      '🔧', '🪛', '🔩', '⚙️', '⚖️', '🔗', '⛓️', '🧰', '🧲', '⚗️',
      '🧪', '🧫', '🧬', '🔬', '🔭', '📡',
    ],
  },
  {
    label: 'Business',
    icon: '📈',
    emojis: [
      '📈', '📉', '💼', '💡', '📊', '🚀', '🎯', '🏆', '✅', '⚡',
      '📅', '📌', '📢', '🔔', '💬', '👀', '🔗', '📷', '🎥', '🛍️',
      '🧾', '💳', '🤝', '🧠', '📝', '🗂️', '📤', '📥', '🏢', '🌍',
      '🕐', '⏰', '⏳', '🔍', '📣', '🎉', '🥇', '📇', '🧮', '🗳️',
    ],
  },
  {
    label: 'Symbols',
    icon: '✨',
    emojis: [
      '✨', '⭐', '🌟', '💫', '🔥', '🎉', '🎊', '🎈', '🎁', '🏵️',
      '✔️', '☑️', '✳️', '❇️', '❎', '❌', '➕', '➖', '➗', '♾️',
      '‼️', '⁉️', '❓', '❔', '❕', '❗', '〰️', '💱', '💲', '⚠️',
      '🚫', '🔞', '📵', '🚭', '🔅', '🔆', '♻️', '🔱', '📛', '🔰',
      '🆕', '🆓', '🆙', '🆗', '🆒', '🆖', '🆘', '💯', '🔟', '🔢',
    ],
  },
]

const ALL_EMOJIS = Array.from(new Set(EMOJI_CATEGORIES.flatMap((c) => c.emojis)))

const KEYWORD_MAP: Record<string, string[]> = {
  smile: ['😀', '😃', '😄', '🙂', '😊'],
  happy: ['😀', '😃', '😄', '🙂', '😊', '🥳'],
  love: ['❤️', '😍', '🥰', '💕', '💖'],
  laugh: ['😂', '🤣', '😆'],
  sad: ['😢', '😭', '😔', '🙁', '😞'],
  cry: ['😢', '😭', '🥺'],
  angry: ['😡', '😠', '🤬'],
  fire: ['🔥'],
  star: ['⭐', '🌟', '✨'],
  heart: ['❤️', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔'],
  thumbs: ['👍', '👎'],
  clap: ['👏'],
  party: ['🎉', '🎊', '🥳'],
  rocket: ['🚀'],
  check: ['✅', '✔️', '☑️'],
  idea: ['💡'],
  money: ['💰', '💵', '💸', '🪙', '💳'],
  food: EMOJI_CATEGORIES.find((c) => c.label === 'Food')?.emojis ?? [],
  animal: EMOJI_CATEGORIES.find((c) => c.label === 'Animals')?.emojis ?? [],
  travel: EMOJI_CATEGORIES.find((c) => c.label === 'Travel')?.emojis ?? [],
  work: EMOJI_CATEGORIES.find((c) => c.label === 'Business')?.emojis ?? [],
}

function loadRecents(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecents(emojis: string[]) {
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(emojis))
  } catch {
    // localStorage can fail in private browsing — recents are a nice-to-have, so ignore
  }
}

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState(-1) // -1 = Recent tab
  const [query, setQuery] = useState('')
  const [recents, setRecents] = useState<string[]>([])

  useEffect(() => {
    setRecents(loadRecents())
  }, [])

  useEffect(() => {
    // Default to the Recent tab only if there's something to show there
    if (isOpen) setActiveCategory(recents.length > 0 ? -1 : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const filteredEmojis = useMemo(() => {
    if (!query.trim()) return null
    const q = query.trim().toLowerCase()
    const matchedKey = Object.keys(KEYWORD_MAP).find((k) => k.includes(q) || q.includes(k))
    if (matchedKey) return KEYWORD_MAP[matchedKey]
    return ALL_EMOJIS
  }, [query])

  const visibleEmojis = filteredEmojis
    ?? (activeCategory === -1 ? recents : EMOJI_CATEGORIES[activeCategory]?.emojis ?? [])

  const handlePick = (emoji: string) => {
    onSelect(emoji)
    const updated = [emoji, ...recents.filter((e) => e !== emoji)].slice(0, MAX_RECENTS)
    setRecents(updated)
    saveRecents(updated)
    setIsOpen(false)
    setQuery('')
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
        title="Add emoji"
      >
        <Smile className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close on outside click */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          <div
            className="absolute bottom-full left-0 mb-2 w-72 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search */}
            <div className="p-2 border-b border-border/60">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground/60 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search emoji"
                  className="w-full text-sm pl-7 pr-2 py-1.5 border border-border rounded-md bg-background outline-none focus:border-primary/60"
                />
              </div>
            </div>

            {/* Category tabs (hidden while searching) */}
            {!query.trim() && (
              <div className="flex overflow-x-auto border-b border-border/60 no-scrollbar">
                {recents.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveCategory(-1)}
                    title="Recently used"
                    className={`shrink-0 flex items-center justify-center w-9 h-9 transition-colors ${
                      activeCategory === -1
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                  </button>
                )}
                {EMOJI_CATEGORIES.map((cat, i) => (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => setActiveCategory(i)}
                    title={cat.label}
                    className={`shrink-0 flex items-center justify-center w-9 h-9 text-base transition-colors ${
                      activeCategory === i
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {cat.icon}
                  </button>
                ))}
              </div>
            )}

            {/* Emoji grid */}
            <div className="grid grid-cols-7 gap-0.5 p-2 max-h-56 overflow-y-auto">
              {visibleEmojis.length > 0 ? (
                visibleEmojis.map((emoji, idx) => (
                  <button
                    key={`${emoji}-${idx}`}
                    type="button"
                    onClick={() => handlePick(emoji)}
                    className="text-lg leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-muted transition-colors"
                  >
                    {emoji}
                  </button>
                ))
              ) : (
                <p className="col-span-7 text-xs text-muted-foreground text-center py-4">
                  {activeCategory === -1 ? 'No recent emoji yet' : 'No emoji found'}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}