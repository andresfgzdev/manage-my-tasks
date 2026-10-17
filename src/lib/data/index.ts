import { TaskRepository } from "./types";
import { memoryRepository } from "./memory";

// In-memory store only — nothing is persisted. Swap this export when a
// real database is added.
export const repo: TaskRepository = memoryRepository;
