// lib/supabase/storage.ts
import { createClient } from '@/lib/supabase/client'

// Post ke liye image ko Supabase Storage ke 'post-media' bucket mein upload karta hai
// aur public URL return karta hai (Facebook/Instagram/LinkedIn ko ye URL chahiye hota hai)
export async function uploadPostImage(file: File, userId: string): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()
  const path = `${userId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage.from('post-media').upload(path, file)
  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from('post-media').getPublicUrl(path)
  return data.publicUrl
}

// Optional: image delete karne ke liye (remove button use kar sakta hai future mein)
export async function deletePostImage(userId: string, url: string): Promise<void> {
  const supabase = createClient()
  const path = url.split(`/post-media/`)[1]
  if (!path) return

  const { error } = await supabase.storage.from('post-media').remove([path])
  if (error) throw new Error(error.message)
}