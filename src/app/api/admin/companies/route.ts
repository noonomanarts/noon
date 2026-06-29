import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from './_auth';
import { listCompanyOrders, createCompanyOrder, type CompanyPackageInput } from '@/lib/db/companies';

export async function GET() {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const orders = await listCompanyOrders();
  return NextResponse.json({ orders });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const companyName = typeof body.companyName === 'string' ? body.companyName.trim() : '';
  if (!companyName) return NextResponse.json({ error: 'Company name is required' }, { status: 400 });

  const packages = Array.isArray(body.packages)
    ? (body.packages as CompanyPackageInput[]).filter((p) => p && typeof p.name === 'string' && p.name.trim())
    : [];

  try {
    const id = await createCompanyOrder({
      companyName,
      contactName: typeof body.contactName === 'string' ? body.contactName : null,
      email: typeof body.email === 'string' ? body.email : null,
      phone: typeof body.phone === 'string' ? body.phone : null,
      currency: typeof body.currency === 'string' ? body.currency : null,
      invoiceDate: typeof body.invoiceDate === 'string' ? body.invoiceDate : null,
      notes: typeof body.notes === 'string' ? body.notes : null,
      packages,
      createdByUserId: admin.id,
    });
    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create' }, { status: 400 });
  }
}
