import { NextRequest, NextResponse } from 'next/server';
import { createInventoryPurchase, listRecentInventoryPurchases } from '@/lib/db/inventory';
import { requireAdminSession } from '../_auth';

function mapValidationStatus(error: unknown): number {
  if (!(error instanceof Error)) return 500;
  const message = error.message.toLowerCase();
  if (
    message.includes('invalid')
    || message.includes('required')
    || message.includes('exists')
    || message.includes('stock')
    || message.includes('line')
  ) {
    return 400;
  }
  return 500;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminSession();
    if (auth.error) return auth.error;

    const limitRaw = Number(request.nextUrl.searchParams.get('limit') ?? '12');
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, Math.trunc(limitRaw))) : 12;

    const purchases = await listRecentInventoryPurchases(limit);
    return NextResponse.json({ purchases });
  } catch (error) {
    console.error('Error listing inventory purchases:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminSession();
    if (auth.error) return auth.error;

    const body = (await request.json().catch(() => ({}))) as {
      supplierName?: string | null;
      invoiceNumber?: string | null;
      occurredAt?: string | null;
      notes?: string | null;
      lines?: Array<{
        inventoryItemId?: string;
        quantity?: number;
        unitCost?: number;
        notes?: string | null;
      }>;
    };

    const purchase = await createInventoryPurchase({
      supplierName: body.supplierName,
      invoiceNumber: body.invoiceNumber,
      occurredAt: body.occurredAt,
      notes: body.notes,
      lines: Array.isArray(body.lines)
        ? body.lines.map((line) => ({
            inventoryItemId: String(line.inventoryItemId ?? ''),
            quantity: Number(line.quantity ?? 0),
            unitCost: Number(line.unitCost ?? 0),
            notes: line.notes,
          }))
        : [],
      adminUserId: auth.user.id,
    });

    return NextResponse.json({ purchase }, { status: 201 });
  } catch (error) {
    console.error('Error creating inventory purchase:', error);
    const status = mapValidationStatus(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status });
  }
}
