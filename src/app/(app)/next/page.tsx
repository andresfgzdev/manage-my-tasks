import { DaySpine } from "@/features/tasks/components/day-spine";

export default function NextPage() {
  return (
    <div className="flex flex-wrap gap-12">
      <DaySpine lens="next" />
    </div>
  );
}
