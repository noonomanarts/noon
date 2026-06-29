import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import type { CompanyOrderDetail } from '@/lib/db/companies';
import type { InvoiceTemplateSettings } from '@/lib/adminSettings';

const PURPLE = rgb(0.42, 0.13, 0.55);
const DARK = rgb(0.15, 0.12, 0.12);
const GREY = rgb(0.45, 0.45, 0.45);
const LIGHT = rgb(0.9, 0.9, 0.9);

function money(amount: number, currency: string): string {
  return `${amount.toFixed(3)} ${currency}`;
}

async function loadLogo(doc: PDFDocument, logoUrl: string) {
  if (!logoUrl) return null;
  try {
    const rel = logoUrl.replace(/^\//, '');
    const candidates = [path.join(process.cwd(), 'public', rel), path.join(process.cwd(), rel)];
    for (const file of candidates) {
      if (!/\.(png|jpe?g)$/i.test(file)) continue;
      const bytes = await fs.readFile(file).catch(() => null);
      if (!bytes) continue;
      return /\.png$/i.test(file) ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    }
  } catch {
    // ignore logo errors, fall back to text
  }
  return null;
}

export async function generateCompanyInvoicePdf(
  order: CompanyOrderDetail,
  settings: InvoiceTemplateSettings
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { width } = page.getSize();
  const left = 50;
  const right = width - 50;
  let y = 780;

  const logo = await loadLogo(doc, settings.logoUrl);
  if (logo) {
    const dims = logo.scaleToFit(90, 60);
    page.drawImage(logo, { x: left, y: y - dims.height + 20, width: dims.width, height: dims.height });
  } else {
    page.drawText(settings.companyName, { x: left, y, size: 16, font: bold, color: PURPLE });
  }

  const crText = settings.taxNumber ? `${settings.companyName}, C.R:${settings.taxNumber}` : settings.companyName;
  page.drawText(crText, { x: right - bold.widthOfTextAtSize(crText, 9), y: y + 5, size: 9, font: bold, color: DARK });

  y -= 40;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 2, color: PURPLE });

  y -= 45;
  page.drawText('INVOICE', { x: left, y, size: 32, font: bold, color: DARK });
  page.drawText(`Invoice No. ${order.invoiceNumber}`, { x: right - 130, y: y + 12, size: 10, font, color: DARK });
  page.drawText(`Date: ${order.invoiceDate.slice(0, 10)}`, { x: right - 130, y: y, size: 10, font, color: DARK });

  y -= 45;
  page.drawText(`Bill To: ${order.companyName}`, { x: left, y, size: 13, font, color: DARK });

  // Table header
  y -= 35;
  const cols = { desc: left + 8, qty: 320, price: 410, amount: right - 8 };
  page.drawRectangle({ x: left, y: y - 8, width: right - left, height: 26, color: PURPLE });
  page.drawText('DESCRIPTION', { x: cols.desc, y, size: 9, font: bold, color: rgb(1, 1, 1) });
  page.drawText('QTY', { x: cols.qty, y, size: 9, font: bold, color: rgb(1, 1, 1) });
  page.drawText('PRICE', { x: cols.price, y, size: 9, font: bold, color: rgb(1, 1, 1) });
  page.drawText('AMOUNT', { x: cols.amount - bold.widthOfTextAtSize('AMOUNT', 9), y, size: 9, font: bold, color: rgb(1, 1, 1) });

  y -= 30;
  let total = 0;
  for (const pkg of order.packages) {
    const lineTotal = pkg.price * pkg.quantity;
    total += lineTotal;
    page.drawText(pkg.name, { x: cols.desc, y, size: 11, font: bold, color: DARK });
    page.drawText(String(pkg.quantity), { x: cols.qty, y, size: 11, font, color: DARK });
    page.drawText(pkg.price.toFixed(3), { x: cols.price, y, size: 11, font, color: DARK });
    const amt = lineTotal.toFixed(3);
    page.drawText(amt, { x: cols.amount - font.widthOfTextAtSize(amt, 11), y, size: 11, font: bold, color: DARK });
    y -= 16;
    if (pkg.description) {
      const lines = pkg.description.split('\n');
      for (const ln of lines) {
        page.drawText(ln.slice(0, 80), { x: cols.desc, y, size: 8.5, font, color: GREY });
        y -= 12;
      }
    }
    y -= 6;
  }

  y -= 6;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1.5, color: PURPLE });

  // Total
  y -= 30;
  page.drawText('TOTAL', { x: 400, y, size: 11, font: bold, color: DARK });
  page.drawRectangle({ x: 450, y: y - 6, width: right - 450, height: 22, color: PURPLE });
  const totalText = money(total, order.currency);
  page.drawText(totalText, { x: 460, y, size: 11, font: bold, color: rgb(1, 1, 1) });

  // Payment through
  y -= 60;
  page.drawText('Payment through:', { x: left, y, size: 11, font: bold, color: DARK });
  y -= 22;
  const bankLines = [
    settings.bankName ? `Name: ${settings.bankName}` : null,
    settings.bankAccount ? `Account Number: ${settings.bankAccount}` : null,
    settings.bankIban ? `IBAN: ${settings.bankIban}` : null,
  ].filter((l): l is string => Boolean(l));
  for (const ln of bankLines) {
    page.drawText(ln, { x: left, y, size: 10, font, color: DARK });
    y -= 16;
  }

  // Footer
  page.drawLine({ start: { x: left, y: 70 }, end: { x: right, y: 70 }, thickness: 0.5, color: LIGHT });
  page.drawText(settings.companyPhone, { x: left, y: 55, size: 9, font, color: GREY });
  const web = settings.companyEmail;
  page.drawText(web, { x: right - font.widthOfTextAtSize(web, 9), y: 55, size: 9, font, color: GREY });

  return doc.save();
}
