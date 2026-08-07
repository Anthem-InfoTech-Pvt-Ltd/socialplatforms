import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PLATFORM_LIMITS: Record<string, number> = { facebook: 1000, instagram: 1000, linkedin: 1000 }

const PLATFORM_STYLE: Record<string, string> = {
  facebook: 'Conversational, moderate emoji, friendly tone, 2-4 hashtags at the end.',
  instagram: 'Casual and expressive, emoji-heavy, punchy short lines, 5-8 hashtags at the end.',
  linkedin: 'Professional, minimal emoji (0-2 total), value/insight-driven, 3-5 hashtags in Title Case.',
}

const FORMAT_GUIDE = `Format every caption like this real example (this is the required structure, follow it exactly — do not write one long paragraph):

🚀 Exciting news! We're thrilled to introduce our latest feature update designed to make your workflow faster and more efficient.

✨ What's new:
- Improved dashboard performance
- Faster loading times
- Enhanced user experience

Thank you for your continued support! Stay tuned for more exciting updates. 💙

#ProductUpdate #Tech #Innovation

Rules for structure:
- Opening hook line (1-2 sentences, emoji at start if natural)
- A blank line, then body — use a "•" bulleted list ONLY when listing multiple items/features/tips; otherwise write 1-2 short paragraphs
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
    perPlatform = false,
  } = await request.json()

  if (!topic?.trim()) {
    return Response.json({ success: false, error: 'Topic is required' }, { status: 400 })
  }
  if (!Array.isArray(platforms) || platforms.length === 0) {
    return Response.json({ success: false, error: 'Select at least one platform' }, { status: 400 })
  }

  const limit = Math.min(...platforms.map((p: string) => PLATFORM_LIMITS[p] ?? 1000))
  const usePerPlatform = perPlatform && platforms.length > 1

  const styleNotes = platforms.map((p: string) => `- ${p}: ${PLATFORM_STYLE[p] ?? ''}`).join('\n')

  const systemPrompt = `You are a social media copywriter.

Tone requested by user: ${tone}
Selected platforms: ${platforms.join(', ')}
${styleNotes}

- ${includeHashtags ? 'Include hashtags on their own final line' : 'Do NOT include hashtags'}
- ${includeEmoji ? 'Use emojis naturally where it fits the platform style above' : 'Do NOT use any emojis'}
- Every caption must stay under ${limit} characters (this is the strictest limit across the selected platforms)

${FORMAT_GUIDE}

Output ONLY valid JSON, no markdown fences, no preamble.
${
  usePerPlatform
    ? `JSON shape: { "variants": [{ "platform": "facebook", "text": "..." }, ...] } — exactly one tailored caption per selected platform (${platforms.join(', ')}), each following that platform's style above.`
    : `JSON shape: { "variants": [{ "text": "..." }, { "text": "..." }, { "text": "..." }] } — exactly 3 distinct variants (different hooks/angles), each equally suitable for all selected platforms.`
}`

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