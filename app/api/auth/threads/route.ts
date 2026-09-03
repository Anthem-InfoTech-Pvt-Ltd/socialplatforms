// app/api/auth/threads/route.ts

export async function GET() {
  const appId = process.env.THREADS_APP_ID
  const nextAuthUrl = process.env.NEXTAUTH_URL

  if (!appId || !nextAuthUrl) {
    return new Response('Missing Threads OAuth configuration', {
      status: 500,
    })
  }

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: `${nextAuthUrl}/api/auth/threads/callback`,
    scope: 'threads_basic,threads_content_publish',
    response_type: 'code',
  })

  const authorizeUrl = `https://threads.net/oauth/authorize?${params.toString()}`

  console.log('THREADS AUTHORIZE URL:', authorizeUrl)
  console.log('THREADS_APP_ID:', appId)

  return Response.redirect(authorizeUrl)
}