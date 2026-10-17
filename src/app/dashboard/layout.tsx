import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { AppSideBar } from "@/components/layout/app-side-bar";
import { ReactNode } from "react";

export default function DashBoardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSideBar />
      <main className="w-full ">
        <SidebarTrigger className="cursor-pointer p-5" />
        {children}
      </main>
    </SidebarProvider>
  );
}
