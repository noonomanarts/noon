import Image from "next/image";
import Link from "next/link";
import { FiBox, FiCheckCircle, FiPackage, FiTag, FiXCircle } from "react-icons/fi";

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
    outOfStock: isArabic ? "نفدت الكمية" : "Sold out",
    featured: isArabic ? "مميز" : "Featured",
    stock: isArabic ? "الكمية" : "Qty",
    addToCart: isArabic ? "أضف إلى السلة" : "Add to cart",
    adding: isArabic ? "جارٍ الإضافة..." : "Adding...",
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
        className="relative block aspect-[3/4] overflow-hidden bg-[color:var(--muted)]"
      >
        {product.image ? (
          <Image
            src={product.image}
            alt={name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[color:var(--text-subtle)]">
            {t.noImage}
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2 sm:p-3">
          <span className="inline-flex items-center gap-1 bg-black/65 px-1.5 py-1 text-[10px] font-medium text-white sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-[11px]">
            <FiTag className="size-3 text-yellow-300" />
            {categoryName}
          </span>
          <div className="flex flex-col items-end gap-1.5">
            {product.is_featured ? (
              <span className="inline-flex items-center gap-1 bg-yellow px-1.5 py-1 text-[10px] font-medium text-[#2f2a1f] sm:px-2.5 sm:text-[11px]">
                <FiBox className="size-3" />
                {t.featured}
              </span>
            ) : null}
            {!inStock ? (
              <span className="inline-flex items-center gap-1 bg-black/70 px-1.5 py-1 text-[10px] font-medium text-white sm:px-2.5 sm:text-[11px]">
                <FiXCircle className="size-3" />
                {t.outOfStock}
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-3 text-center sm:gap-3 sm:p-5">
        <div className="space-y-1">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-[color:var(--text)] sm:text-xl sm:leading-6">
            {name}
          </h3>
          {description ? (
            <p className="line-clamp-2 text-xs leading-5 text-[color:var(--text-muted)] sm:text-sm">
              {description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          {inStock ? (
            <span className="inline-flex items-center gap-1.5 rounded-none border border-teal/35 bg-teal/10 px-2 py-1 font-medium text-teal sm:px-3 sm:py-1.5">
              <FiPackage className="size-3.5" />
              {t.stock}: {product.stock_quantity}
            </span>
          ) : null}
          <span
            className={`inline-flex items-center gap-1.5 rounded-none border px-2 py-1 font-medium sm:px-3 sm:py-1.5 ${
              inStock
                ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-800"
                : "border-rose-500/35 bg-rose-500/10 text-rose-800"
            }`}
          >
            {inStock ? <FiCheckCircle className="size-3.5" /> : <FiXCircle className="size-3.5" />}
            {inStock ? t.inStock : t.outOfStock}
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-xl font-black leading-none text-[color:var(--text)] sm:text-2xl">
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
            buttonClassName="inline-flex w-full items-center justify-center rounded-none bg-[color:var(--primary)] px-2 py-2.5 text-sm font-semibold leading-tight sm:px-4 text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>
    </article>
  );
}
