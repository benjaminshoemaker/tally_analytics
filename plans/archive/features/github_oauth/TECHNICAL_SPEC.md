# Technical Spec: GitHub OAuth Authentication

> Implementation guide for replacing magic link authentication with GitHub OAuth.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           User Browser                               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │ Marketing    │ │ Login Page   │ │ Dashboard    │
            │ Pages        │ │ /login       │ │ /projects/*  │
            └──────┬───────┘ └──────┬───────┘ └──────────────┘
                   │                │                   ▲
                   │   "Sign in with GitHub"            │
                   ▼                ▼                   │
            ┌─────────────────────────────────────┐     │
            │   GET /api/auth/github              │     │
            │   - Generate state                  │     │
            │   - Set state cookie                │     │
            │   - Redirect to GitHub              │     │
            └─────────────────┬───────────────────┘     │
                              ▼                         │
            ┌─────────────────────────────────────┐     │
            │   GitHub OAuth                      │     │
            │   - User authorizes                 │     │
            │   - Redirect with code + state      │     │
            └─────────────────┬───────────────────┘     │
                              ▼                         │
            ┌─────────────────────────────────────┐     │
            │   GET /api/auth/github/callback     │     │
            │   - Verify state                    │     │
            │   - Exchange code for token         │     │
            │   - Fetch GitHub user               │     │
            │   - Find/create Tally user          │     │
            │   - Create session                  │     │
            │   - Set session cookie              │     │
            │   - Redirect to /projects ──────────┼─────┘
            └─────────────────────────────────────┘
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| OAuth redirect route | `app/api/auth/github/route.ts` | Generate state, redirect to GitHub |
| OAuth callback route | `app/api/auth/github/callback/route.ts` | Handle callback, create session |
| GitHub OAuth client | `lib/auth/github-oauth.ts` | Token exchange, user fetch helpers |
| Login page | `app/login/page.tsx` | "Sign in with GitHub" UI |
| Header dropdown | `components/dashboard/header.tsx` | Avatar + username + logout |
| DB migration | `drizzle/migrations/0003_github_oauth.sql` | Add columns to users table |
| User linking script | `scripts/link-github-users.ts` | One-time migration for existing users |

---

## Data Models

### Users Table — Schema Changes

```typescript
// lib/db/schema.ts — updated users table

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    
    // NEW: GitHub OAuth fields
    githubUserId: bigint("github_user_id", { mode: "bigint" }).unique(),
    githubUsername: varchar("github_username", { length: 39 }),
    githubAvatarUrl: text("github_avatar_url"),
    
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),

    // Stripe fields unchanged
    plan: varchar("plan", { length: 20 }).notNull().default("free"),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
    stripeSubscriptionStatus: varchar("stripe_subscription_status", { length: 32 }),
    stripePriceId: varchar("stripe_price_id", { length: 255 }),
    stripeCurrentPeriodEnd: timestamp("stripe_current_period_end", { withTimezone: true }),
    stripeCancelAtPeriodEnd: boolean("stripe_cancel_at_period_end"),
    stripeLastWebhookEventId: varchar("stripe_last_webhook_event_id", { length: 255 }),
    stripeLastWebhookEventCreated: bigint("stripe_last_webhook_event_created", { mode: "bigint" }),
  },
  (table) => [
    // Remove email uniqueness constraint — github_user_id is now the unique identifier
    // Email can change if user updates it on GitHub
    check("users_plan_check", sql`${table.plan} in ('free','pro','team')`),
    index("idx_users_email").on(table.email),
    index("idx_users_github_user_id").on(table.githubUserId),
    index("idx_users_stripe_subscription_id").on(table.stripeSubscriptionId),
  ],
);
```

### Migration: Add GitHub Columns

```sql
-- drizzle/migrations/0003_github_oauth.sql

-- Add GitHub OAuth columns
ALTER TABLE users ADD COLUMN github_user_id BIGINT UNIQUE;
ALTER TABLE users ADD COLUMN github_username VARCHAR(39);
ALTER TABLE users ADD COLUMN github_avatar_url TEXT;

-- Create index for lookups
CREATE INDEX idx_users_github_user_id ON users(github_user_id);

-- Remove unique constraint on email (github_user_id is now primary identity)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_unique;
```

### Migration: Drop Magic Links (Separate, Run Later)

```sql
-- drizzle/migrations/0004_drop_magic_links.sql

DROP TABLE IF EXISTS magic_links;
```

### User Linking Script

```typescript
// scripts/link-github-users.ts

import { db } from "../apps/web/lib/db/client";
import { users } from "../apps/web/lib/db/schema";
import { eq } from "drizzle-orm";

const USERS_TO_LINK = [
  { email: "emriedel@...", githubUserId: 8659979n, githubUsername: "emriedel" },
  { email: "ben@...", githubUserId: 224462439n, githubUsername: "benjaminshoemaker" },
];

async function main() {
  for (const user of USERS_TO_LINK) {
    const result = await db
      .update(users)
      .set({
        githubUserId: user.githubUserId,
        githubUsername: user.githubUsername,
      })
      .where(eq(users.email, user.email))
      .returning({ id: users.id, email: users.email });

    if (result.length === 0) {
      console.error(`User not found: ${user.email}`);
    } else {
      console.log(`Linked ${user.email} → ${user.githubUsername} (${user.githubUserId})`);
    }
  }
}

main().catch(console.error);
```

---

## API/Interface Contracts

### Environment Variables (New)

```bash
# .env.example — add these
GITHUB_OAUTH_CLIENT_ID=Ov23li...
GITHUB_OAUTH_CLIENT_SECRET=...
```

### GET /api/auth/github

**Purpose:** Initiate OAuth flow by redirecting to GitHub.

**Request:** None (browser navigation)

**Response:** 302 redirect to GitHub

**Implementation:**

```typescript
// app/api/auth/github/route.ts

import { NextResponse } from "next/server";
import { generateOAuthState, buildGitHubAuthUrl } from "../../../lib/auth/github-oauth";

export async function GET(request: Request): Promise<Response> {
  const state = generateOAuthState();
  const url = buildGitHubAuthUrl(state);
  
  const response = NextResponse.redirect(url);
  
  // Set state cookie for CSRF verification
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });
  
  return response;
}
```

### GET /api/auth/github/callback

**Purpose:** Handle OAuth callback, create/find user, establish session.

**Request:**
```
GET /api/auth/github/callback?code=xxx&state=yyy
```

**Response:** 302 redirect to `/projects` or `/login?error=...`

**Error Codes:**
| Error | Meaning |
|-------|---------|
| `oauth_cancelled` | User denied authorization on GitHub |
| `invalid_state` | State mismatch (possible CSRF) |
| `github_error` | GitHub API returned an error |

**Implementation:**

```typescript
// app/api/auth/github/callback/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  exchangeCodeForToken,
  fetchGitHubUser,
  fetchGitHubUserEmail,
} from "../../../../lib/auth/github-oauth";
import { findOrCreateUserByGitHub } from "../../../../lib/db/queries/users";
import { createSession } from "../../../../lib/auth/session";
import { buildSessionCookie } from "../../../../lib/auth/cookies";

function redirectToLogin(request: Request, error: string): Response {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // User cancelled on GitHub
  if (error === "access_denied") {
    return redirectToLogin(request, "oauth_cancelled");
  }

  if (!code || !state) {
    return redirectToLogin(request, "invalid_state");
  }

  // Verify state matches cookie
  const cookieStore = await cookies();
  const storedState = cookieStore.get("oauth_state")?.value;
  
  if (!storedState || storedState !== state) {
    return redirectToLogin(request, "invalid_state");
  }

  try {
    // Exchange code for access token
    const accessToken = await exchangeCodeForToken(code);

    // Fetch user info from GitHub
    const githubUser = await fetchGitHubUser(accessToken);
    const email = await fetchGitHubUserEmail(accessToken);

    // Find or create Tally user
    const user = await findOrCreateUserByGitHub({
      githubUserId: BigInt(githubUser.id),
      githubUsername: githubUser.login,
      githubAvatarUrl: githubUser.avatar_url,
      email,
    });

    // Create session
    const session = await createSession(user.id);

    // Build response with session cookie
    const response = NextResponse.redirect(new URL("/projects", request.url));
    response.cookies.set(buildSessionCookie(session.id));
    
    // Clear OAuth state cookie
    response.cookies.delete("oauth_state");
    
    return response;
  } catch (err) {
    console.error("GitHub OAuth callback error:", err);
    return redirectToLogin(request, "github_error");
  }
}
```

### GitHub OAuth Helper Functions

```typescript
// lib/auth/github-oauth.ts

import crypto from "crypto";

const GITHUB_OAUTH_CLIENT_ID = process.env.GITHUB_OAUTH_CLIENT_ID!;
const GITHUB_OAUTH_CLIENT_SECRET = process.env.GITHUB_OAUTH_CLIENT_SECRET!;

export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function buildGitHubAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GITHUB_OAUTH_CLIENT_ID,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`,
    scope: "read:user user:email",
    state,
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: GITHUB_OAUTH_CLIENT_ID,
      client_secret: GITHUB_OAUTH_CLIENT_SECRET,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  return data.access_token;
}

export type GitHubUser = {
  id: number;
  login: string;
  avatar_url: string;
  email: string | null;
};

export async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub user fetch failed: ${response.status}`);
  }

  return response.json();
}

type GitHubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

export async function fetchGitHubUserEmail(accessToken: string): Promise<string> {
  const response = await fetch("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub email fetch failed: ${response.status}`);
  }

  const emails: GitHubEmail[] = await response.json();
  
  // Find primary verified email
  const primary = emails.find((e) => e.primary && e.verified);
  if (primary) return primary.email;
  
  // Fallback to any verified email
  const verified = emails.find((e) => e.verified);
  if (verified) return verified.email;
  
  // Fallback to first email
  if (emails.length > 0) return emails[0].email;
  
  throw new Error("No email found on GitHub account");
}
```

### User Database Query

```typescript
// lib/db/queries/users.ts (new file)

import { eq } from "drizzle-orm";
import { db } from "../client";
import { users } from "../schema";

export type FindOrCreateUserByGitHubParams = {
  githubUserId: bigint;
  githubUsername: string;
  githubAvatarUrl: string;
  email: string;
};

export async function findOrCreateUserByGitHub(
  params: FindOrCreateUserByGitHubParams
): Promise<{ id: string }> {
  // Try to find existing user by GitHub ID
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.githubUserId, params.githubUserId));

  if (existing.length > 0) {
    // Update user info (username/avatar/email may have changed)
    await db
      .update(users)
      .set({
        githubUsername: params.githubUsername,
        githubAvatarUrl: params.githubAvatarUrl,
        email: params.email,
        updatedAt: new Date(),
      })
      .where(eq(users.githubUserId, params.githubUserId));

    return { id: existing[0].id };
  }

  // Create new user
  const created = await db
    .insert(users)
    .values({
      githubUserId: params.githubUserId,
      githubUsername: params.githubUsername,
      githubAvatarUrl: params.githubAvatarUrl,
      email: params.email,
    })
    .returning({ id: users.id });

  if (created.length === 0) {
    throw new Error("Failed to create user");
  }

  return { id: created[0].id };
}

export async function getUserById(userId: string): Promise<{
  id: string;
  email: string;
  githubUsername: string | null;
  githubAvatarUrl: string | null;
} | null> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      githubUsername: users.githubUsername,
      githubAvatarUrl: users.githubAvatarUrl,
    })
    .from(users)
    .where(eq(users.id, userId));

  return rows[0] ?? null;
}
```

---

## UI Components

### Login Page

```tsx
// app/login/page.tsx

"use client";

import React from "react";
import { useSearchParams } from "next/navigation";

function LogoMark() {
  return (
    <div className="flex size-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7">
        <path
          fill="currentColor"
          d="M3 3h18v18H3V3zm4 14h2V9H7v8zm4 0h2V5h-2v12zm4 0h2v-6h-2v6z"
        />
      </svg>
    </div>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

const ERROR_MESSAGES: Record<string, string> = {
  oauth_cancelled: "GitHub authorization was cancelled. Please try again.",
  invalid_state: "Invalid authorization state. Please try again.",
  github_error: "Unable to connect to GitHub. Please try again.",
};

export default function LoginPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const errorMessage = error ? ERROR_MESSAGES[error] ?? "An error occurred." : null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-warm-50">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 size-96 rounded-full bg-brand-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 size-96 rounded-full bg-brand-400/5 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-radial from-brand-500/3 to-transparent" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-8 px-6 py-16">
        <header className="flex flex-col items-center gap-4 text-center opacity-0 animate-fade-in">
          <a href="/" className="transition-transform hover:scale-105">
            <LogoMark />
          </a>
          <div>
            <h1 className="font-display text-3xl tracking-tight text-warm-900">Welcome to Tally</h1>
            <p className="mt-2 text-sm text-warm-500">
              Sign in with your GitHub account to continue
            </p>
          </div>
        </header>

        <div
          className="flex flex-col gap-5 rounded-xl border border-warm-200 bg-white p-6 shadow-warm-lg opacity-0 animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          {errorMessage && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700"
            >
              {errorMessage}
            </p>
          )}

          <a
            href="/api/auth/github"
            className="group flex h-11 items-center justify-center gap-3 rounded-lg bg-warm-900 px-4 text-sm font-medium text-white shadow-warm transition-all hover:bg-warm-800 hover:shadow-warm-md"
          >
            <GitHubIcon className="size-5" />
            Sign in with GitHub
          </a>

          <p className="text-center text-xs text-warm-500">
            By signing in, you agree to our{" "}
            <a href="/terms" className="underline hover:text-warm-700">Terms</a>
            {" "}and{" "}
            <a href="/privacy" className="underline hover:text-warm-700">Privacy Policy</a>
          </p>
        </div>
      </div>
    </main>
  );
}
```

### Dashboard Header with Dropdown

```tsx
// components/dashboard/header.tsx

"use client";

import React, { useState, useRef, useEffect } from "react";

type UserInfo = {
  username: string;
  avatarUrl: string | null;
};

function UserDropdown({ user }: { user: UserInfo }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-warm-200 bg-white px-2 py-1.5 text-sm font-medium text-warm-700 shadow-sm transition-all hover:border-warm-300 hover:bg-warm-50"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="size-6 rounded-full"
          />
        ) : (
          <div className="flex size-6 items-center justify-center rounded-full bg-warm-200 text-xs text-warm-600">
            {user.username.charAt(0).toUpperCase()}
          </div>
        )}
        <svg
          className={`size-4 text-warm-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          viewBox="0 0 16 16"
          fill="none"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-warm-200 bg-white py-1 shadow-warm-lg">
          <div className="border-b border-warm-100 px-3 py-2">
            <p className="text-sm font-medium text-warm-900">{user.username}</p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-warm-600 hover:bg-warm-50 hover:text-warm-900"
            >
              <svg className="size-4" viewBox="0 0 16 16" fill="none">
                <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function DashboardHeader({ user }: { user?: UserInfo }) {
  return (
    <header className="flex items-center justify-between border-b border-warm-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile logo */}
        <a href="/" className="flex items-center gap-2 md:hidden">
          <div className="flex size-7 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
              <path
                fill="currentColor"
                d="M3 3h18v18H3V3zm4 14h2V9H7v8zm4 0h2V5h-2v12zm4 0h2v-6h-2v6z"
              />
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight text-warm-900">Tally</span>
        </a>
      </div>

      {user ? (
        <UserDropdown user={user} />
      ) : (
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="group flex items-center gap-2 rounded-lg border border-warm-200 bg-white px-3 py-1.5 text-sm font-medium text-warm-700 shadow-sm transition-all hover:border-warm-300 hover:bg-warm-50 hover:text-warm-900"
          >
            <svg className="size-4 text-warm-400 transition-colors group-hover:text-warm-600" viewBox="0 0 16 16" fill="none">
              <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Log out
          </button>
        </form>
      )}
    </header>
  );
}
```

### Dashboard Layout Update

```tsx
// app/(dashboard)/layout.tsx — update to pass user info to header

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import DashboardHeader from "../../components/dashboard/header";
import Sidebar from "../../components/dashboard/sidebar";
import MobileTabBar from "../../components/dashboard/mobile-tab-bar";
import { getUserFromSession } from "../../lib/auth/get-user";
import { getUserById } from "../../lib/db/queries/users";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await getUserFromSession();
  if (!sessionUser) {
    redirect("/login");
  }

  const user = await getUserById(sessionUser.id);
  const userInfo = user ? {
    username: user.githubUsername ?? user.email,
    avatarUrl: user.githubAvatarUrl,
  } : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-warm-50 md:flex-row">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <DashboardHeader user={userInfo} />
        <main className="flex-1 overflow-auto p-4 pb-20 sm:p-6 md:pb-6">{children}</main>
      </div>
      <MobileTabBar />
    </div>
  );
}
```

---

## Marketing CTA Updates

Update all instances linking directly to GitHub App:

### Files to Update

| File | Change |
|------|--------|
| `app/(marketing)/page.tsx` | Hero CTA → `/api/auth/github` |
| `app/(marketing)/pricing/page.tsx` | "Get Started" → `/api/auth/github` |
| `app/(marketing)/docs/setup/page.tsx` | Install link → `/api/auth/github` |
| `components/marketing/navbar.tsx` | "Get Started" → `/api/auth/github` |
| `components/marketing/hero.tsx` | CTA → `/api/auth/github` |

### Example Change

```tsx
// Before
<a href="https://github.com/apps/tally-analytics-agent">
  Install GitHub App
