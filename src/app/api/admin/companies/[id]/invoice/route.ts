import { NextResponse } from 'next/server';
import { requireAdminApi } from '../../_auth';
import { getCompanyOrder } from '@/lib/db/companies';
import { generateCompanyInvoicePdf } from '@/lib/invoice/companyInvoicePdf';
import { getAdminSettingsByKey } from '@/lib/db/adminSettings';
import { defaultInvoiceTemplateSettings, sanitizeInvoiceTemplateSettings, type InvoiceTemplateSettings } from '@/lib/adminSettings';

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  const order = await getCompanyOrder(id);
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const saved = await getAdminSettingsByKey<InvoiceTemplateSettings>('invoice-template');
  const settings = sanitizeInvoiceTemplateSettings(saved ?? defaultInvoiceTemplateSettings);
  const pdf = await generateCompanyInvoicePdf(order, settings);

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${order.invoiceNumber}.pdf"`,
    },
  });
}
