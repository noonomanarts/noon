"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { InShopSale, InShopSaleItem } from "@/lib/db/types";
import { FiPlus, FiPrinter, FiClock, FiDollarSign, FiShoppingCart } from "react-icons/fi";

type SaleWithDetails = InShopSale & { worker_name: string; items: InShopSaleItem[] };

interface Props {
  locale: string;
  sales: SaleWithDetails[];
  canPrintBills: boolean;
}

export default function WorkerSalesClient({ locale, sales, canPrintBills }: Props) {
  const isArabic = locale === "ar";

  const t = useMemo(
    () => ({
      title: isArabic ? "المبيعات" : "Sales",
      newSale: isArabic ? "بيع جديد" : "New Sale",
      recentSales: isArabic ? "المبيعات الأخيرة" : "Recent Sales",
      noSales: isArabic ? "لا توجد مبيعات بعد" : "No sales yet",
      items: isArabic ? "منتجات" : "items",
      total: isArabic ? "الإجمالي" : "Total",
      printBill: isArabic ? "طباعة الفاتورة" : "Print Bill",
      voided: isArabic ? "ملغاة" : "Voided",
      cash: isArabic ? "نقدي" : "Cash",
      card: isArabic ? "بطاقة" : "Card",
      bankTransfer: isArabic ? "تحويل بنكي" : "Bank Transfer",
      customer: isArabic ? "العميل" : "Customer",
      discount: isArabic ? "خصم" : "Discount",
    }),
    [isArabic]
  );

  const paymentMethodLabel = (method: string) => {
    switch (method) {
      case "CASH":
        return t.cash;
      case "CARD":
        return t.card;
      case "BANK_TRANSFER":
        return t.bankTransfer;
      default:
        return method;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(isArabic ? "ar" : "en", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: 'Asia/Muscat',
    }).format(new Date(date));
  };

  const handlePrint = (saleId: string) => {
    window.open(`/${locale}/worker/sales/${saleId}/print`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t.title}</h1>
        <Link
          href={`/${locale}/worker/sales/new`}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-amber-600"
        >
          <FiPlus className="h-5 w-5" />
          {t.newSale}
        </Link>
      </div>

      {/* Sales List */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-white">{t.recentSales}</h2>
        </div>

        {sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FiShoppingCart className="mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
            <p className="text-zinc-500 dark:text-zinc-400">{t.noSales}</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {sales.map((sale) => (
              <div
                key={sale.id}
                className={`p-5 ${sale.voided_at ? "bg-zinc-50 opacity-60 dark:bg-zinc-900" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-white">
                        {sale.sale_number}
                      </span>
                      {sale.voided_at && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          {t.voided}
                        </span>
                      )}
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {paymentMethodLabel(sale.payment_method)}
                      </span>
                    </div>
                    
                    {sale.customer_name && (
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {t.customer}: {sale.customer_name}
                        {sale.customer_phone && <span className="ms-2">({sale.customer_phone})</span>}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-2">
                      {sale.items.map((item) => (
                        <span
                          key={item.id}
                          className="rounded-lg bg-zinc-100 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        >
                          {isArabic ? item.product_name_ar : item.product_name_en} × {item.quantity}
                        </span>
                      ))}
                    </div>

                    <div className="mt-2 flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1">
                        <FiClock className="h-4 w-4" />
                        {formatDate(sale.created_at)}
                      </span>
                      <span>
                        {sale.items.length} {t.items}
                      </span>
                      {sale.discount_amount > 0 && (
                        <span className="text-amber-600">
                          {t.discount}: -{sale.discount_amount.toFixed(3)} {sale.currency}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1 text-lg font-bold text-zinc-900 dark:text-white">
                      <FiDollarSign className="h-5 w-5 text-emerald-500" />
                      {sale.total_amount.toFixed(3)} {sale.currency}
                    </div>
                    
                    {canPrintBills && !sale.voided_at && (
                      <button
                        type="button"
                        onClick={() => handlePrint(sale.id)}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <FiPrinter className="h-4 w-4" />
                        {t.printBill}
                      </button>
                    )}
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
