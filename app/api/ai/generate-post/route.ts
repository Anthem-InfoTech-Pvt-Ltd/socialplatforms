import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PLATFORM_LIMITS: Record<string, number> = { facebook: 1000, instagram: 1000, linkedin: 1000 }

const PLATFORM_STYLE: Record<string, string> = {
  facebook: 'conversational, moderate emoji, friendly',
  instagram: 'casual, expressive, emoji-friendly, punchy short lines',
  linkedin: 'professional, minimal emoji, value/insight-driven',
}

const FORMAT_GUIDE = `Format every caption like this real example (required structure — never one long paragraph):

🚀 Exciting news! We're thrilled to introduce our latest feature update designed to make your workflow faster and more efficient.

✨ What's new:
- Improved dashboard performance
- Faster loading times
- Enhanced user experience

Thank you for your continued support! Stay tuned for more exciting updates. 💙

#ProductUpdate #Tech #Innovation

Rules for structure:
- Opening hook line (1-2 sentences, emoji at start if natural)
- A blank line, then body — use a bulleted list ONLY when listing multiple items/features/tips; otherwise 1-2 short paragraphs
- A blank line, then a short closing/CTA line
- A blank line, then the hashtags on their own final line
- Use "\\n\\n" between blocks and "\\n" before each bullet line in the JSON string — never return one unbroken paragraph`

export async function POST(request: Request) {
  const {
    topic,
    platforms = ['facebook', 'instagram', 'linkedin'],
    tone = 'professional',
    includeHashtags = true,
    includeEmoji = true,
  } = await request.json()

  if (!topic?.trim()) {
    return Response.json({ success: false, error: 'Topic is required' }, { status: 400 })
  }
  if (!Array.isArray(platforms) || platforms.length === 0) {
    return Response.json({ success: false, error: 'Select at least one platform' }, { status: 400 })
  }

  const limit = Math.min(...platforms.map((p: string) => PLATFORM_LIMITS[p] ?? 1000))
  const styleNotes = platforms.map((p: string) => `${p} (${PLATFORM_STYLE[p] ?? 'general'})`).join(', ')

  const systemPrompt = `You are a social media copywriter.

The user will publish ONE single caption simultaneously to ALL of these platforms: ${styleNotes}.
Write captions that work well across all of them at once — do not tailor to just one platform.

Tone requested: ${tone}
- ${includeHashtags ? 'Include hashtags on their own final line' : 'Do NOT include hashtags'}
- ${includeEmoji ? 'Use emojis naturally, but keep the amount moderate so it reads fine on every platform above (including more formal ones if selected)' : 'Do NOT use any emojis'}
- Caption must stay under ${limit} characters (the strictest limit across the selected platforms)

${FORMAT_GUIDE}

Output ONLY valid JSON, no markdown fences, no preamble.
JSON shape: { "variants": [{ "text": "..." }, { "text": "..." }, { "text": "..." }] } — exactly 3 distinct variants (different hooks/angles), each fully suitable for ALL selected platforms.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1536,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Topic/brief: ${topic}` }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') throw new Error('No text response from AI')

    const cleaned = textBlock.text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed.variants)) throw new Error('Unexpected AI response shape')

    return Response.json({ success: true, variants: parsed.variants })
  } catch (err) {
    console.error('AI post generation failed:', err)
    return Response.json(
      { success: false, error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 500 }
    )
  }
}