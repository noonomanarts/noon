import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserById } from "@/lib/db/users";
import { adminUpdateWalletAvailableBalance } from "@/lib/db/wallet";

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

    const { userId, availableBalance } = await request.json();

    if (!userId || availableBalance === undefined || availableBalance < 0) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const result = await adminUpdateWalletAvailableBalance(userId, availableBalance);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating wallet available balance:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}