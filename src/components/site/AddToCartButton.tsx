'use client';

import { useState } from 'react';

export default function AddToCartButton({
  productId,
  locale,
  disabled,
}: {
  productId: string;
  locale: 'en' | 'ar';
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isArabic = locale === 'ar';

  const handleAdd = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to add product to cart');
      }

      window.dispatchEvent(new CustomEvent('cart:changed', { detail: { delta: 1 } }));
      setMessage(isArabic ? 'تمت إضافة المنتج إلى السلة.' : 'Product added to cart.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to add product to cart');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => void handleAdd()}
        className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading
          ? isArabic
            ? 'جاري الإضافة...'
            : 'Adding...'
          : isArabic
            ? 'أضف إلى السلة'
            : 'Add to Cart'}
      </button>

      {message && <p className="text-xs text-emerald-700 dark:text-emerald-300">{message}</p>}
      {error && <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>}
    </div>
  );
}
