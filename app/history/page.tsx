'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/AuthContext';
import { usePosts } from '@/store/PostsContext';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Post } from '@/types';

export default function HistoryPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { posts, loadPosts, deletePost, isLoading } = usePosts();
  const [filter, setFilter] = useState<'all' | 'published' | 'scheduled' | 'draft'>(
    'all'
  );
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadPosts(user.id);
    }
  }, [user, loadPosts]);

  const filteredPosts = posts.filter((post) => {
    if (filter === 'all') return true;
    return post.status === filter;
  });

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    setError('');
    setSuccess('');

    try {
      await deletePost(postId);
      setSuccess('Post deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete post');
    }
  };

  const getStatusBadgeColor = (status: Post['status']) => {
    switch (status) {
      case 'published':
        return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'scheduled':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'draft':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      case 'failed':
        return 'bg-destructive/10 text-destructive border-destructive/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Post History</h1>
          <p className="text-muted-foreground">
            View and manage all your posts
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-sm text-green-500">{success}</p>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          {['all', 'published', 'scheduled', 'draft'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status as any)}
              className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                filter === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-muted-foreground hover:border-primary'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Posts List */}
        {filteredPosts.length > 0 ? (
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <p className="text-foreground font-medium mb-2">{post.content}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {post.platforms.map((platform) => (
                        <span
                          key={platform}
                          className="inline-block text-xs px-2 py-1 bg-primary/10 text-primary rounded capitalize"
                        >
                          {platform}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeColor(
                      post.status
                    )}`}
                  >
                    {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                  </span>
                </div>

                {/* Engagement Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 pb-4 border-b border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Likes</p>
                    <p className="text-lg font-semibold text-foreground">
                      {post.engagement.likes}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Comments</p>
                    <p className="text-lg font-semibold text-foreground">
                      {post.engagement.comments}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Shares</p>
                    <p className="text-lg font-semibold text-foreground">
                      {post.engagement.shares}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Views</p>
                    <p className="text-lg font-semibold text-foreground">
                      {post.engagement.views}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="text-lg font-semibold text-foreground">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-4">
                  <span>Created: {new Date(post.createdAt).toLocaleString()}</span>
                  {post.publishedAt && (
                    <span>Published: {new Date(post.publishedAt).toLocaleString()}</span>
                  )}
                  {post.scheduledAt && (
                    <span>Scheduled: {new Date(post.scheduledAt).toLocaleString()}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {post.status === 'draft' && (
                    <>
                      <Button
                        onClick={() => router.push('/compose')}
                        variant="outline"
                        size="sm"
                        className="border-primary text-primary hover:bg-primary/10"
                      >
                        Edit & Publish
                      </Button>
                    </>
                  )}
                  <Button
                    onClick={() => handleDelete(post.id)}
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <p className="text-muted-foreground mb-4">
              {filter === 'all'
                ? 'No posts yet. Create your first post!'
                : `No ${filter} posts found.`}
            </p>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Create Post
            </Button>
          </div>
        )}

        {/* Summary */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Total Posts</p>
            <p className="text-2xl font-bold text-foreground">{posts.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Published</p>
            <p className="text-2xl font-bold text-green-500">
              {posts.filter((p) => p.status === 'published').length}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Scheduled</p>
            <p className="text-2xl font-bold text-blue-500">
              {posts.filter((p) => p.status === 'scheduled').length}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Drafts</p>
            <p className="text-2xl font-bold text-amber-500">
              {posts.filter((p) => p.status === 'draft').length}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
