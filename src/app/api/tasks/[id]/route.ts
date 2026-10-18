import { NextResponse } from "next/server";
import { tasks } from "@/features/tasks/server/default-tasks";
import { FORBIDDEN, PRIVATE, isSameSite, readJsonBody, statusFor } from "@/features/tasks/server/http";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Context) {
  const { id } = await params;
  const body = await readJsonBody(req);
  const result = body.ok ? await tasks.update(id, body.value) : body;
  return result.ok
    ? NextResponse.json(result.value, { headers: PRIVATE })
    : NextResponse.json({ error: result.error }, { status: statusFor(result.error), headers: PRIVATE });
}

export async function DELETE(req: Request, { params }: Context) {
  const { id } = await params;
  const result = isSameSite(req) ? await tasks.remove(id) : { ok: false as const, error: FORBIDDEN };
  return result.ok
    ? new Response(null, { status: 204, headers: PRIVATE })
    : NextResponse.json({ error: result.error }, { status: statusFor(result.error), headers: PRIVATE });
}
