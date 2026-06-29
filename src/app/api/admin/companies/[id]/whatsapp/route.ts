import { NextResponse } from 'next/server';
import { requireAdminApi } from '../../_auth';
import { getCompanyOrder } from '@/lib/db/companies';
import { generateCompanyInvoicePdf } from '@/lib/invoice/companyInvoicePdf';
import { getAdminSettingsByKey } from '@/lib/db/adminSettings';
import { defaultInvoiceTemplateSettings, sanitizeInvoiceTemplateSettings, type InvoiceTemplateSettings } from '@/lib/adminSettings';
import { sendWhatsAppFile } from '@/lib/whatsappClient';

export async function POST(_request: Request, props: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  const order = await getCompanyOrder(id);
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!order.phone) return NextResponse.json({ error: 'No phone number on file' }, { status: 400 });

  const saved = await getAdminSettingsByKey<InvoiceTemplateSettings>('invoice-template');
  const settings = sanitizeInvoiceTemplateSettings(saved ?? defaultInvoiceTemplateSettings);
  const pdf = await generateCompanyInvoicePdf(order, settings);
  const base64 = Buffer.from(pdf).toString('base64');

  const result = await sendWhatsAppFile({
    phoneNumber: order.phone,
    data: base64,
    filename: `Invoice-${order.invoiceNumber}.pdf`,
    mimetype: 'application/pdf',
    caption: `Invoice #${order.invoiceNumber} - ${order.companyName}. Total: ${order.totalAmount.toFixed(3)} ${order.currency}.`,
  });

  if (!result.ok) return NextResponse.json({ error: result.body }, { status: 502 });
  return NextResponse.json({ ok: true });
}
