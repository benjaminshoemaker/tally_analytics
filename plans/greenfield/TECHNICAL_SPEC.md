# [ProductName] — Technical Specification

## Document Information

| Field | Value |
|-------|-------|
| **Status** | Ready for Implementation |
| **Target Timeline** | 6 weeks to MVP |
| **Last Updated** | December 2024 |

---

## 1. Architecture Overview

### 1.1 System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER JOURNEY                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Marketing  │     │    GitHub    │     │  Dashboard   │     │   End User   │
│     Site     │────▶│  OAuth/App   │────▶│    (App)     │────▶│   Website    │
│              │     │   Install    │     │              │     │   + SDK      │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │                    │
       │                    │                    │                    │
       ▼                    ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VERCEL PLATFORM                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     Next.js App (App Router)                         │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │    │
│  │  │  Marketing  │  │  Dashboard  │  │  API Routes │  │   Webhook  │  │    │
│  │  │   Pages     │  │   Pages     │  │             │  │  Handlers  │  │    │
│  │  │   (SSG)     │  │   (SSR)     │  │             │  │            │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│  ┌─────────────────────────────────┴───────────────────────────────────┐    │
│  │                    Vercel Functions (Fluid Compute)                  │    │
│  │                         Max Duration: 800s                           │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │    │
│  │  │  Repo Analyzer  │  │   PR Generator  │  │  Event Ingestion    │  │    │
│  │  │  (30-60s jobs)  │  │                 │  │  (events.*.com)     │  │    │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│       Neon       │    │     Tinybird     │    │      Resend      │
│    (Postgres)    │    │   (ClickHouse)   │    │     (Email)      │
│                  │    │                  │    │                  │
│  • Users         │    │  • Events        │    │  • Magic links   │
│  • Sessions      │    │  • Aggregates    │    │                  │
│  • Projects      │    │                  │    │                  │
│  • GitHub tokens │    │                  │    │                  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
          │
          ▼
┌──────────────────┐
│    GitHub API    │
│                  │
│  • Contents API  │
│  • Pull Requests │
│  • Permissions   │
└──────────────────┘
```

### 1.2 Key Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Web Application** | Next.js 14+ (App Router) | Marketing site, dashboard, API routes |
| **Hosting** | Vercel | Deployment, edge network, serverless functions |
| **Metadata Database** | Neon (Postgres) | Users, sessions, projects, GitHub tokens |
| **Event Storage** | Tinybird | Time-series event data, analytics queries |
| **Email Service** | Resend | Magic link authentication emails |
| **Source Control Integration** | GitHub App | Repo access, PR creation |
| **Client SDK** | NPM Package | Browser-side event tracking |

### 1.3 Domain Structure

| Domain | Purpose |
|--------|---------|
| `[productname].com` | Marketing site (SSG) |
| `app.[productname].com` | Dashboard application (SSR) |
| `events.[productname].com` | Event ingestion endpoint (subdomain to avoid ad blockers) |
| `docs.[productname].com` | Documentation (can be separate or part of marketing) |

---

## 2. Data Models

### 2.1 Neon (Postgres) Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- USERS TABLE
-- =============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Subscription info
    plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
    stripe_customer_id VARCHAR(255),
    
    -- Indexes
    CONSTRAINT email_lowercase CHECK (email = LOWER(email))
);

CREATE INDEX idx_users_email ON users(email);

-- =============================================================================
-- SESSIONS TABLE (Auth sessions, not analytics sessions)
-- =============================================================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Session metadata
    user_agent TEXT,
    ip_address INET
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- =============================================================================
-- MAGIC LINKS TABLE
-- =============================================================================
CREATE TABLE magic_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_magic_links_token ON magic_links(token);
CREATE INDEX idx_magic_links_email ON magic_links(email);

-- =============================================================================
-- PROJECTS TABLE
-- =============================================================================
CREATE TABLE projects (
    id VARCHAR(20) PRIMARY KEY, -- Format: proj_[nanoid]
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- GitHub info
    github_repo_id BIGINT NOT NULL,
    github_repo_full_name VARCHAR(255) NOT NULL, -- e.g., "username/repo-name"
    github_installation_id BIGINT NOT NULL,
    
    -- Status tracking
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
        'pending',           -- Just installed, not yet analyzed
        'analyzing',         -- Currently being analyzed
        'analysis_failed',   -- Analysis failed
        'pr_pending',        -- PR is open, waiting for merge
        'pr_closed',         -- PR was closed without merging
        'active',            -- PR merged, receiving events
        'unsupported'        -- Unsupported framework detected
    )),
    
    -- PR info
    pr_number INTEGER,
    pr_url VARCHAR(500),
    
    -- Framework detection
    detected_framework VARCHAR(50), -- 'nextjs-app', 'nextjs-pages', null
    detected_analytics TEXT[], -- Array of detected existing analytics packages
    
    -- Quota tracking
    events_this_month BIGINT DEFAULT 0,
    events_month_reset_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_event_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    UNIQUE(github_repo_id)
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_github_repo_id ON projects(github_repo_id);
CREATE INDEX idx_projects_status ON projects(status);

-- =============================================================================
-- GITHUB TOKENS TABLE
-- =============================================================================
CREATE TABLE github_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Installation tokens (for GitHub App)
    installation_id BIGINT NOT NULL,
    installation_access_token TEXT,
    installation_token_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- User OAuth tokens (for checking permissions)
    user_access_token TEXT,
    user_refresh_token TEXT,
    user_token_expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(installation_id)
);

CREATE INDEX idx_github_tokens_user_id ON github_tokens(user_id);
CREATE INDEX idx_github_tokens_installation_id ON github_tokens(installation_id);

-- =============================================================================
-- WAITLIST TABLE (for unsupported frameworks)
-- =============================================================================
CREATE TABLE waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    framework VARCHAR(100), -- The framework they want supported
    github_repo_full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(email, framework)
);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_github_tokens_updated_at BEFORE UPDATE ON github_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2.2 Tinybird Schema

```sql
-- =============================================================================
-- EVENTS DATA SOURCE
-- =============================================================================
-- File: datasources/events.datasource

