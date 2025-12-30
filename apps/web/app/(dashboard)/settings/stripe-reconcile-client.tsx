"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type ReconcileState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; plan: string }
  | { status: "error"; message: string };

export function StripeReconcileClient(): React.ReactElement | null {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasRunRef = useRef(false);
  const [state, setState] = useState<ReconcileState>({ status: "idle" });

  useEffect(() => {
    if (hasRunRef.current) return;

    const success = searchParams.get("success");
    const checkoutSessionId = searchParams.get("checkout_session_id");
    if (success !== "true" || !checkoutSessionId) return;

    hasRunRef.current = true;
    setState({ status: "loading" });

    void (async () => {
      try {
        const response = await fetch("/api/stripe/reconcile", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ checkout_session_id: checkoutSessionId }),
        });

        if (!response.ok) {
          setState({ status: "error", message: "Failed to finalize your subscription. Please refresh and try again." });
          return;
        }

        const json = (await response.json()) as { plan?: unknown };
        const plan = typeof json.plan === "string" ? json.plan : "updated";
        setState({ status: "success", plan });
        router.replace("/settings?success=true");
        router.refresh();
      } catch {
        setState({ status: "error", message: "Failed to finalize your subscription. Please refresh and try again." });
      }
    })();
  }, [router, searchParams]);

  if (state.status === "idle") return null;

  if (state.status === "loading") {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        Finalizing your subscription…
      </div>
    );
  }

  if (state.status === "success") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
        Subscription updated. Your plan is now {state.plan}.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{state.message}</div>
  );
}

