'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { Locale } from '@/lib/locale';
import { formatAmountWithCurrency } from '@/lib/formatNumber';

type CartApiItem = {
  productId: string;
  quantity: number;
  lineTotal: number;
  product: {
    id: string;
    slug: string;
    name_en: string;
    name_ar: string;
    image: string | null;
    price: number;
    currency: string;
    stock_quantity: number;
    category_name_en: string;
    category_name_ar: string;
    category_slug: string;
  };
};

type CartPayload = {
  items: CartApiItem[];
  summary: {
    totalQuantity: number;
    subtotal: number;
    currency: string;
  };
};

export default function CartPageClient({ locale }: { locale: Locale }) {
  const isArabic = locale === 'ar';
  const [loading, setLoading] = useState(true);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [payload, setPayload] = useState<CartPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const t = {
    title: isArabic ? 'السلة' : 'Shopping Cart',
    subtitle: isArabic ? 'محصولات انتخاب‌شده را بررسی و برای پرداخت آماده کنید.' : 'Review your selected products and continue to checkout.',
    empty: isArabic ? 'السلة فارغة حالياً.' : 'Your cart is currently empty.',
    backToShop: isArabic ? 'العودة للمتجر' : 'Back to shop',
    category: isArabic ? 'التصنيف' : 'Category',
    qty: isArabic ? 'الكمية' : 'Quantity',
    price: isArabic ? 'السعر' : 'Price',
    total: isArabic ? 'الإجمالي' : 'Total',
    remove: isArabic ? 'حذف' : 'Remove',
    subtotal: isArabic ? 'الإجمالي الفرعي' : 'Subtotal',
    proceedCheckout: isArabic ? 'المتابعة إلى الدفع' : 'Proceed to checkout',
    increase: isArabic ? 'زيادة' : 'Increase',
    decrease: isArabic ? 'تقليل' : 'Decrease',
    loading: isArabic ? 'جاري تحميل السلة...' : 'Loading cart...',
    noImage: isArabic ? 'بدون صورة' : 'No image',
    items: isArabic ? 'منتجات' : 'items',
  };

  const loadCart = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/cart', { cache: 'no-store' });
      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        throw new Error(typeof errPayload?.error === 'string' ? errPayload.error : 'Failed to load cart');
      }

      const nextPayload = (await response.json()) as CartPayload;
      setPayload(nextPayload);
    } catch (loadError) {
      setPayload({ items: [], summary: { totalQuantity: 0, subtotal: 0, currency: 'OMR' } });
      setError(loadError instanceof Error ? loadError.message : 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCart();
  }, [loadCart]);

  const updateQuantity = async (productId: string, quantity: number) => {
    setSavingItemId(productId);
    setError(null);

    try {
      const response = await fetch(`/api/cart/items/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });

      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        throw new Error(typeof errPayload?.error === 'string' ? errPayload.error : 'Failed to update quantity');
      }

      window.dispatchEvent(new Event('cart:changed'));
      await loadCart();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to update quantity');
    } finally {
      setSavingItemId(null);
    }
  };

  const removeItem = async (productId: string) => {
    setSavingItemId(productId);
    setError(null);

    try {
      const response = await fetch(`/api/cart/items/${productId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        throw new Error(typeof errPayload?.error === 'string' ? errPayload.error : 'Failed to remove item');
      }

      window.dispatchEvent(new Event('cart:changed'));
      await loadCart();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to remove item');
    } finally {
      setSavingItemId(null);
    }
  };

  const currency = payload?.summary.currency ?? 'OMR';
  const subtotal = payload?.summary.subtotal ?? 0;
  const items = payload?.items ?? [];
  const hasItems = items.length > 0;

  return (
    <div className="relative overflow-x-clip pb-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem]">
        <div className="absolute -left-16 top-8 h-64 w-64 rounded-full bg-coral/18 blur-3xl dark:bg-coral/10" />
        <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-teal/18 blur-3xl dark:bg-teal/10" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-12 text-center">
        <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-7 text-center shadow-sm sm:p-9">
          <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--text)] sm:text-4xl">{t.title}</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)] sm:text-base">
            {t.subtitle}
          </p>
        </section>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-6 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-4 text-center text-sm text-[color:var(--text-muted)]">
            {t.loading}
          </div>
        ) : !hasItems ? (
          <div className="mt-8 rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-10 text-center shadow-sm">
            <p className="text-sm text-[color:var(--text-muted)]">{t.empty}</p>
            <Link
              href={`/${locale}/shop`}
              className="mt-5 inline-flex rounded-xl bg-[color:var(--primary)] px-4 py-2.5 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)]"
            >
              {t.backToShop}
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
            <section className="space-y-3">
              {items.map((item) => (
                <article
                  key={item.productId}
                  className="grid gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 shadow-sm md:grid-cols-[100px_1fr_auto] md:items-center"
                >
                  <div className="relative h-24 w-full overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] md:w-24">
                    {item.product.image ? (
                      <Image src={item.product.image} alt={isArabic ? item.product.name_ar : item.product.name_en} fill sizes="96px" className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-[color:var(--text-subtle)]">{t.noImage}</div>
                    )}
                  </div>

                  <div className="space-y-1 text-center">
                    <Link href={`/${locale}/shop/product/${item.product.slug}`} className="line-clamp-1 text-sm font-semibold text-[color:var(--text)] hover:underline">
                      {isArabic ? item.product.name_ar : item.product.name_en}
                    </Link>
                    <p className="text-xs text-[color:var(--text-subtle)]">
                      {t.category}: {isArabic ? item.product.category_name_ar : item.product.category_name_en}
                    </p>
                    <p className="text-sm font-semibold text-[color:var(--text)]">
                      {formatAmountWithCurrency(item.product.price, item.product.currency)}
                    </p>
                  </div>

                  <div className="flex flex-col items-center space-y-2 text-center">
                    <div className="inline-flex items-center overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)]">
                      <button
                        type="button"
                        disabled={savingItemId === item.productId || item.quantity <= 1}
                        onClick={() => void updateQuantity(item.productId, item.quantity - 1)}
                        className="px-2 py-1 text-sm text-[color:var(--text)] hover:bg-[color:var(--surface)] disabled:opacity-40"
                        aria-label={t.decrease}
                      >
                        −
                      </button>
                      <span className="px-3 py-1 text-sm text-[color:var(--text)]">{item.quantity}</span>
                      <button
                        type="button"
                        disabled={savingItemId === item.productId || item.quantity >= item.product.stock_quantity}
                        onClick={() => void updateQuantity(item.productId, item.quantity + 1)}
                        className="px-2 py-1 text-sm text-[color:var(--text)] hover:bg-[color:var(--surface)] disabled:opacity-40"
                        aria-label={t.increase}
                      >
                        +
                      </button>
                    </div>
                    <p className="text-xs text-[color:var(--text-subtle)]">{t.total}: {formatAmountWithCurrency(item.lineTotal, item.product.currency)}</p>
                    <button
                      type="button"
                      disabled={savingItemId === item.productId}
                      onClick={() => void removeItem(item.productId)}
                      className="text-xs font-medium text-rose-700 hover:underline disabled:opacity-50 dark:text-rose-300"
                    >
                      {t.remove}
                    </button>
                  </div>
                </article>
              ))}
            </section>

            <aside className="h-fit rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 text-center shadow-sm lg:sticky lg:top-24">
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4 text-center">
                <p className="text-sm text-[color:var(--text-muted)]">{t.subtotal}</p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--text)]">{formatAmountWithCurrency(subtotal, currency)}</p>
                <p className="mt-1 text-xs text-[color:var(--text-subtle)]">
                  {payload?.summary.totalQuantity ?? 0} {t.items}
                </p>
              </div>
              <Link
                href={`/${locale}/checkout`}
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[color:var(--primary)] px-4 py-2.5 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)]"
              >
                {t.proceedCheckout}
              </Link>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
