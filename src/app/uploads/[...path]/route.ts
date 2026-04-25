import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";
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

function streamFile(filePath: string, range?: { start: number; end: number }) {
  return Readable.toWeb(createReadStream(filePath, range)) as ReadableStream;
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
      headers.set("Content-Range", `bytes ${start}-${end}/${fileInfo.size}`);
      headers.set("Content-Length", String(end - start + 1));
      return new NextResponse(streamFile(filePath, { start, end }), { status: 206, headers });
    }
  }

  if (headOnly) {
    return new NextResponse(null, { status: 200, headers });
  }

  return new NextResponse(streamFile(filePath), { status: 200, headers });
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
