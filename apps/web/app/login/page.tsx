import React from "react";

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

type LoginPageProps = {
  searchParams?: { error?: string };
};

function getLoginErrorMessage(error: string | undefined): string | null {
  if (error === "oauth_cancelled") return "GitHub sign-in was cancelled. Please try again.";
  if (error === "invalid_state") return "That sign-in attempt expired. Please try again.";
  if (error === "github_error") return "GitHub sign-in failed. Please try again.";
  return null;
}

function GitHubLogo() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const errorMessage = getLoginErrorMessage(searchParams?.error);

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
            <h1 className="font-display text-3xl tracking-tight text-warm-900">Welcome back</h1>
            <p className="mt-2 text-sm text-warm-500">
              Sign in with GitHub to access your analytics dashboard
            </p>
          </div>
        </header>

        <div
          className="flex flex-col gap-5 rounded-xl border border-warm-200 bg-white p-6 shadow-warm-lg opacity-0 animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          {errorMessage && (
            <p
              role="status"
              aria-live="polite"
              className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700"
            >
              {errorMessage}
            </p>
          )}

          <a
            href="/api/auth/github"
            className="group inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-warm-900 px-4 text-sm font-medium text-white shadow-warm transition-all hover:bg-warm-950 hover:shadow-warm-md"
          >
            <GitHubLogo />
            Sign in with GitHub
            <svg className="size-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>

          <p className="text-center text-xs text-warm-500">
            By continuing, you agree to our{" "}
            <a href="/terms" className="font-medium text-warm-700 hover:text-warm-900">
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy" className="font-medium text-warm-700 hover:text-warm-900">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
