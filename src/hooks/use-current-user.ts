import { getCurrentUser } from "@/lib/session";

// Client-side access to the current user. Replace with the real auth
// provider's hook once authentication is implemented.
export function useCurrentUser() {
  return getCurrentUser();
}