SCHEMA >
    `project_id` String,
    `session_id` String,
    `event_type` LowCardinality(String),
    `timestamp` DateTime64(3),
    `url` Nullable(String),
    `path` Nullable(String),
    `referrer` Nullable(String),
    `user_agent` Nullable(String),
    `screen_width` Nullable(UInt16),
    `user_id` Nullable(String),
    `country` Nullable(String),
    `city` Nullable(String)

ENGINE "MergeTree"
ENGINE_PARTITION_KEY "toYYYYMM(timestamp)"
ENGINE_SORTING_KEY "project_id, timestamp"
ENGINE_TTL "timestamp + INTERVAL 90 DAY"
```

```sql
-- =============================================================================
-- DAILY AGGREGATES MATERIALIZED VIEW
-- =============================================================================
-- File: datasources/daily_aggregates.datasource

SCHEMA >
    `project_id` String,
    `date` Date,
    `page_views` UInt64,
    `sessions` UInt64,
    `unique_visitors` UInt64

ENGINE "SummingMergeTree"
ENGINE_PARTITION_KEY "toYYYYMM(date)"
ENGINE_SORTING_KEY "project_id, date"

-- Pipe to populate this:
-- File: pipes/daily_aggregates_pipe.pipe

NODE daily_stats
SQL >
    SELECT
        project_id,
        toDate(timestamp) as date,
        countIf(event_type = 'page_view') as page_views,
        countIf(event_type = 'session_start') as sessions,
        uniqExact(session_id) as unique_visitors
    FROM events
    GROUP BY project_id, date

TYPE materialized
DATASOURCE daily_aggregates
```

### 2.3 TypeScript Types

```typescript
// =============================================================================
// FILE: src/types/database.ts
// =============================================================================

export type Plan = 'free' | 'pro' | 'team';

export type ProjectStatus =
  | 'pending'
  | 'analyzing'
  | 'analysis_failed'
  | 'pr_pending'
  | 'pr_closed'
  | 'active'
  | 'unsupported';

export type DetectedFramework = 'nextjs-app' | 'nextjs-pages' | null;

export interface User {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  plan: Plan;
  stripeCustomerId: string | null;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
}

export interface Project {
  id: string; // Format: proj_[nanoid]
  userId: string;
  githubRepoId: number;
  githubRepoFullName: string;
  githubInstallationId: number;
  status: ProjectStatus;
  prNumber: number | null;
  prUrl: string | null;
  detectedFramework: DetectedFramework;
  detectedAnalytics: string[];
  eventsThisMonth: number;
  eventsMonthResetAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastEventAt: Date | null;
}

// =============================================================================
// FILE: src/types/events.ts
// =============================================================================

export type EventType = 'page_view' | 'session_start';

export interface AnalyticsEvent {
  project_id: string;
  session_id: string;
  event_type: EventType;
  timestamp: string; // ISO 8601
  url?: string;
  path?: string;
  referrer?: string;
  user_agent?: string;
  screen_width?: number;
  user_id?: string;
}

// =============================================================================
// FILE: src/types/github.ts
// =============================================================================

export interface GitHubInstallation {
  id: number;
  account: {
    login: string;
    id: number;
    type: 'User' | 'Organization';
  };
  repositorySelection: 'all' | 'selected';
}

export interface GitHubRepository {
  id: number;
  fullName: string;
  name: string;
  owner: {
    login: string;
    id: number;
  };
  private: boolean;
  defaultBranch: string;
}

export interface FrameworkDetectionResult {
  framework: DetectedFramework;
  entryPoint: string | null; // e.g., 'app/layout.tsx'
  existingAnalytics: string[];
  isMonorepo: boolean;
  error: string | null;
}
```

---

## 3. API/Interface Contracts

### 3.1 Internal API Routes

#### Authentication APIs

```typescript
// =============================================================================
// POST /api/auth/magic-link
// Request a magic link to be sent to email
// =============================================================================
interface MagicLinkRequest {
  email: string;
}

interface MagicLinkResponse {
  success: boolean;
  message: string; // "Check your email for a login link"
}

// Rate limit: 3 requests per email per 15 minutes

// =============================================================================
// GET /api/auth/verify?token=xxx
// Verify magic link token and create session
// =============================================================================
// Response: Redirect to /dashboard with Set-Cookie header
// Error: Redirect to /login?error=invalid_token or expired_token

// =============================================================================
// POST /api/auth/logout
// Destroy session
// =============================================================================
// Response: Clear cookie, redirect to /
```

#### Project APIs

```typescript
// =============================================================================
// GET /api/projects
// List all projects for authenticated user
// =============================================================================
interface ProjectsResponse {
  projects: Array<{
    id: string;
    githubRepoFullName: string;
    status: ProjectStatus;
    prUrl: string | null;
    detectedFramework: DetectedFramework;
    eventsThisMonth: number;
    lastEventAt: string | null;
    createdAt: string;
  }>;
}

