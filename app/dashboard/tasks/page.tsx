import CreateNewTask from "@/components/tasks/create-new-task";
import Greetings from "@/components/layout/greetings";
import ListTasks from "@/components/tasks/list-tasks";
import { Separator } from "@/components/ui/separator";
import { getCurrentUser } from "@/lib/session";

export default function Tasks() {
  const { id: userId } = getCurrentUser();

  return (
    <section className="w-full flex min-h-[calc(100%-40px)] justify-center px-8 font-inter">
      <div className="max-w-[700px] w-full min-h-[calc(100%-40px)] flex flex-col">
        <div className="flex flex-col gap-1">
          <Greetings />

          <Separator className="my-2" />

          <section className="w-full flex justify-end">
            <CreateNewTask />
          </section>
        </div>

        <Separator className="my-3" />

        <section className="flex flex-col gap-4">
          <ListTasks userId={userId} />
        </section>
      </div>
    </section>
  );
}
