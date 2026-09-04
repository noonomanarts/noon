import { NextRequest, NextResponse } from 'next/server';
import { deleteInventoryPurchase, updateInventoryPurchase } from '@/lib/db/inventory';
import { isQuarterHourDateTimeValue } from '@/lib/dateTime';
import { requireAdminSession } from '../../_auth';

type Params = { params: Promise<{ purchaseId: string }> };

function validationStatus(error: unknown): number {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('required') || message.includes('invalid') || message.includes('consumed') || message.includes('exist') ? 400 : 500;
}

export async function PUT(request: NextRequest, props: Params) {
  try {
    const auth = await requireAdminSession();
    if (auth.error) return auth.error;
    const { purchaseId } = await props.params;
    const body = (await request.json().catch(() => ({}))) as {
      supplierName?: string | null;
      invoiceNumber?: string | null;
      occurredAt?: string | null;
      notes?: string | null;
      lines?: Array<{ inventoryItemId?: string; quantity?: number; unitCost?: number; notes?: string | null }>;
    };
    if (!isQuarterHourDateTimeValue(body.occurredAt)) {
      return NextResponse.json({ error: 'Purchase date/time minutes must be 00, 15, 30, or 45' }, { status: 400 });
    }
    const updated = await updateInventoryPurchase({
      purchaseId,
      supplierName: body.supplierName,
      invoiceNumber: body.invoiceNumber,
      occurredAt: body.occurredAt,
      notes: body.notes,
      lines: Array.isArray(body.lines) ? body.lines.map((line) => ({
        inventoryItemId: String(line.inventoryItemId ?? ''),
        quantity: Number(line.quantity ?? 0),
        unitCost: Number(line.unitCost ?? 0),
        notes: line.notes,
      })) : [],
      adminUserId: auth.user.id,
    });
    if (!updated) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating inventory purchase:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: validationStatus(error) });
  }
}

export async function DELETE(_request: NextRequest, props: Params) {
  try {
    const auth = await requireAdminSession();
    if (auth.error) return auth.error;
    const { purchaseId } = await props.params;
    const deleted = await deleteInventoryPurchase(purchaseId, auth.user.id);
    if (!deleted) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting inventory purchase:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: validationStatus(error) });
  }
}
