import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserById, updateUserWithPassword, deleteUser } from "@/lib/db/users";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

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

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

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

    const formData = await request.formData();
    
    const fullName = formData.get("fullName") as string;
    const email = formData.get("email") as string;
    const phoneNumber = formData.get("phone") as string;
    const formRole = formData.get("role") as string;
    const dob = formData.get("dob") as string;
    const preferredLanguage = formData.get("preferredLanguage") as "en" | "ar";
    const password = formData.get("password") as string;
    const profileImageFile = formData.get("profileImage") as File | null;

    // Map form role to database role
    const role: "ADMIN" | "TRAINER" | "CUSTOMER" = 
      formRole === "user" ? "CUSTOMER" : (formRole.toUpperCase() as "ADMIN" | "TRAINER" | "CUSTOMER");

    let profileImagePath: string | undefined;

    // Handle profile image upload
    if (profileImageFile && profileImageFile.size > 0) {
      const bytes = await profileImageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Create unique filename
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const ext = path.extname(profileImageFile.name);
      const filename = `profile_${userId}_${uniqueSuffix}${ext}`;
      
      // Save to public/uploads/profiles
      const uploadDir = path.join(process.cwd(), "public", "uploads", "profiles");
      
      // Ensure directory exists
      await mkdir(uploadDir, { recursive: true });
      
      const filePath = path.join(uploadDir, filename);
      
      await writeFile(filePath, buffer);
      profileImagePath = `/uploads/profiles/${filename}`;
    }

    const updateData: any = {
      fullName,
      email,
      phoneNumber,
      role,
      dateOfBirth: dob ? new Date(dob) : undefined,
      preferredLanguage: preferredLanguage === "ar" ? "ARABIC" : "ENGLISH",
    };

    if (password) {
      updateData.password = password;
    }

    if (profileImagePath) {
      updateData.profileImage = profileImagePath;
    }

    const updatedUser = await updateUserWithPassword(userId, updateData);

    if (!updatedUser) {
      return NextResponse.json(
        { error: "Failed to update user or email already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

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

    // Prevent deleting yourself
    if (userId === sessionId) {
      return NextResponse.json(
        { error: "Cannot delete yourself" },
        { status: 400 }
      );
    }

    const success = await deleteUser(userId);

    if (!success) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
