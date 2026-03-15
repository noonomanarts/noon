import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import {
  findReadableUploadFilePath,
  sanitizeUploadPathSegments,
} from "@/lib/uploadStorage";

const MIME_BY_EXTENSION: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
  ".webm": "video/webm",
  ".ogg": "video/ogg",
  ".pdf": "application/pdf",
};

function getContentType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  return MIME_BY_EXTENSION[extension] || "application/octet-stream";
}

async function resolveRequestedFilePath(params: Promise<{ path: string[] }>) {
  const { path: rawSegments } = await params;
  const safeSegments = sanitizeUploadPathSegments(rawSegments ?? []);
  if (safeSegments.length === 0) {
    return null;
  }

  return findReadableUploadFilePath(safeSegments);
}

async function buildUploadResponse(
  request: NextRequest,
  params: Promise<{ path: string[] }>,
  headOnly: boolean
) {
  const filePath = await resolveRequestedFilePath(params);
  if (!filePath) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const fileInfo = await stat(filePath).catch(() => null);
  if (!fileInfo || !fileInfo.isFile()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const contentType = getContentType(filePath);
  const headers = new Headers({
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Length": String(fileInfo.size),
    "Accept-Ranges": "bytes",
  });

  const rangeHeader = request.headers.get("range");
  if (rangeHeader && !headOnly) {
    const [startRaw, endRaw] = rangeHeader.replace(/^bytes=/i, "").split("-");
    const start = Number.parseInt(startRaw, 10);
    const end = endRaw ? Number.parseInt(endRaw, 10) : fileInfo.size - 1;

    if (
      Number.isFinite(start) &&
      Number.isFinite(end) &&
      start >= 0 &&
      end >= start &&
      end < fileInfo.size
    ) {
      const buffer = await readFile(filePath);
      const chunk = buffer.subarray(start, end + 1);
      headers.set("Content-Range", `bytes ${start}-${end}/${fileInfo.size}`);
      headers.set("Content-Length", String(chunk.length));
      return new NextResponse(chunk, { status: 206, headers });
    }
  }

  if (headOnly) {
    return new NextResponse(null, { status: 200, headers });
  }

  const fileBuffer = await readFile(filePath);
  return new NextResponse(fileBuffer, { status: 200, headers });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return buildUploadResponse(request, params, false);
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return buildUploadResponse(request, params, true);
}
