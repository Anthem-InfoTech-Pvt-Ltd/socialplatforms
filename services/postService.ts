import { createClient } from '@/lib/supabase/client'
import { Post, PostEngagement } from '@/types'

const supabase = createClient()

function mapPost(row: any): Post {
  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    mediaUrls: Array.isArray(row.media_urls) ? row.media_urls : [],
    platforms: row.platforms ?? [],
    status: row.status,
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

  async createPost(userId: string, content: string, platforms: string[], mediaUrls: string[] = []) {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        content,
        platforms,
        media_urls: mediaUrls,
        status: 'draft'
      })
      .select()
      .single()

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
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
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