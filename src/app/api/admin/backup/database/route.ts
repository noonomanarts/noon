import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserById } from "@/lib/db/users";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

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
    console.error("Database backup/restore error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(process.cwd(), "backups", "database");
    const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error("DATABASE_URL not found");
    }

    // Parse database URL
    const url = new URL(dbUrl);
    const username = url.username;
    const password = url.password;
    const host = url.hostname;
    const port = url.port || "5432";
    const database = url.pathname.slice(1);

    // Create backup using pg_dump
    const command = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -F p -f "${backupFile}"`;
    
    await execAsync(command);

    // Read the backup file
    const backupData = fs.readFileSync(backupFile);
    const backupSize = fs.statSync(backupFile).size;

    // Return the file
    return new NextResponse(backupData, {
      headers: {
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename="database-backup-${timestamp}.sql"`,
        "Content-Length": backupSize.toString(),
      },
    });
  } catch (error) {
    console.error("Backup error:", error);
    throw error;
  }
}

async function handleRestore(file: File) {
  try {
    const backupDir = path.join(process.cwd(), "backups", "database", "temp");
    
    // Ensure temp directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const tempFile = path.join(backupDir, `restore-${Date.now()}.sql`);

    // Save uploaded file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    fs.writeFileSync(tempFile, buffer);

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error("DATABASE_URL not found");
    }

    // Parse database URL
    const url = new URL(dbUrl);
    const username = url.username;
    const password = url.password;
    const host = url.hostname;
    const port = url.port || "5432";
    const database = url.pathname.slice(1);

    // Restore using psql
    const command = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${username} -d ${database} -f "${tempFile}"`;
    
    await execAsync(command);

    // Clean up temp file
    fs.unlinkSync(tempFile);

    return NextResponse.json({
      success: true,
      message: "Database restored successfully",
    });
  } catch (error) {
    console.error("Restore error:", error);
    throw error;
  }
}
