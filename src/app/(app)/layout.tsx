import { redirect } from "next/navigation";
import { AppMenuProvider } from "@/components/ds/app-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionGuard } from "@/features/auth/components/session-guard";
import { TasksProvider } from "@/features/tasks/client/use-tasks";
import { AppShell } from "@/features/tasks/components/app-shell";
import { QuickAdd, QuickAddProvider } from "@/features/tasks/components/quick-add";
import { TaskEditorProvider } from "@/features/tasks/components/task-editor";
import { getCurrentUser } from "@/lib/session";

// The app's providers live here, not in the root layout, so the landing ships none of them.
// Nothing renders until the session is confirmed in the database (D21): a revoked or
// expired session never paints the app, not even its cached tasks.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?reason=expired");

  return (
    <TasksProvider userId={user.id}>
      <SessionGuard />
      <TooltipProvider delayDuration={250} skipDelayDuration={100}>
        <AppMenuProvider>
          <TaskEditorProvider>
            <QuickAddProvider>
              <AppShell user={{ name: user.name, email: user.email, image: user.image }}>{children}</AppShell>
              <QuickAdd />
            </QuickAddProvider>
          </TaskEditorProvider>
        </AppMenuProvider>
      </TooltipProvider>
    </TasksProvider>
  );
}
