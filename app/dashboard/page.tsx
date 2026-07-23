'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/store/AuthContext';
import { usePosts } from '@/store/PostsContext';
import { useAccounts } from '@/store/AccountsContext';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/features/StatCard';
import { DashboardStats } from '@/types';
import { analyticsService } from '@/services/analyticsService';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { posts, loadPosts } = usePosts();
  const { accounts, loadAccounts } = useAccounts();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (user) {
      const loadData = async () => {
        try {
          await Promise.all([
            loadPosts(user.id),
            loadAccounts(user.id),
          ]);
        } catch (error) {
          console.error('Failed to load data:', error);
        } finally {
          setIsLoading(false);
        }
      };

      loadData();
    }
  }, [user, loadPosts, loadAccounts]);

  useEffect(() => {
    if (user && posts.length > 0) {
      const loadStats = async () => {
        try {
          const dashboardStats = await analyticsService.getDashboardStats(
            user.id,
            posts
          );
          setStats(dashboardStats);
        } catch (error) {
          console.error('Failed to load stats:', error);
        }
      };

      loadStats();
    }
  }, [user, posts]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-border border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const publishedPosts = posts.filter((p) => p.status === 'published');
  const scheduledPosts = posts.filter((p) => p.status === 'scheduled');
  const draftPosts = posts.filter((p) => p.status === 'draft');

  // Real week-over-week comparison for Published Posts trend — no hardcoded numbers.
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - 7);
  const startOfLastWeek = new Date(now);
  startOfLastWeek.setDate(now.getDate() - 14);

  const publishedThisWeek = publishedPosts.filter(
    (p) => p.publishedAt && new Date(p.publishedAt) >= startOfThisWeek
  ).length;
  const publishedLastWeek = publishedPosts.filter(
    (p) =>
      p.publishedAt &&
      new Date(p.publishedAt) >= startOfLastWeek &&
      new Date(p.publishedAt) < startOfThisWeek
  ).length;

  const hasPublishedTrend = publishedThisWeek > 0 || publishedLastWeek > 0;
  const publishedTrendValue =
    publishedLastWeek > 0
      ? Math.round(((publishedThisWeek - publishedLastWeek) / publishedLastWeek) * 100)
      : 100;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {user?.name.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s an overview of your social media performance
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            label="Total Followers"
            value={stats?.totalFollowers.toLocaleString() || '0'}
          />
          <StatCard
            label="Total Engagement"
            value={stats?.totalEngagement || '0'}
          />
          <StatCard
            label="Published Posts"
            value={publishedPosts.length}
            trend={
              hasPublishedTrend
                ? { value: Math.abs(publishedTrendValue), isPositive: publishedTrendValue >= 0 }
                : undefined
            }
          />
          <StatCard
            label="Scheduled Posts"
            value={scheduledPosts.length}
          />
        </div>

        {/* Connected Accounts */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">Connected Accounts</h2>
            <Link href="/accounts">
              <Button variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10">
                Manage
              </Button>
            </Link>
          </div>
          {accounts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="bg-card border border-border rounded-lg p-4"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary capitalize">
                        {account.platform.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground text-sm">
                        {account.accountName}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {account.platform}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-green-500 font-medium">
                    ✓ Connected
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground mb-4">No accounts connected yet</p>
              <Link href="/accounts">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Connect Account
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Recent Posts */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">Recent Posts</h2>
            <Link href="/history">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                View all
              </Button>
            </Link>
          </div>
          {publishedPosts.length > 0 ? (
            <div className="space-y-4">
              {publishedPosts.slice(0, 3).map((post) => (
                <div
                  key={post.id}
                  className="bg-card border border-border rounded-lg p-4"
                >
                  <div className="flex gap-4">
                    {post.mediaUrls?.[0] && (
                      <img
                        src={post.mediaUrls[0]}
                        alt="post media"
                        className="w-16 h-16 object-cover rounded-lg border border-border shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-medium mb-2">{post.content}</p>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <span>👍 {post.engagement.likes} Likes</span>
                        <span>💬 {post.engagement.comments} Comments</span>
                        <span>🔄 {post.engagement.shares} Shares</span>
                      </div>
                      <div className="flex gap-2 mt-3">
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
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground mb-4">No posts published yet</p>
              <Link href="/compose">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Create Post
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {draftPosts.length > 0 && (
          <div className="mt-8 bg-accent/10 border border-accent/30 rounded-lg p-4">
            <p className="text-sm text-accent font-medium">
              You have {draftPosts.length} draft{draftPosts.length !== 1 ? 's' : ''} ready to publish
            </p>
          </div>
        )}
      </main>
    </div>
  );
}