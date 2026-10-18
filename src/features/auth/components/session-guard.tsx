"use client";

import { useEffect } from "react";
import { endSession } from "@/features/tasks/client/use-tasks";
import { authClient } from "@/lib/auth-client";

const EVERY_MS = 5 * 60_000;

/**
 * Notices a session that ends while the app is open (expired, revoked, signed out in
 * another tab): checks when the tab comes back and every few minutes while visible.
 * A network error is not an ended session: it waits for the next check.
 */
export function SessionGuard() {
  useEffect(() => {
    let checking = false;
    const check = async () => {
      if (checking || document.visibilityState !== "visible") return;
      checking = true;
      const { data, error } = await authClient.getSession().catch((e: unknown) => ({ data: null, error: e }));
      checking = false;
      if (!error && !data) endSession();
    };
    const onVisible = () => void check();
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(check, EVERY_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, []);

  return null;
}