// =============================================================================
// GET /api/projects/[projectId]
// Get single project details
// =============================================================================
interface ProjectDetailResponse {
  project: {
    id: string;
    githubRepoFullName: string;
    status: ProjectStatus;
    prNumber: number | null;
    prUrl: string | null;
    detectedFramework: DetectedFramework;
    detectedAnalytics: string[];
    eventsThisMonth: number;
    lastEventAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  quotaLimit: number; // Based on plan
  quotaUsed: number;
  isOverQuota: boolean;
}

// =============================================================================
// POST /api/projects/[projectId]/regenerate
// Trigger fresh analysis and new PR
// =============================================================================
interface RegenerateResponse {
  success: boolean;
  message: string;
}
```

#### Analytics APIs

```typescript
// =============================================================================
// GET /api/projects/[projectId]/analytics/live
// Real-time event feed (polling endpoint)
// =============================================================================
interface LiveFeedRequest {
  limit?: number; // Default 20, max 100
  since?: string; // ISO timestamp, only events after this
}

interface LiveFeedResponse {
  events: Array<{
    id: string;
    eventType: EventType;
    path: string;
    referrer: string | null;
    timestamp: string;
    relativeTime: string; // "3 seconds ago"
  }>;
  hasMore: boolean;
}

// =============================================================================
// GET /api/projects/[projectId]/analytics/overview
// Overview stats for dashboard
// =============================================================================
interface OverviewRequest {
  period?: '24h' | '7d' | '30d'; // Default '7d'
}

interface OverviewResponse {
  period: string;
  pageViews: {
    total: number;
    change: number; // Percentage change from previous period
    timeSeries: Array<{ date: string; count: number }>;
  };
  sessions: {
    total: number;
    change: number;
  };
  topPages: Array<{
    path: string;
    views: number;
    percentage: number;
  }>;
  topReferrers: Array<{
    referrer: string; // "Direct", "google.com", etc.
    count: number;
    percentage: number;
  }>;
}

// =============================================================================
// GET /api/projects/[projectId]/analytics/sessions
// Session analytics
// =============================================================================
interface SessionsResponse {
  period: string;
  totalSessions: number;
  newVisitors: number;
  returningVisitors: number;
  timeSeries: Array<{
    date: string;
    newSessions: number;
    returningSessions: number;
  }>;
}
```

#### GitHub Webhook Handler

```typescript
// =============================================================================
// POST /api/webhooks/github
// Handle GitHub App webhooks
// =============================================================================

// Events to handle:
// - installation.created: New installation, trigger repo analysis
// - installation.deleted: Remove projects for this installation
// - installation_repositories.added: New repos added to installation
// - installation_repositories.removed: Repos removed from installation
// - pull_request.closed: Update project status if our PR was merged/closed

// Webhook signature verification required using GITHUB_WEBHOOK_SECRET
```

### 3.2 Event Ingestion Endpoint

```typescript
// =============================================================================
// POST https://events.[productname].com/v1/track
// Ingest analytics events from SDK
// =============================================================================

// Request Headers:
// Content-Type: application/json
// Origin: <tracked-site-origin> (for CORS)

interface TrackRequest {
  events: AnalyticsEvent[]; // Batch of 1-10 events
}

interface TrackResponse {
  success: boolean;
  received: number;
}

// CORS Configuration:
// - Allow all origins (public endpoint)
// - Allow POST, OPTIONS methods
// - Allow Content-Type header
// - No credentials required

// Response Headers:
// Access-Control-Allow-Origin: *
// Access-Control-Allow-Methods: POST, OPTIONS
// Access-Control-Allow-Headers: Content-Type
```

### 3.3 SDK Public Interface

```typescript
// =============================================================================
// FILE: @[productname]/sdk
// =============================================================================

interface InitOptions {
  projectId: string;
  respectDNT?: boolean; // Default: true
  debug?: boolean; // Default: false
}

interface ProductNameSDK {
  /**
   * Initialize the SDK. Must be called before any other methods.
   */
  init(options: InitOptions): void;

  /**
   * Track a page view. Called automatically on route changes
   * when using the React component.
   */
  trackPageView(path?: string): void;

  /**
   * Associate events with a user ID.
   * Called manually by the developer when user logs in.
   */
  identify(userId: string): void;

