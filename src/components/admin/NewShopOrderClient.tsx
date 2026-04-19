'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/lib/locale';
import { formatAmountWithCurrency } from '@/lib/formatNumber';

type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
};

type AdminProduct = {
  id: string;
  name_en: string;
  name_ar: string;
  price: number;
  currency: string;
  stock_quantity: number;
  is_active: boolean;
  image: string | null;
  category_name_en: string;
  category_name_ar: string;
};

type CartLine = {
  productId: string;
  quantity: number;
};

type FulfillmentType = 'DELIVERY' | 'PICKUP';
type PaymentMethod = 'BANK_TRANSFER' | 'PAYMENT_LINK' | 'CASH';

export default function NewShopOrderClient({ locale }: { locale: Locale }) {
  const isArabic = locale === 'ar';
  const router = useRouter();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [productQuery, setProductQuery] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);

  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('PICKUP');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');

  const [shippingFee, setShippingFee] = useState('0');
  const [recipientFullName, setRecipientFullName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [area, setArea] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [notes, setNotes] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = {
    title: isArabic ? 'إنشاء طلب جديد' : 'Create New Order',
    back: isArabic ? 'رجوع للطلبات' : 'Back to Orders',
    customer: isArabic ? 'العميل' : 'Customer',
    searchCustomer: isArabic ? 'بحث عميل (الاسم/الإيميل/الهاتف)' : 'Search customer (name/email/phone)',
    selectCustomer: isArabic ? '— اختر عميلاً —' : '— Select a customer —',
    products: isArabic ? 'المنتجات' : 'Products',
    searchProducts: isArabic ? 'بحث منتج' : 'Search product',
    addToCart: isArabic ? 'إضافة' : 'Add',
    stock: isArabic ? 'المخزون' : 'Stock',
    price: isArabic ? 'السعر' : 'Price',
    cart: isArabic ? 'الأصناف المختارة' : 'Selected Items',
    quantity: isArabic ? 'الكمية' : 'Qty',
    remove: isArabic ? 'حذف' : 'Remove',
    fulfillment: isArabic ? 'طريقة الاستلام' : 'Fulfillment',
    pickup: isArabic ? 'استلام من نون' : 'Pickup from Noon',
    delivery: isArabic ? 'توصيل' : 'Delivery',
    payment: isArabic ? 'طريقة الدفع' : 'Payment Method',
    bankTransfer: isArabic ? 'تحويل بنكي' : 'Bank Transfer',
    paymentLink: isArabic ? 'رابط الدفع' : 'Payment Link',
    cash: isArabic ? 'نقداً' : 'Cash',
    recipient: isArabic ? 'اسم المستلم' : 'Recipient name',
    phone: isArabic ? 'الهاتف' : 'Phone',
    area: isArabic ? 'المنطقة' : 'Area',
    streetAddress: isArabic ? 'العنوان' : 'Street address',
    postalCode: isArabic ? 'الرمز البريدي' : 'Postal code',
    shippingFee: isArabic ? 'رسوم التوصيل' : 'Shipping fee',
    notes: isArabic ? 'ملاحظات للعميل' : 'Customer notes',
    adminNotes: isArabic ? 'ملاحظات داخلية' : 'Admin notes',
    subtotal: isArabic ? 'المجموع الفرعي' : 'Subtotal',
    total: isArabic ? 'الإجمالي' : 'Total',
    submit: isArabic ? 'إنشاء الطلب' : 'Create Order',
    submitting: isArabic ? 'جارٍ الإنشاء...' : 'Creating...',
    noCart: isArabic ? 'لم تتم إضافة منتجات بعد.' : 'No products added yet.',
    noProducts: isArabic ? 'لا توجد نتائج.' : 'No products found.',
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch('/api/admin/users?status=ACTIVE&role=CUSTOMER&limit=800', { cache: 'no-store' });
        const payload = (await response.json().catch(() => ({}))) as { users?: AdminUser[] };
        if (active && response.ok) {
          setUsers(Array.isArray(payload.users) ? payload.users : []);
        }
      } catch {
        if (active) setUsers([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch('/api/admin/shop/products?includeInactive=false', { cache: 'no-store' });
        const payload = (await response.json().catch(() => ({}))) as { products?: AdminProduct[] };
        if (active && response.ok) {
          setProducts(Array.isArray(payload.products) ? payload.products : []);
        }
      } catch {
        if (active) setProducts([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  useEffect(() => {
    if (selectedUser) {
      if (!recipientFullName) setRecipientFullName(selectedUser.fullName || '');
      if (!recipientPhone) setRecipientPhone(selectedUser.phoneNumber || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser]);

  const filteredUsers = useMemo(() => {
    const term = userQuery.trim().toLowerCase();
    if (!term) return users.slice(0, 100);
    return users
      .filter(
        (user) =>
          user.fullName.toLowerCase().includes(term)
          || user.email.toLowerCase().includes(term)
          || user.phoneNumber.toLowerCase().includes(term)
      )
      .slice(0, 100);
  }, [users, userQuery]);

  const filteredProducts = useMemo(() => {
    const term = productQuery.trim().toLowerCase();
    const list = products.filter((product) => product.is_active && product.stock_quantity > 0);
    if (!term) return list.slice(0, 50);
    return list
      .filter(
        (product) =>
          product.name_en.toLowerCase().includes(term)
          || product.name_ar.toLowerCase().includes(term)
          || product.category_name_en.toLowerCase().includes(term)
          || product.category_name_ar.toLowerCase().includes(term)
      )
      .slice(0, 50);
  }, [products, productQuery]);

  const productMap = useMemo(() => {
    const map = new Map<string, AdminProduct>();
    for (const product of products) map.set(product.id, product);
    return map;
  }, [products]);

  const addProduct = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((line) => line.productId === productId);
      if (existing) {
        const product = productMap.get(productId);
        const max = product ? product.stock_quantity : existing.quantity + 1;
        return prev.map((line) =>
          line.productId === productId
            ? { ...line, quantity: Math.min(max, line.quantity + 1) }
            : line
        );
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, value: number) => {
    const product = productMap.get(productId);
    const max = product ? product.stock_quantity : 1;
    const qty = Math.max(1, Math.min(max, Math.trunc(value) || 1));
    setCart((prev) => prev.map((line) => (line.productId === productId ? { ...line, quantity: qty } : line)));
  };

  const removeProduct = (productId: string) => {
    setCart((prev) => prev.filter((line) => line.productId !== productId));
  };

  const cartLines = useMemo(() => {
    return cart.map((line) => {
      const product = productMap.get(line.productId);
      const unitPrice = product ? product.price : 0;
      return {
        productId: line.productId,
        product,
        quantity: line.quantity,
        unitPrice,
        lineTotal: Number((unitPrice * line.quantity).toFixed(3)),
      };
    });
  }, [cart, productMap]);

  const subtotal = useMemo(
    () => Number(cartLines.reduce((sum, line) => sum + line.lineTotal, 0).toFixed(3)),
    [cartLines]
  );

  const shippingFeeNumber = useMemo(() => {
    if (fulfillmentType === 'PICKUP') return 0;
    const value = Number(shippingFee);
    return Number.isFinite(value) && value > 0 ? Number(value.toFixed(3)) : 0;
  }, [shippingFee, fulfillmentType]);

  const totalAmount = useMemo(() => Number((subtotal + shippingFeeNumber).toFixed(3)), [subtotal, shippingFeeNumber]);

  const currency = cartLines[0]?.product?.currency ?? 'OMR';

  const canSubmit =
    !submitting
    && selectedUserId.length > 0
    && cart.length > 0
    && (fulfillmentType === 'PICKUP'
      || (recipientFullName.trim().length > 0 && recipientPhone.trim().length > 0 && area.trim().length > 0 && streetAddress.trim().length > 0));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/shop/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          fulfillmentType,
          paymentMethod,
          shippingFee: shippingFeeNumber,
          recipientFullName: recipientFullName.trim() || undefined,
          recipientPhone: recipientPhone.trim() || undefined,
          area: area.trim() || undefined,
          streetAddress: streetAddress.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
          notes: notes.trim() || undefined,
          adminNotes: adminNotes.trim() || undefined,
          items: cart,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        order?: { id: string };
        error?: string;
      };

      if (!response.ok || !payload.order) {
        throw new Error(payload.error || 'Failed to create order');
      }

      router.push(`/${locale}/admin/shop/orders/${payload.order.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to create order');
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t.title}</h1>
        <Link
          href={`/${locale}/admin/shop/orders`}
          className="text-sm font-medium text-[color:var(--noon-teal)] hover:underline"
        >
          ← {t.back}
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">{t.customer}</h2>
            <input
              type="text"
              value={userQuery}
              onChange={(event) => setUserQuery(event.target.value)}
              placeholder={t.searchCustomer}
              className={inputClass}
            />
            <select
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              className={inputClass}
            >
              <option value="">{t.selectCustomer}</option>
              {filteredUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName} — {user.phoneNumber || user.email}
                </option>
              ))}
            </select>
          </section>

          <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">{t.products}</h2>
            <input
              type="text"
              value={productQuery}
              onChange={(event) => setProductQuery(event.target.value)}
              placeholder={t.searchProducts}
              className={inputClass}
            />
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.noProducts}</p>
              ) : (
                filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-xs dark:border-zinc-700"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                        {isArabic ? product.name_ar : product.name_en}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {t.price}: {formatAmountWithCurrency(product.price, product.currency)} • {t.stock}: {product.stock_quantity}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addProduct(product.id)}
                      className="rounded-lg bg-[color:var(--noon-teal)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                    >
                      + {t.addToCart}
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">{t.cart}</h2>
            {cartLines.length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.noCart}</p>
            ) : (
              <div className="space-y-2">
                {cartLines.map((line) => (
                  <div
                    key={line.productId}
                    className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-xs dark:border-zinc-700"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                        {line.product ? (isArabic ? line.product.name_ar : line.product.name_en) : '—'}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {formatAmountWithCurrency(line.unitPrice, currency)} × {line.quantity} ={' '}
                        <strong>{formatAmountWithCurrency(line.lineTotal, currency)}</strong>
                      </p>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={line.product?.stock_quantity ?? 999}
                      value={line.quantity}
                      onChange={(event) => updateQuantity(line.productId, Number(event.target.value))}
                      className="w-20 rounded-lg border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => removeProduct(line.productId)}
                      className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/20"
                    >
                      {t.remove}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">{t.fulfillment}</h2>
            <div className="grid grid-cols-2 gap-2">
              {(['PICKUP', 'DELIVERY'] as FulfillmentType[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFulfillmentType(option)}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    fulfillmentType === option
                      ? 'border-[color:var(--noon-teal)] bg-[color:var(--noon-teal)]/10 text-[color:var(--noon-teal)]'
                      : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  {option === 'PICKUP' ? t.pickup : t.delivery}
                </button>
              ))}
            </div>

            {fulfillmentType === 'DELIVERY' && (
              <div className="space-y-2 pt-2">
                <input
                  type="text"
                  value={recipientFullName}
                  onChange={(event) => setRecipientFullName(event.target.value)}
                  placeholder={t.recipient}
                  className={inputClass}
                />
                <input
                  type="text"
                  value={recipientPhone}
                  onChange={(event) => setRecipientPhone(event.target.value)}
                  placeholder={t.phone}
                  className={inputClass}
                />
                <input
                  type="text"
                  value={area}
                  onChange={(event) => setArea(event.target.value)}
                  placeholder={t.area}
                  className={inputClass}
                />
                <textarea
                  value={streetAddress}
                  onChange={(event) => setStreetAddress(event.target.value)}
                  placeholder={t.streetAddress}
                  rows={2}
                  className={inputClass}
                />
                <input
                  type="text"
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value)}
                  placeholder={t.postalCode}
                  className={inputClass}
                />
                <input
                  type="number"
                  step="0.001"
                  min={0}
                  value={shippingFee}
                  onChange={(event) => setShippingFee(event.target.value)}
                  placeholder={t.shippingFee}
                  className={inputClass}
                />
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">{t.payment}</h2>
            <div className="grid gap-2">
              {(['BANK_TRANSFER', 'PAYMENT_LINK', 'CASH'] as PaymentMethod[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPaymentMethod(option)}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    paymentMethod === option
                      ? 'border-[color:var(--noon-teal)] bg-[color:var(--noon-teal)]/10 text-[color:var(--noon-teal)]'
                      : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  {option === 'BANK_TRANSFER' ? t.bankTransfer : option === 'PAYMENT_LINK' ? t.paymentLink : t.cash}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t.notes}
              rows={2}
              className={inputClass}
            />
            <textarea
              value={adminNotes}
              onChange={(event) => setAdminNotes(event.target.value)}
              placeholder={t.adminNotes}
              rows={2}
              className={inputClass}
            />
          </section>

          <section className="space-y-2 rounded-xl border border-zinc-200 bg-white p-5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
              <span>{t.subtotal}</span>
              <span>{formatAmountWithCurrency(subtotal, currency)}</span>
            </div>
            {fulfillmentType === 'DELIVERY' && (
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
                <span>{t.shippingFee}</span>
                <span>{formatAmountWithCurrency(shippingFeeNumber, currency)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-zinc-200 pt-2 text-base font-bold text-zinc-900 dark:border-zinc-700 dark:text-white">
              <span>{t.total}</span>
              <span>{formatAmountWithCurrency(totalAmount, currency)}</span>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="mt-4 w-full rounded-xl bg-[color:var(--noon-teal)] px-4 py-3 text-sm font-bold text-white shadow hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? t.submitting : t.submit}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
