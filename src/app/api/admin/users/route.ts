import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserById, getAllUsers, createUser, getUserByEmail, getUserByPhoneNormalized } from "@/lib/db/users";
import { upsertWorkerPermissions } from "@/lib/db/worker";
import type { UserRole, UserStatus } from "@/lib/db/types";

const mapRole = (value: string | null): UserRole | undefined => {
  if (!value) return undefined;
  const normalized = value.toUpperCase();
  if (normalized === "ADMIN") return "ADMIN";
  if (normalized === "TRAINER") return "TRAINER";
  if (normalized === "CUSTOMER") return "CUSTOMER";
  if (normalized === "EMPLOYEE") return "EMPLOYEE";
  if (normalized === "SOCIAL_MEDIA_ADMIN") return "SOCIAL_MEDIA_ADMIN";
  if (normalized === "PHOTOGRAPHER") return "PHOTOGRAPHER";
  if (normalized === "WORKER") return "WORKER";
  if (normalized === "USER") return "CUSTOMER";
  return undefined;
};

const mapStatus = (value: string | null): UserStatus | undefined => {
  if (!value) return undefined;
  const normalized = value.toUpperCase();
  if (normalized === "ACTIVE") return "ACTIVE";
  if (normalized === "INACTIVE") return "INACTIVE";
  if (normalized === "SUSPENDED") return "SUSPENDED";
  return undefined;
};

export async function GET(request: NextRequest) {
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

    const { searchParams } = request.nextUrl;
    const role = mapRole(searchParams.get("role"));
    const status = mapStatus(searchParams.get("status"));
    const take = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
    const skip = searchParams.get("skip") ? Number(searchParams.get("skip")) : undefined;

    const users = await getAllUsers({
      role,
      status,
      take: Number.isFinite(take) ? take : undefined,
      skip: Number.isFinite(skip) ? skip : undefined,
    });
    return NextResponse.json({ users });
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

    const normalizedEmail = String(data.email).trim().toLowerCase();
    const normalizedPhone = String(data.phoneNumber).trim();

    const existingEmail = await getUserByEmail(normalizedEmail);
    if (existingEmail) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 }
      );
    }

    const existingPhone = await getUserByPhoneNormalized(normalizedPhone);
    if (existingPhone) {
      return NextResponse.json(
        { error: "Phone number already exists" },
        { status: 409 }
      );
    }

    // Create user
    const role = mapRole(typeof data.role === "string" ? data.role : null) ?? "CUSTOMER";
    const workerPermissions =
      role === "WORKER" && data.workerPermissions && typeof data.workerPermissions === "object"
        ? {
            can_restock: Boolean(data.workerPermissions.can_restock),
            can_print_labels: Boolean(data.workerPermissions.can_print_labels),
            can_record_sales: Boolean(data.workerPermissions.can_record_sales),
            can_manage_orders: Boolean(data.workerPermissions.can_manage_orders),
            can_print_bills: Boolean(data.workerPermissions.can_print_bills),
          }
        : null;

    const newUser = await createUser({
      email: normalizedEmail,
      password: data.password,
      fullName: data.fullName,
      role,
      phoneNumber: normalizedPhone,
      dateOfBirth: data.dob,
      preferredLanguage: data.preferredLanguage === "ar" ? "ARABIC" : "ENGLISH",
    });

    if (!newUser) {
      return NextResponse.json(
        { error: "Unable to create user" },
        { status: 500 }
      );
    }

    if (role === "WORKER") {
      await upsertWorkerPermissions(newUser.id, workerPermissions ?? {
        can_restock: false,
        can_print_labels: false,
        can_record_sales: false,
        can_manage_orders: false,
        can_print_bills: false,
      });
    }

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
