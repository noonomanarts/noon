'use client';

import { useState } from 'react';

export default function AddToCartButton({
  productId,
  locale,
  disabled,
  quantity = 1,
  showFeedback = true,
  buttonClassName,
  idleLabel,
  loadingLabel,
}: {
  productId: string;
  locale: 'en' | 'ar';
  disabled?: boolean;
  quantity?: number;
  showFeedback?: boolean;
  buttonClassName?: string;
  idleLabel?: string;
  loadingLabel?: string;
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
        body: JSON.stringify({ productId, quantity: Math.max(1, Math.trunc(quantity || 1)) }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to add product to cart');
      }

      window.dispatchEvent(new CustomEvent('cart:changed', { detail: { delta: Math.max(1, Math.trunc(quantity || 1)) } }));
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
        className={
          buttonClassName ??
          "inline-flex w-full items-center justify-center rounded-xl bg-[color:var(--primary)] px-4 py-2.5 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {loading ? (loadingLabel ?? (isArabic ? 'جاري الإضافة...' : 'Adding...')) : (idleLabel ?? (isArabic ? 'أضف إلى السلة' : 'Add to Cart'))}
      </button>

      {showFeedback && message && <p className="text-xs text-emerald-700 dark:text-emerald-300">{message}</p>}
      {showFeedback && error && <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>}
    </div>
  );
}
