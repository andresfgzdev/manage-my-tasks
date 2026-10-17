import "server-only";

// Entry point for future auth: every request is the same local user for now.
export async function getCurrentUserId(): Promise<string> {
  return "demo-user";
}
