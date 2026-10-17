import { NextResponse } from "next/server";
import { tasks } from "@/features/tasks/server/default-tasks";

export async function GET() {
  return NextResponse.json(await tasks.list());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const result = await tasks.create(body);
  return result.ok
    ? NextResponse.json(result.value, { status: 201 })
    : NextResponse.json({ error: result.error }, { status: 400 });
}
