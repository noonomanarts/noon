import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserById } from "@/lib/db/users";
import { getWalletByUserId, requestWalletWithdrawal } from "@/lib/db/wallet";

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

    const transaction = await requestWalletWithdrawal(userId, amount, description || "Admin withdrawal request");
    const wallet = await getWalletByUserId(userId);

    return NextResponse.json({ transaction, wallet });
  } catch (error) {
    console.error("Error requesting wallet withdrawal:", error);
    if (error instanceof Error && error.message === 'Insufficient available balance') {
      return NextResponse.json({ error: 'Insufficient withdrawable balance' }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Insufficient balance') {
      return NextResponse.json({ error: 'Insufficient total balance' }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}