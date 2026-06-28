export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/facebook/callback`,
    scope: 'public_profile',
    response_type: 'code',
  })

  return Response.redirect(
    `https://www.facebook.com/v18.0/dialog/oauth?${params}`
  )
}