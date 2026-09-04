'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/lib/locale';
import type { CompanyOrderDetail, CompanyCostType, CompanyPaymentMethod } from '@/lib/db/companies';
import type { InventoryCatalogItem } from '@/lib/db/inventory';

const PAYMENT_METHODS: CompanyPaymentMethod[] = ['BANK_TRANSFER', 'CARD', 'CASH', 'PAYMENT_LINK'];

export default function CompanyDetailClient({ locale, order: initial, inventory }: { locale: Locale; order: CompanyOrderDetail; inventory: InventoryCatalogItem[] }) {
  const router = useRouter();
  const isAr = locale === 'ar';
  const [order, setOrder] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const closed = order.status === 'CLOSED';

  const [costTitle, setCostTitle] = useState('');
  const [costType, setCostType] = useState<CompanyCostType>('DIRECT_BILL');
  const [costAmount, setCostAmount] = useState(0);
  const [costItem, setCostItem] = useState('');
  const [costNotes, setCostNotes] = useState('');

  type PkgRow = { name: string; description: string; quantity: number; price: number };
  const [pkgRows, setPkgRows] = useState<PkgRow[]>(() =>
    initial.packages.length > 0
      ? initial.packages.map((p) => ({ name: p.name, description: p.description ?? '', quantity: p.quantity, price: p.price }))
      : [{ name: '', description: '', quantity: 1, price: 0 }]
  );
  const pkgTotal = pkgRows.reduce(
    (sum, p) => sum + (Number.isFinite(p.price) ? Math.max(0, p.price) : 0) * Math.max(1, p.quantity || 1),
    0
  );

  const t = {
    invoice: isAr ? 'فاتورة' : 'Invoice',
    total: isAr ? 'الإجمالي' : 'Total',
    cost: isAr ? 'التكلفة' : 'Costs',
    profit: isAr ? 'الربح' : 'Profit',
    addCost: isAr ? 'إضافة تكلفة' : 'Add cost',
    direct: isAr ? 'فاتورة مباشرة' : 'Direct bill',
    inv: isAr ? 'خصم من قيمة المخزون' : 'Cut from inventory value',
    title: isAr ? 'العنوان' : 'Title',
    amount: isAr ? 'المبلغ' : 'Amount',
    item: isAr ? 'الصنف' : 'Item',
    qty: isAr ? 'الكمية' : 'Qty',
    notes: isAr ? 'ملاحظات' : 'Notes',
    pkgName: isAr ? 'اسم الباقة' : 'Package name',
    pkgDesc: isAr ? 'الوصف' : 'Description',
    price: isAr ? 'السعر (OMR)' : 'Price (OMR)',
    addPkg: isAr ? 'إضافة باقة' : 'Add package',
    savePkgs: isAr ? 'حفظ الإيراد' : 'Save revenue',
    revenueHint: isAr
      ? 'إيراد المشروع = مجموع (السعر × الكمية) للباقات. أدخل مبلغ الحملة هنا ليحتسب الربح بشكل صحيح.'
      : 'Project revenue = sum of (price × qty) of the packages below. Enter the campaign amount here so profit is calculated correctly.',
    attach: isAr ? 'مرفقات داخلية' : 'Internal attachments',
    viewInvoice: isAr ? 'عرض الفاتورة' : 'View invoice',
    sendWa: isAr ? 'إرسال عبر واتساب' : 'Send invoice on WhatsApp',
    markPaid: isAr ? 'تحديد كمدفوع' : 'Mark as paid',
    close: isAr ? 'إغلاق المشروع' : 'Close project',
    closed: isAr ? 'مغلق' : 'Closed',
    paid: isAr ? 'مدفوع' : 'Paid',
  };

  async function api(url: string, opts?: RequestInit) {
    setBusy(true); setError(null);
    const res = await fetch(url, opts);
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error || 'Failed'); return null; }
    if (data.order) setOrder(data.order);
    router.refresh();
    return data;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">{order.companyName} <span className="text-purple-600">#{order.invoiceNumber}</span></h1>
        <div className="flex gap-2 text-xs">
          {closed && <span className="rounded-full bg-zinc-600 px-3 py-1 text-white">{t.closed}</span>}
          {order.isPaid && <span className="rounded-full bg-green-600 px-3 py-1 text-white">{t.paid}</span>}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t.total} value={`${order.totalAmount.toFixed(3)} ${order.currency}`} />
        <Stat label={t.cost} value={`${order.totalCost.toFixed(3)} ${order.currency}`} />
        <Stat label={t.profit} value={`${order.profit.toFixed(3)} ${order.currency}`} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <a href={`/api/admin/companies/${order.id}/invoice`} target="_blank" rel="noreferrer" className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white">{t.viewInvoice}</a>
        <button disabled={busy || !order.phone} onClick={() => api(`/api/admin/companies/${order.id}/whatsapp`, { method: 'POST' })} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{t.sendWa}</button>
        {!closed && <button disabled={busy} onClick={() => confirmClose ? api(`/api/admin/companies/${order.id}/close`, { method: 'POST' }) : setConfirmClose(true)} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{confirmClose ? (isAr ? 'تأكيد الإغلاق' : 'Confirm close') : t.close}</button>}
      </div>

      {!order.isPaid && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm">{t.markPaid}:</span>
          {PAYMENT_METHODS.map((m) => (
            <button key={m} disabled={busy} onClick={() => api(`/api/admin/companies/${order.id}/mark-paid`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method: m }) })} className="rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-xs">{m.replace('_', ' ')}</button>
          ))}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <h2 className="mt-6 mb-2 font-semibold">{t.invoice}</h2>
      <div className="rounded-xl border border-[color:var(--border)] p-3 text-sm">
        {closed ? (
          order.packages.map((p) => (
            <div key={p.id} className="flex justify-between border-b border-[color:var(--border)] py-1.5 last:border-0">
              <span>{p.name} x{p.quantity}</span><span>{(p.price * p.quantity).toFixed(3)}</span>
            </div>
          ))
        ) : (
          <>
            <p className="mb-3 text-xs text-[color:var(--text-muted)]">{t.revenueHint}</p>
            <div className="mb-1 hidden gap-2 text-xs font-medium text-[color:var(--text-muted)] sm:grid sm:grid-cols-[2fr_3fr_70px_100px_auto]">
              <span>{t.pkgName}</span>
              <span>{t.pkgDesc}</span>
              <span>{t.qty}</span>
              <span>{t.price}</span>
              <span />
            </div>
            {pkgRows.map((p, i) => (
              <div key={i} className="mb-2 grid gap-2 sm:grid-cols-[2fr_3fr_70px_100px_auto]">
                <input value={p.name} onChange={(e) => setPkgRows((arr) => arr.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder={t.pkgName} className="rounded-lg border border-[color:var(--border)] bg-transparent px-3 py-2" />
                <input value={p.description} onChange={(e) => setPkgRows((arr) => arr.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} placeholder={t.pkgDesc} className="rounded-lg border border-[color:var(--border)] bg-transparent px-3 py-2" />
                <input type="number" min="1" value={p.quantity} onChange={(e) => setPkgRows((arr) => arr.map((x, j) => j === i ? { ...x, quantity: Number(e.target.value) } : x))} aria-label={t.qty} title={t.qty} className="rounded-lg border border-[color:var(--border)] bg-transparent px-3 py-2" />
                <input type="number" min="0" step="0.001" value={p.price} onChange={(e) => setPkgRows((arr) => arr.map((x, j) => j === i ? { ...x, price: Number(e.target.value) } : x))} aria-label={t.price} title={t.price} className="rounded-lg border border-[color:var(--border)] bg-transparent px-3 py-2" />
                <button onClick={() => setPkgRows((arr) => arr.length > 1 ? arr.filter((_, j) => j !== i) : arr)} className="px-2 text-red-500">x</button>
              </div>
            ))}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <button onClick={() => setPkgRows((arr) => [...arr, { name: '', description: '', quantity: 1, price: 0 }])} className="text-sm text-purple-600">+ {t.addPkg}</button>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">{t.total}: {pkgTotal.toFixed(3)} {order.currency}</span>
                <button
                  disabled={busy}
                  onClick={() => api(`/api/admin/companies/${order.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ packages: pkgRows }),
                  })}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {t.savePkgs}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <h2 className="mt-6 mb-2 font-semibold">{t.cost}</h2>
      <div className="rounded-xl border border-[color:var(--border)] p-3 text-sm">
        {order.costs.map((c) => (
          <div key={c.id} className="flex items-center justify-between border-b border-[color:var(--border)] py-1.5 last:border-0">
            <span>{c.title} <span className="text-[color:var(--text-muted)]">({c.costType === 'INVENTORY_CUT' ? `${c.inventoryItemName} · ${c.amount.toFixed(3)}` : t.direct})</span></span>
            <span className="flex gap-3">{c.amount.toFixed(3)} {!closed && <button onClick={() => api(`/api/admin/companies/${order.id}/costs?costId=${c.id}`, { method: 'DELETE' })} className="text-red-500">x</button>}</span>
          </div>
        ))}
        {!closed && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input value={costTitle} onChange={(e) => setCostTitle(e.target.value)} placeholder={t.title} className="rounded-lg border border-[color:var(--border)] bg-transparent px-3 py-2" />
            <select value={costType} onChange={(e) => setCostType(e.target.value as CompanyCostType)} className="rounded-lg border border-[color:var(--border)] bg-transparent px-3 py-2">
              <option value="DIRECT_BILL">{t.direct}</option>
              <option value="INVENTORY_CUT">{t.inv}</option>
            </select>
            {costType === 'INVENTORY_CUT' ? (
              <>
                <select value={costItem} onChange={(e) => setCostItem(e.target.value)} className="rounded-lg border border-[color:var(--border)] bg-transparent px-3 py-2">
                  <option value="">{t.item}</option>
                  {inventory.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.currentStock} {i.unit})</option>)}
                </select>
                <input type="number" min="0.001" step="0.001" value={costAmount || ''} onChange={(e) => setCostAmount(Number(e.target.value))} placeholder={t.amount} aria-label={t.amount} className="rounded-lg border border-[color:var(--border)] bg-transparent px-3 py-2" />
              </>
            ) : (
              <input type="number" value={costAmount} onChange={(e) => setCostAmount(Number(e.target.value))} placeholder={t.amount} className="rounded-lg border border-[color:var(--border)] bg-transparent px-3 py-2" />
            )}
            <input value={costNotes} onChange={(e) => setCostNotes(e.target.value)} placeholder={t.notes} className="rounded-lg border border-[color:var(--border)] bg-transparent px-3 py-2 sm:col-span-2" />
            <button disabled={busy} onClick={() => api(`/api/admin/companies/${order.id}/costs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: costTitle, costType, amount: costAmount, inventoryItemId: costItem || null, notes: costNotes }) }).then((result) => { if (result) { setCostTitle(''); setCostAmount(0); setCostItem(''); setCostNotes(''); } })} className="rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white sm:col-span-2">{t.addCost}</button>
          </div>
        )}
      </div>

      <h2 className="mt-6 mb-2 font-semibold">{t.attach}</h2>
      <div className="rounded-xl border border-[color:var(--border)] p-3 text-sm">
        {order.attachments.map((a) => (
          <div key={a.id} className="flex justify-between py-1">
            <a href={a.fileUrl} target="_blank" rel="noreferrer" className="text-purple-600">{a.fileName}</a>
            <button onClick={() => api(`/api/admin/companies/${order.id}/attachments?attachmentId=${a.id}`, { method: 'DELETE' })} className="text-red-500">x</button>
          </div>
        ))}
        <input type="file" disabled={busy} onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const fd = new FormData(); fd.append('file', f); await api(`/api/admin/companies/${order.id}/attachments`, { method: 'POST', body: fd }); }} className="mt-2 text-xs" />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
      <p className="text-xs text-[color:var(--text-muted)]">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
