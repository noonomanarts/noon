"use client";

import Image from "next/image";
import { useState, useMemo } from "react";
import type { ShopProduct } from "@/lib/db/types";
import { FiPrinter, FiSearch, FiPlus, FiMinus, FiX, FiTag } from "react-icons/fi";

type ProductForLabel = Pick<ShopProduct, "id" | "name_en" | "name_ar" | "sku" | "price" | "currency" | "stock_quantity" | "image"> & {
  latest_expiry_date: Date | string | null;
  latest_production_date: Date | string | null;
};

interface Props {
  locale: string;
  products: ProductForLabel[];
}

interface LabelItem {
  product: ProductForLabel;
  quantity: number;
}

export default function PrintLabelsClient({ locale, products }: Props) {
  const isArabic = locale === "ar";
  const [search, setSearch] = useState("");
  const [labelItems, setLabelItems] = useState<LabelItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const t = useMemo(
    () => ({
      title: isArabic ? "طباعة الملصقات" : "Print Labels",
      searchPlaceholder: isArabic ? "ابحث عن منتج..." : "Search products...",
      addToQueue: isArabic ? "إضافة" : "Add",
      labelQueue: isArabic ? "قائمة الطباعة" : "Label Queue",
      noItems: isArabic ? "لا توجد ملصقات للطباعة" : "No labels in queue",
      preview: isArabic ? "معاينة" : "Preview",
      print: isArabic ? "طباعة" : "Print",
      clear: isArabic ? "مسح الكل" : "Clear All",
      labels: isArabic ? "ملصق" : "labels",
      currency: isArabic ? "ر.ع" : "OMR",
      sku: isArabic ? "رمز المنتج" : "SKU",
      productionDate: isArabic ? "تاريخ الإنتاج" : "Production",
      expiryDate: isArabic ? "تاريخ الانتهاء" : "Expiry",
      noDate: isArabic ? "غير متوفر" : "N/A",
      back: isArabic ? "رجوع" : "Back",
      close: isArabic ? "إغلاق" : "Close",
    }),
    [isArabic]
  );

  const formatLabelDate = (value: Date | string | null) => {
    if (!value) return t.noDate;
    const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return t.noDate;
    return new Intl.DateTimeFormat(isArabic ? "ar" : "en", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  };

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products.slice(0, 20);
    const s = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name_en.toLowerCase().includes(s) ||
        p.name_ar.toLowerCase().includes(s) ||
        (p.sku && p.sku.toLowerCase().includes(s))
    );
  }, [products, search]);

  const addProduct = (product: ProductForLabel) => {
    setLabelItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setLabelItems((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (productId: string) => {
    setLabelItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const totalLabels = labelItems.reduce((sum, item) => sum + item.quantity, 0);

  const handlePrint = () => {
    setShowPreview(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (showPreview) {
    return (
      <div className="min-h-screen bg-white p-4">
        {/* Print Controls */}
        <div className="mb-4 flex justify-center gap-4 print:hidden">
          <button
            type="button"
            onClick={() => setShowPreview(false)}
            className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-300"
          >
            {t.back}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            <FiPrinter className="h-4 w-4" />
            {t.print}
          </button>
        </div>

        {/* Labels Grid */}
        <div className="label-grid flex flex-wrap gap-2 print:gap-0">
          {labelItems.flatMap((item) =>
            Array.from({ length: item.quantity }).map((_, i) => (
              <div
                key={`${item.product.id}-${i}`}
                className="label flex h-[38mm] w-[58mm] flex-col justify-between border border-zinc-300 p-2 print:border-0 print:border-b print:border-r print:border-dashed"
                dir={isArabic ? "rtl" : "ltr"}
              >
                <div className="space-y-1 text-center">
                  <p className="text-[11px] font-bold leading-tight">
                    {isArabic ? item.product.name_ar : item.product.name_en}
                  </p>
                  {!isArabic && item.product.name_ar && (
                    <p className="text-[10px] text-zinc-500">{item.product.name_ar}</p>
                  )}
                  {isArabic && item.product.name_en && (
                    <p className="text-[10px] text-zinc-500">{item.product.name_en}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="space-y-0.5 text-[9px] leading-tight text-zinc-700">
                    <p className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{t.productionDate}</span>
                      <span>{formatLabelDate(item.product.latest_production_date)}</span>
                    </p>
                    <p className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{t.expiryDate}</span>
                      <span>{formatLabelDate(item.product.latest_expiry_date)}</span>
                    </p>
                  </div>
                  <div className="flex items-end justify-between gap-2 border-t border-zinc-200 pt-1">
                    {item.product.sku ? (
                      <span className="text-[8px] text-zinc-400">{item.product.sku}</span>
                    ) : <span />}
                    <span className="text-sm font-bold">
                      {item.product.price.toFixed(3)} {item.product.currency}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .label-grid,
            .label-grid * {
              visibility: visible;
            }
            .label-grid {
              position: absolute;
              left: 0;
              top: 0;
              display: flex;
              flex-wrap: wrap;
            }
            .label {
              page-break-inside: avoid;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t.title}</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Product Search */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="relative mb-4">
            <FiSearch className="absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 pe-4 ps-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
            />
          </div>

          <div className="max-h-[400px] space-y-2 overflow-y-auto">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50"
              >
                <div className="flex items-center gap-3">
                  {product.image ? (
                    <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-zinc-200">
                      <Image
                        src={product.image}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-700">
                      <FiTag className="h-5 w-5 text-zinc-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      {isArabic ? product.name_ar : product.name_en}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {product.price.toFixed(3)} {product.currency}
                      {product.sku && ` • ${product.sku}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => addProduct(product)}
                  className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  <FiPlus className="h-3 w-3" />
                  {t.addToQueue}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Label Queue */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{t.labelQueue}</h2>
            {labelItems.length > 0 && (
              <button
                type="button"
                onClick={() => setLabelItems([])}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
              >
                {t.clear}
              </button>
            )}
          </div>

          {labelItems.length === 0 ? (
            <div className="py-12 text-center">
              <FiTag className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.noItems}</p>
            </div>
          ) : (
            <>
              <div className="mb-4 max-h-[300px] space-y-2 overflow-y-auto">
                {labelItems.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">
                        {isArabic ? item.product.name_ar : item.product.name_en}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {item.product.price.toFixed(3)} {item.product.currency}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                      >
                        <FiMinus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-zinc-900 dark:text-white">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                      >
                        <FiPlus className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.product.id)}
                        className="ms-2 flex h-7 w-7 items-center justify-center rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        <FiX className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-700">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {totalLabels} {t.labels}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPreview(true)}
                    className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                  >
                    {t.preview}
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                  >
                    <FiPrinter className="h-4 w-4" />
                    {t.print}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
