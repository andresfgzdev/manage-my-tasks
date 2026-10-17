// Temporary stand-in until real authentication is implemented.
// Every request is treated as this single local user.
export interface SessionUser {
  id: string;
  firstName: string;
}

export const DEMO_USER: SessionUser = {
  id: "demo-user",
  firstName: "Demo",
};

export function getCurrentUser(): SessionUser {
  return DEMO_USER;
}
