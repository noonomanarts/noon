import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserById } from "@/lib/db/users";
import { getWalletByUserId, createWallet } from "@/lib/db/wallet";

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("noon_session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserById(sessionId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get("userId");

    // Allow admins to view any user's balance, regular users can only view their own
    const targetUserId = requestedUserId && user.role === "ADMIN" ? requestedUserId : user.id;

    let wallet = await getWalletByUserId(targetUserId);

    if (!wallet) {
      wallet = await createWallet(targetUserId, 'OMR');
    }

    return NextResponse.json(wallet);
  } catch (error) {
    console.error("Error getting wallet balance:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}