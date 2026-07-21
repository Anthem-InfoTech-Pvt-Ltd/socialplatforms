// app/api/posts/publish/route.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

const INSTAGRAM_CAPTION_LIMIT = 2200

// Helper function — Convert HTML to plain text
function htmlToPlainText(html: string): string {
  return html
    .replace(/<strong>(.*?)<\/strong>/gi, '*$1*')
    .replace(/<em>(.*?)<\/em>/gi, '_$1_')
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n$1\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '\n• $1')
    .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (_, content) => {
      let i = 1
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `\n${i++}. $1`)
    })
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '\n"$1"\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gis, '$1\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Extract image URLs from HTML — handles both single and double quoted src attrs
function extractImageUrls(html: string): string[] {
  const matches = html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)
  return [...matches]
    .map(match => match[1])
    .filter(url => url.startsWith('http')) // data: URLs (base64) can't be used by FB/IG/LinkedIn APIs — they need a public URL
}

export async function POST(request: Request) {
  const { postId, accountIds } = await request.json()

  const supabase = await createServerSupabaseClient()

  // Fetch post
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single()

  if (postError || !post) {
    return Response.json(
      { success: false, error: 'Post not found' },
      { status: 404 }
    )
  }

  const plainText = htmlToPlainText(post.content)

  // Images upload karke alag se 'media_urls' column mein store hote hain (compose page
  // ke upload button se), HTML content ke andar <img> tag ke roop mein nahi aate.
  // Isliye pehle wahi column check karo; agar kisi purane post mein content ke andar
  // hi <img> tag ho (paste kiya hua), toh fallback ke roop mein wahan se bhi nikaal lo.
  //
  // NOTE: agar tumhare Supabase schema mein column ka naam 'media_urls' nahi hai
  // (jaise 'image_urls' ya 'media'), toh yahan wahi naam use karo.
  const storedMediaUrls: string[] = Array.isArray(post.media_urls) ? post.media_urls : []
  const imageUrls = storedMediaUrls.length > 0
    ? storedMediaUrls
    : extractImageUrls(post.content)

  console.log('Plain Text:', plainText)
  console.log('Plain Text length:', plainText.length)
  console.log('Images:', imageUrls)

  const results = []

  for (const accountId of accountIds) {
    const { data: account } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('id', accountId)
      .single()

    if (!account) {
      results.push({
        accountId,
        platform: null,
        success: false,
        error: 'Account not found',
      })
      continue
    }

    try {
      let platformPostId: string | null = null

      // ==========================
      // FACEBOOK
      // ==========================
      if (account.platform === 'facebook') {
        let res

        if (imageUrls.length > 0) {
          // Publish image post
          res = await fetch(
            `https://graph.facebook.com/v18.0/${account.account_id}/photos`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                url: imageUrls[0],
                caption: plainText,
                access_token: account.access_token,
              }),
            }
          )
        } else {
          // Publish text post
          res = await fetch(
            `https://graph.facebook.com/v18.0/${account.account_id}/feed`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: plainText,
                access_token: account.access_token,
              }),
            }
          )
        }

        const data = await res.json()

        console.log(
          'Facebook post result:',
          JSON.stringify(data, null, 2)
        )

        if (!res.ok || data.error) {
          throw new Error(
            data.error?.message || 'Facebook publish failed'
          )
        }

        platformPostId = data.post_id || data.id
      }

      // ==========================
      // INSTAGRAM
      // ==========================
      if (account.platform === 'instagram') {
        // Instagram Graph API has no text-only feed post — an image (or video) is required
        if (imageUrls.length === 0) {
          throw new Error(
            'Instagram requires at least one image — text-only posts are not supported'
          )
        }

        // Instagram caption hard limit is 2,200 characters. Facebook doesn't enforce
        // this, so a long post can silently succeed on FB but fail on IG's container
        // creation step. Trim it here so the request never gets rejected for length,
        // and log a warning so we know it happened.
        let igCaption = plainText
        if (igCaption.length > INSTAGRAM_CAPTION_LIMIT) {
          console.warn(
            `Instagram caption too long (${igCaption.length} chars) — truncating to ${INSTAGRAM_CAPTION_LIMIT}`
          )
          igCaption = igCaption.slice(0, INSTAGRAM_CAPTION_LIMIT - 1) + '…'
        }

        // Step 1: create a media container
        const containerRes = await fetch(
          `https://graph.facebook.com/v18.0/${account.account_id}/media`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image_url: imageUrls[0],
              caption: igCaption,
              access_token: account.access_token,
            }),
          }
        )

        const containerData = await containerRes.json()

        console.log(
          'Instagram container result:',
          JSON.stringify(containerData, null, 2)
        )

        if (!containerRes.ok || containerData.error) {
          throw new Error(
            containerData.error?.message
              || containerData.error?.error_user_msg
              || 'Instagram container creation failed'
          )
        }

        // Step 2: publish the container
        const publishRes = await fetch(
          `https://graph.facebook.com/v18.0/${account.account_id}/media_publish`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              creation_id: containerData.id,
              access_token: account.access_token,
            }),
          }
        )

        const publishData = await publishRes.json()

        console.log(
          'Instagram publish result:',
          JSON.stringify(publishData, null, 2)
        )

        if (!publishRes.ok || publishData.error) {
          throw new Error(
            publishData.error?.message
              || publishData.error?.error_user_msg
              || 'Instagram publish failed'
          )
        }

        platformPostId = publishData.id
      }

      // ==========================
      // LINKEDIN
      // ==========================
      if (account.platform === 'linkedin') {
        const res = await fetch(
          'https://api.linkedin.com/v2/ugcPosts',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${account.access_token}`,
              'Content-Type': 'application/json',
              'X-Restli-Protocol-Version': '2.0.0',
            },
            body: JSON.stringify({
              author: `urn:li:person:${account.account_id}`,
              lifecycleState: 'PUBLISHED',
              specificContent: {
                'com.linkedin.ugc.ShareContent': {
                  shareCommentary: {
                    text: plainText,
                  },
                  shareMediaCategory: 'NONE',
                },
              },
              visibility: {
                'com.linkedin.ugc.MemberNetworkVisibility':
                  'PUBLIC',
              },
            }),
          }
        )

        const data = await res.json()

        console.log(
          'LinkedIn post result:',
          JSON.stringify(data, null, 2)
        )

        if (!res.ok || data.serviceErrorCode) {
          throw new Error(
            data.message || 'LinkedIn publish failed'
          )
        }

        platformPostId = data.id
      }

      // Save engagement
      await supabase.from('post_engagements').insert({
        post_id: postId,
        platform: account.platform,
        platform_post_id: platformPostId,
      })

      results.push({
        accountId,
        platform: account.platform,
        success: true,
        platformPostId,
      })
    } catch (err) {
      console.error(`Publish failed for account ${accountId} (${account.platform}):`, err)

      results.push({
        accountId,
        platform: account.platform,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // Update post status
  await supabase
    .from('posts')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', postId)

  const allFailed = results.length > 0 && results.every((r) => !r.success)

  return Response.json({
    success: !allFailed,
    results,
  })
}