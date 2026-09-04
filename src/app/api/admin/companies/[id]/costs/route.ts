import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '../../_auth';
import { getCompanyOrder, addCompanyCost, deleteCompanyCost, type CompanyCostType } from '@/lib/db/companies';

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  const order = await getCompanyOrder(id);
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (order.status === 'CLOSED') return NextResponse.json({ error: 'Order already closed' }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const costType: CompanyCostType = body.costType === 'INVENTORY_CUT' ? 'INVENTORY_CUT' : 'DIRECT_BILL';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  if (costType === 'INVENTORY_CUT' && !body.inventoryItemId) {
    return NextResponse.json({ error: 'Inventory item is required' }, { status: 400 });
  }
  const amount = typeof body.amount === 'number' ? body.amount : Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: costType === 'INVENTORY_CUT' ? 'A positive inventory value is required' : 'A valid amount is required' }, { status: 400 });
  }

  try {
    await addCompanyCost(id, {
      title,
      costType,
      amount,
      inventoryItemId: typeof body.inventoryItemId === 'string' ? body.inventoryItemId : null,
      quantity: body.quantity == null ? null : Number(body.quantity),
      notes: typeof body.notes === 'string' ? body.notes : null,
      createdByUserId: admin.id,
    });
    return NextResponse.json({ order: await getCompanyOrder(id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  const costId = new URL(request.url).searchParams.get('costId');
  if (!costId) return NextResponse.json({ error: 'costId required' }, { status: 400 });
  await deleteCompanyCost(id, costId);
  return NextResponse.json({ order: await getCompanyOrder(id) });
}
