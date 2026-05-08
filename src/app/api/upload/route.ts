import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserById } from "@/lib/db/users";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { getUploadRootDir } from "@/lib/uploadStorage";

const sanitizeFolder = (value: string) =>
  value.replace(/[^a-z0-9-_]/gi, "-").toLowerCase();

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("noon_session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await getUserById(sessionId);
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const folderValue = formData.get("folder")?.toString() || "uploads";

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const isPdf = file.type === "application/pdf";

    if (!isImage && !isVideo && !isPdf) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const maxFileSize = isVideo ? 50 * 1024 * 1024 : isPdf ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxFileSize) {
      return NextResponse.json(
        {
          error: isVideo
            ? "Video size must be 50MB or less"
            : isPdf
              ? "PDF size must be 20MB or less"
              : "Image size must be 5MB or less",
        },
        { status: 400 }
      );
    }

    const safeFolder = sanitizeFolder(folderValue);
    const uploadDir = path.join(getUploadRootDir(), safeFolder);
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name) || (isPdf ? ".pdf" : ".jpg");
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    await writeFile(filePath, buffer);

    return NextResponse.json({ url: `/uploads/${safeFolder}/${fileName}` });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
