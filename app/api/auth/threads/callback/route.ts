// app/api/auth/threads/callback/route.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return Response.redirect(`${process.env.NEXTAUTH_URL}/accounts?error=threads_denied`)
  }

  // Step 1: code → short-lived token (valid ~1 hour).
  // NOTE: unlike Facebook/LinkedIn, this endpoint wants x-www-form-urlencoded,
  // not JSON — Threads returns an HTML error page instead of JSON if you send
  // the wrong content type here, which is confusing to debug later.
  const tokenRes = await fetch('https://graph.threads.net/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.THREADS_APP_ID!,
      client_secret: process.env.THREADS_APP_SECRET!,
      grant_type: 'authorization_code',
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/threads/callback`,
      code,
    }),
  })
  const tokenData = await tokenRes.json()
  console.log('THREADS SHORT-LIVED TOKEN RESULT:', JSON.stringify(tokenData, null, 2))

  if (!tokenRes.ok || tokenData.error_type || !tokenData.access_token) {
    return Response.redirect(`${process.env.NEXTAUTH_URL}/accounts?error=token_failed`)
  }

  const threadsUserId: string = tokenData.user_id

  // Step 2: short-lived → long-lived token (valid ~60 days). Refresh this on
  // a schedule before it expires — Threads doesn't auto-refresh like a
  // typical OAuth refresh_token flow.
  const longLivedRes = await fetch(
    'https://graph.threads.net/access_token?' +
      new URLSearchParams({
        grant_type: 'th_exchange_token',
        client_secret: process.env.THREADS_APP_SECRET!,
        access_token: tokenData.access_token,
      })
  )
  const longLivedData = await longLivedRes.json()
  console.log('THREADS LONG-LIVED TOKEN RESULT:', JSON.stringify(longLivedData, null, 2))

  const accessToken: string = longLivedData.access_token || tokenData.access_token

  // Step 3: profile info for the account_name we show in the UI
  const profileRes = await fetch(
    `https://graph.threads.net/v1.0/${threadsUserId}?` +
      new URLSearchParams({ fields: 'id,username', access_token: accessToken })
  )
  const profile = await profileRes.json()
  console.log('THREADS PROFILE:', JSON.stringify(profile, null, 2))

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.redirect(`${process.env.NEXTAUTH_URL}/login`)
  }

  await supabase.from('social_accounts').upsert({
    user_id: user.id,
    platform: 'threads',
    account_name: profile.username ?? 'Threads account',
    account_id: threadsUserId,
    access_token: accessToken,
    is_connected: true,
  }, { onConflict: 'user_id,account_id' })

  return Response.redirect(`${process.env.NEXTAUTH_URL}/accounts?connected=threads`)
}