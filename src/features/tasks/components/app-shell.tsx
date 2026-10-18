"use client";

import { CalendarDays, Inbox, Plus, Sun, SunMedium } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useAppMenu } from "@/components/ds/app-menu";
import type { MenuItem } from "@/components/ds/app-menu";
import { LensTabs } from "@/components/ds/lens-tabs";
import { AccountButton } from "@/features/auth/components/account-button";
import type { AccountUser } from "@/features/auth/components/account-button";
import { useNow } from "@/features/tasks/client/use-now";
import { useTasks } from "@/features/tasks/client/use-tasks";
import { lensCounts } from "@/features/tasks/domain/spine";
import { DayHeader } from "./day-header";
import { useQuickAdd } from "./quick-add";

// Warms the calendar chunk when the Week tab is hovered or focused, so it opens at
// once without every Today visit paying for FullCalendar.
const warmWeek = () => import("@/features/calendar/week-calendar");

export function AppShell({ user, children }: { user: AccountUser; children: React.ReactNode }) {
  const router = useRouter();
  const now = useNow();
  const { tasks } = useTasks();
  const menu = useAppMenu();
  const { focus } = useQuickAdd();
  const today = now?.today ?? null;
  const counts = useMemo(() => (today ? lensCounts(tasks, today) : null), [tasks, today]);

  const tabs = useMemo(
    () => [
      { href: "/today", label: "Today", count: counts?.today },
      { href: "/next", label: "Next", count: counts?.next },
      { href: "/inbox", label: "Inbox", count: counts?.inbox },
      { href: "/week", label: "Week", onWarm: warmWeek },
    ],
    [counts],
  );

  // Right click on the page itself (tasks and the calendar bring their own menus).
  const onContextMenu = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("input, textarea, [contenteditable=true]")) return;
    const go = (href: string) => () => router.push(href);
    const items: MenuItem[] = [
      { type: "action", label: "New task", icon: <Plus />, hint: "Line", run: focus },
      { type: "separator" },
      { type: "action", label: "Today", icon: <Sun />, run: go("/today") },
      { type: "action", label: "Next", icon: <SunMedium />, run: go("/next") },
      { type: "action", label: "Inbox", icon: <Inbox />, run: go("/inbox") },
      { type: "action", label: "Week", icon: <CalendarDays />, run: go("/week") },
    ];
    e.preventDefault();
    menu.open({ kind: "point", x: e.clientX, y: e.clientY }, items);
  };

  return (
    <div className="min-h-dvh px-6 pt-10 max-sm:px-4" onContextMenu={onContextMenu}>
      {/* One width for every view: switching tabs never moves the header or the tabs. */}
      <div className="mx-auto flex max-w-[1360px] flex-col gap-7">
        <div className="animate-rise" style={{ animationDelay: "0ms" }}>
          <DayHeader />
        </div>
        <div className="flex animate-rise items-center justify-between gap-4" style={{ animationDelay: "70ms" }}>
          {/* The tabs' underline runs up to the account button. */}
          <div className="min-w-0 flex-1">
            <LensTabs items={tabs} />
          </div>
          <AccountButton user={user} />
        </div>
        {/* The view's own entrance lives in (app)/template.tsx: one animation, not two. */}
        {children}
      </div>
    </div>
  );
}
