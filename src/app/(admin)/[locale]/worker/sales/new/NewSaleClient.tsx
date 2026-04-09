"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { ShopProduct } from "@/lib/db/types";
import { FiPackage, FiPlus, FiMinus, FiTrash2, FiSearch, FiCheck, FiPrinter, FiArrowLeft } from "react-icons/fi";

type ProductForWorker = Pick<ShopProduct, 'id' | 'name_en' | 'name_ar' | 'sku' | 'price' | 'currency' | 'stock_quantity' | 'image'>;

interface CartItem {
  product: ProductForWorker;
  quantity: number;
}

interface Props {
  locale: string;
  products: ProductForWorker[];
  canPrintBills: boolean;
}

export default function NewSaleClient({ locale, products, canPrintBills }: Props) {
  const router = useRouter();
  const isArabic = locale === "ar";

  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "BANK_TRANSFER">("CASH");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<{ id: string; sale_number: string } | null>(null);

  const t = useMemo(
    () => ({
      title: isArabic ? "بيع جديد" : "New Sale",
      back: isArabic ? "رجوع" : "Back",
      searchProducts: isArabic ? "البحث عن المنتجات..." : "Search products...",
      cart: isArabic ? "السلة" : "Cart",
      emptyCart: isArabic ? "السلة فارغة" : "Cart is empty",
      addProducts: isArabic ? "أضف منتجات من القائمة" : "Add products from the list",
      customerInfo: isArabic ? "معلومات العميل (اختياري)" : "Customer Info (optional)",
      customerName: isArabic ? "اسم العميل" : "Customer Name",
      customerPhone: isArabic ? "رقم الهاتف" : "Phone Number",
      discount: isArabic ? "الخصم" : "Discount",
      discountAmount: isArabic ? "مبلغ الخصم" : "Discount Amount",
      discountReason: isArabic ? "سبب الخصم" : "Discount Reason",
      paymentMethod: isArabic ? "طريقة الدفع" : "Payment Method",
      cash: isArabic ? "نقدي" : "Cash",
      card: isArabic ? "بطاقة" : "Card",
      bankTransfer: isArabic ? "تحويل بنكي" : "Bank Transfer",
      notes: isArabic ? "ملاحظات" : "Notes",
      subtotal: isArabic ? "المجموع الفرعي" : "Subtotal",
      total: isArabic ? "الإجمالي" : "Total",
      completeSale: isArabic ? "إتمام البيع" : "Complete Sale",
      processing: isArabic ? "جارٍ المعالجة..." : "Processing...",
      stock: isArabic ? "المخزون" : "Stock",
      outOfStock: isArabic ? "نفد المخزون" : "Out of stock",
      saleCompleted: isArabic ? "تمت عملية البيع بنجاح!" : "Sale completed successfully!",
      saleNumber: isArabic ? "رقم الفاتورة" : "Sale Number",
      printBill: isArabic ? "طباعة الفاتورة" : "Print Bill",
      newSale: isArabic ? "بيع جديد" : "New Sale",
      errorEmptyCart: isArabic ? "السلة فارغة" : "Cart is empty",
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

  const addToCart = (product: ProductForWorker) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) return prev;
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      if (product.stock_quantity <= 0) return prev;
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.product.stock_quantity) return item;
          return { ...item, quantity: newQty };
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart]
  );

  const discount = parseFloat(discountAmount) || 0;
  const total = Math.max(0, subtotal - discount);

  const handleSubmit = async () => {
    if (cart.length === 0) {
      setError(t.errorEmptyCart);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/worker/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          discountAmount: discount || undefined,
          discountReason: discountReason || undefined,
          paymentMethod,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to complete sale");
      }

      setCompletedSale({ id: data.sale.id, sale_number: data.sale.sale_number });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    if (completedSale) {
      window.open(`/${locale}/worker/sales/${completedSale.id}/print`, "_blank");
    }
  };

  const handleNewSale = () => {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setDiscountAmount("");
    setDiscountReason("");
    setPaymentMethod("CASH");
    setNotes("");
    setCompletedSale(null);
    setError(null);
  };

  // Success screen
  if (completedSale) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="rounded-full bg-emerald-100 p-6 dark:bg-emerald-900/30">
          <FiCheck className="h-16 w-16 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="mt-6 text-2xl font-bold text-zinc-900 dark:text-white">{t.saleCompleted}</h2>
        <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
          {t.saleNumber}: <span className="font-mono font-bold">{completedSale.sale_number}</span>
        </p>
        <p className="mt-1 text-2xl font-bold text-emerald-600">
          {total.toFixed(3)} OMR
        </p>
        <div className="mt-8 flex gap-4">
          {canPrintBills && (
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-6 py-3 font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <FiPrinter className="h-5 w-5" />
              {t.printBill}
            </button>
          )}
          <button
            type="button"
            onClick={handleNewSale}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-amber-600"
          >
            <FiPlus className="h-5 w-5" />
            {t.newSale}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push(`/${locale}/worker/sales`)}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          <FiArrowLeft className="h-5 w-5" />
          {t.back}
        </button>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t.title}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Product Selection */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
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

            {/* Product Grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => {
                const inCart = cart.find((item) => item.product.id === product.id);
                const outOfStock = product.stock_quantity <= 0;
                const maxReached = inCart && inCart.quantity >= product.stock_quantity;

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addToCart(product)}
                    disabled={outOfStock || maxReached}
                    className={`relative flex flex-col rounded-lg border p-3 text-start transition-all ${
                      outOfStock
                        ? "cursor-not-allowed border-zinc-200 bg-zinc-50 opacity-60 dark:border-zinc-800 dark:bg-zinc-900"
                        : maxReached
                          ? "cursor-not-allowed border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20"
                          : "border-zinc-200 bg-white hover:border-emerald-500 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-emerald-500"
                    }`}
                  >
                    {inCart && (
                      <span className="absolute -end-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                        {inCart.quantity}
                      </span>
                    )}
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={isArabic ? product.name_ar : product.name_en}
                        width={80}
                        height={80}
                        className="mb-2 h-20 w-full rounded-lg object-cover"
                      />
                    ) : (
                      <div className="mb-2 flex h-20 w-full items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-700">
                        <FiPackage className="h-8 w-8 text-zinc-400" />
                      </div>
                    )}
                    <p className="text-sm font-medium text-zinc-900 dark:text-white line-clamp-2">
                      {isArabic ? product.name_ar : product.name_en}
                    </p>
                    <p className="mt-1 text-sm font-bold text-emerald-600">
                      {product.price.toFixed(3)} {product.currency}
                    </p>
                    <p className={`text-xs ${outOfStock ? "text-red-500" : "text-zinc-500 dark:text-zinc-400"}`}>
                      {outOfStock ? t.outOfStock : `${t.stock}: ${product.stock_quantity}`}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cart */}
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">{t.cart}</h2>

            {cart.length === 0 ? (
              <div className="py-8 text-center">
                <FiPackage className="mx-auto mb-2 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
                <p className="text-zinc-500 dark:text-zinc-400">{t.emptyCart}</p>
                <p className="text-sm text-zinc-400 dark:text-zinc-500">{t.addProducts}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                        {isArabic ? item.product.name_ar : item.product.name_en}
                      </p>
                      <p className="text-sm text-emerald-600">
                        {(item.product.price * item.quantity).toFixed(3)} {item.product.currency}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-700"
                      >
                        <FiMinus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center font-semibold text-zinc-900 dark:text-white">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, 1)}
                        disabled={item.quantity >= item.product.stock_quantity}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-700"
                      >
                        <FiPlus className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="ms-2 flex h-7 w-7 items-center justify-center rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Totals */}
            {cart.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">{t.subtotal}</span>
                  <span className="font-medium text-zinc-900 dark:text-white">{subtotal.toFixed(3)} OMR</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">{t.discount}</span>
                    <span className="font-medium text-amber-600">-{discount.toFixed(3)} OMR</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-zinc-900 dark:text-white">{t.total}</span>
                  <span className="text-emerald-600">{total.toFixed(3)} OMR</span>
                </div>
              </div>
            )}
          </div>

          {/* Customer Info & Options */}
          {cart.length > 0 && (
            <>
              <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{t.customerInfo}</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={t.customerName}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder={t.customerPhone}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{t.discount}</h3>
                <div className="space-y-3">
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    placeholder={t.discountAmount}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                  <input
                    type="text"
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    placeholder={t.discountReason}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{t.paymentMethod}</h3>
                <div className="flex gap-2">
                  {(["CASH", "CARD", "BANK_TRANSFER"] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        paymentMethod === method
                          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {method === "CASH" ? t.cash : method === "CARD" ? t.card : t.bankTransfer}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{t.notes}</h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || cart.length === 0}
                className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? t.processing : `${t.completeSale} - ${total.toFixed(3)} OMR`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
