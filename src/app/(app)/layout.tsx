import { AppShell } from "@/features/tasks/components/app-shell";
import { QuickAdd, QuickAddProvider } from "@/features/tasks/components/quick-add";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QuickAddProvider>
      <AppShell>{children}</AppShell>
      <QuickAdd />
    </QuickAddProvider>
  );
}
