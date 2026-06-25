# SocialHub - Project Setup Guide

A modern, full-featured social media management dashboard built with Next.js 16, React, TypeScript, and Tailwind CSS.

## Overview

SocialHub is a comprehensive social media management platform that enables users to:
- Manage multiple social media accounts (Facebook, Instagram, LinkedIn) from one dashboard
- Compose and publish posts to multiple platforms simultaneously
- Schedule posts for optimal engagement
- Track engagement metrics and analytics
- View post history and performance data

## Demo Credentials

The application includes pre-configured demo credentials for testing:

**Marketing User:**
- Email: `demo@example.com`
- Password: `demo123`

**Admin User:**
- Email: `admin@example.com`
- Password: `admin123`

## Architecture

### Folder Structure

```
/app
  /dashboard        - Main dashboard page
  /login           - Login authentication page
  /register        - Registration page
  /compose         - Post composition and publishing
  /accounts        - Social account management
  /history         - Post history and management
  /analytics       - Performance analytics
  /layout.tsx      - Root layout with providers
  /page.tsx        - Root redirect page
  /globals.css     - Global styles and theme

/components
  /layout          - Layout components (Header, etc.)
  /features        - Feature-specific components (StatCard, etc.)
  /ui             - Re-usable UI components (Button, etc.)

/hooks             - Custom React hooks

/services          - Business logic and API integration
  - authService.ts       - Authentication service
  - socialService.ts     - Social media platform integration
  - postService.ts       - Post creation and management
  - analyticsService.ts  - Analytics data handling

/store             - React Context providers
  - AuthContext.tsx       - Authentication state management
  - PostsContext.tsx      - Posts state management
  - AccountsContext.tsx   - Social accounts state management

/types             - TypeScript type definitions
  - index.ts        - All application types

/utils             - Utility functions and helpers

/public            - Static assets
  - /images        - Image assets
```

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Custom components + shadcn/ui Button
- **State Management**: React Context API
- **Data Fetching**: Mock services (ready for real API integration)
- **Authentication**: Mock auth service (ready for real auth provider integration)

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

### 3. Login

Use the demo credentials to access the dashboard:
- Email: `demo@example.com`
- Password: `demo123`

## Features

### Dashboard
- Overview of social media performance
- Connected accounts display
- Recent posts with engagement metrics
- Quick stats and trends

### Compose
- Rich text editor for post content
- Multi-platform selection
- Account selection for simultaneous publishing
- Draft saving
- Real-time preview
- Post scheduling capability

### Accounts
- Connect new social media accounts
- View connected accounts
- Disconnect accounts
- Account status indicators

### History
- View all posts (published, scheduled, draft, failed)
- Filter by status
- View engagement metrics
- Delete posts
- Post performance data

### Analytics
- Multi-platform performance dashboard
- Detailed analytics metrics
- Engagement rate tracking
- Impression and click data
- Conversion tracking

## API Integration Points

The application uses mock services that can be replaced with real API calls. Each service file contains TODO comments indicating integration points:

### Authentication Service (`services/authService.ts`)
**Replace with**: Firebase, Auth0, Supabase, or custom authentication provider

Integration points:
- `authService.login()` - User authentication
- `authService.register()` - New account registration
- `authService.resetPassword()` - Password reset functionality
- `authService.logout()` - Session termination

### Social Service (`services/socialService.ts`)
**Replace with**: Facebook Graph API, Instagram Graph API, LinkedIn API

Integration points:
- `socialService.getAccounts()` - Retrieve connected accounts
- `socialService.connectAccount()` - OAuth flow for connecting accounts
- `socialService.disconnectAccount()` - Revoke account access
- `socialService.publishPost()` - Publish to platforms
- `socialService.schedulePost()` - Schedule posts for future publishing

### Post Service (`services/postService.ts`)
**Replace with**: Database (Supabase, Neon, Firebase, MongoDB)

Integration points:
- `postService.getPosts()` - Retrieve posts from database
- `postService.createPost()` - Save new posts
- `postService.updatePost()` - Update post metadata
- `postService.publishPost()` - Publish to platforms and record
- `postService.deletePost()` - Remove posts (soft delete recommended)
- `postService.schedulePost()` - Schedule posts with provider