  /**
   * Check if tracking is enabled.
   * Returns false if DNT is set and respectDNT is true.
   */
  isEnabled(): boolean;
}

// Usage:
// import { init, trackPageView, identify } from '@[productname]/sdk';
// init({ projectId: 'proj_abc123' });
```

---

## 4. State Management

### 4.1 Server-Side State

| State | Storage | TTL | Purpose |
|-------|---------|-----|---------|
| Auth sessions | Neon `sessions` table | 30 days | User authentication |
| Magic link tokens | Neon `magic_links` table | 15 minutes | Passwordless auth |
| Project status | Neon `projects` table | Permanent | Track repo analysis/PR state |
| GitHub tokens | Neon `github_tokens` table | Varies (refreshed) | API access |
| Analytics events | Tinybird | 90 days | Raw event data |
| Daily aggregates | Tinybird | Permanent | Historical charts |

### 4.2 Client-Side State (SDK)

| State | Storage | TTL | Purpose |
|-------|---------|-----|---------|
| Session ID | First-party cookie | 30 min inactivity | Anonymous visitor tracking |
| User ID | Memory only | Session | Optional identified user |
| Last activity | Cookie timestamp | Rolling 30 min | Session expiry detection |

### 4.3 Client-Side State (Dashboard)

| State | Management | Purpose |
|-------|------------|---------|
| Auth state | HTTP-only cookie (server-verified) | Authentication |
| Current project | URL params + React state | Navigation |
| Analytics data | React Query with polling | Dashboard data |
| Live feed | React Query with 5s polling | Real-time updates |
| Analysis status | React Query with 2s polling | Repo analysis progress |

### 4.4 Polling Configuration

```typescript
// FILE: src/lib/polling-config.ts

export const POLLING_INTERVALS = {
  // When user is watching repo analysis
  ANALYSIS_IN_PROGRESS: 2000, // 2 seconds

  // Live event feed on dashboard
  LIVE_FEED: 5000, // 5 seconds

  // Dashboard charts and stats
  DASHBOARD_STATS: 30000, // 30 seconds

  // Project list (to catch status changes)
  PROJECT_LIST: 10000, // 10 seconds
} as const;
```

---

## 5. Dependencies & Libraries

### 5.1 Core Dependencies

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    
    "@neondatabase/serverless": "^0.9.0",
    "drizzle-orm": "^0.30.0",
    
    "@tinybird/sdk": "^0.2.0",
    
    "resend": "^3.2.0",
    
    "@octokit/app": "^14.0.0",
    "@octokit/rest": "^20.0.0",
    "@octokit/webhooks": "^13.0.0",
    
    "nanoid": "^5.0.0",
    
    "@tanstack/react-query": "^5.28.0",
    
    "recharts": "^2.12.0",
    
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "drizzle-kit": "^0.20.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.0"
  }
}
```

### 5.2 SDK Dependencies

```json
{
  "name": "@[productname]/sdk",
  "version": "0.1.0",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.4.0",
    "tsup": "^8.0.0"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "next": ">=13.0.0"
  }
}
```

### 5.3 Environment Variables

```bash
# =============================================================================
# FILE: .env.example
# =============================================================================

# Neon Database
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Tinybird
TINYBIRD_API_URL="https://api.tinybird.co"
TINYBIRD_ADMIN_TOKEN="p.xxxxxx"
TINYBIRD_EVENTS_TOKEN="p.xxxxxx" # Write-only token for events

# Resend
RESEND_API_KEY="re_xxxxxx"
FROM_EMAIL="auth@[productname].com"

# GitHub App
GITHUB_APP_ID="123456"
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
GITHUB_CLIENT_ID="Iv1.xxxxxx"
GITHUB_CLIENT_SECRET="xxxxxx"
GITHUB_WEBHOOK_SECRET="whsec_xxxxxx"

# App Config
NEXT_PUBLIC_APP_URL="https://app.[productname].com"
NEXT_PUBLIC_EVENTS_URL="https://events.[productname].com"
NEXT_PUBLIC_MARKETING_URL="https://[productname].com"

# Auth
SESSION_SECRET="32-character-random-string-here"
MAGIC_LINK_SECRET="32-character-random-string-here"

# Optional: Stripe (for billing)
STRIPE_SECRET_KEY="sk_xxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxx"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_xxxx"
```

---

## 6. Edge Cases & Boundary Conditions

### 6.1 Framework Detection Logic

```typescript
// FILE: src/lib/framework-detection.ts

interface DetectionResult {
  framework: 'nextjs-app' | 'nextjs-pages' | null;
  entryPoint: string | null;
  existingAnalytics: string[];
  isMonorepo: boolean;
  error: string | null;
}

async function detectFramework(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<DetectionResult> {
  // Step 1: Fetch package.json
  const packageJson = await fetchFile(octokit, owner, repo, 'package.json');
  if (!packageJson) {
    return { error: 'No package.json found', ...defaults };
  }

  // Step 2: Check for Next.js
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  
  if (!deps['next']) {
    return { error: 'unsupported_framework', framework: null, ...defaults };
  }

  // Step 3: Check for monorepo indicators
  const isMonorepo = !!(
    packageJson.workspaces ||
    (await fileExists(octokit, owner, repo, 'pnpm-workspace.yaml')) ||
    (await fileExists(octokit, owner, repo, 'lerna.json'))
  );
  
  if (isMonorepo) {
    return { error: 'monorepo_detected', isMonorepo: true, ...defaults };
  }

  // Step 4: Detect existing analytics
  const analyticsPackages = [
    'posthog-js', 'posthog-node',
    '@amplitude/analytics-browser',
    'mixpanel-browser',
    '@segment/analytics-next',
    '@vercel/analytics',
    'plausible-tracker',
    '@google-analytics/data', 'ga-4-react',
  ];
  const existingAnalytics = analyticsPackages.filter(pkg => deps[pkg]);

  // Step 5: Detect App Router vs Pages Router
  const appLayoutExists = await fileExists(octokit, owner, repo, 'app/layout.tsx')
    || await fileExists(octokit, owner, repo, 'app/layout.js')
    || await fileExists(octokit, owner, repo, 'src/app/layout.tsx')
    || await fileExists(octokit, owner, repo, 'src/app/layout.js');

  if (appLayoutExists) {
    const entryPoint = await findEntryPoint(octokit, owner, repo, [
      'app/layout.tsx',
      'app/layout.js',
      'src/app/layout.tsx',
      'src/app/layout.js',
    ]);
    return {
      framework: 'nextjs-app',
      entryPoint,
      existingAnalytics,
      isMonorepo: false,
      error: null,
    };
  }

  const pagesAppExists = await fileExists(octokit, owner, repo, 'pages/_app.tsx')
    || await fileExists(octokit, owner, repo, 'pages/_app.js')
    || await fileExists(octokit, owner, repo, 'src/pages/_app.tsx')
    || await fileExists(octokit, owner, repo, 'src/pages/_app.js');

  if (pagesAppExists) {
    const entryPoint = await findEntryPoint(octokit, owner, repo, [
      'pages/_app.tsx',
      'pages/_app.js',
      'src/pages/_app.tsx',
      'src/pages/_app.js',
    ]);
    return {
      framework: 'nextjs-pages',
      entryPoint,
      existingAnalytics,
      isMonorepo: false,
      error: null,
    };
  }

  return {
    framework: null,
    entryPoint: null,
    existingAnalytics,
    isMonorepo: false,
    error: 'entry_point_not_found',
  };
}
```

### 6.2 Error States & Recovery

| Scenario | Detection | User Message | System Action |
|----------|-----------|--------------|---------------|
| **Unsupported framework** | No `next` in package.json | "We don't support [detected framework] yet." | Show waitlist form, set status='unsupported' |
| **Monorepo detected** | `workspaces` in package.json or pnpm-workspace.yaml exists | "Monorepo detected — we don't support this yet." | Show waitlist form, set status='unsupported' |
| **No entry point found** | Next.js detected but no layout/app file | "We couldn't find your app's entry point." | Show retry button, set status='analysis_failed' |
| **GitHub API rate limit** | 403 response with rate limit headers | "We're temporarily rate limited. Try again in X minutes." | Queue for retry, exponential backoff |
| **GitHub API error** | 5xx response | "GitHub is having issues. Please try again." | Queue for retry, set status='analysis_failed' |
| **PR creation failed** | Error from createPullRequest | "We hit a snag creating the PR." | Show retry button, set status='analysis_failed' |
| **Existing analytics warning** | Detected packages in deps | "We detected [tools]. You can still proceed..." | Show warning banner, allow continue |
| **Branch already exists** | 422 error on branch creation | Auto-increment: `add-[productname]-analytics-2` | Retry with new branch name |
| **PR already exists** | 422 error on PR creation | "A PR already exists for this repo." | Link to existing PR, set status='pr_pending' |

### 6.3 Quota Enforcement Logic

```typescript
// FILE: src/lib/quota.ts

const PLAN_LIMITS = {
  free: 10_000,
  pro: 100_000,
  team: 1_000_000,
} as const;

interface QuotaCheck {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  isOverQuota: boolean;
}

async function checkQuota(projectId: string): Promise<QuotaCheck> {
  const project = await getProject(projectId);
  const user = await getUser(project.userId);
  
  const limit = PLAN_LIMITS[user.plan];
  const used = project.eventsThisMonth;
  const remaining = Math.max(0, limit - used);
  const isOverQuota = used >= limit;
  
  return {
    allowed: true, // Always allow ingestion
    limit,
    used,
    remaining,
    isOverQuota,
  };
}

// Events are ALWAYS ingested, but dashboard visibility is gated
// Tinybird query filters based on quota:
// WHERE timestamp <= quota_exceeded_at OR user.plan != 'free'
```

### 6.4 Session Expiry Logic (SDK)

```typescript
// FILE: sdk/src/session.ts

const SESSION_COOKIE_NAME = '[productname]_session';
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

function getOrCreateSession(): string {
  const existing = getCookie(SESSION_COOKIE_NAME);
  
  if (existing) {
    const { sessionId, lastActivity } = JSON.parse(existing);
    const elapsed = Date.now() - lastActivity;
    
    if (elapsed < SESSION_DURATION_MS) {
      // Session still valid, update last activity
      updateSessionActivity(sessionId);
      return sessionId;
    }
    // Session expired, create new one
  }
  
  // Create new session
  const sessionId = crypto.randomUUID();
  setCookie(SESSION_COOKIE_NAME, JSON.stringify({
    sessionId,
    lastActivity: Date.now(),
  }), {
    maxAge: 365 * 24 * 60 * 60, // 1 year (cookie persists, session logic is internal)
    sameSite: 'lax',
    secure: location.protocol === 'https:',
  });
  
  // Track session start event
  trackEvent('session_start');
  
  return sessionId;
}
```

---

## 7. Code Generation Templates

### 7.1 App Router Template

```typescript
// =============================================================================
// GENERATED FILE: components/[productname]-analytics.tsx
// =============================================================================
'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

// [ProductName] analytics - see docs.[productname].com/setup

const PROJECT_ID = '{{PROJECT_ID}}';
const EVENTS_URL = 'https://events.[productname].com/v1/track';

let isInitialized = false;
let sessionId: string | null = null;

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  if (sessionId) return sessionId;
  
  const cookieName = '[productname]_sid';
  const existing = document.cookie
    .split('; ')
    .find(row => row.startsWith(cookieName + '='))
    ?.split('=')[1];
  
  if (existing) {
    sessionId = existing;
    return sessionId;
  }
  
  sessionId = crypto.randomUUID();
  document.cookie = `${cookieName}=${sessionId}; max-age=31536000; path=/; samesite=lax`;
  return sessionId;
}

function trackPageView(path: string) {
  if (typeof window === 'undefined') return;
  
  // Respect Do Not Track
  if (navigator.doNotTrack === '1') return;
  
  const event = {
    project_id: PROJECT_ID,
    session_id: getSessionId(),
    event_type: 'page_view',
    timestamp: new Date().toISOString(),
    url: window.location.href,
    path,
    referrer: document.referrer || null,
    user_agent: navigator.userAgent,
    screen_width: window.innerWidth,
  };
  
  fetch(EVENTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events: [event] }),
    keepalive: true,
  }).catch(() => {
    // Silently fail - analytics should never break the app
  });
}

function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    if (!isInitialized) {
      isInitialized = true;
      // Track initial session start
      fetch(EVENTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: [{
            project_id: PROJECT_ID,
            session_id: getSessionId(),
            event_type: 'session_start',
            timestamp: new Date().toISOString(),
            referrer: document.referrer || null,
            user_agent: navigator.userAgent,
          }],
        }),
        keepalive: true,
      }).catch(() => {});
    }
    
    trackPageView(pathname + (searchParams.toString() ? `?${searchParams}` : ''));
  }, [pathname, searchParams]);
  
  return null;
}

export function ProductNameAnalytics() {
  return (
    <Suspense fallback={null}>
      <AnalyticsTracker />
    </Suspense>
  );
}
```

```typescript
// =============================================================================
// MODIFIED FILE: app/layout.tsx (example diff)
// =============================================================================

// ADD at top of file:
import { ProductNameAnalytics } from '@/components/[productname]-analytics';

// ADD inside <body> tag, typically at the end:
<ProductNameAnalytics />
```

### 7.2 Pages Router Template

```typescript
// =============================================================================
// GENERATED FILE: components/[productname]-analytics.tsx
// =============================================================================
import { useRouter } from 'next/router';
import { useEffect } from 'react';

// [ProductName] analytics - see docs.[productname].com/setup

const PROJECT_ID = '{{PROJECT_ID}}';
const EVENTS_URL = 'https://events.[productname].com/v1/track';

let isInitialized = false;
let sessionId: string | null = null;

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  if (sessionId) return sessionId;
  
  const cookieName = '[productname]_sid';
  const existing = document.cookie
    .split('; ')
    .find(row => row.startsWith(cookieName + '='))
    ?.split('=')[1];
  
  if (existing) {
    sessionId = existing;
    return sessionId;
  }
  
  sessionId = crypto.randomUUID();
  document.cookie = `${cookieName}=${sessionId}; max-age=31536000; path=/; samesite=lax`;
  return sessionId;
}

function trackPageView(path: string) {
  if (typeof window === 'undefined') return;
  if (navigator.doNotTrack === '1') return;
  
  const event = {
    project_id: PROJECT_ID,
    session_id: getSessionId(),
    event_type: 'page_view',
    timestamp: new Date().toISOString(),
    url: window.location.href,
    path,
    referrer: document.referrer || null,
    user_agent: navigator.userAgent,
    screen_width: window.innerWidth,
  };
  
  fetch(EVENTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events: [event] }),
    keepalive: true,
  }).catch(() => {});
}

export function useProductNameAnalytics() {
  const router = useRouter();
  
  useEffect(() => {
    if (!isInitialized) {
      isInitialized = true;
      fetch(EVENTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: [{
            project_id: PROJECT_ID,
            session_id: getSessionId(),
            event_type: 'session_start',
            timestamp: new Date().toISOString(),
            referrer: document.referrer || null,
            user_agent: navigator.userAgent,
          }],
        }),
        keepalive: true,
      }).catch(() => {});
    }
    
    // Track initial page view
    trackPageView(router.asPath);
    
    // Track route changes
    const handleRouteChange = (url: string) => {
      trackPageView(url);
    };
    
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router]);
}
```

```typescript
// =============================================================================
// MODIFIED FILE: pages/_app.tsx (example diff)
// =============================================================================

// ADD at top of file:
import { useProductNameAnalytics } from '@/components/[productname]-analytics';

// ADD inside App component, before return:
useProductNameAnalytics();
```

### 7.3 PR Generation Logic

```typescript
// FILE: src/lib/pr-generator.ts

interface PRGenerationResult {
  success: boolean;
  prNumber?: number;
  prUrl?: string;
  error?: string;
}

async function generatePR(
  octokit: Octokit,
  project: Project,
  detection: FrameworkDetectionResult
): Promise<PRGenerationResult> {
  const [owner, repo] = project.githubRepoFullName.split('/');
  
  // 1. Get default branch
  const { data: repoData } = await octokit.repos.get({ owner, repo });
  const defaultBranch = repoData.default_branch;
  
  // 2. Get latest commit SHA
  const { data: ref } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${defaultBranch}`,
  });
  const baseSha = ref.object.sha;
  
  // 3. Create branch
  const branchName = `add-[productname]-analytics`;
  try {
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    });
  } catch (error: any) {
    if (error.status === 422) {
      // Branch exists, try with suffix
      // Implementation: increment suffix until unique
    }
    throw error;
  }
  
  // 4. Generate files based on framework
  const files = generateFilesForFramework(detection.framework, project.id);
  
  // 5. Create/update files
  for (const file of files) {
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: file.path,
      message: `Add ${file.path}`,
      content: Buffer.from(file.content).toString('base64'),
      branch: branchName,
    });
  }
  
  // 6. Update existing layout file
  const layoutUpdate = generateLayoutUpdate(detection);
  const { data: existingFile } = await octokit.repos.getContent({
    owner,
    repo,
    path: detection.entryPoint!,
    ref: defaultBranch,
  });
  
  const updatedContent = insertAnalyticsCode(
    Buffer.from((existingFile as any).content, 'base64').toString(),
    detection.framework
  );
  
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: detection.entryPoint!,
    message: `Add [ProductName] analytics to ${detection.entryPoint}`,
    content: Buffer.from(updatedContent).toString('base64'),
    branch: branchName,
    sha: (existingFile as any).sha,
  });
  
  // 7. Create PR
  const { data: pr } = await octokit.pulls.create({
    owner,
    repo,
    title: 'Add [ProductName] analytics',
    head: branchName,
    base: defaultBranch,
    body: generatePRDescription(project, detection),
  });
  
  return {
    success: true,
    prNumber: pr.number,
    prUrl: pr.html_url,
  };
}

