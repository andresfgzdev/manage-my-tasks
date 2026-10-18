"use client";

import dynamic from "next/dynamic";

// FullCalendar is the heaviest dependency: it loads only when Week is opened
// (or is warmed up by hovering its tab), never with Today, Next or Inbox.
// No server render: the week depends on the visitor's clock and the tasks live on the client.
const WeekCalendar = dynamic(
  () => import("./week-calendar").then((m) => m.WeekCalendar),
  { ssr: false, loading: () => <WeekSkeleton /> },
);

// Same footprint as the calendar, so the page does not jump when it arrives.
function WeekSkeleton() {
  return (
    <div className="min-w-0 flex-1 pb-[280px]" aria-busy="true">
      <div className="h-[84px]" />
      <div className="h-[640px] animate-shimmer rounded-row bg-surface/50" />
    </div>
  );
}

export function WeekView() {
  return <WeekCalendar />;
}
