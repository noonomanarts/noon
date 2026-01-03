import { mkdirSync } from "node:fs";
import path from "node:path";

import { open, type RootDatabase } from "lmdb";

let cachedDb: RootDatabase | null = null;
let cachedDbError: Error | null = null;

function getDbPath() {
  // Keep local mutable data out of the repo and out of git.
  return path.join(process.cwd(), ".data", "lmdb");
}

export function getDb(): RootDatabase | null {
  if (cachedDb) return cachedDb;
  if (cachedDbError) return null;

  try {
    const dbPath = getDbPath();
    mkdirSync(dbPath, { recursive: true });
    cachedDb = open({ path: dbPath, compression: true });
    return cachedDb;
  } catch (err) {
    cachedDbError = err instanceof Error ? err : new Error("Failed to open LMDB");
    return null;
  }
}

export function getJson<T>(key: string): T | null {
  const db = getDb();
  if (!db) return null;
  const value = db.get(key);
  if (value == null) return null;

  // lmdb can store objects directly, but we also tolerate JSON strings.
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
}

export function putJson<T>(key: string, value: T): boolean {
  const db = getDb();
  if (!db) return false;
  db.put(key, value);
  return true;
}
