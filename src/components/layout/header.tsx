import Link from "next/link";
import { ListTodo } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky px-8 w-full bg-background/95 backdrop-blur border-b border-transparent shadow-none">
      <div className=" flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-80 transition cursor-pointer"
        >
          <ListTodo className="h-6 w-6 text-purple-100" />
          <span className="text-xl font-bold tracking-tight text-purple-100">
            Better Tasks
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/tasks"
            className="text-sm font-medium px-3 py-1 rounded cursor-pointer text-purple-600 hover:bg-purple-100 hover:text-purple-800 transition-colors"
          >
            Tasks
          </Link>
        </div>
      </div>
    </header>
  );
}
