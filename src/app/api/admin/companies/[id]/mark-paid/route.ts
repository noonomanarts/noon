import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '../../_auth';
import { markCompanyOrderPaid, getCompanyOrder, type CompanyPaymentMethod } from '@/lib/db/companies';

const METHODS: CompanyPaymentMethod[] = ['BANK_TRANSFER', 'CARD', 'CASH', 'PAYMENT_LINK'];

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  const body = (await request.json().catch(() => ({}))) as { method?: string };
  const method = body.method as CompanyPaymentMethod;
  if (!METHODS.includes(method)) return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
  await markCompanyOrderPaid(id, method);
  return NextResponse.json({ order: await getCompanyOrder(id) });
}
