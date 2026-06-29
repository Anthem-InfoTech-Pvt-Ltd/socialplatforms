// app/api/posts/publish/route.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

// Helper function — HTML ko plain text mein convert karta hai
// LinkedIn/Facebook plain text accept karte hain, raw HTML nahi
function htmlToPlainText(html: string): string {
  return html
    .replace(/<strong>(.*?)<\/strong>/gi, '*$1*')        // Bold → *text*
    .replace(/<em>(.*?)<\/em>/gi, '_$1_')                // Italic → _text_
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n$1\n') // Headings
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '\n• $1')         // List items → bullet
    .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (_, content) => {
      let i = 1
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `\n${i++}. $1`)
    })
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '\n"$1"\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gis, '$1\n')
    .replace(/<[^>]+>/g, '')                             // Remaining tags hata do
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')                          // 3+ newlines → 2
    .trim()
}

// Helper function — HTML se image URLs extract karta hai
// (Abhi sirf collect karne ke liye, platform APIs mein image upload baad mein add hoga)
function extractImageUrls(html: string): string[] {
  const matches = html.matchAll(/<img[^>]+src="([^"]+)"/gi)
  return [...matches].map(m => m[1]).filter(url => url.startsWith('http'))
}

export async function POST(request: Request) {
  const { postId, accountIds } = await request.json()
  const supabase = await createServerSupabaseClient()

  // Post content fetch karo
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single()

  // Content ko ek baar convert karo — sab accounts ke liye reuse hoga
  const plainText = htmlToPlainText(post.content)
  const imageUrls = extractImageUrls(post.content) // abhi sirf logging/future use ke liye

  const results = []

  for (const accountId of accountIds) {
    const { data: account } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('id', accountId)
      .single()

    try {
      let platformPostId = null

      if (account.platform === 'facebook') {
        const res = await fetch(
          `https://graph.facebook.com/v18.0/${account.account_id}/feed`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: plainText, // ✅ plain text
              access_token: account.access_token
            })
          }
        )
        const data = await res.json()
        console.log('Facebook post result:', JSON.stringify(data))
        platformPostId = data.id
      }

      if (account.platform === 'linkedin') {
        // LinkedIn API call (v2)
        const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${account.access_token}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify({
            author: `urn:li:person:${account.account_id}`,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: { text: plainText }, // ✅ plain text
                shareMediaCategory: 'NONE'
              }
            },
            visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
          })
        })
        const data = await res.json()
        console.log('LinkedIn post result:', JSON.stringify(data))
        platformPostId = data.id
      }

      // Engagement record banao
      await supabase.from('post_engagements').insert({
        post_id: postId,
        platform: account.platform,
        platform_post_id: platformPostId
      })

      results.push({ accountId, success: true })
    } catch (err) {
      results.push({ accountId, success: false, error: String(err) })
    }
  }

  // Post status update
  await supabase
    .from('posts')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', postId)

  return Response.json({ success: true, results })
}