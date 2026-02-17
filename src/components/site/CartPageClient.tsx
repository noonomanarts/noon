'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { Locale } from '@/lib/locale';

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
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{t.title}</h1>

      {error && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">Loading...</p>
      ) : !hasItems ? (
        <div className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.empty}</p>
          <Link
            href={`/${locale}/shop`}
            className="mt-4 inline-flex rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {t.backToShop}
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="space-y-3">
            {items.map((item) => (
              <article key={item.productId} className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900 md:grid-cols-[100px_1fr_auto] md:items-center">
                <div className="relative h-24 w-full overflow-hidden rounded-lg bg-zinc-100 md:w-24 dark:bg-zinc-800">
                  {item.product.image ? (
                    <Image src={item.product.image} alt={isArabic ? item.product.name_ar : item.product.name_en} fill sizes="96px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">No image</div>
                  )}
                </div>

                <div className="space-y-1">
                  <Link href={`/${locale}/shop/product/${item.product.slug}`} className="line-clamp-1 text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-100">
                    {isArabic ? item.product.name_ar : item.product.name_en}
                  </Link>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t.category}: {isArabic ? item.product.category_name_ar : item.product.category_name_en}
                  </p>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {item.product.price.toFixed(3)} {item.product.currency}
                  </p>
                </div>

                <div className="space-y-2 md:text-right">
                  <div className="inline-flex items-center overflow-hidden rounded-md border border-zinc-300 dark:border-zinc-600">
                    <button
                      type="button"
                      disabled={savingItemId === item.productId || item.quantity <= 1}
                      onClick={() => void updateQuantity(item.productId, item.quantity - 1)}
                      className="px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      aria-label={t.decrease}
                    >
                      −
                    </button>
                    <span className="px-3 py-1 text-sm text-zinc-900 dark:text-zinc-100">{item.quantity}</span>
                    <button
                      type="button"
                      disabled={savingItemId === item.productId || item.quantity >= item.product.stock_quantity}
                      onClick={() => void updateQuantity(item.productId, item.quantity + 1)}
                      className="px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      aria-label={t.increase}
                    >
                      +
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.total}: {item.lineTotal.toFixed(3)} {item.product.currency}</p>
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

          <aside className="h-fit rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.subtotal}</p>
            <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{subtotal.toFixed(3)} {currency}</p>
            <Link
              href={`/${locale}/checkout`}
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {t.proceedCheckout}
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
