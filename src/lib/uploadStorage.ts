import path from "path";
import { access } from "fs/promises";
import { constants as fsConstants } from "fs";

function resolveUploadRootFromEnv(): string | null {
  const custom = process.env.UPLOAD_DIR?.trim();
  if (!custom) return null;
  return path.isAbsolute(custom) ? custom : path.join(process.cwd(), custom);
}

export function getUploadRootDir(): string {
  const fromEnv = resolveUploadRootFromEnv();
  if (fromEnv) return fromEnv;
  return path.join(process.cwd(), "uploads");
}

export function getLegacyUploadRoots(): string[] {
  const cwd = process.cwd();
  return [
    path.join(cwd, "public", "uploads"),
    path.join(cwd, ".next", "standalone", "public", "uploads"),
    path.join(cwd, "..", "public", "uploads"),
    path.join(cwd, "..", "..", "public", "uploads"),
  ];
}

export function sanitizeUploadPathSegments(segments: string[]): string[] {
  return segments
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => segment !== "." && segment !== "..")
    .map((segment) => segment.replace(/[\\/]/g, ""));
}

export async function findReadableUploadFilePath(segments: string[]): Promise<string | null> {
  const safeSegments = sanitizeUploadPathSegments(segments);
  if (safeSegments.length === 0) return null;

  const roots = [getUploadRootDir(), ...getLegacyUploadRoots()];

  for (const root of roots) {
    const candidate = path.join(root, ...safeSegments);
    try {
      await access(candidate, fsConstants.R_OK);
      return candidate;
    } catch {
      // Try next root.
    }
  }

  return null;
}
