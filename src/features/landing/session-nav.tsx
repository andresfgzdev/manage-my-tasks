"use client";

import Image from "next/image";
import Link from "next/link";
import { Popover } from "radix-ui";
import { useState } from "react";
import { clearTasksCache } from "@/features/tasks/client/tasks-api";
import { authClient } from "@/lib/auth-client";

// The landing stays static: the session is asked for in the browser, and the
// signed-out links render until it answers (a placeholder keeps the row still).

type User = { name: string; email: string; image?: string | null };

function Avatar({ user }: { user: User }) {
  const [photo, setPhoto] = useState(user.image ?? null);
  return photo ? (
    // Google serves the photo; no-referrer, as its CDN may refuse hotlinked requests.
    <Image
      src={photo}
      alt=""
      width={36}
      height={36}
      unoptimized
      referrerPolicy="no-referrer"
      onError={() => setPhoto(null)}
      className="bt-avatar__img"
    />
  ) : (
    <span aria-hidden>{user.name.charAt(0)}</span>
  );
}

async function signOut() {
  await authClient.signOut();
  // Same as the app's sign out: a shared browser keeps no copy of the tasks.
  clearTasksCache();
}

/** Top right of the landing: "Log in", or the signed-in account with its menu. */
export function NavSession({ loginHref, appHref }: { loginHref: string; appHref: string }) {
  const { data, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <span className="bt-nav__login" aria-hidden style={{ visibility: "hidden" }}>
        Log in
      </span>
    );
  }
  if (!data) {
    return (
      <Link href={loginHref} className="bt-nav__login">
        Log in
      </Link>
    );
  }

  const { user } = data;
  return (
    <Popover.Root>
      <Popover.Trigger className="bt-avatar" aria-label={`Account: ${user.name}`}>
        <Avatar user={user} />
      </Popover.Trigger>
      {/* No portal: the menu must stay inside .bt, where the landing's colours live. */}
      <Popover.Content align="end" sideOffset={10} collisionPadding={16} className="bt-account">
        <div className="bt-account__who">
          <strong>{user.name}</strong>
          <span>{user.email}</span>
        </div>
        <Link href={appHref} className="bt-account__item">
          Open today
        </Link>
        <button type="button" onClick={signOut} className="bt-account__item bt-account__item--out">
          Sign out
        </button>
      </Popover.Content>
    </Popover.Root>
  );
}

/** The footer's login tile: a welcome back once there is a session. */
export function FootSession({ loginHref, appHref }: { loginHref: string; appHref: string }) {
  const { data } = authClient.useSession();

  if (!data) {
    return (
      <>
        <span>Already have tasks?</span>
        <Link href={loginHref} className="bt-tile__link">
          Log in
        </Link>
      </>
    );
  }
  return (
    <>
      <span>Welcome back, {data.user.name.split(" ")[0]}.</span>
      <Link href={appHref} className="bt-tile__link">
        Open today
      </Link>
    </>
  );
}
