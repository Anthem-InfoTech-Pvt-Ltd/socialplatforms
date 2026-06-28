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

  if (tokenData.error) {
    return Response.redirect(`${process.env.NEXTAUTH_URL}/accounts?error=token_failed`)
  }

  // User ki Facebook pages fetch karo
  const pagesRes = await fetch(
    `https://graph.facebook.com/v18.0/me/accounts?access_token=${tokenData.access_token}`
  )
  const pagesData = await pagesRes.json()

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.redirect(`${process.env.NEXTAUTH_URL}/login`)
  }

  // Pages ko Supabase mein save karo
  if (pagesData.data?.length > 0) {
    for (const page of pagesData.data) {
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
    // Agar pages nahi hain to user token save karo
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