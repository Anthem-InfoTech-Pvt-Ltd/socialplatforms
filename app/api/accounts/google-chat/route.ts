// app/api/accounts/google-chat/route.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { userId, label, webhookUrl } = await request.json()

  if (!userId || !webhookUrl) {
    return Response.json(
      { success: false, error: 'Missing userId or webhookUrl' },
      { status: 400 }
    )
  }

  if (!webhookUrl.startsWith('https://chat.googleapis.com/')) {
    return Response.json(
      { success: false, error: 'That does not look like a valid Google Chat webhook URL' },
      { status: 400 }
    )
  }

  const supabase = await createServerSupabaseClient()

  // Google Chat webhooks don't have a natural account "ID" the way OAuth
  // accounts do. Derive a stable one from the space ID segment in the URL
  // so re-saving the same webhook updates the same row instead of creating
  // a duplicate every time.
  const spaceIdMatch = webhookUrl.match(/spaces\/([^/]+)/)
  const accountId = spaceIdMatch ? spaceIdMatch[1] : webhookUrl

  const { error } = await supabase.from('social_accounts').upsert(
    {
      user_id: userId,
      platform: 'google_chat',
      account_name: label?.trim() || 'Google Chat Space',
      account_id: accountId,
      access_token: webhookUrl, // the webhook URL itself is the "credential"
      is_connected: true,
    },
    { onConflict: 'user_id,account_id' }
  )

  if (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}