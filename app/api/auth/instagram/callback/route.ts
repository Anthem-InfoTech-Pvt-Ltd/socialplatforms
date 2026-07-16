// app/api/auth/instagram/callback/route.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return Response.redirect(`${process.env.NEXTAUTH_URL}/accounts?error=instagram_denied`)
  }

  const tokenRes = await fetch(
    `https://graph.facebook.com/v18.0/oauth/access_token?` +
    new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID!,
      client_secret: process.env.FACEBOOK_APP_SECRET!,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/instagram/callback`,
      code,
    })
  )
  const tokenData = await tokenRes.json()

  if (tokenData.error) {
    return Response.redirect(`${process.env.NEXTAUTH_URL}/accounts?error=token_failed`)
  }

  // Step 1: try normal /me/accounts
  const pagesRes = await fetch(
    `https://graph.facebook.com/v18.0/me/accounts?` +
    new URLSearchParams({
      fields: 'name,access_token,instagram_business_account{id,username}',
      access_token: tokenData.access_token,
    })
  )
  const pagesData = await pagesRes.json()
  console.log('IG PAGES DATA (me/accounts):', JSON.stringify(pagesData, null, 2))

  let pages = pagesData.data ?? []

  // Step 2: if empty, fall back to known Page IDs
  if (pages.length === 0) {
    const knownPageIds = (process.env.FACEBOOK_KNOWN_PAGE_IDS || '1149660078237700')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)

    for (const pageId of knownPageIds) {
      try {
        const pageRes = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}?` +
          new URLSearchParams({
            fields: 'name,access_token,instagram_business_account{id,username}',
            access_token: tokenData.access_token,
          })
        )
        const pageData = await pageRes.json()
        if (pageData.access_token) {
          pages.push(pageData)
        } else {
          console.log(`IG fallback failed for page ${pageId}:`, JSON.stringify(pageData))
        }
      } catch (err) {
        console.log(`IG fallback error for page ${pageId}:`, String(err))
      }
    }
  }

  console.log('IG FINAL PAGES:', JSON.stringify(pages, null, 2))

  const pagesWithInstagram = pages.filter((page: any) => page.instagram_business_account)

  if (pagesWithInstagram.length === 0) {
    return Response.redirect(`${process.env.NEXTAUTH_URL}/accounts?error=no_instagram_business_account`)
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.redirect(`${process.env.NEXTAUTH_URL}/login`)
  }

  for (const page of pagesWithInstagram) {
    const igAccount = page.instagram_business_account

    await supabase.from('social_accounts').upsert({
      user_id: user.id,
      platform: 'instagram',
      account_name: igAccount.username ?? page.name,
      account_id: igAccount.id,
      access_token: page.access_token,
      is_connected: true,
    }, { onConflict: 'user_id,account_id' })
  }

  return Response.redirect(`${process.env.NEXTAUTH_URL}/accounts?connected=instagram`)
}