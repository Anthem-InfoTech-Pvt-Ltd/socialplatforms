// app/api/auth/threads/route.ts
//
// Threads uses its own app credentials (Threads App ID / Threads App Secret
// from the Meta dev console — "Threads" use case on the same app you already
// created for Facebook/Instagram, but NOT the same as FACEBOOK_APP_ID/SECRET).
// Scopes must be comma-separated, not space/plus-joined — Threads rejects the
// "+"-joined form that most OAuth libs produce by default.
export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.THREADS_APP_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/threads/callback`,
    scope: 'threads_basic,threads_content_publish',
    response_type: 'code',
  })

  return Response.redirect(
    `https://threads.net/oauth/authorize?${params}`
  )
}