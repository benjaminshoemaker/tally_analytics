'use client';

import { useEffect } from 'react';

import { identifyPostHogUser } from '../lib/posthog/client';

type PostHogIdentityUser = {
  id: string;
  email: string | null;
  githubUsername: string | null;
};

export function PostHogUserIdentity({ user }: { user: PostHogIdentityUser }) {
  useEffect(() => {
    identifyPostHogUser(user);
  }, [user.id, user.email, user.githubUsername]);

  return null;
}
