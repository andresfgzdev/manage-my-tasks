"use client";

import { House, LogOut } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppMenu } from "@/components/ds/app-menu";
import { clearTasksCache } from "@/features/tasks/client/use-tasks";
import { authClient } from "@/lib/auth-client";

export type AccountUser = { name: string; email: string; image: string | null };

export function AccountButton({ user }: { user: AccountUser }) {
  const router = useRouter();
  const menu = useAppMenu();
  const [photo, setPhoto] = useState(user.image);

  async function signOut() {
    await authClient.signOut();
    clearTasksCache();
    // Back to the landing. Leaving the app's layout unmounts TasksProvider, and its
    // in-memory cache with it.
    router.replace("/");
  }

  return (
    <button
      type="button"
      aria-label={`Account: ${user.name}`}
      onClick={(e) =>
        menu.open({ kind: "box", rect: e.currentTarget.getBoundingClientRect() }, [
          { type: "heading", title: user.name, detail: user.email },
          { type: "separator" },
          { type: "action", label: "Home page", icon: <House />, run: () => router.push("/") },
          { type: "action", label: "Sign out", icon: <LogOut />, run: signOut },
        ])
      }
      className="press grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-raise text-sm font-semibold text-bone uppercase transition-colors hover:border-faint focus-visible:ring-2 focus-visible:ring-sodium/60 focus-visible:outline-none"
    >
      {photo ? (
        // Google serves the photo; no-referrer, as its CDN may refuse hotlinked requests.
        <Image
          src={photo}
          alt=""
          width={36}
          height={36}
          unoptimized
          referrerPolicy="no-referrer"
          onError={() => setPhoto(null)}
          className="size-full object-cover"
        />
      ) : (
        user.name.charAt(0)
      )}
    </button>
  );
}
