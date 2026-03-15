import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserById } from "@/lib/db/users";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { getLegacyUploadRoots, getUploadRootDir } from "@/lib/uploadStorage";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("noon_session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await getUserById(sessionId);
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { action } = await request.json();

    if (action === "backup") {
      return await handleBackup();
    } else if (action === "restore") {
      const formData = await request.formData();
      const file = formData.get("file") as File;
      
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      return await handleRestore(file);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Files backup/restore error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const uploadsDirCandidates = [getUploadRootDir(), ...getLegacyUploadRoots()];
    const uploadsDir = uploadsDirCandidates.find((candidate) => fs.existsSync(candidate));
    const backupDir = path.join(process.cwd(), "backups", "files");
    const backupFile = path.join(backupDir, `uploads-backup-${timestamp}.tar.gz`);

    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Check if uploads directory exists
    if (!uploadsDir || !fs.existsSync(uploadsDir)) {
      return NextResponse.json(
        { error: "Uploads directory not found" },
        { status: 404 }
      );
    }

    // Create tar.gz archive
    const uploadsFolderName = path.basename(uploadsDir);
    const command = `tar -czf "${backupFile}" -C "${path.dirname(uploadsDir)}" "${uploadsFolderName}"`;
    await execAsync(command);

    // Read the backup file
    const backupData = fs.readFileSync(backupFile);
    const backupSize = fs.statSync(backupFile).size;

    // Return the file
    return new NextResponse(backupData, {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="uploads-backup-${timestamp}.tar.gz"`,
        "Content-Length": backupSize.toString(),
      },
    });
  } catch (error) {
    console.error("Files backup error:", error);
    throw error;
  }
}

async function handleRestore(file: File) {
  try {
    const backupDir = path.join(process.cwd(), "backups", "files", "temp");
    const uploadRootDir = getUploadRootDir();
    const uploadParentDir = path.dirname(uploadRootDir);
    
    // Ensure temp directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const tempFile = path.join(backupDir, `restore-${Date.now()}.tar.gz`);

    // Save uploaded file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    fs.writeFileSync(tempFile, buffer);

    // Extract archive
    if (!fs.existsSync(uploadParentDir)) {
      fs.mkdirSync(uploadParentDir, { recursive: true });
    }

    const command = `tar -xzf "${tempFile}" -C "${uploadParentDir}"`;
    await execAsync(command);

    // Clean up temp file
    fs.unlinkSync(tempFile);

    return NextResponse.json({
      success: true,
      message: "Files restored successfully",
    });
  } catch (error) {
    console.error("Files restore error:", error);
    throw error;
  }
}
