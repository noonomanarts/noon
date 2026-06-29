import { NextResponse } from 'next/server';
import { requireAdminApi } from '../../_auth';
import { closeCompanyOrder, getCompanyOrder } from '@/lib/db/companies';

export async function POST(_request: Request, props: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  try {
    await closeCompanyOrder(id, admin.id);
    return NextResponse.json({ order: await getCompanyOrder(id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to close' }, { status: 400 });
  }
}
