// app/api/auth/google-business/route.ts
//
// Standard Google OAuth 2.0 (no special SDK needed — plain fetch is fine).
// access_type=offline + prompt=consent are both required, or Google will
// only give you a refresh_token the very first time a user ever connects —
// on a reconnect it silently omits it, which breaks the token-refresh logic
// in the publish route later.
export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/google-business/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/business.manage',
    access_type: 'offline',
    prompt: 'consent',
  })

  return Response.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  )
}