// app/api/auth/facebook/callback/route.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return Response.redirect(`${process.env.NEXTAUTH_URL}/accounts?error=facebook_denied`)
  }

  console.log('Facebook callback hit:', { code: !!code, error })

  // Code → Token exchange
  const tokenRes = await fetch(
    `https://graph.facebook.com/v18.0/oauth/access_token?` +
    new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID!,
      client_secret: process.env.FACEBOOK_APP_SECRET!,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/facebook/callback`,
      code,
    })
  )
  const tokenData = await tokenRes.json()
  console.log('USER ACCESS TOKEN:', tokenData.access_token)

  if (tokenData.error) {
    return Response.redirect(`${process.env.NEXTAUTH_URL}/accounts?error=token_failed`)
  }

  // Step 1: Normal /me/accounts try karo
  const pagesRes = await fetch(
    `https://graph.facebook.com/v18.0/me/accounts?access_token=${tokenData.access_token}`
  )
  const pagesData = await pagesRes.json()
  console.log('PAGES DATA (me/accounts):', JSON.stringify(pagesData, null, 2))

  let pages = pagesData.data ?? []

  // Step 2: Agar khaali aaye (Business Login for Business flow ka known issue),
  // to known Page ID se seedha token derive karo
  if (pages.length === 0) {
    const knownPageIds = (process.env.FACEBOOK_KNOWN_PAGE_IDS || '1149660078237700')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)

    for (const pageId of knownPageIds) {
      try {
        const pageRes = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}?fields=id,name,access_token&access_token=${tokenData.access_token}`
        )
        const pageData = await pageRes.json()
        if (pageData.access_token) {
          pages.push(pageData)
        } else {
          console.log(`Fallback failed for page ${pageId}:`, JSON.stringify(pageData))
        }
      } catch (err) {
        console.log(`Fallback error for page ${pageId}:`, String(err))
      }
    }
  }

  console.log('FINAL PAGES TO SAVE:', JSON.stringify(pages, null, 2))

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.redirect(`${process.env.NEXTAUTH_URL}/login`)
  }

  // Pages ko Supabase mein save karo
  if (pages.length > 0) {
    for (const page of pages) {
      await supabase.from('social_accounts').upsert({
        user_id: user.id,
        platform: 'facebook',
        account_name: page.name,
        account_id: page.id,
        access_token: page.access_token, // Page-level token
        is_connected: true,
      }, { onConflict: 'user_id,account_id' })
    }
  } else {
    // Agar phir bhi pages nahi milin to user token save karo (last resort)
    const meRes = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${tokenData.access_token}`
    )
    const meData = await meRes.json()

    await supabase.from('social_accounts').upsert({
      user_id: user.id,
      platform: 'facebook',
      account_name: meData.name,
      account_id: meData.id,
      access_token: tokenData.access_token,
      is_connected: true,
    }, { onConflict: 'user_id,account_id' })
  }

  return Response.redirect(`${process.env.NEXTAUTH_URL}/accounts?connected=facebook`)
}