import { NextResponse } from "next/server";

export async function respond<T>(fn: () => Promise<T>) {
  try {
    return NextResponse.json((await fn()) ?? null);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
