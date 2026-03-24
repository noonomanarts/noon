"use client";

import { useMemo, useState } from "react";
import { FiMinus, FiPlus, FiTruck, FiShield, FiRotateCcw } from "react-icons/fi";

import type { Locale } from "@/lib/locale";
import AddToCartButton from "@/components/site/AddToCartButton";
import { formatAmountWithCurrency } from "@/lib/formatNumber";

export default function ProductPurchasePanel({
  productId,
  locale,
  stockQuantity,
  unitPrice,
  currency,
}: {
  productId: string;
  locale: Locale;
  stockQuantity: number;
  unitPrice: number;
  currency: string;
}) {
  const isArabic = locale === "ar";
  const inStock = stockQuantity > 0;
  const [quantity, setQuantity] = useState(1);

  const t = {
    quantity: isArabic ? "الكمية" : "Quantity",
    subtotal: isArabic ? "الإجمالي الفرعي" : "Subtotal",
    stockLeft: isArabic ? "متبقي في المخزون" : "Items left",
    addToCart: isArabic ? "أضف إلى السلة" : "Add to cart",
    adding: isArabic ? "جارٍ الإضافة..." : "Adding...",
    delivery: isArabic ? "توصيل سريع داخل عُمان" : "Fast delivery in Oman",
    guarantee: isArabic ? "منتجات أصلية مضمونة" : "Guaranteed authentic products",
    returns: isArabic ? "دعم واستبدال حسب السياسة" : "Support and returns as per policy",
  };

  const subtotal = useMemo(() => Number((unitPrice * quantity).toFixed(3)), [quantity, unitPrice]);

  const decrement = () => setQuantity((prev) => Math.max(1, prev - 1));
  const increment = () => {
    setQuantity((prev) => Math.min(Math.max(1, stockQuantity), prev + 1));
  };

  return (
    <div className="space-y-4 border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
      <div className="grid grid-cols-[1fr_auto] items-end gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-subtle)]">{t.quantity}</p>
          <div className="inline-flex items-center border border-[color:var(--border)] bg-[color:var(--muted)]">
            <button
              type="button"
              onClick={decrement}
              disabled={!inStock || quantity <= 1}
              className="inline-flex h-10 w-10 items-center justify-center text-[color:var(--text)] transition hover:bg-[color:var(--surface)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FiMinus className="size-4" />
            </button>
            <span className="inline-flex h-10 min-w-12 items-center justify-center border-x border-[color:var(--border)] text-sm font-semibold text-[color:var(--text)]">
              {quantity}
            </span>
            <button
              type="button"
              onClick={increment}
              disabled={!inStock || quantity >= Math.max(1, stockQuantity)}
              className="inline-flex h-10 w-10 items-center justify-center text-[color:var(--text)] transition hover:bg-[color:var(--surface)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FiPlus className="size-4" />
            </button>
          </div>
        </div>
        <div className="text-end">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-subtle)]">{t.subtotal}</p>
          <p className="mt-1 text-lg font-extrabold text-[color:var(--text)]">
            {formatAmountWithCurrency(subtotal, currency)}
          </p>
        </div>
      </div>

      <p className="text-xs text-[color:var(--text-muted)]">
        {t.stockLeft}: <span className="font-semibold text-[color:var(--text)]">{stockQuantity}</span>
      </p>

      <AddToCartButton
        productId={productId}
        locale={locale}
        disabled={!inStock}
        quantity={quantity}
        idleLabel={t.addToCart}
        loadingLabel={t.adding}
      />

      <div className="space-y-2 border border-[color:var(--border)] bg-[color:var(--muted)] p-3 text-xs text-[color:var(--text-muted)]">
        <p className="flex items-center gap-2">
          <FiTruck className="size-3.5" />
          {t.delivery}
        </p>
        <p className="flex items-center gap-2">
          <FiShield className="size-3.5" />
          {t.guarantee}
        </p>
        <p className="flex items-center gap-2">
          <FiRotateCcw className="size-3.5" />
          {t.returns}
        </p>
      </div>
    </div>
  );
}
