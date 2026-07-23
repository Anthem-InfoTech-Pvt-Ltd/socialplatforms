import { AnalyticsData, DashboardStats, Post } from '@/types';

// Mock data — only used by the Analytics page charts, not the Dashboard stats below.
const generateMockAnalytics = (): AnalyticsData[] => {
  const data: AnalyticsData[] = [];
  const platforms = ['facebook', 'instagram', 'linkedin'];
  const today = new Date();

  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    platforms.forEach((platform) => {
      data.push({
        date: date.toISOString().split('T')[0],
        platform,
        impressions: Math.floor(Math.random() * 5000) + 1000,
        engagements: Math.floor(Math.random() * 500) + 50,
        clicks: Math.floor(Math.random() * 300) + 20,
        conversions: Math.floor(Math.random() * 50) + 5,
      });
    });
  }

  return data;
};

let mockAnalyticsData = generateMockAnalytics();

export const analyticsService = {
  async getDashboardStats(userId: string, posts: Post[]): Promise<DashboardStats> {
    // Fully derived from real posts + post_engagements — no Math.random() here anymore.
    const totalEngagement = posts.reduce(
      (sum, p) =>
        sum +
        p.engagement.likes +
        p.engagement.comments +
        p.engagement.shares,
      0
    );

    const topPerformingPost =
      posts.length > 0
        ? posts.reduce((top, post) => {
            const postEngagement =
              post.engagement.likes +
              post.engagement.comments +
              post.engagement.shares;
            const topEngagement =
              top.engagement.likes +
              top.engagement.comments +
              top.engagement.shares;
            return postEngagement > topEngagement ? post : top;
          })
        : null;

    return {
      totalFollowers: 0, // TODO: needs real FB/IG/LinkedIn insights API integration
      totalEngagement,
      averageEngagementRate: posts.length > 0 ? totalEngagement / posts.length : 0,
      topPerformingPost,
    };
  },

  async getAnalytics(
    userId: string,
    platform?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AnalyticsData[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    let data = mockAnalyticsData;

    if (platform) {
      data = data.filter((d) => d.platform === platform);
    }

    if (startDate || endDate) {
      data = data.filter((d) => {
        const dataDate = new Date(d.date);
        if (startDate && dataDate < startDate) return false;
        if (endDate && dataDate > endDate) return false;
        return true;
      });
    }

    return data;
  },

  async getPlatformMetrics(
    userId: string,
    platform: string
  ): Promise<{
    followers: number;
    engagement_rate: number;
    avg_post_reach: number;
    top_content_type: string;
  }> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      followers: Math.floor(Math.random() * 50000) + 10000,
      engagement_rate: Math.random() * 8 + 2,
      avg_post_reach: Math.floor(Math.random() * 5000) + 500,
      top_content_type: ['image', 'video', 'link'][Math.floor(Math.random() * 3)],
    };
  },

  async getPostMetrics(
    userId: string,
    postId: string
  ): Promise<{
    views: number;
    interactions: number;
    clicks: number;
    shares: number;
  }> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      views: Math.floor(Math.random() * 5000) + 500,
      interactions: Math.floor(Math.random() * 500) + 50,
      clicks: Math.floor(Math.random() * 300) + 20,
      shares: Math.floor(Math.random() * 100) + 5,
    };
  },
};