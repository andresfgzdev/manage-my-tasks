"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type Notice = { tone: "info" | "error"; text: string };

const FAILED = "Google sign-in didn't work. Try again.";

export function LoginForm({ next, notice }: { next: string; notice: Notice | null }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shown: Notice | null = error ? { tone: "error", text: error } : notice;

  // Back from Google's page (back/forward cache): the button must work again.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => e.persisted && setPending(false);
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  async function signIn() {
    setPending(true);
    setError(null);
    // Better Auth checks both URLs against the app's origin; on success it leaves for Google.
    const { error } = await authClient.signIn
      .social({
        provider: "google",
        callbackURL: next,
        errorCallbackURL: `/login?next=${encodeURIComponent(next)}`,
      })
      .catch(() => ({ error: { message: FAILED } }));
    if (error) {
      setError(FAILED);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-bone">Log in to Better Tasks</h1>
        <p className="text-sm text-ash">Use your Google account. The first time, it creates your Better Tasks account.</p>
      </div>

      {shown && (
        <p
          role={shown.tone === "error" ? "alert" : "status"}
          className={cn(
            "rounded-control border px-3 py-2.5 text-sm",
            shown.tone === "error" ? "border-ember/40 bg-ember/10 text-ember-soft" : "border-line bg-surface text-bone",
          )}
        >
          {shown.text}
        </p>
      )}

      <Button type="button" className="h-11 rounded-control" disabled={pending} onClick={signIn} autoFocus>
        {pending ? "Opening Google…" : "Continue with Google"}
      </Button>

      <p className="font-mono text-[11px] text-ash-dim">Better Tasks only reads your name and email.</p>
    </div>
  );
}
