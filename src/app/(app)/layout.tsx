import { AppMenuProvider } from "@/components/ds/app-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TasksProvider } from "@/features/tasks/client/use-tasks";
import { AppShell } from "@/features/tasks/components/app-shell";
import { QuickAdd, QuickAddProvider } from "@/features/tasks/components/quick-add";
import { TaskEditorProvider } from "@/features/tasks/components/task-editor";

// The app's providers live here, not in the root layout, so the landing ships none of them.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TasksProvider>
      <TooltipProvider delayDuration={250} skipDelayDuration={100}>
        <AppMenuProvider>
          <TaskEditorProvider>
            <QuickAddProvider>
              <AppShell>{children}</AppShell>
              <QuickAdd />
            </QuickAddProvider>
          </TaskEditorProvider>
        </AppMenuProvider>
      </TooltipProvider>
    </TasksProvider>
  );
}
