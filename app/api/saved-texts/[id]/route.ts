// app/api/saved-texts/[id]/route.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

function isMissingColumnError(error: any): boolean {
  return error?.code === '42703' || /column .* does not exist/i.test(error?.message ?? '')
}

// PATCH /api/saved-texts/:id — update an existing snippet { title?, content, tags? }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { title, content, tags } = await request.json()

  if (!id) {
    return Response.json(
      { success: false, error: 'Missing id' },
      { status: 400 }
    )
  }
  if (!content?.trim()) {
    return Response.json(
      { success: false, error: 'Missing content' },
      { status: 400 }
    )
  }

  const supabase = await createServerSupabaseClient()

  const baseUpdates = {
    title: title?.trim() || null,
    content: content.trim(),
  }
  const extendedUpdates = {
    ...baseUpdates,
    ...(Array.isArray(tags) ? { tags } : {}),
  }

  let { data, error } = await supabase
    .from('saved_texts')
    .update(extendedUpdates)
    .eq('id', id)
    .select()
    .single()

  if (error && isMissingColumnError(error)) {
    ;({ data, error } = await supabase
      .from('saved_texts')
      .update(baseUpdates)
      .eq('id', id)
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

// DELETE /api/saved-texts/:id — remove a saved snippet
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id) {
    return Response.json(
      { success: false, error: 'Missing id' },
      { status: 400 }
    )
  }

  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('saved_texts')
    .delete()
    .eq('id', id)

  if (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  return Response.json({ success: true })
}