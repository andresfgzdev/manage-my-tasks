import { createAuthClient } from "better-auth/react";

// Same origin as the app, so no baseURL.
export const authClient = createAuthClient();