function generatePRDescription(
  project: Project,
  detection: FrameworkDetectionResult
): string {
  return `This PR adds [ProductName] for automatic page view tracking.

## Changes
- Added \`@[productname]/sdk\` to package.json
- Added analytics component in \`components/[productname]-analytics.tsx\`
- Added initialization in \`${detection.entryPoint}\`
- Added automatic page view tracking on route changes

## What happens next
1. Review and merge this PR
2. Deploy via your normal process
3. Visit https://app.[productname].com/projects/${project.id} to see your analytics

## Questions?
Reply to this PR or email support@[productname].com`;
}
```

---

## 8. Implementation Sequence

### Phase 1: Foundation (Week 1-2)

#### 1.1 Project Setup
- [ ] Initialize Next.js 14 project with App Router
- [ ] Configure TypeScript, ESLint, Prettier
- [ ] Set up Tailwind CSS
- [ ] Configure Vercel project with environment variables
- [ ] Set up Neon database and run migrations
- [ ] Configure Tinybird workspace and data sources

#### 1.2 Authentication System
- [ ] Implement magic link request endpoint (`POST /api/auth/magic-link`)
- [ ] Configure Resend email templates
- [ ] Implement token verification endpoint (`GET /api/auth/verify`)
- [ ] Implement session management (create, validate, destroy)
- [ ] Add auth middleware for protected routes
- [ ] Create login page UI

#### 1.3 GitHub App Setup
- [ ] Create GitHub App in GitHub Developer Settings
- [ ] Configure permissions: Contents (R/W), Pull Requests (R/W), Metadata (R)
- [ ] Set up webhook URL and secret
- [ ] Implement GitHub App installation callback
- [ ] Implement installation token refresh logic
- [ ] Store tokens securely in database

### Phase 2: Core Analysis Engine (Week 2-3)

#### 2.1 Framework Detection
- [ ] Implement `package.json` fetching via GitHub Contents API
- [ ] Implement Next.js version detection
- [ ] Implement App Router vs Pages Router detection
- [ ] Implement existing analytics package detection
- [ ] Implement monorepo detection
- [ ] Add comprehensive error handling

#### 2.2 Code Generation
- [ ] Create App Router analytics component template
- [ ] Create Pages Router analytics component/hook template
- [ ] Implement layout file modification logic
- [ ] Add package.json modification for SDK dependency
- [ ] Test with various file structures (TS/JS, src/, no src/)

#### 2.3 PR Generation
- [ ] Implement branch creation
- [ ] Implement file creation/update via GitHub API
- [ ] Implement PR creation with description template
- [ ] Handle edge cases (existing branch, existing PR)
- [ ] Implement retry logic with exponential backoff

### Phase 3: SDK Development (Week 3-4)

#### 3.1 Core SDK
- [ ] Set up SDK package with tsup build
- [ ] Implement session ID generation and cookie management
- [ ] Implement page view tracking
- [ ] Implement session start tracking
- [ ] Implement DNT respect
- [ ] Implement `identify()` method

#### 3.2 React Integration
- [ ] Create App Router component with `usePathname`/`useSearchParams`
- [ ] Create Pages Router hook with `router.events`
- [ ] Add Suspense boundary for App Router
- [ ] Test with Next.js 13, 14, 15

#### 3.3 Publish SDK
- [ ] Set up npm package publishing
- [ ] Create README with usage instructions
- [ ] Publish initial version

### Phase 4: Event Ingestion (Week 4)

#### 4.1 Ingestion Endpoint
- [ ] Create `events.[productname].com` subdomain in Vercel
- [ ] Implement `POST /v1/track` endpoint
- [ ] Configure CORS for all origins
- [ ] Validate event payload with Zod
- [ ] Forward events to Tinybird
- [ ] Handle batch events (1-10 per request)

#### 4.2 Tinybird Setup
- [ ] Create events data source
- [ ] Create daily aggregates materialized view
- [ ] Create API endpoints for queries:
  - Recent events (live feed)
  - Page views over time
  - Top pages
  - Top referrers
  - Session counts

### Phase 5: Dashboard (Week 5-6)

#### 5.1 Project Management
- [ ] Create project list page
- [ ] Create project detail page
- [ ] Implement status polling during analysis
- [ ] Create "Regenerate PR" functionality
- [ ] Show onboarding checklist

#### 5.2 Analytics Views
- [ ] Implement live feed view with 5s polling
- [ ] Implement overview page:
  - Page views chart (Recharts)
  - Top pages list
  - Top referrers list
- [ ] Implement sessions view:
  - Sessions over time
  - New vs returning
- [ ] Implement period selector (24h, 7d, 30d)

#### 5.3 Quota & Billing
- [ ] Implement quota tracking
- [ ] Show quota usage in dashboard
- [ ] Implement over-quota banner
- [ ] (Optional) Stripe integration for upgrades

### Phase 6: Polish & Launch (Week 6)

#### 6.1 Marketing Site
- [ ] Create landing page
- [ ] Create pricing page
- [ ] Create docs/setup guide
- [ ] Add "Add to GitHub" CTA button

#### 6.2 Testing & QA
- [ ] Test full flow: install → analyze → PR → merge → events
- [ ] Test error states and recovery
- [ ] Test with various Next.js project structures
- [ ] Load test event ingestion endpoint
- [ ] Security review (auth, tokens, CORS)

#### 6.3 Deployment
- [ ] Configure production domains
- [ ] Set up monitoring/alerting
- [ ] Deploy to production
- [ ] Verify all integrations work

---

## 9. File Structure

```
[productname]/
├── apps/
│   └── web/                          # Next.js application
│       ├── app/
│       │   ├── (marketing)/          # Marketing site (SSG)
│       │   │   ├── page.tsx          # Landing page
│       │   │   ├── pricing/
│       │   │   └── docs/
│       │   ├── (dashboard)/          # Dashboard (SSR, auth required)
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx          # Redirect to /projects
│       │   │   └── projects/
│       │   │       ├── page.tsx      # Project list
│       │   │       └── [id]/
│       │   │           ├── page.tsx  # Project overview
│       │   │           ├── live/     # Live feed
│       │   │           └── sessions/ # Sessions view
│       │   ├── api/
│       │   │   ├── auth/
│       │   │   │   ├── magic-link/route.ts
│       │   │   │   ├── verify/route.ts
│       │   │   │   └── logout/route.ts
│       │   │   ├── projects/
│       │   │   │   ├── route.ts
│       │   │   │   └── [id]/
│       │   │   │       ├── route.ts
│       │   │   │       ├── regenerate/route.ts
│       │   │   │       └── analytics/
│       │   │   │           ├── live/route.ts
│       │   │   │           ├── overview/route.ts
│       │   │   │           └── sessions/route.ts
│       │   │   └── webhooks/
│       │   │       └── github/route.ts
│       │   ├── login/
│       │   │   └── page.tsx
│       │   ├── layout.tsx
│       │   └── globals.css
│       ├── components/
│       │   ├── ui/                   # Shared UI components
│       │   ├── dashboard/            # Dashboard-specific components
│       │   └── marketing/            # Marketing-specific components
│       ├── lib/
│       │   ├── db/
│       │   │   ├── schema.ts         # Drizzle schema
│       │   │   ├── client.ts         # Database client
│       │   │   └── queries/          # Query functions
│       │   ├── tinybird/
│       │   │   ├── client.ts
│       │   │   └── queries.ts
│       │   ├── github/
│       │   │   ├── app.ts            # GitHub App client
│       │   │   ├── detection.ts      # Framework detection
│       │   │   └── pr-generator.ts   # PR generation
│       │   ├── auth/
│       │   │   ├── session.ts
│       │   │   └── magic-link.ts
│       │   ├── email/
│       │   │   └── templates.tsx
│       │   └── utils.ts
│       ├── types/
│       │   ├── database.ts
│       │   ├── events.ts
│       │   └── github.ts
│       ├── drizzle/
│       │   └── migrations/
│       ├── public/
│       ├── next.config.js
│       ├── tailwind.config.js
│       ├── tsconfig.json
│       └── package.json
│
├── apps/
│   └── events/                       # Event ingestion (separate Vercel project)
│       ├── app/
│       │   └── v1/
│       │       └── track/route.ts
│       ├── lib/
│       │   └── tinybird.ts
│       ├── next.config.js
│       └── package.json
│
├── packages/
│   └── sdk/                          # NPM package
│       ├── src/
│       │   ├── index.ts
│       │   ├── session.ts
│       │   ├── tracker.ts
│       │   └── react/
│       │       ├── app-router.tsx
│       │       └── pages-router.tsx
│       ├── tsup.config.ts
│       ├── package.json
│       └── README.md
│
├── .github/
│   └── workflows/
│       └── deploy.yml
│
├── package.json                      # Workspace root
├── pnpm-workspace.yaml
└── README.md
```

---

## 10. Security Considerations

### 10.1 Authentication
- Magic link tokens: 64-character random string, expires in 15 minutes, single-use
- Session cookies: HTTP-only, Secure, SameSite=Lax, 30-day expiry
- Session IDs: UUIDv4, stored in database with user association

### 10.2 GitHub Integration
- GitHub App private key: Store in environment variable, never log
- Installation tokens: Short-lived (1 hour), refresh automatically
- Webhook signature: Verify using HMAC-SHA256 with webhook secret
- Permissions: Request minimum necessary (Contents, PRs, Metadata)

### 10.3 Event Ingestion
- No authentication required (public endpoint)
- Validate project_id exists before accepting events
- Rate limiting deferred to v2 (quota system handles abuse)
- CORS: Allow all origins (events come from customer domains)

### 10.4 Data Privacy
- No PII collected by default
- Session IDs are anonymous UUIDs
- DNT respected by default
- First-party cookies only (no cross-site tracking)
- 90-day data retention (auto-delete via Tinybird TTL)

---

## 11. Monitoring & Observability

### 11.1 Key Metrics to Track

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| GitHub App installs | Database count | N/A (growth metric) |
| PRs generated | Database count | N/A (growth metric) |
| PRs merged | Webhook events | N/A (growth metric) |
| Event ingestion rate | Tinybird | > 10,000/sec (scale concern) |
| API error rate | Vercel logs | > 1% |
| Webhook processing time | Vercel logs | > 30s average |
| Database connections | Neon dashboard | > 80% pool |

### 11.2 Logging Strategy

```typescript
// Structured logging for key events
console.log(JSON.stringify({
  event: 'pr_generated',
  projectId: project.id,
  framework: detection.framework,
  duration_ms: Date.now() - startTime,
  timestamp: new Date().toISOString(),
}));
```

### 11.3 Error Tracking
- Use Vercel's built-in error tracking
- Consider adding Sentry for detailed stack traces in v2

---

## 12. Future Considerations (Out of Scope for MVP)

- Additional frameworks: Remix, SvelteKit, Astro, Vue/Nuxt
- Custom events UI in dashboard
- Funnels and retention curves
- GitLab and Bitbucket support
- Monorepo support
- Data export (CSV, API)
- Self-hosted option
- Team collaboration features
- Advanced filtering in dashboard
- Mobile SDK
- Server-side tracking

---

## Appendix A: Tinybird Queries

```sql
-- =============================================================================
-- Live Feed Query
-- File: pipes/live_feed.pipe
-- =============================================================================
NODE live_events
SQL >
    SELECT
        project_id,
        event_type,
        path,
        referrer,
        timestamp,
        formatReadableTimeDelta(now() - timestamp) as relative_time
    FROM events
    WHERE project_id = {{String(project_id, '')}}
    AND timestamp > {{DateTime(since, '2024-01-01 00:00:00')}}
    ORDER BY timestamp DESC
    LIMIT {{Int32(limit, 20)}}

