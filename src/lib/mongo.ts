import "server-only";
import { MongoClient } from "mongodb";
import type { Db } from "mongodb";

// One client per process, kept on globalThis so dev hot reloads and warm
// serverless invocations reuse its connection pool.
const globalForMongo = globalThis as unknown as { __mongoClient?: MongoClient };

export function getMongoClient(): MongoClient {
  if (!globalForMongo.__mongoClient) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set");
    // The client connects on its first operation.
    globalForMongo.__mongoClient = new MongoClient(uri);
  }
  return globalForMongo.__mongoClient;
}

export function getDb(): Db {
  return getMongoClient().db(process.env.MONGODB_DB || "better-tasks");
}
