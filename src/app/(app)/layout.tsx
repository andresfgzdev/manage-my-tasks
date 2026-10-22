import { AppMenuProvider } from "@/components/ds/app-menu";
import { AppShell } from "@/features/tasks/components/app-shell";
import { QuickAdd, QuickAddProvider } from "@/features/tasks/components/quick-add";
import { TaskEditorProvider } from "@/features/tasks/components/task-editor";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppMenuProvider>
      <TaskEditorProvider>
        <QuickAddProvider>
          <AppShell>{children}</AppShell>
          <QuickAdd />
        </QuickAddProvider>
      </TaskEditorProvider>
    </AppMenuProvider>
  );
}
