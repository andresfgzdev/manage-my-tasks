import "server-only";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "./mongo";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const DAY = 60 * 60 * 24;

export const auth = betterAuth({
  // The Db only, no client: no transactions, so a standalone local mongod works too (D18).
  database: mongodbAdapter(getDb()),
  // Google is the only way in: the same button signs up and logs in (D20).
  socialProviders: {
    google: {
      clientId: required("GOOGLE_CLIENT_ID"),
      clientSecret: required("GOOGLE_CLIENT_SECRET"),
      // Always show the account chooser, so a shared browser never signs in the wrong person.
      prompt: "select_account",
    },
  },
  // A session lasts 7 days and is extended at most once a day while it is used.
  session: { expiresIn: 7 * DAY, updateAge: DAY },
  // In the database: on serverless, per-instance memory would not limit anything.
  rateLimit: { storage: "database" },
  // Lets server actions and route handlers set cookies; it must stay the last plugin.
  plugins: [nextCookies()],
});
