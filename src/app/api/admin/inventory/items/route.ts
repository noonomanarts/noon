import { NextRequest, NextResponse } from 'next/server';
import { createInventoryItem, listInventoryItems } from '@/lib/db/inventory';
import { requireAdminSession } from '../_auth';

function mapValidationStatus(error: unknown): number {
  if (!(error instanceof Error)) return 500;
  const message = error.message.toLowerCase();
  if (
    message.includes('invalid')
    || message.includes('required')
    || message.includes('exists')
    || message.includes('duplicate')
  ) {
    return 400;
  }
  return 500;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminSession();
    if (auth.error) return auth.error;

    const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true';
    const items = await listInventoryItems({ includeInactive });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error listing inventory items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminSession();
    if (auth.error) return auth.error;

    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      sku?: string | null;
      unit?: string | null;
      reorderLevel?: number;
      currency?: string | null;
    };

    const item = await createInventoryItem({
      name: body.name ?? '',
      sku: body.sku,
      unit: body.unit,
      reorderLevel: Number(body.reorderLevel ?? 0),
      currency: body.currency,
      adminUserId: auth.user.id,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    const status = mapValidationStatus(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status });
  }
}