</a>

// After
<a href="/api/auth/github">
  Sign in with GitHub
</a>
```

**Note:** The `/projects` empty state **keeps** its "Install GitHub App" link to `github.com/apps/tally-analytics-agent` — this is correct because users reaching that page are already authenticated.

---

## Files to Delete

After migration is complete and verified:

| File | Reason |
|------|--------|
| `app/api/auth/magic-link/route.ts` | Replaced by GitHub OAuth |
| `app/api/auth/verify/route.ts` | Replaced by GitHub OAuth callback |
| `lib/auth/magic-link.ts` | No longer needed |
| `lib/email/templates.tsx` | Only contains magic link template |
| `lib/email/send.ts` | Only used for magic links |
| `tests/magic-link*.ts` | All magic link tests |
| `tests/verify-api.test.ts` | Verify route test |
| `tests/email-*.test.ts` | Email tests |
| `tests/login-page.test.ts` | Needs rewrite for new login page |

**Keep:**
- `lib/auth/session.ts` — still used
- `lib/auth/cookies.ts` — still used
- `lib/auth/get-user.ts` — still used

---

## Testing Strategy

### Unit Tests (Vitest + MSW)

```typescript
// tests/github-oauth.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateOAuthState, buildGitHubAuthUrl, exchangeCodeForToken, fetchGitHubUser } from "../lib/auth/github-oauth";

