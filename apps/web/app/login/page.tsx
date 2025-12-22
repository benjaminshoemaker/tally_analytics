"use client";

import React, { useState } from "react";

type SubmitState = "idle" | "loading" | "success" | "error";

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
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Log in</h1>
        <p className="text-sm text-slate-600">We’ll email you a magic link that expires in 15 minutes.</p>
      </header>

      <form
        action="/api/auth/magic-link"
        method="post"
        onSubmit={onSubmit}
        className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-900">
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-slate-500"
            placeholder="you@example.com"
          />
        </label>

        <button
          type="submit"
          disabled={state === "loading"}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {state === "loading" ? "Sending…" : "Send magic link"}
        </button>

        <p role="status" aria-live="polite" className="text-sm text-slate-700">
          {message}
        </p>
      </form>
    </main>
  );
}
