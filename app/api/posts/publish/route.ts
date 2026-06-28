// app/api/posts/publish/route.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { postId, accountIds } = await request.json()
  const supabase = await createServerSupabaseClient()

  // Post content fetch karo
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single()

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
          `https://graph.facebook.com/${account.account_id}/feed`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: post.content,
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
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            author: `urn:li:person:${account.account_id}`,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: { text: post.content },
                shareMediaCategory: 'NONE'
              }
            },
            visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
          })
        })
        const data = await res.json()
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