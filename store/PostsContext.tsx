'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Post } from '@/types';
import { postService } from '@/services/postService';

interface PostsContextType {
  posts: Post[];
  isLoading: boolean;
  error: string | null;
  loadPosts: (userId: string) => Promise<void>;
  createPost: (
    userId: string,
    content: string,
    platforms: string[],
    mediaUrls?: string[]
  ) => Promise<Post>;
  updatePost: (postId: string, updates: Partial<Post>) => Promise<Post>;
  deletePost: (postId: string) => Promise<void>;
  publishPost: (postId: string, accountIds: string[]) => Promise<boolean>;
  schedulePost: (
    postId: string,
    scheduledAt: Date,
    accountIds: string[]
  ) => Promise<Post>;
}

const PostsContext = createContext<PostsContextType | undefined>(undefined);

export function PostsProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedPosts = await postService.getPosts(userId);
      setPosts(fetchedPosts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPost = useCallback(
    async (
      userId: string,
      content: string,
      platforms: string[],
      mediaUrls: string[] = []
    ) => {
      try {
        const newPost = await postService.createPost(
          userId,
          content,
          platforms,
          mediaUrls
        );
        setPosts((prev) => [newPost, ...prev]);
        return newPost;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to create post');
      }
    },
    []
  );

  const updatePost = useCallback(async (postId: string, updates: Partial<Post>) => {
    try {
      const updatedPost = await postService.updatePost(postId, updates);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? updatedPost : p))
      );
      return updatedPost;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update post');
    }
  }, []);

  const deletePost = useCallback(async (postId: string) => {
    try {
      await postService.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete post');
    }
  }, []);

  const publishPost = useCallback(async (postId: string, accountIds: string[]) => {
    try {
      const result = await postService.publishPost(postId, accountIds);
      if (result.success) {
        const updatedPost = await postService.getPostById(postId);
        if (updatedPost) {
          setPosts((prev) =>
            prev.map((p) => (p.id === postId ? updatedPost : p))
          );
        }
      }
      return result.success;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to publish post');
    }
  }, []);

  const schedulePost = useCallback(
    async (postId: string, scheduledAt: Date, accountIds: string[]) => {
      try {
        const scheduledPost = await postService.schedulePost(
          postId,
          scheduledAt,
          accountIds
        );
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? scheduledPost : p))
        );
        return scheduledPost;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to schedule post');
      }
    },
    []
  );

  const value: PostsContextType = {
    posts,
    isLoading,
    error,
    loadPosts,
    createPost,
    updatePost,
    deletePost,
    publishPost,
    schedulePost,
  };

  return <PostsContext.Provider value={value}>{children}</PostsContext.Provider>;
}

export function usePosts() {
  const context = useContext(PostsContext);
  if (context === undefined) {
    throw new Error('usePosts must be used within a PostsProvider');
  }
  return context;
}
