import { NextResponse } from "next/server";
import { tasks } from "@/features/tasks/server/default-tasks";
import { PRIVATE, readJsonBody, statusFor } from "@/features/tasks/server/http";

export async function GET() {
  const result = await tasks.list();
  return result.ok
    ? NextResponse.json(result.value, { headers: PRIVATE })
    : NextResponse.json({ error: result.error }, { status: statusFor(result.error), headers: PRIVATE });
}

export async function POST(req: Request) {
  const body = await readJsonBody(req);
  const result = body.ok ? await tasks.create(body.value) : body;
  return result.ok
    ? NextResponse.json(result.value, { status: 201, headers: PRIVATE })
    : NextResponse.json({ error: result.error }, { status: statusFor(result.error), headers: PRIVATE });
}
