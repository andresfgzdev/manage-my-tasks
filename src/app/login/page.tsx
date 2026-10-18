import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/components/login-form";
import { safeNext } from "@/features/auth/safe-next";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Log in · Better Tasks" };

type Search = { next?: string | string[]; reason?: string | string[]; error?: string | string[] };

// What brought the visitor here, in words: an ended session or a failed Google sign-in.
function noticeFor({ reason, error }: Search): { tone: "info" | "error"; text: string } | null {
  if (error === "access_denied") return { tone: "info", text: "Google sign-in was cancelled." };
  if (error) return { tone: "error", text: "Google sign-in didn't work. Try again." };
  if (reason === "expired") return { tone: "info", text: "Your session ended. Log in again to continue." };
  return null;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const next = safeNext(search.next);

  // The real check, not the cookie: a stale cookie must still be able to log in.
  if (await getCurrentUser()) redirect(next);

  return (
    <main className="grid min-h-dvh place-items-center px-6 py-10 max-sm:px-4">
      <div className="flex w-full max-w-[380px] flex-col gap-6">
        <Link href="/" className="kicker self-start transition-colors hover:text-bone">
          Better Tasks
        </Link>
        <LoginForm next={next} notice={noticeFor(search)} />
      </div>
    </main>
  );
}
