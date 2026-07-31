// app/api/saved-texts/route.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

// OPTIONAL MIGRATION — only needed for tags to persist. Without it, saving
// still works exactly as before; the tags are just silently dropped.
//
//   alter table saved_texts add column if not exists tags text[] default '{}';

function isMissingColumnError(error: any): boolean {
  return error?.code === '42703' || /column .* does not exist/i.test(error?.message ?? '')
}

// GET /api/saved-texts?userId=... — list a user's saved texts, newest first
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return Response.json(
      { success: false, error: 'Missing userId' },
      { status: 400 }
    )
  }

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('saved_texts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  const savedTexts = (data ?? []).map((row) => ({ ...row, tags: row.tags ?? [] }))
  return Response.json({ success: true, savedTexts })
}

// POST /api/saved-texts — save a new snippet { userId, title?, content, tags? }
// Content no longer needs to come from the post editor — the "New text" form
// in the UI lets the user type it directly, independent of the compose box.
export async function POST(request: Request) {
  const { userId, title, content, tags } = await request.json()

  if (!userId || !content?.trim()) {
    return Response.json(
      { success: false, error: 'Missing userId or content' },
      { status: 400 }
    )
  }

  const supabase = await createServerSupabaseClient()

  const basePayload = {
    user_id: userId,
    title: title?.trim() || null,
    content: content.trim(),
  }
  const extendedPayload = {
    ...basePayload,
    ...(Array.isArray(tags) && tags.length > 0 ? { tags } : {}),
  }

  let { data, error } = await supabase
    .from('saved_texts')
    .insert(extendedPayload)
    .select()
    .single()

  if (error && isMissingColumnError(error)) {
    console.warn(
      'saved_texts.tags column missing — saving without tags. ' +
      'Run the migration in the comment at the top of this file to enable them.'
    )
    ;({ data, error } = await supabase
      .from('saved_texts')
      .insert(basePayload)
      .select()
      .single())
  }

  if (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  return Response.json({ success: true, savedText: { ...data, tags: data.tags ?? [] } })
}