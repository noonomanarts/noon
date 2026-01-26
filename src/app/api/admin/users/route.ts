import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserById, getAllUsers, createUser } from "@/lib/db/users";

export async function GET() {
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

    const users = await getAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

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

    const data = await request.json();

    // Validate required fields
    if (!data.email || !data.password || !data.fullName || !data.phoneNumber) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create user
    const newUser = await createUser({
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      role: data.role === "user" ? "CUSTOMER" : (data.role?.toUpperCase() || "CUSTOMER"),
      phoneNumber: data.phoneNumber,
      dateOfBirth: data.dob,
      preferredLanguage: data.preferredLanguage === "ar" ? "ARABIC" : "ENGLISH",
    });

    if (!newUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
