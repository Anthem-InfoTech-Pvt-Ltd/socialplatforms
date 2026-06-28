export async function GET() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/linkedin/callback`,
    scope: 'openid profile w_member_social',
  })

  return Response.redirect(
    `https://www.linkedin.com/oauth/v2/authorization?${params}`
  )
}