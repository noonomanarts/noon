"use client";

import { useMemo, useEffect } from "react";
import type { InShopSale, InShopSaleItem } from "@/lib/db/types";
import { FiPrinter } from "react-icons/fi";

interface Props {
  locale: string;
  sale: InShopSale & { worker_name: string; items: InShopSaleItem[] };
}

export default function PrintSaleReceiptClient({ locale, sale }: Props) {
  const isArabic = locale === "ar";

  const t = useMemo(
    () => ({
      receipt: isArabic ? "إيصال" : "Receipt",
      saleNumber: isArabic ? "رقم البيع" : "Sale #",
      date: isArabic ? "التاريخ" : "Date",
      cashier: isArabic ? "الموظف" : "Cashier",
      item: isArabic ? "المنتج" : "Item",
      qty: isArabic ? "الكمية" : "Qty",
      price: isArabic ? "السعر" : "Price",
      total: isArabic ? "الإجمالي" : "Total",
      subtotal: isArabic ? "المجموع الفرعي" : "Subtotal",
      discount: isArabic ? "الخصم" : "Discount",
      paymentMethod: isArabic ? "طريقة الدفع" : "Payment",
      cash: isArabic ? "نقداً" : "Cash",
      card: isArabic ? "بطاقة" : "Card",
      bank: isArabic ? "تحويل بنكي" : "Bank Transfer",
      customer: isArabic ? "العميل" : "Customer",
      thankYou: isArabic ? "شكراً لزيارتكم!" : "Thank you for your visit!",
      print: isArabic ? "طباعة" : "Print",
      back: isArabic ? "رجوع" : "Back",
      voidReceipt: isArabic ? "ملغي" : "VOIDED",
    }),
    [isArabic]
  );

  const paymentLabel = (method: string) => {
    switch (method) {
      case "CASH": return t.cash;
      case "CARD": return t.card;
      case "BANK_TRANSFER": return t.bank;
      default: return method;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(isArabic ? "ar" : "en", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const subtotal = sale.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  useEffect(() => {
    // Auto-print when page loads (optional – can be removed)
    // window.print();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-100 p-4 dark:bg-zinc-950">
      {/* Print Controls (hidden when printing) */}
      <div className="mb-4 flex justify-center gap-4 print:hidden">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          {t.back}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          <FiPrinter className="h-4 w-4" />
          {t.print}
        </button>
      </div>

      {/* Receipt (printable) */}
      <div
        className="receipt-container mx-auto max-w-sm bg-white p-6 font-mono text-sm text-black shadow-lg print:m-0 print:max-w-none print:shadow-none"
        dir={isArabic ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="mb-4 text-center">
          <h1 className="text-xl font-bold">Noon</h1>
          <p className="text-xs text-zinc-500">{t.receipt}</p>
        </div>

        {/* Voided Banner */}
        {sale.voided_at && (
          <div className="mb-4 border-2 border-red-500 bg-red-50 py-1 text-center font-bold text-red-600">
            {t.voidReceipt}
          </div>
        )}

        {/* Meta Info */}
        <div className="mb-4 border-b border-dashed border-zinc-300 pb-4 text-xs">
          <div className="flex justify-between">
            <span>{t.saleNumber}</span>
            <span className="font-semibold">{sale.sale_number}</span>
          </div>
          <div className="flex justify-between">
            <span>{t.date}</span>
            <span>{formatDate(sale.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t.cashier}</span>
            <span>{sale.worker_name}</span>
          </div>
          {sale.customer_name && (
            <div className="flex justify-between">
              <span>{t.customer}</span>
              <span>{sale.customer_name}</span>
            </div>
          )}
        </div>

        {/* Items */}
        <table className="mb-4 w-full text-xs">
          <thead className="border-b border-zinc-300">
            <tr>
              <th className="py-1 text-start">{t.item}</th>
              <th className="py-1 text-center">{t.qty}</th>
              <th className="py-1 text-end">{t.price}</th>
              <th className="py-1 text-end">{t.total}</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.id} className="border-b border-dashed border-zinc-200">
                <td className="py-1">{isArabic ? item.product_name_ar : item.product_name_en}</td>
                <td className="py-1 text-center">{item.quantity}</td>
                <td className="py-1 text-end">{item.unit_price.toFixed(3)}</td>
                <td className="py-1 text-end">{(item.unit_price * item.quantity).toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mb-4 border-t border-zinc-300 pt-2 text-xs">
          <div className="flex justify-between">
            <span>{t.subtotal}</span>
            <span>{subtotal.toFixed(3)} OMR</span>
          </div>
          {sale.discount_amount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>{t.discount}</span>
              <span>-{sale.discount_amount.toFixed(3)} OMR</span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-double border-zinc-300 pt-1 text-base font-bold">
            <span>{t.total}</span>
            <span>{sale.total_amount.toFixed(3)} OMR</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="mb-4 text-center text-xs">
          <span className="rounded bg-zinc-100 px-2 py-0.5">{t.paymentMethod}: {paymentLabel(sale.payment_method)}</span>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-zinc-500">
          <p>{t.thankYou}</p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-container,
          .receipt-container * {
            visibility: visible;
          }
          .receipt-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 5mm;
          }
        }
      `}</style>
    </div>
  );
}
