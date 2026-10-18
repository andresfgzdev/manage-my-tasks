import { NextResponse } from "next/server";
import { tasks } from "@/features/tasks/server/default-tasks";
import { NOT_FOUND } from "@/features/tasks/server/tasks";

type Context = { params: Promise<{ id: string }> };

const statusFor = (error: string) => (error === NOT_FOUND ? 404 : 400);

export async function PATCH(req: Request, { params }: Context) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const result = await tasks.update(id, body);
  return result.ok
    ? NextResponse.json(result.value)
    : NextResponse.json({ error: result.error }, { status: statusFor(result.error) });
}

export async function DELETE(_req: Request, { params }: Context) {
  const { id } = await params;
  const result = await tasks.remove(id);
  return result.ok
    ? new Response(null, { status: 204 })
    : NextResponse.json({ error: result.error }, { status: statusFor(result.error) });
}
