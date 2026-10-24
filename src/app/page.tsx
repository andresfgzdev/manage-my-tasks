import type { Metadata } from "next";
import { Landing } from "@/features/landing/landing";

export const metadata: Metadata = {
  title: "Better Tasks: type a task, it finds its hour",
  description:
    "Type one line and Better Tasks reads the time, the length, the priority and the tags, then puts the task on your day.",
  openGraph: {
    title: "Better Tasks: type a task, it finds its hour",
    description: "Type one line and it lands on your day at the hour it names.",
    type: "website",
  },
};

export default function Home() {
  return <Landing />;
}
