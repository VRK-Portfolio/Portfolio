import '@testing-library/jest-dom/vitest';
// vite.setup.ts
import { beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { revalidateTag } from "next/cache";

// 1. Set fallback ENV variables BEFORE env.ts gets imported/evaluated
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/test_db";

// Mock server-only for Next.js app router
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => Promise<unknown>) => async (...args: unknown[]) => {
    const result: unknown = JSON.parse(JSON.stringify(await fn(...args)));
    return result;
  },
  revalidateTag: vi.fn(),
}));

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  
  // 2. Override with dynamic MongoMemoryServer URI once started
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(uri);
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  vi.mocked(revalidateTag).mockClear();
  if (mongoose.connection.readyState === 0 && process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
});