import {
  defaultInvoiceTemplateSettings,
  sanitizeInvoiceTemplateSettings,
  type InvoiceTemplateSettings,
} from '@/lib/adminSettings';
import { getAdminSettingsByKey } from '@/lib/db/adminSettings';

async function getInvoiceSettings(): Promise<InvoiceTemplateSettings> {
  const saved = await getAdminSettingsByKey<InvoiceTemplateSettings>('invoice-template');
  return sanitizeInvoiceTemplateSettings(saved ?? defaultInvoiceTemplateSettings);
}

export async function getEmailLayout(input: {
  content: string;
  isArabic?: boolean;
  title?: string;
}): Promise<string> {
  const settings = await getInvoiceSettings();
  const isRTL = input.isArabic ?? false;
  const direction = isRTL ? 'rtl' : 'ltr';
  const fontFamily = isRTL
    ? "'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    : "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

  return `
<!DOCTYPE html>
<html lang="${isRTL ? 'ar' : 'en'}" dir="${direction}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${input.title || (isRTL ? 'نون' : 'Noon')}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
      font-family: ${fontFamily};
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .email-header {
      background: linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor});
      padding: 24px;
      border-radius: 16px 16px 0 0;
      text-align: center;
    }
    .email-logo {
      max-height: 48px;
      max-width: 160px;
    }
    .email-body {
      background: #ffffff;
      padding: 32px 24px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .email-body p {
      margin: 0 0 16px;
      line-height: 1.6;
      color: #374151;
      font-size: 15px;
    }
    .email-body strong {
      color: #111827;
    }
    .email-body a {
      color: ${settings.primaryColor};
      text-decoration: none;
    }
    .email-body a:hover {
      text-decoration: underline;
    }
    .email-footer {
      background: #f9fafb;
      padding: 20px 24px;
      border: 1px solid #e5e7eb;
      border-top: none;
      border-radius: 0 0 16px 16px;
      text-align: center;
    }
    .footer-company {
      font-weight: 600;
      color: #374151;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .footer-contact {
      color: #6b7280;
      font-size: 13px;
      margin-bottom: 4px;
    }
    .footer-notes {
      color: #9ca3af;
      font-size: 12px;
      margin-top: 16px;
      font-style: italic;
    }
    @media (max-width: 640px) {
      .email-wrapper {
        padding: 12px;
      }
      .email-header {
        padding: 16px;
      }
      .email-body {
        padding: 24px 16px;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header">
      ${settings.logoUrl ? `<img src="${settings.logoUrl}" alt="${isRTL ? settings.companyNameAr : settings.companyName}" class="email-logo">` : `<h1 style="color: white; margin: 0; font-size: 24px;">${isRTL ? settings.companyNameAr : settings.companyName}</h1>`}
    </div>
    <div class="email-body" style="direction: ${direction}; text-align: ${isRTL ? 'right' : 'left'};">
      ${input.content}
    </div>
    <div class="email-footer">
      <div class="footer-company">${isRTL ? settings.companyNameAr : settings.companyName}</div>
      <div class="footer-contact">${isRTL ? settings.companyAddressAr : settings.companyAddress}</div>
      <div class="footer-contact">${settings.companyPhone} | ${settings.companyEmail}</div>
      <div class="footer-notes">${isRTL ? settings.footerNotesAr : settings.footerNotes}</div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export type InvoiceData = {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  currency: string;
  notes?: string;
  isArabic?: boolean;
};

export async function generateInvoiceHtml(data: InvoiceData): Promise<string> {
  const settings = await getInvoiceSettings();
  const isRTL = data.isArabic ?? false;
  const direction = isRTL ? 'rtl' : 'ltr';
  const fontFamily = isRTL
    ? "'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    : "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

  const t = {
    invoice: isRTL ? 'فاتورة' : 'Invoice',
    invoiceNo: isRTL ? 'رقم الفاتورة' : 'Invoice No',
    date: isRTL ? 'التاريخ' : 'Date',
    dueDate: isRTL ? 'تاريخ الاستحقاق' : 'Due Date',
    billTo: isRTL ? 'فاتورة إلى' : 'Bill To',
    description: isRTL ? 'الوصف' : 'Description',
    qty: isRTL ? 'الكمية' : 'Qty',
    unitPrice: isRTL ? 'سعر الوحدة' : 'Unit Price',
    total: isRTL ? 'المجموع' : 'Total',
    subtotal: isRTL ? 'المجموع الفرعي' : 'Subtotal',
    discount: isRTL ? 'الخصم' : 'Discount',
    tax: isRTL ? 'الضريبة' : 'Tax',
    grandTotal: isRTL ? 'المجموع الكلي' : 'Grand Total',
    bankDetails: isRTL ? 'التفاصيل البنكية' : 'Bank Details',
    bankName: isRTL ? 'اسم البنك' : 'Bank Name',
    accountNo: isRTL ? 'رقم الحساب' : 'Account No',
    iban: isRTL ? 'آيبان' : 'IBAN',
    taxNo: isRTL ? 'الرقم الضريبي' : 'Tax No',
  };

  const formatMoney = (amount: number) => `${amount.toFixed(3)} ${data.currency}`;

  return `
<!DOCTYPE html>
<html lang="${isRTL ? 'ar' : 'en'}" dir="${direction}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.invoice} #${data.invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: ${fontFamily}; background: #f3f4f6; padding: 20px; color: #374151; }
    .invoice { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor}); color: white; padding: 32px; display: flex; justify-content: space-between; align-items: flex-start; }
    .header-left { text-align: ${isRTL ? 'right' : 'left'}; }
    .header-right { text-align: ${isRTL ? 'left' : 'right'}; }
    .logo { max-height: 48px; margin-bottom: 8px; }
    .company-name { font-size: 20px; font-weight: 700; }
    .company-details { font-size: 13px; opacity: 0.9; margin-top: 8px; line-height: 1.5; }
    .invoice-title { font-size: 28px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; }
    .invoice-number { font-size: 14px; margin-top: 8px; opacity: 0.9; }
    .body { padding: 32px; }
    .info-section { display: flex; justify-content: space-between; margin-bottom: 32px; gap: 24px; flex-wrap: wrap; }
    .info-block { flex: 1; min-width: 200px; }
    .info-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .info-value { font-size: 14px; line-height: 1.6; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .items-table th { background: #f9fafb; padding: 12px 16px; text-align: ${isRTL ? 'right' : 'left'}; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
    .items-table td { padding: 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    .items-table .qty, .items-table .price, .items-table .total { text-align: ${isRTL ? 'left' : 'right'}; white-space: nowrap; }
    .totals { margin-${isRTL ? 'right' : 'left'}: auto; width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .totals-row.grand { font-size: 18px; font-weight: 700; color: ${settings.primaryColor}; border-top: 2px solid #e5e7eb; padding-top: 16px; margin-top: 8px; }
    .footer { background: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb; }
    .footer-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; }
    .footer-section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 8px; }
    .footer-section-content { font-size: 13px; line-height: 1.6; }
    .notes { margin-top: 24px; padding: 16px; background: #fef3c7; border-radius: 8px; font-size: 13px; color: #92400e; }
    @media print { body { padding: 0; background: white; } .invoice { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="header-left">
        ${settings.logoUrl ? `<img src="${settings.logoUrl}" alt="${isRTL ? settings.companyNameAr : settings.companyName}" class="logo">` : ''}
        <div class="company-name">${isRTL ? settings.companyNameAr : settings.companyName}</div>
        <div class="company-details">
          ${isRTL ? settings.companyAddressAr : settings.companyAddress}<br>
          ${settings.companyPhone}<br>
          ${settings.companyEmail}
          ${settings.taxNumber ? `<br>${t.taxNo}: ${settings.taxNumber}` : ''}
        </div>
      </div>
      <div class="header-right">
        <div class="invoice-title">${t.invoice}</div>
        <div class="invoice-number">#${data.invoiceNumber}</div>
      </div>
    </div>
    
    <div class="body">
      <div class="info-section">
        <div class="info-block">
          <div class="info-label">${t.billTo}</div>
          <div class="info-value">
            <strong>${data.customerName}</strong><br>
            ${data.customerEmail ? data.customerEmail + '<br>' : ''}
            ${data.customerPhone ? data.customerPhone + '<br>' : ''}
            ${data.customerAddress || ''}
          </div>
        </div>
        <div class="info-block">
          <div class="info-label">${t.invoiceNo}</div>
          <div class="info-value" style="font-weight: 600;">${data.invoiceNumber}</div>
          <div class="info-label" style="margin-top: 16px;">${t.date}</div>
          <div class="info-value">${data.invoiceDate}</div>
          ${data.dueDate ? `<div class="info-label" style="margin-top: 16px;">${t.dueDate}</div><div class="info-value">${data.dueDate}</div>` : ''}
        </div>
      </div>
      
      <table class="items-table">
        <thead>
          <tr>
            <th>${t.description}</th>
            <th class="qty">${t.qty}</th>
            <th class="price">${t.unitPrice}</th>
            <th class="total">${t.total}</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => `
            <tr>
              <td>${item.description}</td>
              <td class="qty">${item.quantity}</td>
              <td class="price">${formatMoney(item.unitPrice)}</td>
              <td class="total">${formatMoney(item.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="totals">
        <div class="totals-row">
          <span>${t.subtotal}</span>
          <span>${formatMoney(data.subtotal)}</span>
        </div>
        ${data.discount ? `
        <div class="totals-row">
          <span>${t.discount}</span>
          <span>-${formatMoney(data.discount)}</span>
        </div>
        ` : ''}
        ${data.tax ? `
        <div class="totals-row">
          <span>${t.tax}</span>
          <span>${formatMoney(data.tax)}</span>
        </div>
        ` : ''}
        <div class="totals-row grand">
          <span>${t.grandTotal}</span>
          <span>${formatMoney(data.total)}</span>
        </div>
      </div>
      
      ${data.notes ? `<div class="notes">${data.notes}</div>` : ''}
    </div>
    
    ${settings.bankName || settings.bankAccount || settings.bankIban ? `
    <div class="footer">
      <div class="footer-grid">
        <div>
          <div class="footer-section-title">${t.bankDetails}</div>
          <div class="footer-section-content">
            ${settings.bankName ? `${t.bankName}: ${settings.bankName}<br>` : ''}
            ${settings.bankAccount ? `${t.accountNo}: ${settings.bankAccount}<br>` : ''}
            ${settings.bankIban ? `${t.iban}: ${settings.bankIban}` : ''}
          </div>
        </div>
        <div>
          <div class="footer-section-content" style="text-align: center; color: #9ca3af; font-style: italic;">
            ${isRTL ? settings.footerNotesAr : settings.footerNotes}
          </div>
        </div>
      </div>
    </div>
    ` : ''}
  </div>
</body>
</html>
  `.trim();
}
