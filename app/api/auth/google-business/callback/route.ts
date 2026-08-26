// app/api/auth/google-business/callback/route.ts
//
// REQUIRES a one-time DB migration before this works:
//   alter table social_accounts add column if not exists refresh_token text;
//   alter table social_accounts add column if not exists token_expires_at timestamptz;
// Google access tokens only last ~1 hour (unlike Meta's ~60-day tokens), so
// publish/route.ts refreshes from refresh_token on every publish if expired.
//
// Also requires Google's separate manual API-access approval for your GCP
// project (support.google.com/business/contact/api_default) — without it
// every call below 429s with RESOURCE_EXHAUSTED even though the API is
// "enabled". This has nothing to do with your code; it's a one-time gate.
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return Response.redirect(`${process.env.NEXTAUTH_URL}/accounts?error=google_business_denied`)
  }

  // Step 1: code → access_token + refresh_token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/google-business/callback`,
      grant_type: 'authorization_code',
      code,
    }),
  })
  const tokenData = await tokenRes.json()
  console.log('GOOGLE TOKEN RESULT:', JSON.stringify(tokenData, null, 2))

  if (!tokenRes.ok || tokenData.error || !tokenData.access_token) {
    return Response.redirect(`${process.env.NEXTAUTH_URL}/accounts?error=token_failed`)
  }

  const accessToken: string = tokenData.access_token
  const refreshToken: string | undefined = tokenData.refresh_token
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

  // Step 2: list the Business Profile accounts this Google login can manage.
  // Almost always exactly one for a small business, but the API always
  // returns a list, so we handle multiple.
  const accountsRes = await fetch(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const accountsData = await accountsRes.json()
  console.log('GOOGLE BUSINESS ACCOUNTS:', JSON.stringify(accountsData, null, 2))

  const gbpAccounts = accountsData.accounts ?? []

  if (gbpAccounts.length === 0) {
    return Response.redirect(`${process.env.NEXTAUTH_URL}/accounts?error=no_google_business_account`)
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.redirect(`${process.env.NEXTAUTH_URL}/login`)
  }

  // Step 3: for each account, list its locations. A post publishes against
  // a specific location (accounts/{accountId}/locations/{locationId}), not
  // against the account itself — so each location becomes its own row in
  // social_accounts, same as how each FB Page becomes its own row.
  let connectedAny = false

  for (const acc of gbpAccounts) {
    const locationsRes = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?` +
        new URLSearchParams({ readMask: 'name,title' }),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const locationsData = await locationsRes.json()
    console.log(`GOOGLE LOCATIONS for ${acc.name}:`, JSON.stringify(locationsData, null, 2))

    const locations = locationsData.locations ?? []

    for (const loc of locations) {
      // loc.name looks like "locations/12345" here — combine with the
      // account to get the full resource path the LocalPosts API expects.
      const resourcePath = `${acc.name}/${loc.name}`

      await supabase.from('social_accounts').upsert({
        user_id: user.id,
        platform: 'google_business',
        account_name: loc.title ?? acc.accountName ?? 'Google Business location',
        account_id: resourcePath,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: expiresAt,
        is_connected: true,
      }, { onConflict: 'user_id,account_id' })

      connectedAny = true
    }
  }

  if (!connectedAny) {
    return Response.redirect(`${process.env.NEXTAUTH_URL}/accounts?error=no_google_business_location`)
  }

  return Response.redirect(`${process.env.NEXTAUTH_URL}/accounts?connected=google_business`)
}