### Analytics Service (`services/analyticsService.ts`)
**Replace with**: Platform-specific analytics APIs + data warehouse

Integration points:
- `analyticsService.getDashboardStats()` - Aggregate metrics
- `analyticsService.getAnalytics()` - Time-series data
- `analyticsService.getPlatformMetrics()` - Platform-specific stats
- `analyticsService.getPostMetrics()` - Individual post performance

## Database Schema

When implementing real database integration, the following tables are required:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  role VARCHAR NOT NULL, -- 'admin' | 'marketing_user'
  password_hash VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Social accounts table
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  platform VARCHAR NOT NULL, -- 'facebook' | 'instagram' | 'linkedin'
  account_name VARCHAR NOT NULL,
  account_id VARCHAR NOT NULL,
  access_token VARCHAR NOT NULL,
  refresh_token VARCHAR,
  expires_at TIMESTAMP,
  is_connected BOOLEAN DEFAULT true,
  connected_at TIMESTAMP DEFAULT NOW()
);

-- Posts table
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  platforms JSONB NOT NULL, -- Array of platform names
  status VARCHAR NOT NULL, -- 'draft' | 'scheduled' | 'published' | 'failed'
  scheduled_at TIMESTAMP,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP -- For soft deletes
);

-- Post engagement table
CREATE TABLE post_engagements (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES posts(id),
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Analytics table
CREATE TABLE analytics_data (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  platform VARCHAR NOT NULL,
  date DATE NOT NULL,
  impressions INTEGER,
  engagements INTEGER,
  clicks INTEGER,
  conversions INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Environment Variables

When integrating with real services, add the following environment variables:

```bash
# Authentication
AUTH_PROVIDER_URL=
AUTH_API_KEY=
AUTH_SECRET=

# Social Media APIs
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
INSTAGRAM_ACCESS_TOKEN=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# Database
DATABASE_URL=

# Storage (for media uploads)
STORAGE_BUCKET=
STORAGE_API_KEY=

# Analytics
ANALYTICS_API_KEY=
```

## Security Considerations

1. **Sensitive Data**: Never commit API keys, tokens, or secrets to version control
2. **Token Storage**: Store access tokens securely (encrypted database fields, secure cookies)
3. **CORS**: Configure CORS properly for API requests
4. **Input Validation**: Validate and sanitize all user inputs
5. **Rate Limiting**: Implement rate limiting on API endpoints
6. **Session Management**: Implement proper session invalidation
7. **Password Hashing**: Use bcrypt or similar for password hashing
8. **HTTPS Only**: Enforce HTTPS in production

## Performance Optimization

- Images should be optimized before upload (use Next.js Image component)
- Implement pagination for post history
- Cache analytics data with appropriate TTL
- Use incremental static regeneration (ISR) for dashboard
- Implement lazy loading for analytics charts
- Use React.memo for expensive components

## Testing

Add tests for:
- Authentication flows
- Post creation and publishing
- Account connection/disconnection
- Analytics calculations
- Form validation

```bash
pnpm test
```

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy: `git push origin main`

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

### Manual Deployment

```bash
# Build
pnpm build

# Start
pnpm start
```

## Future Enhancements

- [ ] Real-time notifications for comments/mentions
- [ ] AI-powered content suggestions
- [ ] Content calendar with drag-and-drop scheduling
- [ ] Team collaboration and permissions
- [ ] Custom branding for white-label use
- [ ] Mobile app (React Native)
- [ ] Browser extensions for quick sharing
- [ ] Sentiment analysis for comments
- [ ] Competitor analysis
- [ ] ROI tracking and attribution

## Troubleshooting

### "AuthToken not found" error
- Ensure you're logged in
- Check browser localStorage for auth token
- Clear cookies and try logging in again

### API errors when connecting accounts
- Verify OAuth credentials are correct
- Check that redirect URIs are properly configured
- Ensure API keys haven't expired

### Posts not publishing
- Verify accounts are still connected
- Check platform API rate limits
- Review API error logs for details

## Support & Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## License

MIT License - Feel free to use this project for commercial or personal use.

---

**Last Updated**: June 2026
**Version**: 1.0.0
