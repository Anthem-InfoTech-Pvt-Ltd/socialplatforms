import { createClient } from '@/lib/supabase/client'
import { Post, PostEngagement } from '@/types'
import type { PlatformOverrides } from '@/store/PostsContext'

// OPTIONAL MIGRATION — only needed if you want `location` / `internalNotes` to
// actually persist in Supabase. Without running this, createPost() still works
// exactly as before (it just detects the missing columns and retries without them).
//
//   alter table posts add column if not exists location text;
//   alter table posts add column if not exists internal_notes text;
//
// `platform_overrides` is already added (jsonb default '{}'), so no extra
// migration is needed for it — the same missing-column fallback below still
// covers it in case it's ever missing on a fresh environment.

const supabase = createClient()

function mapPost(row: any): Post {
  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    mediaUrls: Array.isArray(row.media_urls) ? row.media_urls : [],
    platforms: row.platforms ?? [],
    status: row.status,
    location: row.location ?? undefined,
    internalNotes: row.internal_notes ?? undefined,
    // Per-platform custom versions — falls back to {} so callers can always
    // safely do `post.platformOverrides[platform]` without a null check.
    platformOverrides: row.platform_overrides ?? {},
    scheduledAt: row.scheduled_at ? new Date(row.scheduled_at) : undefined,
    publishedAt: row.published_at ? new Date(row.published_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    engagement: mapEngagement(row.post_engagements),
  }
}

function mapEngagement(rows: any): PostEngagement {
  const e = Array.isArray(rows) ? rows[0] : rows
  return {
    likes: e?.likes ?? 0,
    comments: e?.comments ?? 0,
    shares: e?.shares ?? 0,
    views: e?.views ?? 0,
  }
}

// Supabase/Postgres reports a missing column as code 42703 (undefined_column).
function isMissingColumnError(error: any): boolean {
  return error?.code === '42703' || /column .* does not exist/i.test(error?.message ?? '')
}

export const postService = {
  async getPosts(userId: string, status?: string) {
    let query = supabase
      .from('posts')
      .select(`*, post_engagements(*)`)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return (data ?? []).map(mapPost)
  },

  async getPostById(postId: string) {
    const { data, error } = await supabase
      .from('posts')
      .select('*, post_engagements(*)')
      .eq('id', postId)
      .single()

    if (error) return null

    return mapPost(data)
  },

  async createPost(
    userId: string,
    content: string,
    platforms: string[],
    mediaUrls: string[] = [],
    location?: string,
    internalNotes?: string,
    platformOverrides?: PlatformOverrides
  ) {
    const basePayload = {
      user_id: userId,
      content,
      platforms,
      media_urls: mediaUrls,
      status: 'draft',
    }

    // platform_overrides always gets written (defaulting to {}) rather than
    // being conditionally spread like location/internalNotes, since the
    // column has a DB-level default and every post should have a value here.
    const extendedPayload = {
      ...basePayload,
      ...(location ? { location } : {}),
      ...(internalNotes ? { internal_notes: internalNotes } : {}),
      platform_overrides: platformOverrides ?? {},
    }

    let { data, error } = await supabase
      .from('posts')
      .insert(extendedPayload)
      .select()
      .single()

    // Graceful degrade: if location/internal_notes/platform_overrides
    // columns don't exist yet, retry with the original payload so post
    // creation still succeeds (the override just won't persist).
    if (error && isMissingColumnError(error)) {
      console.warn(
        'posts.location / posts.internal_notes / posts.platform_overrides column missing — ' +
        'saving without them. Run the migration in the comment at the top of postService.ts to enable them.'
      )
      ;({ data, error } = await supabase
        .from('posts')
        .insert(basePayload)
        .select()
        .single())
    }

    if (error) throw new Error(error.message)
    return mapPost(data)
  },

  async publishPost(postId: string, accountIds: string[]) {
    const res = await fetch('/api/posts/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, accountIds }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Publish failed')
    return data
  },

  async updatePost(postId: string, updates: any) {
    // If a caller passes `platformOverrides` (camelCase, matching the Post
    // type) instead of the raw column name, translate it here so editing a
    // draft's custom versions works the same way createPost does.
    const { platformOverrides, ...rest } = updates ?? {}
    const payload = platformOverrides !== undefined
      ? { ...rest, platform_overrides: platformOverrides }
      : rest

    const { data, error } = await supabase
      .from('posts')
      .update(payload)
      .eq('id', postId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return mapPost(data)
  },

  async deletePost(postId: string) {
    const { error } = await supabase
      .from('posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', postId)

    if (error) throw new Error(error.message)
  },

  async schedulePost(postId: string, scheduledAt: Date) {
    const { data, error } = await supabase
      .from('posts')
      .update({ status: 'scheduled', scheduled_at: scheduledAt.toISOString() })
      .eq('id', postId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return mapPost(data)
  }
}