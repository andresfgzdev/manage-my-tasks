import { DayAside } from "@/features/tasks/components/day-aside";
import { DaySpine } from "@/features/tasks/components/day-spine";

export default function TodayPage() {
  return (
    <div className="flex flex-wrap gap-12">
      <DaySpine lens="today" />
      <DayAside />
    </div>
  );
}
