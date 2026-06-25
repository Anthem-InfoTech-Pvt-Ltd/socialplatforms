import { Post, PostEngagement } from '@/types';

// Mock database for posts
let mockPosts: Post[] = [
  {
    id: '1',
    userId: '1',
    content: 'Excited to announce our new product launch! 🚀',
    mediaUrls: [],
    platforms: ['facebook', 'linkedin'],
    status: 'published',
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    engagement: {
      likes: 245,
      comments: 32,
      shares: 18,
      views: 1250,
    },
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    userId: '1',
    content: 'Check out our latest blog post on industry trends',
    mediaUrls: [],
    platforms: ['instagram', 'facebook'],
    status: 'published',
    publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    engagement: {
      likes: 189,
      comments: 28,
      shares: 12,
      views: 890,
    },
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
];

// TODO: Replace with real database
// Integration points:
// - Supabase, Neon, or MongoDB for persistent storage
// - Implement pagination for large datasets
// - Add filtering and sorting capabilities
// - Store media files in cloud storage (Vercel Blob, S3, etc.)

export const postService = {
  async getPosts(userId: string, status?: string): Promise<Post[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    let posts = mockPosts.filter((p) => p.userId === userId);
    if (status) {
      posts = posts.filter((p) => p.status === status);
    }
    return posts.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async getPostById(postId: string): Promise<Post | null> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    return mockPosts.find((p) => p.id === postId) || null;
  },

  async createPost(
    userId: string,
    content: string,
    platforms: string[],
    mediaUrls: string[] = []
  ): Promise<Post> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const newPost: Post = {
      id: Date.now().toString(),
      userId,
      content,
      mediaUrls,
      platforms: platforms as any,
      status: 'draft',
      engagement: {
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPosts.push(newPost);

    // TODO: Save to database
    // - Store post content and metadata
    // - Handle media uploads
    // - Create audit log entry

    return newPost;
  },

  async updatePost(postId: string, updates: Partial<Post>): Promise<Post> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 400));

    const postIndex = mockPosts.findIndex((p) => p.id === postId);
    if (postIndex === -1) {
      throw new Error('Post not found');
    }

    mockPosts[postIndex] = {
      ...mockPosts[postIndex],
      ...updates,
      updatedAt: new Date(),
    };

    // TODO: Update database record
    // - Track change history
    // - Update platform post if already published

    return mockPosts[postIndex];
  },

  async publishPost(
    postId: string,
    accountIds: string[]
  ): Promise<{ success: boolean; results: any[] }> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const post = mockPosts.find((p) => p.id === postId);
    if (!post) {
      throw new Error('Post not found');
    }

    // TODO: Implement multi-platform publishing
    // - Call social media APIs for each platform
    // - Store platform-specific post IDs
    // - Update post status and timestamps
    // - Handle partial failures (some platforms succeed, others fail)

    const results = accountIds.map((accountId) => ({
      accountId,
      success: Math.random() > 0.1,
      message: 'Published successfully',
    }));

    const allSuccess = results.every((r) => r.success);

    if (allSuccess) {
      post.status = 'published';
      post.publishedAt = new Date();
      post.updatedAt = new Date();
    }

    return { success: allSuccess, results };
  },

  async deletePost(postId: string): Promise<void> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    mockPosts = mockPosts.filter((p) => p.id !== postId);

    // TODO: Implement soft delete pattern per user's preference
    // - Mark as deleted instead of permanent removal
    // - Store deletion timestamp
    // - Allow restoration within time window
  },

  async updateEngagement(
    postId: string,
    engagement: Partial<PostEngagement>
  ): Promise<Post> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    const post = mockPosts.find((p) => p.id === postId);
    if (!post) {
      throw new Error('Post not found');
    }

    post.engagement = {
      ...post.engagement,
      ...engagement,
    };

    // TODO: Fetch real engagement data from APIs
    // - Call Facebook Graph API for metrics
    // - Call Instagram Graph API for metrics
    // - Call LinkedIn API for metrics
    // - Cache results with TTL
    // - Set up webhooks for real-time updates

    return post;
  },

  async schedulePost(
    postId: string,
    scheduledAt: Date,
    accountIds: string[]
  ): Promise<Post> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const post = mockPosts.find((p) => p.id === postId);
    if (!post) {
      throw new Error('Post not found');
    }

    post.status = 'scheduled';
    post.scheduledAt = scheduledAt;
    post.updatedAt = new Date();

    // TODO: Schedule with platform APIs
    // - Set up scheduled publishing
    // - Store scheduling metadata
    // - Implement retry logic for failed scheduling

    return post;
  },
};
