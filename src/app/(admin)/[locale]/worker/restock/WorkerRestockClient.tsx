"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import type { ShopProduct, StockRestock } from "@/lib/db/types";
import { FiPackage, FiPlus, FiCheck, FiSearch, FiClock } from "react-icons/fi";

type ProductForWorker = Pick<ShopProduct, 'id' | 'name_en' | 'name_ar' | 'sku' | 'price' | 'currency' | 'stock_quantity' | 'image'>;
type RestockWithDetails = StockRestock & { product_name_en: string; product_name_ar: string; worker_name: string };

interface Props {
  locale: string;
  products: ProductForWorker[];
  recentRestocks: RestockWithDetails[];
}

export default function WorkerRestockClient({ locale, products, recentRestocks }: Props) {
  const isArabic = locale === "ar";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductForWorker | null>(null);
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restocks, setRestocks] = useState<RestockWithDetails[]>(recentRestocks);

  const t = useMemo(
    () => ({
      title: isArabic ? "إعادة التخزين" : "Restock Products",
      selectProduct: isArabic ? "اختر المنتج" : "Select Product",
      searchProducts: isArabic ? "البحث عن المنتجات..." : "Search products...",
      currentStock: isArabic ? "المخزون الحالي" : "Current Stock",
      quantity: isArabic ? "الكمية المضافة" : "Quantity to Add",
      unitCost: isArabic ? "تكلفة الوحدة (اختياري)" : "Unit Cost (optional)",
      supplierName: isArabic ? "اسم المورد (اختياري)" : "Supplier Name (optional)",
      notes: isArabic ? "ملاحظات (اختياري)" : "Notes (optional)",
      submit: isArabic ? "إضافة المخزون" : "Add Stock",
      submitting: isArabic ? "جارٍ الإضافة..." : "Adding...",
      recentRestocks: isArabic ? "إعادة التخزين الأخيرة" : "Recent Restocks",
      noRestocks: isArabic ? "لا توجد عمليات إعادة تخزين" : "No restocks yet",
      added: isArabic ? "تمت الإضافة" : "Added",
      units: isArabic ? "وحدة" : "units",
      by: isArabic ? "بواسطة" : "by",
      sku: isArabic ? "رمز المنتج" : "SKU",
      price: isArabic ? "السعر" : "Price",
      selectFirst: isArabic ? "اختر منتجًا أولاً" : "Select a product first",
      success: isArabic ? "تمت إضافة المخزون بنجاح!" : "Stock added successfully!",
      errorRequired: isArabic ? "يرجى إدخال الكمية" : "Please enter quantity",
      errorMin: isArabic ? "الكمية يجب أن تكون أكبر من صفر" : "Quantity must be greater than zero",
    }),
    [isArabic]
  );

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name_en.toLowerCase().includes(q) ||
        p.name_ar.includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  const handleSubmit = async () => {
    if (!selectedProduct) return;
    
    const qty = parseInt(quantity, 10);
    if (!quantity || isNaN(qty)) {
      setError(t.errorRequired);
      return;
    }
    if (qty <= 0) {
      setError(t.errorMin);
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/worker/restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantityAdded: qty,
          unitCost: unitCost ? parseFloat(unitCost) : undefined,
          supplierName: supplierName || undefined,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add stock");
      }

      // Update the product's stock in the local list
      setSelectedProduct((prev) =>
        prev ? { ...prev, stock_quantity: prev.stock_quantity + qty } : null
      );

      // Add to recent restocks
      setRestocks((prev) => [data.restock, ...prev].slice(0, 20));

      setSuccessMessage(t.success);
      setQuantity("");
      setUnitCost("");
      setSupplierName("");
      setNotes("");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(isArabic ? "ar" : "en", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t.title}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Product Selection */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">{t.selectProduct}</h2>

          {/* Search */}
          <div className="relative mb-4">
            <FiSearch className="absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchProducts}
              className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 ps-10 pe-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-white dark:focus:ring-white/10"
            />
          </div>

          {/* Product List */}
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => setSelectedProduct(product)}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-start transition-colors ${
                  selectedProduct?.id === product.id
                    ? "border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/20"
                    : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600 dark:hover:bg-zinc-700"
                }`}
              >
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={isArabic ? product.name_ar : product.name_en}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-700">
                    <FiPackage className="h-6 w-6 text-zinc-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-zinc-900 dark:text-white truncate">
                    {isArabic ? product.name_ar : product.name_en}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {t.currentStock}: <span className="font-semibold">{product.stock_quantity}</span>
                    {product.sku && <span className="ms-2">· {product.sku}</span>}
                  </p>
                </div>
                {selectedProduct?.id === product.id && (
                  <FiCheck className="h-5 w-5 shrink-0 text-emerald-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Restock Form */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          {selectedProduct ? (
            <div className="space-y-4">
              {/* Selected Product Info */}
              <div className="flex items-center gap-4 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800">
                {selectedProduct.image ? (
                  <Image
                    src={selectedProduct.image}
                    alt={isArabic ? selectedProduct.name_ar : selectedProduct.name_en}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-700">
                    <FiPackage className="h-8 w-8 text-zinc-400" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-white">
                    {isArabic ? selectedProduct.name_ar : selectedProduct.name_en}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {t.currentStock}: <span className="font-bold text-emerald-600">{selectedProduct.stock_quantity}</span>
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {t.price}: {selectedProduct.price.toFixed(3)} {selectedProduct.currency}
                  </p>
                </div>
              </div>

              {/* Form Fields */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.quantity} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-white dark:focus:ring-white/10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.unitCost}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-white dark:focus:ring-white/10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.supplierName}
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-white dark:focus:ring-white/10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t.notes}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-white dark:focus:ring-white/10"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400">
                  {successMessage}
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiPlus className="h-5 w-5" />
                {isSubmitting ? t.submitting : t.submit}
              </button>
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <FiPackage className="mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
              <p className="text-zinc-500 dark:text-zinc-400">{t.selectFirst}</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Restocks */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">{t.recentRestocks}</h2>
        
        {restocks.length === 0 ? (
          <p className="text-center text-zinc-500 dark:text-zinc-400">{t.noRestocks}</p>
        ) : (
          <div className="space-y-3">
            {restocks.map((restock) => (
              <div
                key={restock.id}
                className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    {isArabic ? restock.product_name_ar : restock.product_name_en}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {t.added} <span className="font-semibold text-emerald-600">+{restock.quantity_added}</span> {t.units}
                    <span className="mx-2">·</span>
                    {restock.previous_quantity} → {restock.new_quantity}
                  </p>
                </div>
                <div className="text-end">
                  <div className="flex items-center gap-1 text-sm text-zinc-400">
                    <FiClock className="h-4 w-4" />
                    {formatDate(restock.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
