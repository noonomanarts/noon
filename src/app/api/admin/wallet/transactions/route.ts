import { readSessionUserId } from '@/lib/sessionToken';
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUserById } from "@/lib/db/users";
import { getWalletTransactionsByUserId } from "@/lib/db/wallet";

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const sessionId = readSessionUserId(cookieStore);

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getSessionUserById(sessionId);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const transactions = await getWalletTransactionsByUserId(userId);

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Error getting wallet transactions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}