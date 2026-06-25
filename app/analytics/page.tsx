'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/AuthContext';
import { usePosts } from '@/store/PostsContext';
import { useAccounts } from '@/store/AccountsContext';
import { Header } from '@/components/layout/Header';
import { analyticsService } from '@/services/analyticsService';
import { AnalyticsData } from '@/types';

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { posts, loadPosts } = usePosts();
  const { accounts, loadAccounts } = useAccounts();
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
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
          await Promise.all([loadPosts(user.id), loadAccounts(user.id)]);
        } catch (error) {
          console.error('Failed to load data:', error);
        }
      };
      loadData();
    }
  }, [user, loadPosts, loadAccounts]);

  useEffect(() => {
    if (user) {
      const loadAnalytics = async () => {
        try {
          setIsLoading(true);
          const data = await analyticsService.getAnalytics(
            user.id,
            selectedPlatform === 'all' ? undefined : selectedPlatform
          );
          setAnalytics(data);
        } catch (error) {
          console.error('Failed to load analytics:', error);
        } finally {
          setIsLoading(false);
        }
      };

      loadAnalytics();
    }
  }, [user, selectedPlatform]);

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

  // Calculate aggregated stats
  const totalImpressions = analytics.reduce((sum, item) => sum + item.impressions, 0);
  const totalEngagements = analytics.reduce((sum, item) => sum + item.engagements, 0);
  const totalClicks = analytics.reduce((sum, item) => sum + item.clicks, 0);
  const totalConversions = analytics.reduce((sum, item) => sum + item.conversions, 0);
  const avgEngagementRate =
    totalImpressions > 0 ? ((totalEngagements / totalImpressions) * 100).toFixed(2) : '0';

  // Get unique platforms
  const platforms = ['all', ...new Set(accounts.map((a) => a.platform))];

  // Group by platform for summary
  const platformSummary: { [key: string]: AnalyticsData[] } = {};
  analytics.forEach((item) => {
    if (!platformSummary[item.platform]) {
      platformSummary[item.platform] = [];
    }
    platformSummary[item.platform].push(item);
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Analytics</h1>
          <p className="text-muted-foreground">
            Track your social media performance across all platforms
          </p>
        </div>

        {/* Platform Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          {platforms.map((platform) => (
            <button
              key={platform}
              onClick={() => setSelectedPlatform(platform)}
              className={`px-4 py-2 rounded-lg transition-all text-sm font-medium capitalize ${
                selectedPlatform === platform
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-muted-foreground hover:border-primary'
              }`}
            >
              {platform === 'all' ? 'All Platforms' : platform}
            </button>
          ))}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Total Impressions
            </p>
            <p className="text-3xl font-bold text-foreground">
              {totalImpressions.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Last 30 days</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Total Engagements
            </p>
            <p className="text-3xl font-bold text-foreground">
              {totalEngagements.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {avgEngagementRate}% engagement rate
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Total Clicks
            </p>
            <p className="text-3xl font-bold text-foreground">
              {totalClicks.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Traffic generated</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Conversions
            </p>
            <p className="text-3xl font-bold text-foreground">
              {totalConversions.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Actions taken</p>
          </div>
        </div>

        {/* Platform Performance */}
        {Object.keys(platformSummary).length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4">
              Platform Performance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(platformSummary).map(([platform, data]) => {
                const platformImpressions = data.reduce(
                  (sum, item) => sum + item.impressions,
                  0
                );
                const platformEngagements = data.reduce(
                  (sum, item) => sum + item.engagements,
                  0
                );
                const platformRate = (
                  (platformEngagements / platformImpressions) *
                  100
                ).toFixed(2);

                return (
                  <div
                    key={platform}
                    className="bg-card border border-border rounded-lg p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-foreground capitalize">
                        {platform}
                      </h3>
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <span className="text-xs font-bold text-primary capitalize">
                          {platform.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Impressions</p>
                        <p className="text-lg font-semibold text-foreground">
                          {platformImpressions.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Engagements</p>
                        <p className="text-lg font-semibold text-foreground">
                          {platformEngagements.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Engagement Rate
                        </p>
                        <p className="text-lg font-semibold text-primary">
                          {platformRate}%
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detailed Analytics Table */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">
            Detailed Metrics
          </h2>
          {isLoading ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          ) : analytics.length > 0 ? (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                        Platform
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">
                        Impressions
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">
                        Engagements
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">
                        Clicks
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">
                        Conversions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {analytics.slice(0, 30).map((item, idx) => (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 text-sm text-foreground">
                          {item.date}
                        </td>
                        <td className="px-6 py-4 text-sm capitalize">
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                            {item.platform}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-foreground">
                          {item.impressions.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-foreground">
                          {item.engagements.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-foreground">
                          {item.clicks.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-foreground">
                          {item.conversions.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground">
                No analytics data available yet
              </p>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-accent/10 border border-accent/30 rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-2">About Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Analytics are updated daily and show performance metrics for the last 30
            days. Metrics include impressions, engagements, clicks, and conversions
            across all your connected social media accounts.
          </p>
        </div>
      </main>
    </div>
  );
}
