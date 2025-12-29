"use client";

import React, { useState } from "react";

type SubmitState = "idle" | "loading" | "success" | "error";

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

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState<string>("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setState("error");
      setMessage("Enter your email address.");
      return;
    }

    setState("loading");
    setMessage("");

    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const body = (await response.json().catch(() => null)) as null | { success?: boolean; message?: string };
      if (!response.ok) {
        setState("error");
        setMessage(body?.message ?? "Unable to send magic link.");
        return;
      }

      setState(body?.success ? "success" : "error");
      setMessage(body?.message ?? "Check your email for a login link.");
    } catch {
      setState("error");
      setMessage("Unable to send magic link.");
    }
  }

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
              Sign in to access your analytics dashboard
            </p>
          </div>
        </header>

        <form
          action="/api/auth/magic-link"
          method="post"
          onSubmit={onSubmit}
          className="flex flex-col gap-5 rounded-xl border border-warm-200 bg-white p-6 shadow-warm-lg opacity-0 animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="text-center">
            <p className="text-sm text-warm-600">
              We'll email you a magic link that expires in 15 minutes.
            </p>
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium text-warm-800">
            Email address
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-lg border border-warm-200 bg-white px-4 py-2.5 text-warm-900 shadow-sm transition-all outline-none placeholder:text-warm-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              placeholder="you@example.com"
            />
          </label>

          <button
            type="submit"
            disabled={state === "loading"}
            className="group relative flex h-11 items-center justify-center gap-2 overflow-hidden rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-warm transition-all hover:bg-brand-600 hover:shadow-warm-md disabled:opacity-50"
          >
            <span className={state === "loading" ? "opacity-0" : ""}>
              Send magic link
            </span>
            {state === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="size-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}
            <svg
              className={`size-4 transition-transform group-hover:translate-x-0.5 ${state === "loading" ? "opacity-0" : ""}`}
              viewBox="0 0 16 16"
              fill="none"
            >
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {message && (
            <p
              role="status"
              aria-live="polite"
              className={`rounded-lg px-3 py-2 text-center text-sm ${
                state === "success"
                  ? "bg-emerald-50 text-emerald-700"
                  : state === "error"
                  ? "bg-red-50 text-red-700"
                  : "text-warm-600"
              }`}
            >
              {state === "success" && (
                <span className="mr-1.5">&#10003;</span>
              )}
              {message}
            </p>
          )}
        </form>

        <p className="text-center text-sm text-warm-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          Don't have an account?{" "}
          <a
            href="https://github.com/apps/tally-analytics-agent"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand-500 transition-colors hover:text-brand-600"
          >
            Install the GitHub App
          </a>
        </p>
      </div>
    </main>
  );
}
