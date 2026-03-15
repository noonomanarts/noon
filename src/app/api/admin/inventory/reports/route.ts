import { NextResponse } from 'next/server';
import { getInventoryOverview } from '@/lib/db/inventory';
import { requireAdminSession } from '../_auth';

export async function GET() {
  try {
    const auth = await requireAdminSession();
    if (auth.error) return auth.error;

    const overview = await getInventoryOverview();
    return NextResponse.json(overview);
  } catch (error) {
    console.error('Error fetching inventory reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
