import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '../_auth';
import {
  getCompanyOrder,
  updateCompanyOrder,
  replaceCompanyPackages,
  deleteCompanyOrder,
  type CompanyPackageInput,
} from '@/lib/db/companies';

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  const order = await getCompanyOrder(id);
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  const order = await getCompanyOrder(id);
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (order.status === 'CLOSED') return NextResponse.json({ error: 'Closed orders cannot be edited' }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  await updateCompanyOrder(id, {
    companyName: typeof body.companyName === 'string' ? body.companyName : undefined,
    contactName: typeof body.contactName === 'string' ? body.contactName : null,
    email: typeof body.email === 'string' ? body.email : null,
    phone: typeof body.phone === 'string' ? body.phone : null,
    invoiceDate: typeof body.invoiceDate === 'string' ? body.invoiceDate : null,
    notes: typeof body.notes === 'string' ? body.notes : null,
  });
  if (Array.isArray(body.packages)) {
    await replaceCompanyPackages(id, body.packages as CompanyPackageInput[]);
  }
  return NextResponse.json({ order: await getCompanyOrder(id) });
}

export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  await deleteCompanyOrder(id);
  return NextResponse.json({ ok: true });
}
