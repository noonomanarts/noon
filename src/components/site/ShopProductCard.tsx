import Image from "next/image";
import Link from "next/link";
import { FiBox, FiCheckCircle, FiPackage, FiTag } from "react-icons/fi";

import type { Locale } from "@/lib/locale";
import AddToCartButton from "@/components/site/AddToCartButton";
import { formatAmountWithCurrency } from "@/lib/formatNumber";

type PublicShopProduct = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  price: number;
  currency: string;
  sku: string | null;
  image: string | null;
  stock_quantity: number;
  is_featured: boolean;
  category_name_en: string;
  category_name_ar: string;
  category_slug: string;
};

export default function ShopProductCard({
  product,
  locale,
  className,
}: {
  product: PublicShopProduct;
  locale: Locale;
  className?: string;
}) {
  const isArabic = locale === "ar";
  const t = {
    noImage: isArabic ? "بدون صورة" : "No image",
    openProduct: isArabic ? "فتح المنتج" : "Open product",
    inStock: isArabic ? "متوفر" : "In stock",
    outOfStock: isArabic ? "غير متوفر" : "Out of stock",
    featured: isArabic ? "مميز" : "Featured",
    stock: isArabic ? "المخزون" : "Stock",
    addToCart: isArabic ? "أضف للسلة" : "Add to cart",
    adding: isArabic ? "جارٍ الإضافة..." : "Adding...",
    noDescription: isArabic ? "وصف المنتج سيتوفر قريباً." : "Product description will be available soon.",
  };

  const name = isArabic ? product.name_ar : product.name_en;
  const description = (isArabic ? product.description_ar : product.description_en)?.trim();
  const categoryName = isArabic ? product.category_name_ar : product.category_name_en;
  const inStock = product.stock_quantity > 0;

  return (
    <article
      className={[
        "group flex h-full flex-col overflow-hidden border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg",
        className ?? "",
      ].join(" ")}
    >
      <Link
        href={`/${locale}/shop/product/${product.slug}`}
        aria-label={`${t.openProduct}: ${name}`}
        className="relative block h-56 overflow-hidden bg-[color:var(--muted)]"
      >
        <div className="absolute inset-x-0 top-0 z-10 h-1 bg-gradient-to-r from-coral via-yellow to-teal" />
        {product.image ? (
          <Image
            src={product.image}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[color:var(--text-subtle)]">
            {t.noImage}
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <span className="inline-flex items-center gap-1.5 bg-black/65 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
            <FiTag className="size-3 text-yellow-300" />
            {categoryName}
          </span>
          <div className="flex flex-col items-end gap-1.5">
            {product.is_featured ? (
              <span className="inline-flex items-center gap-1 bg-yellow px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#2f2a1f]">
                <FiBox className="size-3" />
                {t.featured}
              </span>
            ) : null}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                inStock
                  ? "bg-emerald-500/20 text-emerald-900 dark:text-emerald-200"
                  : "bg-rose-500/20 text-rose-900 dark:text-rose-200"
              }`}
            >
              <FiCheckCircle className="size-3" />
              {inStock ? t.inStock : t.outOfStock}
            </span>
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5 text-center">
        <div className="space-y-1">
          <h3 className="line-clamp-2 text-xl font-bold leading-6 text-[color:var(--text)]">
            {name}
          </h3>
          <p className="line-clamp-2 text-sm leading-5 text-[color:var(--text-muted)]">
            {description || t.noDescription}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 border border-teal/35 bg-teal/10 px-3 py-1.5 font-semibold text-teal">
            <FiPackage className="size-3.5" />
            {t.stock}: {product.stock_quantity}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 border px-3 py-1.5 font-semibold ${
              inStock
                ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-800"
                : "border-rose-500/35 bg-rose-500/10 text-rose-800"
            }`}
          >
            <FiCheckCircle className="size-3.5" />
            {inStock ? t.inStock : t.outOfStock}
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-2xl font-black text-[color:var(--text)]">
            {formatAmountWithCurrency(product.price, product.currency)}
          </p>
        </div>

        <div className="mt-auto">
          <AddToCartButton
            productId={product.id}
            locale={locale}
            disabled={!inStock}
            showFeedback={false}
            idleLabel={t.addToCart}
            loadingLabel={t.adding}
            buttonClassName="inline-flex w-full items-center justify-center bg-[color:var(--primary)] px-4 py-2.5 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>
    </article>
  );
}