describe("GitHub OAuth", () => {
  describe("generateOAuthState", () => {
    it("returns a 64-character hex string", () => {
      const state = generateOAuthState();
      expect(state).toMatch(/^[a-f0-9]{64}$/);
    });

    it("generates unique values", () => {
      const state1 = generateOAuthState();
      const state2 = generateOAuthState();
      expect(state1).not.toBe(state2);
    });
  });

  describe("buildGitHubAuthUrl", () => {
    it("builds correct authorization URL", () => {
      const state = "test-state";
      const url = buildGitHubAuthUrl(state);
      
      expect(url).toContain("https://github.com/login/oauth/authorize");
      expect(url).toContain("client_id=");
      expect(url).toContain("state=test-state");
      expect(url).toContain("scope=read%3Auser+user%3Aemail");
    });
  });

  describe("exchangeCodeForToken", () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it("exchanges code for access token", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ access_token: "gho_test_token" }),
      });

      const token = await exchangeCodeForToken("test-code");
      expect(token).toBe("gho_test_token");
    });

    it("throws on GitHub error response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ error: "bad_verification_code" }),
      });

      await expect(exchangeCodeForToken("invalid-code")).rejects.toThrow();
    });
  });

  describe("fetchGitHubUser", () => {
    it("returns user data", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 12345,
          login: "testuser",
          avatar_url: "https://github.com/avatar.png",
        }),
      });

      const user = await fetchGitHubUser("test-token");
      expect(user.id).toBe(12345);
      expect(user.login).toBe("testuser");
    });
  });
});
```

```typescript
// tests/github-oauth-callback.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../app/api/auth/github/callback/route";

