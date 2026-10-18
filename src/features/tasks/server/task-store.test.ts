import { createMemoryTaskStore } from "./task-store.ts";
import { storeContract } from "./task-store-contract.ts";

storeContract(async () => ({ store: createMemoryTaskStore(), cleanup: async () => {} }));
