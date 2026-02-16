import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserById } from "@/lib/db/users";
import { adminAddWalletCredit } from "@/lib/db/wallet";

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("noon_session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserById(sessionId);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, amount, description } = await request.json();

    if (!userId || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const result = await adminAddWalletCredit(userId, amount, description || "Admin credit addition");

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error adding wallet credit:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}