// Mock dependencies
vi.mock("../lib/auth/github-oauth", () => ({
  exchangeCodeForToken: vi.fn(),
  fetchGitHubUser: vi.fn(),
  fetchGitHubUserEmail: vi.fn(),
}));

vi.mock("../lib/db/queries/users", () => ({
  findOrCreateUserByGitHub: vi.fn(),
}));

vi.mock("../lib/auth/session", () => ({
  createSession: vi.fn(),
}));

describe("GET /api/auth/github/callback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("redirects to login with error if code is missing", async () => {
    const request = new Request("http://localhost/api/auth/github/callback?state=abc");
    const response = await GET(request);
    
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("/login?error=invalid_state");
  });

  it("redirects to login if state does not match cookie", async () => {
    // Test implementation with mocked cookies
  });

  it("creates session and redirects to projects on success", async () => {
    // Test implementation with mocked OAuth flow
  });
});
```

### E2E Test Bypass

```typescript
// app/api/auth/e2e-login/route.ts (only in test environments)

import { NextResponse } from "next/server";
import { createSession } from "../../../lib/auth/session";
import { buildSessionCookie } from "../../../lib/auth/cookies";

// Only available in E2E test mode
export async function POST(request: Request): Promise<Response> {
  if (process.env.E2E_TEST_MODE !== "1" || process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  const { userId } = await request.json();
  const session = await createSession(userId);
  
  const response = NextResponse.json({ success: true });
  response.cookies.set(buildSessionCookie(session.id));
  return response;
}
```

---

## Implementation Sequence

### Phase 1: Infrastructure (Non-Breaking)

1. **Add environment variables**
   - Create GitHub OAuth App in GitHub Developer Settings
   - Add `GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_CLIENT_SECRET` to `.env`

2. **Database migration**
   - Create `0003_github_oauth.sql` migration
   - Run migration to add columns (does not affect existing functionality)

3. **Run user linking script**
   - Execute `scripts/link-github-users.ts` to link existing users

4. **Create OAuth helper library**
   - Implement `lib/auth/github-oauth.ts`
   - Add unit tests

5. **Create user query functions**
   - Implement `lib/db/queries/users.ts`
   - Add unit tests

### Phase 2: New Routes (Non-Breaking)

6. **Create OAuth routes**
   - Implement `GET /api/auth/github`
   - Implement `GET /api/auth/github/callback`
   - Add unit tests

7. **Create E2E test bypass route**
   - Implement `POST /api/auth/e2e-login` (test only)

### Phase 3: UI Updates (Breaking)

8. **Update login page**
   - Replace magic link form with GitHub button
   - Add error message handling
   - Update tests

9. **Update dashboard header**
   - Add UserDropdown component
   - Pass user info from layout
   - Add tests

10. **Update dashboard layout**
    - Fetch user info and pass to header

11. **Update marketing CTAs**
    - Change all "Install GitHub App" links to `/api/auth/github`
    - Update copy to "Sign in with GitHub"

### Phase 4: Cleanup

12. **Delete magic link code**
    - Remove routes, lib files, tests
    - Remove email infrastructure (if not used elsewhere)

13. **Drop magic_links table**
    - Create and run `0004_drop_magic_links.sql` migration

14. **Update E2E tests**
    - Use E2E login bypass instead of magic link flow

---

## Edge Cases & Error Handling

| Scenario | Handling |
|----------|----------|
| User cancels OAuth on GitHub | Redirect to `/login?error=oauth_cancelled` |
| State cookie missing/expired | Redirect to `/login?error=invalid_state` |
| State mismatch | Redirect to `/login?error=invalid_state` |
| GitHub API returns error | Log error, redirect to `/login?error=github_error` |
| Token exchange fails | Log error, redirect to `/login?error=github_error` |
| User has no verified email | Use any email, or throw if none exist |
| GitHub user ID already linked to different Tally user | Should not happen with current migration approach; log and investigate |
| Network timeout to GitHub | Redirect to `/login?error=github_error` |
| Already logged in user visits /login | Redirect to /projects |

---

## Dependencies

### New Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GITHUB_OAUTH_CLIENT_ID` | OAuth App client ID | `Ov23liXXXXXX` |
| `GITHUB_OAUTH_CLIENT_SECRET` | OAuth App client secret | `xxxxxxxx` |

### No New Package Dependencies

The implementation uses only:
- Node.js `crypto` (built-in)
- `fetch` (built-in)
- Existing packages (drizzle-orm, next, react)

---

## Rollback Plan

If issues arise after deployment:

1. **Immediate**: Revert to previous deployment
2. **Data**: GitHub columns on users table are additive — no data loss
3. **Magic links**: If not yet deleted, users can still use magic link flow
4. **Recovery**: After identifying issues, redeploy with fixes

**Recommendation**: Keep magic link code for 1 week after deployment, verify both existing users can log in, then run cleanup phase.
