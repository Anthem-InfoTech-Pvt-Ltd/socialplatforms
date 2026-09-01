// app/api/posts/publish/route.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

const INSTAGRAM_CAPTION_LIMIT = 2200
const THREADS_CAPTION_LIMIT = 500
const GOOGLE_BUSINESS_SUMMARY_LIMIT = 1500

// Helper function — Convert HTML to plain text
function htmlToPlainText(html: string): string {
  return html
    // Links inserted via the "Insert link" tool show custom display text in the
    // editor, but FB/IG/LinkedIn/Threads/GBP/Chat captions are plain text — so keep
    // both the text and the actual URL, or the link would silently vanish on publish.
    .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, (_, href, text) =>
      text.trim() === href.trim() ? href : `${text} (${href})`
    )
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
    .filter(url => url.startsWith('http')) // data: URLs (base64) can't be used by any of these APIs — they need a public URL
}

// Truncate a caption to a platform limit, adding an ellipsis, and warn in the
// server logs so a silent truncation doesn't go unnoticed.
function truncateCaption(text: string, limit: number, platform: string): string {
  if (text.length <= limit) return text
  console.warn(`${platform} caption too long (${text.length} chars) — truncating to ${limit}`)
  return text.slice(0, limit - 1) + '…'
}

// Google's access tokens only last ~1 hour, unlike Meta's ~60-day tokens.
// Refresh from the stored refresh_token whenever the stored expiry is past
// (or close to it), and write the new token back so the next publish reuses it.
async function getFreshGoogleAccessToken(supabase: any, account: any): Promise<string> {
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0
  const isExpiringSoon = expiresAt - Date.now() < 5 * 60 * 1000 // refresh 5 min early

  if (!isExpiringSoon) {
    return account.access_token
  }

  if (!account.refresh_token) {
    throw new Error('Google Business token expired and no refresh_token is stored — reconnect the account')
  }

  const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: account.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  const refreshData = await refreshRes.json()

  if (!refreshRes.ok || refreshData.error || !refreshData.access_token) {
    throw new Error(refreshData.error_description || 'Google Business token refresh failed')
  }

  const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString()

  await supabase
    .from('social_accounts')
    .update({ access_token: refreshData.access_token, token_expires_at: newExpiresAt })
    .eq('id', account.id)

  return refreshData.access_token
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

  let plainText = htmlToPlainText(post.content)

  // Optional location tag (posts.location) — only appended if the column
  // exists and has a value, so posts without it behave exactly as before.
  if (post.location) {
    plainText = `${plainText}\n\n📍 ${post.location}`
  }

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
        const igCaption = truncateCaption(plainText, INSTAGRAM_CAPTION_LIMIT, 'Instagram')

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
      // THREADS
      // ==========================
      if (account.platform === 'threads') {
        // Threads supports text-only posts (unlike Instagram), so no image
        // requirement here. Same container → publish two-step pattern as IG.
        const threadsCaption = truncateCaption(plainText, THREADS_CAPTION_LIMIT, 'Threads')

        const containerBody: Record<string, string> = {
          media_type: imageUrls.length > 0 ? 'IMAGE' : 'TEXT',
          text: threadsCaption,
          access_token: account.access_token,
        }
        if (imageUrls.length > 0) {
          containerBody.image_url = imageUrls[0]
        }

        const containerRes = await fetch(
          `https://graph.threads.net/v1.0/${account.account_id}/threads`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(containerBody),
          }
        )

        const containerData = await containerRes.json()

        console.log(
          'Threads container result:',
          JSON.stringify(containerData, null, 2)
        )

        if (!containerRes.ok || containerData.error) {
          throw new Error(
            containerData.error?.message || 'Threads container creation failed'
          )
        }

        // Publish step happens moments after container creation. Threads
        // occasionally still has the container in IN_PROGRESS status right
        // after creation — a short delay avoids a spurious failure on
        // larger images. Text-only posts don't need this.
        if (imageUrls.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }

        const publishRes = await fetch(
          `https://graph.threads.net/v1.0/${account.account_id}/threads_publish`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              creation_id: containerData.id,
              access_token: account.access_token,
            }),
          }
        )

        const publishData = await publishRes.json()

        console.log(
          'Threads publish result:',
          JSON.stringify(publishData, null, 2)
        )

        if (!publishRes.ok || publishData.error) {
          throw new Error(
            publishData.error?.message || 'Threads publish failed'
          )
        }

        platformPostId = publishData.id
      }

      // ==========================
      // GOOGLE BUSINESS PROFILE
      // ==========================
      if (account.platform === 'google_business') {
        // Google's access token is short-lived (~1hr) — refresh first if needed.
        const freshToken = await getFreshGoogleAccessToken(supabase, account)

        const gbpSummary = truncateCaption(plainText, GOOGLE_BUSINESS_SUMMARY_LIMIT, 'Google Business')

        const localPostBody: Record<string, any> = {
          languageCode: 'en-US',
          summary: gbpSummary,
          topicType: 'STANDARD',
        }

        // GBP local posts accept exactly one photo (jpg/png, under 5MB,
        // minimum 400x300) — unlike FB/Threads there's no multi-image support here.
        if (imageUrls.length > 0) {
          localPostBody.media = [
            { mediaFormat: 'PHOTO', sourceUrl: imageUrls[0] },
          ]
        }

        // account.account_id is the full resource path stored at connect
        // time: accounts/{accountId}/locations/{locationId}
        const res = await fetch(
          `https://mybusiness.googleapis.com/v4/${account.account_id}/localPosts`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${freshToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(localPostBody),
          }
        )

        const data = await res.json()

        console.log(
          'Google Business post result:',
          JSON.stringify(data, null, 2)
        )

        if (!res.ok || data.error) {
          throw new Error(
            data.error?.message || 'Google Business publish failed'
          )
        }

        platformPostId = data.name
      }

      // ==========================
      // GOOGLE CHAT
      // ==========================
      if (account.platform === 'google_chat') {
        // Google Chat has no "post" concept like the others — it's a simple
        // incoming-webhook message. account.access_token holds the webhook
        // URL that was saved when the user connected this "account".
        if (!account.access_token) {
          throw new Error('Google Chat webhook URL is missing — reconnect this space')
        }

        // Plain "text" messages don't auto-unfurl links into an image the
        // way some other chat apps do — Google Chat only renders an actual
        // image when it's sent as a Cards v2 widget. Build a card when an
        // image is present; fall back to a plain text message otherwise.
        const chatBody: Record<string, any> = imageUrls.length > 0
          ? {
              cardsV2: [
                {
                  cardId: 'social-post',
                  card: {
                    sections: [
                      {
                        widgets: [
                          { textParagraph: { text: plainText.replace(/\n/g, '<br>') } },
                          { image: { imageUrl: imageUrls[0] } },
                        ],
                      },
                    ],
                  },
                },
              ],
            }
          : { text: plainText }

        const res = await fetch(account.access_token, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chatBody),
        })

        const data = await res.json()

        console.log(
          'Google Chat message result:',
          JSON.stringify(data, null, 2)
        )

        if (!res.ok || data.error) {
          throw new Error(
            data.error?.message || 'Google Chat message failed'
          )
        }

        platformPostId = data.name || null
      }

      // ==========================
      // LINKEDIN
      // ==========================
      if (account.platform === 'linkedin') {
        const authorUrn = `urn:li:person:${account.account_id}`

        // Unlike FB/IG, LinkedIn's UGC API can't take an image URL directly —
        // the image has to be registered as an asset, then its raw bytes
        // uploaded to LinkedIn's own upload URL, before it can be referenced
        // in the post. This is why LinkedIn was only ever getting text before.
        let media: any[] = []

        if (imageUrls.length > 0) {
          try {
            const registerRes = await fetch(
              'https://api.linkedin.com/v2/assets?action=registerUpload',
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${account.access_token}`,
                  'Content-Type': 'application/json',
                  'X-Restli-Protocol-Version': '2.0.0',
                },
                body: JSON.stringify({
                  registerUploadRequest: {
                    recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
                    owner: authorUrn,
                    serviceRelationships: [
                      {
                        relationshipType: 'OWNER',
                        identifier: 'urn:li:userGeneratedContent',
                      },
                    ],
                  },
                }),
              }
            )
            const registerData = await registerRes.json()

            console.log(
              'LinkedIn register upload result:',
              JSON.stringify(registerData, null, 2)
            )

            if (!registerRes.ok || registerData.error) {
              throw new Error(
                registerData.message || 'LinkedIn image upload registration failed'
              )
            }

            const uploadUrl =
              registerData.value.uploadMechanism[
                'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
              ].uploadUrl
            const asset = registerData.value.asset

            // Pull the image bytes from our own public Supabase URL, then hand
            // them straight to LinkedIn's upload URL.
            const imageBytesRes = await fetch(imageUrls[0])
            const imageBuffer = await imageBytesRes.arrayBuffer()

            const uploadRes = await fetch(uploadUrl, {
              method: 'PUT',
              headers: { Authorization: `Bearer ${account.access_token}` },
              body: imageBuffer,
            })

            if (!uploadRes.ok) {
              throw new Error('LinkedIn image upload failed')
            }

            media = [
              {
                status: 'READY',
                description: { text: '' },
                media: asset,
                title: { text: '' },
              },
            ]
          } catch (imgErr) {
            // Don't let a failed image upload block the whole post — fall back
            // to text-only, same as if no image had been attached.
            console.error('LinkedIn image attach failed, falling back to text-only:', imgErr)
            media = []
          }
        }

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
              author: authorUrn,
              lifecycleState: 'PUBLISHED',
              specificContent: {
                'com.linkedin.ugc.ShareContent': {
                  shareCommentary: {
                    text: plainText,
                  },
                  shareMediaCategory: media.length > 0 ? 'IMAGE' : 'NONE',
                  ...(media.length > 0 ? { media } : {}),
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