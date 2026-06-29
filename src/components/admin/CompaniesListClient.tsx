'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/lib/locale';
import type { CompanyOrder } from '@/lib/db/companies';

type PackageRow = { name: string; description: string; quantity: number; price: number };

export default function CompaniesListClient({ locale, initialOrders }: { locale: Locale; initialOrders: CompanyOrder[] }) {
  const router = useRouter();
  const isAr = locale === 'ar';
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [packages, setPackages] = useState<PackageRow[]>([{ name: '', description: '', quantity: 1, price: 0 }]);

  const t = {
    title: isAr ? 'الشركات' : 'Companies',
    add: isAr ? 'شركة جديدة' : 'New Company',
    company: isAr ? 'اسم الشركة' : 'Company name',
    contact: isAr ? 'اسم جهة الاتصال' : 'Contact person',
    email: 'Email',
    phone: isAr ? 'الهاتف' : 'Phone',
    packages: isAr ? 'الباقات' : 'Packages',
    pkgName: isAr ? 'اسم الباقة' : 'Package name',
    desc: isAr ? 'الوصف' : 'Description',
    qty: isAr ? 'الكمية' : 'Qty',
    price: isAr ? 'السعر' : 'Price',
    addPkg: isAr ? 'إضافة باقة' : 'Add package',
    save: isAr ? 'حفظ' : 'Create',
    invoice: isAr ? 'فاتورة' : 'Invoice',
    total: isAr ? 'الإجمالي' : 'Total',
    status: isAr ? 'الحالة' : 'Status',
    paid: isAr ? 'مدفوع' : 'Paid',
    empty: isAr ? 'لا توجد شركات بعد' : 'No companies yet',
  };

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await fetch('/api/admin/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName, contactName, email, phone, packages }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed');
      return;
    }
    const data = await res.json();
    router.push(`/${locale}/admin/companies/${data.id}`);
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[color:var(--text)]">{t.title}</h1>
        <button onClick={() => setShowForm((v) => !v)} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">
          {t.add}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder={t.company} className="rounded-lg border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm" />
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder={t.contact} className="rounded-lg border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.email} className="rounded-lg border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.phone} className="rounded-lg border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm" />
          </div>
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold">{t.packages}</p>
            {packages.map((p, i) => (
              <div key={i} className="mb-2 grid gap-2 sm:grid-cols-[2fr_3fr_70px_90px_auto]">
                <input value={p.name} onChange={(e) => setPackages((arr) => arr.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder={t.pkgName} className="rounded-lg border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm" />
                <input value={p.description} onChange={(e) => setPackages((arr) => arr.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} placeholder={t.desc} className="rounded-lg border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm" />
                <input type="number" value={p.quantity} onChange={(e) => setPackages((arr) => arr.map((x, j) => j === i ? { ...x, quantity: Number(e.target.value) } : x))} placeholder={t.qty} className="rounded-lg border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm" />
                <input type="number" value={p.price} onChange={(e) => setPackages((arr) => arr.map((x, j) => j === i ? { ...x, price: Number(e.target.value) } : x))} placeholder={t.price} className="rounded-lg border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm" />
                <button onClick={() => setPackages((arr) => arr.filter((_, j) => j !== i))} className="px-2 text-red-500">x</button>
              </div>
            ))}
            <button onClick={() => setPackages((arr) => [...arr, { name: '', description: '', quantity: 1, price: 0 }])} className="text-sm text-purple-600">+ {t.addPkg}</button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button onClick={submit} disabled={saving || !companyName.trim()} className="mt-4 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{t.save}</button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[color:var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-purple-600 text-white">
            <tr>
              <th className="px-3 py-2 text-start">{t.invoice}</th>
              <th className="px-3 py-2 text-start">{t.company}</th>
              <th className="px-3 py-2 text-start">{t.total}</th>
              <th className="px-3 py-2 text-start">{t.status}</th>
              <th className="px-3 py-2 text-start">{t.paid}</th>
            </tr>
          </thead>
          <tbody>
            {initialOrders.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-[color:var(--text-muted)]">{t.empty}</td></tr>
            )}
            {initialOrders.map((o) => (
              <tr key={o.id} className="border-t border-[color:var(--border)] hover:bg-[color:var(--muted)]">
                <td className="px-3 py-2"><Link href={`/${locale}/admin/companies/${o.id}`} className="font-semibold text-purple-600">#{o.invoiceNumber}</Link></td>
                <td className="px-3 py-2">{o.companyName}</td>
                <td className="px-3 py-2">{o.totalAmount.toFixed(3)} {o.currency}</td>
                <td className="px-3 py-2">{o.status === 'CLOSED' ? (isAr ? 'مغلق' : 'Closed') : (isAr ? 'مفتوح' : 'Open')}</td>
                <td className="px-3 py-2">{o.isPaid ? '✓' : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
