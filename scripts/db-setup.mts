// Prepares the database: the tasks validator and indexes, and the indexes Better Auth
// declares but does not create on MongoDB (its unique/index field flags only reach SQL
// through its CLI). Idempotent: run it again after any change.
//
//   npm run db:setup        (reads MONGODB_URI and MONGODB_DB from .env.local)
import { MongoClient } from "mongodb";
import type { Db, IndexSpecification, CreateIndexesOptions } from "mongodb";
import { setUpTasksCollection } from "../src/features/tasks/server/mongo-task-store.ts";

type Index = { key: IndexSpecification; options: CreateIndexesOptions & { name: string } };

// Names follow Better Auth's own scheme (<model>_<fields>_uidx|idx) so they never clash
// with indexes it may create itself.
const AUTH_INDEXES: Record<string, Index[]> = {
  user: [{ key: { email: 1 }, options: { name: "user_email_uidx", unique: true } }],
  session: [
    { key: { token: 1 }, options: { name: "session_token_uidx", unique: true } },
    { key: { userId: 1 }, options: { name: "session_userId_idx" } },
    // MongoDB deletes each session when it expires.
    { key: { expiresAt: 1 }, options: { name: "session_expiresAt_ttl", expireAfterSeconds: 0 } },
  ],
  account: [
    { key: { userId: 1 }, options: { name: "account_userId_idx" } },
    { key: { providerId: 1, accountId: 1 }, options: { name: "account_providerId_accountId_uidx", unique: true } },
  ],
  // Better Auth's rate limit counters (rateLimit.storage = "database").
  rateLimit: [{ key: { key: 1 }, options: { name: "rateLimit_key_uidx", unique: true } }],
  verification: [
    { key: { identifier: 1 }, options: { name: "verification_identifier_idx" } },
    { key: { expiresAt: 1 }, options: { name: "verification_expiresAt_ttl", expireAfterSeconds: 0 } },
  ],
};

async function setUpAuthCollections(db: Db) {
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  for (const [name, indexes] of Object.entries(AUTH_INDEXES)) {
    if (!existing.has(name)) await db.createCollection(name);
    for (const { key, options } of indexes) await db.collection(name).createIndex(key, options);
    console.log(`✓ ${name}: ${indexes.map((i) => i.options.name).join(", ")}`);
  }
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set (add it to .env.local)");
  process.exit(1);
}

const client = new MongoClient(uri);
try {
  const db = client.db(process.env.MONGODB_DB || "better-tasks");
  console.log(`Setting up "${db.databaseName}"`);
  await setUpTasksCollection(db);
  console.log("✓ tasks: validator, userId_1_createdAt_1");
  await setUpAuthCollections(db);
} finally {
  await client.close();
}
