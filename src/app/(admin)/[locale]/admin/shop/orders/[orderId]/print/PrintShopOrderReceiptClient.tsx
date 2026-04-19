'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { FiPrinter } from 'react-icons/fi';
import { getPaymentMethodLabel } from '@/lib/paymentMethod';

type ShopOrderStatus = 'PAID' | 'PROCESSING' | 'READY_TO_SHIP' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

type ShopOrderItem = {
  id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  product_name_en: string;
  product_name_ar: string;
};

type PrintShopOrder = {
  id: string;
  order_number: string;
  status: ShopOrderStatus;
  city: string | null;
  area: string | null;
  street_address: string | null;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  postal_code: string | null;
  recipient_full_name: string;
  recipient_phone: string;
  notes: string | null;
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  total_amount: number;
  currency: string;
  payment_method: string;
  fulfillment_type: 'DELIVERY' | 'PICKUP';
  paid_at: string;
  created_at: string;
  items: ShopOrderItem[];
};

export default function PrintShopOrderReceiptClient({
  locale,
  order,
}: {
  locale: string;
  order: PrintShopOrder;
}) {
  const isArabic = locale === 'ar';
  const [locationQrCodeDataUrl, setLocationQrCodeDataUrl] = useState<string | null>(null);

  const googleMapsUrl =
    typeof order.delivery_latitude === 'number' &&
    Number.isFinite(order.delivery_latitude) &&
    typeof order.delivery_longitude === 'number' &&
    Number.isFinite(order.delivery_longitude)
      ? `https://www.google.com/maps/search/?api=1&query=${order.delivery_latitude},${order.delivery_longitude}`
      : null;

  const t = useMemo(
    () => ({
      receipt: isArabic ? 'إيصال الطلب' : 'Order Receipt',
      orderNumber: isArabic ? 'رقم الطلب' : 'Order #',
      date: isArabic ? 'التاريخ' : 'Date',
      customer: isArabic ? 'المستلم' : 'Recipient',
      phone: isArabic ? 'الهاتف' : 'Phone',
      address: isArabic ? 'العنوان' : 'Address',
      item: isArabic ? 'المنتج' : 'Item',
      qty: isArabic ? 'الكمية' : 'Qty',
      price: isArabic ? 'السعر' : 'Price',
      total: isArabic ? 'الإجمالي' : 'Total',
      subtotal: isArabic ? 'المجموع الفرعي' : 'Subtotal',
      discount: isArabic ? 'الخصم' : 'Discount',
      shipping: isArabic ? 'التوصيل' : 'Shipping',
      paymentMethod: isArabic ? 'طريقة الدفع' : 'Payment',
      notes: isArabic ? 'ملاحظات' : 'Notes',
      status: isArabic ? 'الحالة' : 'Status',
      print: isArabic ? 'طباعة' : 'Print',
      back: isArabic ? 'رجوع' : 'Back',
      thankYou: isArabic ? 'شكراً لطلبكم' : 'Thank you for your order',
      locationQr: isArabic ? 'QR لوكيشن التوصيل' : 'Delivery Location QR',
      scanLocation: isArabic ? 'امسح الكود لفتح موقع التسليم' : 'Scan to open delivery location',
      coordinates: isArabic ? 'الإحداثيات' : 'Coordinates',
      noLocation: isArabic ? 'لا يوجد لوكيشن محفوظ' : 'No saved location',
    }),
    [isArabic]
  );

  const formatDate = (value: string) => {
    return new Intl.DateTimeFormat(isArabic ? 'ar' : 'en', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  };

  useEffect(() => {
    let active = true;

    const generateQrCode = async () => {
      if (!googleMapsUrl) {
        setLocationQrCodeDataUrl(null);
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(googleMapsUrl, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 180,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });

        if (active) {
          setLocationQrCodeDataUrl(dataUrl);
        }
      } catch {
        if (active) {
          setLocationQrCodeDataUrl(null);
        }
      }
    };

    void generateQrCode();

    return () => {
      active = false;
    };
  }, [googleMapsUrl]);

  return (
    <div className="min-h-screen bg-zinc-100 p-4 dark:bg-zinc-950">
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

      <div
        className="receipt-container mx-auto max-w-sm bg-white p-6 font-mono text-sm text-black shadow-lg print:m-0 print:max-w-none print:shadow-none"
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        <div className="mb-4 text-center">
          <h1 className="text-xl font-bold">Noon</h1>
          <p className="text-xs text-zinc-500">{t.receipt}</p>
        </div>

        <div className="mb-4 border-b border-dashed border-zinc-300 pb-4 text-xs">
          <div className="flex justify-between gap-4">
            <span>{t.orderNumber}</span>
            <span className="font-semibold">{order.order_number}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>{t.date}</span>
            <span>{formatDate(order.created_at)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>{t.status}</span>
            <span>{order.status}</span>
          </div>
          <div className="mt-2 space-y-1 border-t border-dashed border-zinc-200 pt-2">
            <div className="flex justify-between gap-4">
              <span>{t.customer}</span>
              <span className="text-end">{order.recipient_full_name}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>{t.phone}</span>
              <span>{order.recipient_phone}</span>
            </div>
          </div>
          <div className="mt-2 border-t border-dashed border-zinc-200 pt-2">
            <p className="font-semibold">{t.address}</p>
            {order.fulfillment_type === 'PICKUP' ? (
              <p className="mt-1">{isArabic ? 'استلام من نون' : 'Pickup from Noon'}</p>
            ) : (
              <>
                <p className="mt-1">{order.city ?? ''} - {order.area ?? ''}</p>
                <p>{order.street_address ?? ''}</p>
                {order.postal_code ? <p>{order.postal_code}</p> : null}
              </>
            )}
          </div>
        </div>

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
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-dashed border-zinc-200">
                <td className="py-1">{isArabic ? item.product_name_ar : item.product_name_en}</td>
                <td className="py-1 text-center">{item.quantity}</td>
                <td className="py-1 text-end">{item.unit_price.toFixed(3)}</td>
                <td className="py-1 text-end">{item.line_total.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mb-4 border-t border-zinc-300 pt-2 text-xs">
          <div className="flex justify-between">
            <span>{t.subtotal}</span>
            <span>{order.subtotal.toFixed(3)} {order.currency}</span>
          </div>
          {order.discount_amount > 0 ? (
            <div className="flex justify-between text-red-600">
              <span>{t.discount}</span>
              <span>-{order.discount_amount.toFixed(3)} {order.currency}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span>{t.shipping}</span>
            <span>{order.shipping_fee.toFixed(3)} {order.currency}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-double border-zinc-300 pt-1 text-base font-bold">
            <span>{t.total}</span>
            <span>{order.total_amount.toFixed(3)} {order.currency}</span>
          </div>
        </div>

        <div className="mb-4 text-center text-xs">
          <span className="rounded bg-zinc-100 px-2 py-0.5">
            {t.paymentMethod}: {getPaymentMethodLabel(order.payment_method, locale)}
          </span>
        </div>

        {order.notes ? (
          <div className="mb-4 border-t border-dashed border-zinc-300 pt-2 text-xs">
            <p className="font-semibold">{t.notes}</p>
            <p className="mt-1 whitespace-pre-wrap">{order.notes}</p>
          </div>
        ) : null}

        <div className="border-t border-dashed border-zinc-300 pt-3 text-center text-xs">
          <p className="font-semibold">{t.locationQr}</p>
          {googleMapsUrl ? (
            <>
              <p className="mt-1 text-zinc-600">{t.scanLocation}</p>
              {locationQrCodeDataUrl ? (
                <img
                  src={locationQrCodeDataUrl}
                  alt={t.locationQr}
                  className="mx-auto mt-3 h-36 w-36"
                />
              ) : null}
              <p className="mt-2">
                {t.coordinates}: {order.delivery_latitude!.toFixed(6)}, {order.delivery_longitude!.toFixed(6)}
              </p>
            </>
          ) : (
            <p className="mt-2 text-zinc-500">{t.noLocation}</p>
          )}
        </div>

        <div className="mt-4 text-center text-xs text-zinc-500">
          <p>{t.thankYou}</p>
        </div>
      </div>

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

          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}