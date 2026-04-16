"use client";

import { useState, useMemo } from "react";
import type { ShopOrder, ShopOrderItem, ShopOrderStatus, ShopOrderStatusHistory } from "@/lib/db/types";
import { FiPackage, FiTruck, FiCheck, FiClock, FiMapPin, FiPhone, FiUser, FiRefreshCw, FiX } from "react-icons/fi";

type OrderWithDetails = ShopOrder & {
  user_full_name: string;
  user_email: string;
  user_phone_number: string;
  user_profile_image: string | null;
  items: ShopOrderItem[];
  history: ShopOrderStatusHistory[];
  total_count: number;
};

interface Props {
  locale: string;
  orders: OrderWithDetails[];
}

const STATUS_COLORS: Record<ShopOrderStatus, string> = {
  PAID: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PROCESSING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  READY_TO_SHIP: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  SHIPPED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  DELIVERED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_ORDER: ShopOrderStatus[] = ["PAID", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERED"];

export default function WorkerOrdersClient({ locale, orders: initialOrders }: Props) {
  const isArabic = locale === "ar";
  const [orders, setOrders] = useState(initialOrders);
  const [filterStatus, setFilterStatus] = useState<ShopOrderStatus | "ALL">("ALL");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  
  // Tracking number modal state
  const [trackingModal, setTrackingModal] = useState<{ orderId: string; orderNumber: string } | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");

  const t = useMemo(
    () => ({
      title: isArabic ? "طلبات الموقع" : "Website Orders",
      filterAll: isArabic ? "الكل" : "All",
      paid: isArabic ? "مدفوع" : "Paid",
      processing: isArabic ? "قيد التجهيز" : "Processing",
      readyToShip: isArabic ? "جاهز للشحن" : "Ready to Ship",
      shipped: isArabic ? "تم الشحن" : "Shipped",
      delivered: isArabic ? "تم التسليم" : "Delivered",
      cancelled: isArabic ? "ملغي" : "Cancelled",
      noOrders: isArabic ? "لا توجد طلبات" : "No orders found",
      items: isArabic ? "منتجات" : "items",
      updateStatus: isArabic ? "تحديث الحالة" : "Update Status",
      updating: isArabic ? "جارٍ التحديث..." : "Updating...",
      orderNumber: isArabic ? "رقم الطلب" : "Order #",
      customer: isArabic ? "العميل" : "Customer",
      address: isArabic ? "العنوان" : "Address",
      total: isArabic ? "الإجمالي" : "Total",
      markAs: isArabic ? "تحديد كـ" : "Mark as",
      trackingNumberTitle: isArabic ? "رقم التتبع" : "Tracking Number",
      trackingNumberDesc: isArabic ? "أدخل رقم التتبع للطلب" : "Enter the tracking number for this order",
      trackingPlaceholder: isArabic ? "أدخل رقم التتبع" : "Enter tracking number",
      cancel: isArabic ? "إلغاء" : "Cancel",
      confirm: isArabic ? "تأكيد الشحن" : "Confirm Shipped",
    }),
    [isArabic]
  );

  const statusLabel = (status: ShopOrderStatus) => {
    switch (status) {
      case "PAID": return t.paid;
      case "PROCESSING": return t.processing;
      case "READY_TO_SHIP": return t.readyToShip;
      case "SHIPPED": return t.shipped;
      case "DELIVERED": return t.delivered;
      case "CANCELLED": return t.cancelled;
    }
  };

  const filteredOrders = useMemo(() => {
    if (filterStatus === "ALL") return orders;
    return orders.filter((order) => order.status === filterStatus);
  }, [orders, filterStatus]);

  const getNextStatus = (currentStatus: ShopOrderStatus): ShopOrderStatus | null => {
    const currentIndex = STATUS_ORDER.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex === STATUS_ORDER.length - 1) return null;
    return STATUS_ORDER[currentIndex + 1];
  };

  const handleStatusClick = (orderId: string, orderNumber: string, newStatus: ShopOrderStatus) => {
    if (newStatus === "SHIPPED") {
      // Show tracking number modal
      setTrackingModal({ orderId, orderNumber });
      setTrackingNumber("");
    } else {
      updateOrderStatus(orderId, newStatus);
    }
  };

  const handleShippedConfirm = () => {
    if (!trackingModal || !trackingNumber.trim()) return;
    updateOrderStatus(trackingModal.orderId, "SHIPPED", trackingNumber.trim());
  };

  const updateOrderStatus = async (orderId: string, newStatus: ShopOrderStatus, trackingNum?: string) => {
    setUpdatingOrderId(orderId);
    setTrackingModal(null);

    try {
      const response = await fetch("/api/worker/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          orderId, 
          status: newStatus,
          ...(trackingNum && { trackingNumber: trackingNum }),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update status");
      }

      // Update local state
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus, tracking_number: trackingNum || order.tracking_number } : order
        )
      );
    } catch (error) {
      console.error("Error updating order status:", error);
      alert(error instanceof Error ? error.message : "Failed to update status");
    } finally {
      setUpdatingOrderId(null);
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t.title}</h1>

        {/* Status Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterStatus("ALL")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filterStatus === "ALL"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            {t.filterAll}
          </button>
          {STATUS_ORDER.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filterStatus === status
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              {statusLabel(status)}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <FiPackage className="mx-auto mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
          <p className="text-zinc-500 dark:text-zinc-400">{t.noOrders}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const nextStatus = getNextStatus(order.status);
            const isUpdating = updatingOrderId === order.id;

            return (
              <div
                key={order.id}
                className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  {/* Order Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-sm font-bold text-zinc-900 dark:text-white">
                        {order.order_number}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[order.status]}`}>
                        {statusLabel(order.status)}
                      </span>
                      <span className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                        <FiClock className="h-4 w-4" />
                        {formatDate(order.created_at)}
                      </span>
                    </div>

                    {/* Customer */}
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <FiUser className="h-4 w-4" />
                      <span className="font-medium">{order.recipient_full_name}</span>
                      <FiPhone className="ms-2 h-4 w-4" />
                      <a href={`tel:${order.recipient_phone}`} className="hover:underline">
                        {order.recipient_phone}
                      </a>
                    </div>

                    {/* Address */}
                    <div className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <FiMapPin className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        {order.street_address}, {order.area}, {order.city}
                        {order.postal_code && ` - ${order.postal_code}`}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="flex flex-wrap gap-2">
                      {order.items.map((item) => (
                        <span
                          key={item.id}
                          className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        >
                          {isArabic ? item.product_name_ar : item.product_name_en} × {item.quantity}
                        </span>
                      ))}
                    </div>

                    {order.notes && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        <span className="font-medium">Notes:</span> {order.notes}
                      </p>
                    )}
                  </div>

                  {/* Right Side - Total & Actions */}
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-end">
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.total}</p>
                      <p className="text-xl font-bold text-emerald-600">
                        {order.total_amount.toFixed(3)} {order.currency}
                      </p>
                    </div>

                    {nextStatus && order.status !== "CANCELLED" && (
                      <button
                        type="button"
                        onClick={() => handleStatusClick(order.id, order.order_number, nextStatus)}
                        disabled={isUpdating}
                        className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                      >
                        {isUpdating ? (
                          <>
                            <FiRefreshCw className="h-4 w-4 animate-spin" />
                            {t.updating}
                          </>
                        ) : (
                          <>
                            {nextStatus === "PROCESSING" && <FiPackage className="h-4 w-4" />}
                            {nextStatus === "READY_TO_SHIP" && <FiCheck className="h-4 w-4" />}
                            {nextStatus === "SHIPPED" && <FiTruck className="h-4 w-4" />}
                            {nextStatus === "DELIVERED" && <FiCheck className="h-4 w-4" />}
                            {t.markAs} {statusLabel(nextStatus)}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tracking Number Modal */}
      {trackingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                {t.trackingNumberTitle}
              </h2>
              <button
                type="button"
                onClick={() => setTrackingModal(null)}
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              {t.trackingNumberDesc} <span className="font-mono font-semibold">{trackingModal.orderNumber}</span>
            </p>
            
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder={t.trackingPlaceholder}
              className="mb-4 w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
              autoFocus
            />
            
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setTrackingModal(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleShippedConfirm}
                disabled={!trackingNumber.trim() || updatingOrderId === trackingModal.orderId}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updatingOrderId === trackingModal.orderId ? (
                  <>
                    <FiRefreshCw className="h-4 w-4 animate-spin" />
                    {t.updating}
                  </>
                ) : (
                  <>
                    <FiTruck className="h-4 w-4" />
                    {t.confirm}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