-- =============================================================================
-- Page Views Over Time
-- File: pipes/page_views_timeseries.pipe
-- =============================================================================
NODE page_views
SQL >
    SELECT
        toDate(timestamp) as date,
        count() as count
    FROM events
    WHERE project_id = {{String(project_id, '')}}
    AND event_type = 'page_view'
    AND timestamp >= {{DateTime(start_date)}}
    AND timestamp < {{DateTime(end_date)}}
    GROUP BY date
    ORDER BY date

-- =============================================================================
-- Top Pages
-- File: pipes/top_pages.pipe
-- =============================================================================
NODE top_pages
SQL >
    SELECT
        path,
        count() as views,
        round(count() * 100.0 / sum(count()) OVER (), 2) as percentage
    FROM events
    WHERE project_id = {{String(project_id, '')}}
    AND event_type = 'page_view'
    AND timestamp >= {{DateTime(start_date)}}
    AND timestamp < {{DateTime(end_date)}}
    GROUP BY path
    ORDER BY views DESC
    LIMIT 10

-- =============================================================================
-- Top Referrers
-- File: pipes/top_referrers.pipe
-- =============================================================================
NODE top_referrers
SQL >
    SELECT
        if(referrer = '', 'Direct', 
           extractURLHost(referrer)) as referrer_host,
        count() as count,
        round(count() * 100.0 / sum(count()) OVER (), 2) as percentage
    FROM events
    WHERE project_id = {{String(project_id, '')}}
    AND event_type = 'page_view'
    AND timestamp >= {{DateTime(start_date)}}
    AND timestamp < {{DateTime(end_date)}}
    GROUP BY referrer_host
    ORDER BY count DESC
    LIMIT 10

-- =============================================================================
-- Session Stats
-- File: pipes/session_stats.pipe
-- =============================================================================
NODE sessions
SQL >
    SELECT
        toDate(timestamp) as date,
        uniqExact(session_id) as total_sessions,
        uniqExactIf(session_id, event_type = 'session_start') as new_sessions
    FROM events
    WHERE project_id = {{String(project_id, '')}}
    AND timestamp >= {{DateTime(start_date)}}
    AND timestamp < {{DateTime(end_date)}}
    GROUP BY date
    ORDER BY date
```

---

## Appendix B: Email Templates

```tsx
// FILE: lib/email/templates.tsx

import { Html, Button, Text, Container } from '@react-email/components';

interface MagicLinkEmailProps {
  loginUrl: string;
}

export function MagicLinkEmail({ loginUrl }: MagicLinkEmailProps) {
  return (
    <Html>
      <Container>
        <Text>Click the button below to log in to [ProductName]:</Text>
        <Button href={loginUrl}>
          Log in to [ProductName]
        </Button>
        <Text>This link expires in 15 minutes.</Text>
        <Text>If you didn't request this email, you can safely ignore it.</Text>
      </Container>
    </Html>
  );
}
```

---

*End of Technical Specification*
