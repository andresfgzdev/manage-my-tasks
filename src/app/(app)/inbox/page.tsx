import { DaySpine } from "@/features/tasks/components/day-spine";

export default function InboxPage() {
  return (
    <div className="flex flex-wrap gap-12">
      <DaySpine lens="inbox" />
    </div>
  );
}
