import { NextResponse } from 'next/server';
import { clearInventoryStock } from '@/lib/db/inventory';
import { requireAdminSession } from '../../_auth';

export async function POST() {
  try {
    const auth = await requireAdminSession();
    if (auth.error) return auth.error;

    const clearedItems = await clearInventoryStock(auth.user.id);
    return NextResponse.json({ clearedItems });
  } catch (error) {
    console.error('Error clearing inventory stock:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}