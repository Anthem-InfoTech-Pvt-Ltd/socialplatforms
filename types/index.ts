// User & Auth Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'marketing_user';
  avatar?: string;
  createdAt: Date;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
}

// Social Account Types
export interface SocialAccount {
  id: string;
  userId: string;
  platform: 'facebook' | 'instagram' | 'linkedin';
  accountName: string;
  accountId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  isConnected: boolean;
  connectedAt: Date;
}

// Post Types
export interface Post {
  id: string;
  userId: string;
  content: string;
  mediaUrls: string[];
  platforms: ('facebook' | 'instagram' | 'linkedin')[];
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  location?: string;       // Optional location tag shown in preview / appended on publish
  internalNotes?: string;  // Internal-only note, never sent to the platforms
  scheduledAt?: Date;
  publishedAt?: Date;
  engagement: PostEngagement;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostEngagement {
  likes: number;
  comments: number;
  shares: number;
  views: number;
}

export interface PostComposerData {
  content: string;
  mediaUrls: string[];
  platforms: ('facebook' | 'instagram' | 'linkedin')[];
  location?: string;
  internalNotes?: string;
  scheduledAt?: Date;
}

// Analytics Types
export interface AnalyticsData {
  date: string;
  platform: string;
  impressions: number;
  engagements: number;
  clicks: number;
  conversions: number;
}

export interface DashboardStats {
  totalFollowers: number;
  totalEngagement: number;
  averageEngagementRate: number;
  topPerformingPost: Post | null;
}

// Notification Types
export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: Date;
  isRead: boolean;
}