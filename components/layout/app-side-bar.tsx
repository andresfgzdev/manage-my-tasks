"use client";

import { Briefcase, List, ListTodo, User } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useCategory } from "@/context/CategoryProvider";
import { usePathname } from "next/navigation";

export function AppSideBar() {
  const pathname = usePathname();
  const { category, setCategory } = useCategory();
  const items = [
    {
      title: "Tasks",
      url: "/dashboard/tasks",
      icon: ListTodo,
      color: "#634AB0",
    },
  ];

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarHeader>
            <SidebarGroupLabel className="text-2xl text-white font-bold font-nunito my-2 flex justify-center items-center">
              <Image
                src="/assets/logo_name.png"
                alt="logo"
                width={200}
                height={200}
              />
            </SidebarGroupLabel>
          </SidebarHeader>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title} className="">
                  <SidebarMenuButton
                    asChild
                    className="h-12 mt-2 px-3 text-md font-medium transition-colors rounded-2xl"
                  >
                    <Link
                      href={item.url}
                      className={cn(
                        pathname === item.url
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <item.icon color={item.color} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>

          <SidebarGroupContent>
            <SidebarGroupLabel className="text-lg text-white font-bold font-nunito my-7 pt-10">
              Categories 📋
            </SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem key={"all"}>
                <SidebarMenuButton
                  asChild
                  className={cn(
                    "h-12 px-3 text-md font-medium transition-colors rounded-2xl cursor-pointer",
                    category === "all" && "bg-muted text-foreground"
                  )}
                  onClick={() => setCategory("all")}
                >
                  <article>
                    <List color="#6366f1" />
                    <span>All</span>
                  </article>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem key={"personal"}>
                <SidebarMenuButton
                  asChild
                  className={cn(
                    "h-12 px-3 text-md font-medium transition-colors rounded-2xl cursor-pointer",
                    category === "personal" && "bg-muted text-foreground"
                  )}
                  onClick={() => setCategory("personal")}
                >
                  <article>
                    <User color="#10b981" />
                    <span>Personal</span>
                  </article>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem key={"work"}>
                <SidebarMenuButton
                  asChild
                  className={cn(
                    "h-12 px-3 text-md font-medium transition-colors rounded-2xl cursor-pointer",
                    category === "work" && "bg-muted text-foreground"
                  )}
                  onClick={() => setCategory("work")}
                >
                  <article>
                    <Briefcase color="#48fffd" />
                    <span>Work</span>
                  </article>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu className="w-full">
          <span className="text-xs text-muted-foreground">
            Made with ❤️ by{" "}
            <a
              href="https://github.com/WalkerFGZ"
              target="_blank"
              className="text-blue-500"
            >
              Andres Gallego
            </a>
          </span>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
