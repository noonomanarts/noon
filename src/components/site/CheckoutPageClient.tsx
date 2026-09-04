'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/lib/locale';
import { MuscatLocationPicker } from '@/components/site/MuscatLocationPicker';
import { formatAmountWithCurrency } from '@/lib/formatNumber';
import { useAppFeedback } from '@/components/ui/AppFeedbackProvider';

type ShopCartApiItem = {
  id: string;
  kind: 'SHOP_PRODUCT';
  productId: string;
  quantity: number;
  lineTotal: number;
  product: {
    id: string;
    slug: string;
    name_en: string;
    name_ar: string;
    price: number;
    currency: string;
  };
};

type ClassCartApiItem = {
  id: string;
  kind: 'CLASS_BOOKING';
  classId: string;
  slug: string;
  title: string;
  titleAr: string | null;
  image: string | null;
  startDateTime: string | null;
  price: number;
  currency: string;
  numberOfParticipants: number;
  lineTotal: number;
  scheduleConflict?: {
    classId: string;
    slug: string;
    title: string;
    titleAr: string | null;
    startDateTime: string;
    endDateTime: string | null;
  } | null;
};

type EventCartApiItem = {
  id: string;
  kind: 'EVENT_BOOKING';
  eventType: 'COOKING_COMPETITION' | 'PRIVATE_CLASS' | 'BIRTHDAY_PARTY';
  title: string;
  titleAr: string;
  selectedDate: string;
  selectedTime: string;
  estimatedTotal: number | null;
  currency: string;
  lineTotal: number | null;
};

type CartApiItem = ShopCartApiItem | ClassCartApiItem | EventCartApiItem;

type CartPayload = {
  items: CartApiItem[];
  summary: {
    totalQuantity: number;
    subtotal: number;
    payableNowTotal: number;
    requestOnlyTotal: number;
    shopItemsCount: number;
    classItemsCount: number;
    eventItemsCount: number;
    currency: string;
  };
};

function hasRenderableProduct(item: CartApiItem): item is ShopCartApiItem {
  return (
    item.kind === 'SHOP_PRODUCT'
    && typeof item.product === 'object'
    && item.product !== null
    && typeof item.product.slug === 'string'
    && typeof item.product.name_en === 'string'
    && typeof item.product.currency === 'string'
  );
}

type WalletPayload = {
  balance: number;
  available_balance: number;
  currency: string;
};

type CheckoutResult = {
  success: boolean;
  summary: {
    shopOrderId: string | null;
    shopOrderNumber: string | null;
    shopTotal: number;
    payableTotal: number;
    currency: string;
    classBookingsCount: number;
    eventRequestsCount: number;
  };
  wallet: {
    balance: number;
    available_balance: number;
    currency: string;
  };
};

type DeliveryLocation = {
  lat: number;
  lng: number;
};

type PromoValidationPayload = {
  valid: true;
  promoCode: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  discountAmount: number;
};

const SHIPPING_FEE = 2;
const CHECKOUT_DRAFT_STORAGE_KEY = 'checkout_draft_v1';

export default function CheckoutPageClient({ locale }: { locale: Locale }) {
  const isArabic = locale === 'ar';
  const { confirm } = useAppFeedback();
  const [cart, setCart] = useState<CartPayload | null>(null);
  const [wallet, setWallet] = useState<WalletPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<PromoValidationPayload | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<DeliveryLocation | null>(null);

  const [form, setForm] = useState({
    area: '',
    streetAddress: '',
    postalCode: '',
    recipientFullName: '',
    recipientPhone: '',
    notes: '',
  });

  const t = {
    title: isArabic ? 'إتمام الطلب' : 'Checkout',
    subtitle: isArabic
      ? 'راجعي العناصر وأكملي الدفع أو إرسال الطلبات.'
      : 'Review your items and complete payment or request submission.',
    loading: isArabic ? 'جاري تحميل بيانات الطلب...' : 'Loading checkout data...',
    loginRequired: isArabic ? 'يرجى تسجيل الدخول لإتمام الطلب.' : 'Please login to complete checkout.',
    goToLogin: isArabic ? 'تسجيل الدخول' : 'Go to login',
    empty: isArabic ? 'السلة فارغة.' : 'Your cart is empty.',
    goToCart: isArabic ? 'العودة للسلة' : 'Back to cart',
    goToShop: isArabic ? 'الذهاب للمتجر' : 'Go to shop',
    shippingInfo: isArabic ? 'معلومات الشحن' : 'Shipping Information',
    city: isArabic ? 'المدينة' : 'City',
    cityValue: isArabic ? 'مسقط' : 'Muscat',
    area: isArabic ? 'المنطقة' : 'Area',
    streetAddress: isArabic ? 'العنوان التفصيلي' : 'Street Address',
    postalCode: isArabic ? 'الرمز البريدي (اختياري)' : 'Postal Code (Optional)',
    recipientFullName: isArabic ? 'اسم المستلم' : 'Recipient Full Name',
    recipientPhone: isArabic ? 'رقم هاتف المستلم' : 'Recipient Phone Number',
    notes: isArabic ? 'ملاحظات (اختياري)' : 'Notes (Optional)',
    onlyMuscat: isArabic ? 'التوصيل داخل مسقط فقط.' : 'Delivery is available in Muscat only.',
    orderSummary: isArabic ? 'ملخص الطلب' : 'Order Summary',
    bookingsSummary: isArabic ? 'الحجوزات والطلبات' : 'Bookings & Requests',
    classBooking: isArabic ? 'حجز دورة' : 'Class Booking',
    eventRequest: isArabic ? 'طلب فعالية' : 'Event Request',
    participants: isArabic ? 'المشاركون' : 'Participants',
    payableNow: isArabic ? 'المطلوب الآن' : 'Payable Now',
    requestOnlyTotal: isArabic ? 'طلبات بدون دفع الآن' : 'Requests only',
    submitRequests: isArabic ? 'إرسال الطلب' : 'Submit request',
    requestOnlyHint: isArabic ? 'لن يتم خصم أي مبلغ الآن.' : 'No payment will be charged now.',
    walletBalance: isArabic ? 'رصيد المحفظة' : 'Wallet Balance',
    subtotal: isArabic ? 'الإجمالي الفرعي' : 'Subtotal',
    shipping: isArabic ? 'رسوم التوصيل' : 'Shipping Fee',
    discount: isArabic ? 'الخصم' : 'Discount',
    promoCode: isArabic ? 'كود الخصم' : 'Promo Code',
    applyPromo: isArabic ? 'تطبيق' : 'Apply',
    removePromo: isArabic ? 'إزالة' : 'Remove',
    promoApplied: isArabic ? 'تم تطبيق كود الخصم' : 'Promo code applied',
    promoPlaceholder: isArabic ? 'مثال: NOON20' : 'Example: NOON20',
    total: isArabic ? 'الإجمالي' : 'Total',
    payWallet: isArabic ? 'الدفع من المحفظة' : 'Pay with Wallet',
    payNow: isArabic ? 'الدفع الآن' : 'Pay now',
    processing: isArabic ? 'جاري المعالجة...' : 'Processing...',
    insufficient: isArabic
      ? 'رصيد المحفظة غير كافٍ. يمكنك شحن المحفظة من صفحة الحساب فقط.'
      : 'Wallet balance is not enough. You can top up your wallet from your account only.',
    topupInAccount: isArabic ? 'شحن المحفظة من الحساب' : 'Top up in account',
    successTitle: isArabic ? 'تمت العملية بنجاح' : 'Checkout completed successfully',
    orderNumber: isArabic ? 'رقم الطلب' : 'Order Number',
    classBookingsDone: isArabic ? 'حجوزات الدورات' : 'Class bookings',
    eventRequestsDone: isArabic ? 'طلبات الفعاليات' : 'Event requests',
    continueShopping: isArabic ? 'متابعة التسوق' : 'Continue shopping',
    backToCart: isArabic ? 'العودة للسلة' : 'Back to cart',
    required: isArabic ? 'هذا الحقل مطلوب' : 'This field is required',
    shippingRequired: isArabic
      ? 'يرجى إكمال بيانات التوصيل المطلوبة أولاً.'
      : 'Please complete the required delivery details first.',
    locationRequired: isArabic
      ? 'يرجى تحديد موقع التوصيل على الخريطة قبل المتابعة.'
      : 'Please choose the delivery location on the map before continuing.',
    items: isArabic ? 'منتجات' : 'items',
    scheduleConflictTitle: isArabic ? 'تعارض في المواعيد' : 'Schedule conflict',
    scheduleConflictConfirmLabel: isArabic ? 'المتابعة رغم ذلك' : 'Continue anyway',
    scheduleConflictCancelLabel: isArabic ? 'إلغاء' : 'Cancel',
  };
  const checkoutTextBoxClassName =
    'w-full rounded-xl border border-solid border-[#b5ada4] bg-[color:var(--muted)] px-3 py-2 text-[color:var(--text)] focus:border-[color:var(--primary)] focus:outline-2 focus:outline-[color:var(--focus)]';

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUnauthorized(false);

    try {
      const cartRes = await fetch('/api/cart', { cache: 'no-store' });

      if (!cartRes.ok) {
        const errPayload = await cartRes.json().catch(() => ({}));
        throw new Error(typeof errPayload?.error === 'string' ? errPayload.error : 'Failed to load cart');
      }

      const cartPayload = (await cartRes.json()) as CartPayload;
      setCart(cartPayload);

      if ((cartPayload.summary.payableNowTotal ?? 0) <= 0) {
        setWallet(null);
        setUnauthorized(false);
        return;
      }

      const walletRes = await fetch('/api/wallet/balance', { cache: 'no-store' });

      if (walletRes.status === 401) {
        setUnauthorized(true);
        setWallet(null);
        return;
      }

      if (!walletRes.ok) {
        const errPayload = await walletRes.json().catch(() => ({}));
        throw new Error(typeof errPayload?.error === 'string' ? errPayload.error : 'Failed to load wallet');
      }

      const walletPayload = (await walletRes.json()) as WalletPayload;
      setWallet(walletPayload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load checkout data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const subtotal = cart?.summary.subtotal ?? 0;
  const currency = cart?.summary.currency ?? wallet?.currency ?? 'OMR';
  const hasShopItems = (cart?.summary.shopItemsCount ?? 0) > 0;
  const hasClassItems = (cart?.summary.classItemsCount ?? 0) > 0;
  const hasEventItems = (cart?.summary.eventItemsCount ?? 0) > 0;
  const discountAmount = appliedPromo?.discountAmount ?? 0;
  const basePayableNow = cart?.summary.payableNowTotal ?? 0;
  const total = Number((Math.max(0, basePayableNow - discountAmount) + (hasShopItems ? SHIPPING_FEE : 0)).toFixed(3));
  const walletBalance = wallet?.balance ?? 0;
  const hasEnoughBalance = walletBalance >= total;
  const hasItems = (cart?.items.length ?? 0) > 0;
  const requiresAuthenticatedCheckout = basePayableNow > 0;
  const isRequestOnlyCart = hasEventItems && basePayableNow <= 0;
  const isLocationMissing = hasShopItems && selectedLocation === null;
  const conflictingClassItems = useMemo(
    () =>
      (cart?.items ?? []).filter(
        (item): item is ClassCartApiItem => item.kind === 'CLASS_BOOKING' && Boolean(item.scheduleConflict)
      ),
    [cart]
  );

  const clearCheckoutDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(`${CHECKOUT_DRAFT_STORAGE_KEY}:${locale}`);
  }, [locale]);

  const requiredMissing = useMemo(() => {
    return (
      hasShopItems && (
        form.area.trim().length === 0 ||
        form.streetAddress.trim().length === 0 ||
        form.recipientFullName.trim().length === 0 ||
        form.recipientPhone.trim().length === 0
      )
    );
  }, [form, hasShopItems]);

  useEffect(() => {
    if (!cart || cart.items.length === 0) {
      setAppliedPromo(null);
      setPromoCodeInput('');
    }
  }, [cart]);

  useEffect(() => {
    setAppliedPromo(null);
  }, [subtotal]);

  const applyPromoCode = async () => {
    setError(null);
    setMessage(null);

    const code = promoCodeInput.trim();
    if (!code) {
      setError(isArabic ? 'يرجى إدخال كود الخصم.' : 'Please enter a promo code.');
      return;
    }

    setPromoLoading(true);
    try {
      const response = await fetch('/api/shop/promo-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          subtotal,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as PromoValidationPayload & {
        error?: string;
      };

      if (!response.ok || !payload.valid) {
        throw new Error(payload.error || (isArabic ? 'كود الخصم غير صالح.' : 'Invalid promo code.'));
      }

      setAppliedPromo(payload);
      setPromoCodeInput(payload.promoCode);
      setMessage(`${t.promoApplied}: ${payload.promoCode}`);
    } catch (promoError) {
      setAppliedPromo(null);
      setError(promoError instanceof Error ? promoError.message : 'Failed to apply promo code');
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
    setPromoCodeInput('');
    setMessage(null);
  };

  const submitCheckout = useCallback(async () => {
    setError(null);
    setMessage(null);

    if (!hasItems) {
      setError(isArabic ? 'السلة فارغة.' : 'Your cart is empty.');
      return;
    }

    if (requiredMissing) {
      setError(t.shippingRequired);
      return;
    }

    if (isLocationMissing) {
      setError(t.locationRequired);
      return;
    }

    if (conflictingClassItems.length > 0) {
      const names = conflictingClassItems
        .map((item) => (isArabic && item.titleAr ? item.titleAr : item.title))
        .join(isArabic ? '، ' : ', ');
      const confirmed = await confirm({
        title: t.scheduleConflictTitle,
        message: isArabic
          ? `لديك تعارض في المواعيد في حجوزاتك (${names}). هل تريد المتابعة وإتمام الدفع رغم ذلك؟`
          : `You have a schedule conflict in your bookings (${names}). Do you still want to continue and complete payment?`,
        confirmLabel: t.scheduleConflictConfirmLabel,
        cancelLabel: t.scheduleConflictCancelLabel,
        tone: 'danger',
      });
      if (!confirmed) {
        return;
      }
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          location: selectedLocation,
          promoCode: appliedPromo?.promoCode ?? null,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as CheckoutResult & {
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || (isArabic ? 'فشل إتمام الطلب.' : 'Checkout failed.'));
      }

      clearCheckoutDraft();
      setCheckoutResult(payload);
      setWallet(payload.wallet);
      setCart({
        items: [],
        summary: {
          totalQuantity: 0,
          subtotal: 0,
          payableNowTotal: 0,
          requestOnlyTotal: 0,
          shopItemsCount: 0,
          classItemsCount: 0,
          eventItemsCount: 0,
          currency: payload.summary.currency,
        },
      });
      window.dispatchEvent(new CustomEvent('cart:changed', { detail: { count: 0 } }));
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout failed');
    } finally {
      setProcessing(false);
    }
  }, [
    appliedPromo?.promoCode,
    clearCheckoutDraft,
    confirm,
    conflictingClassItems,
    form,
    hasItems,
    isArabic,
    isLocationMissing,
    requiredMissing,
    selectedLocation,
    t.locationRequired,
    t.scheduleConflictCancelLabel,
    t.scheduleConflictConfirmLabel,
    t.scheduleConflictTitle,
    t.shippingRequired,
  ]);

  if (loading) {
    return (
      <div className="checkout-page relative overflow-x-clip pb-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem]">
          <div className="absolute -left-16 top-8 h-64 w-64 rounded-full bg-coral/18 blur-3xl dark:bg-coral/10" />
          <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-teal/18 blur-3xl dark:bg-teal/10" />
        </div>
        <div className="mx-auto w-full max-w-6xl px-4 py-12">
          <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-5 text-center text-sm text-[color:var(--text-muted)] shadow-sm">
            {t.loading}
          </div>
        </div>
      </div>
    );
  }

  if (unauthorized && requiresAuthenticatedCheckout) {
    return (
      <div className="checkout-page relative overflow-x-clip pb-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem]">
          <div className="absolute -left-16 top-8 h-64 w-64 rounded-full bg-coral/18 blur-3xl dark:bg-coral/10" />
          <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-teal/18 blur-3xl dark:bg-teal/10" />
        </div>
        <div className="mx-auto w-full max-w-3xl px-4 py-12">
          <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-7 text-center shadow-sm">
            <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--text)]">{t.title}</h1>
            <p className="mt-3 text-sm text-[color:var(--text-muted)]">{t.loginRequired}</p>
            <Link
              href={`/${locale}/login`}
              className="mt-5 inline-flex rounded-xl bg-[color:var(--primary)] px-4 py-2.5 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)]"
            >
              {t.goToLogin}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (checkoutResult) {
    return (
      <div className="checkout-page relative overflow-x-clip pb-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem]">
          <div className="absolute -left-16 top-8 h-64 w-64 rounded-full bg-coral/18 blur-3xl dark:bg-coral/10" />
          <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-teal/18 blur-3xl dark:bg-teal/10" />
        </div>
        <div className="mx-auto w-full max-w-3xl px-4 py-12">
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-7 text-center shadow-sm">
            <h1 className="text-2xl font-semibold text-emerald-900 dark:text-emerald-200">{t.successTitle}</h1>
            {checkoutResult.summary.shopOrderNumber ? (
              <p className="mt-3 text-sm text-emerald-800 dark:text-emerald-300">
                {t.orderNumber}: <span className="font-semibold">{checkoutResult.summary.shopOrderNumber}</span>
              </p>
            ) : null}
            <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-300">
              {t.total}: {formatAmountWithCurrency(checkoutResult.summary.payableTotal, checkoutResult.summary.currency)}
            </p>
            {checkoutResult.summary.classBookingsCount > 0 ? (
              <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">{t.classBookingsDone}: {checkoutResult.summary.classBookingsCount}</p>
            ) : null}
            {checkoutResult.summary.eventRequestsCount > 0 ? (
              <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">{t.eventRequestsDone}: {checkoutResult.summary.eventRequestsCount}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href={`/${locale}/shop`}
                className="inline-flex rounded-xl bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)]"
              >
                {t.continueShopping}
              </Link>
              <Link
                href={`/${locale}/cart`}
                className="inline-flex rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-medium text-[color:var(--text)] transition hover:bg-[color:var(--muted)]"
              >
                {t.backToCart}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasItems) {
    return (
      <div className="checkout-page relative overflow-x-clip pb-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem]">
          <div className="absolute -left-16 top-8 h-64 w-64 rounded-full bg-coral/18 blur-3xl dark:bg-coral/10" />
          <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-teal/18 blur-3xl dark:bg-teal/10" />
        </div>
        <div className="mx-auto w-full max-w-3xl px-4 py-12">
          <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-7 text-center shadow-sm">
            <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--text)]">{t.title}</h1>
            <p className="mt-3 text-sm text-[color:var(--text-muted)]">{t.empty}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                href={`/${locale}/cart`}
                className="inline-flex rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-medium text-[color:var(--text)] transition hover:bg-[color:var(--muted)]"
              >
                {t.goToCart}
              </Link>
              <Link
                href={`/${locale}/shop`}
                className="inline-flex rounded-xl bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)]"
              >
                {t.goToShop}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page relative overflow-x-clip pb-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem]">
        <div className="absolute -left-16 top-8 h-64 w-64 rounded-full bg-coral/18 blur-3xl dark:bg-coral/10" />
        <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-teal/18 blur-3xl dark:bg-teal/10" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-7 text-center shadow-sm sm:p-9">
          <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--text)] sm:text-4xl">{t.title}</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)] sm:text-base">
            {t.subtitle}
          </p>
        </section>

        {conflictingClassItems.length > 0 ? (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
            <p className="font-semibold">{t.scheduleConflictTitle}</p>
            <p className="mt-1">
              {isArabic
                ? `لديك تعارض في المواعيد في حجوزاتك: ${conflictingClassItems
                    .map((item) => item.titleAr || item.title)
                    .join('، ')}. يمكنك المتابعة، لكن انتبه لتداخل المواعيد.`
                : `You have a schedule conflict in your bookings: ${conflictingClassItems
                    .map((item) => item.title)
                    .join(', ')}. You can continue, but note the overlapping schedule.`}
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
            {message}
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
          <section className="space-y-6">
            {hasShopItems ? (
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 text-center shadow-sm">
              <h2 className="text-lg font-semibold text-[color:var(--text)]">{t.shippingInfo}</h2>
              <p className="mt-1 text-xs text-[color:var(--text-subtle)]">{t.onlyMuscat}</p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1 text-sm">
                  <span className="text-[color:var(--text)]">{t.city}</span>
                  <div className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-2 text-[color:var(--text)]">
                    {t.cityValue}
                  </div>
                </div>
                <label className="space-y-1 text-sm">
                  <span className="text-[color:var(--text)]">{t.area}</span>
                  <input
                    value={form.area}
                    onChange={(event) => setForm((prev) => ({ ...prev, area: event.target.value }))}
                    className={checkoutTextBoxClassName}
                  />
                </label>
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-[color:var(--text)]">{t.streetAddress}</span>
                  <input
                    value={form.streetAddress}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, streetAddress: event.target.value }))
                    }
                    className={checkoutTextBoxClassName}
                  />
                </label>
                <MuscatLocationPicker
                  locale={locale}
                  value={selectedLocation}
                  onChange={setSelectedLocation}
                />
                <label className="space-y-1 text-sm">
                  <span className="text-[color:var(--text)]">{t.postalCode}</span>
                  <input
                    value={form.postalCode}
                    onChange={(event) => setForm((prev) => ({ ...prev, postalCode: event.target.value }))}
                    className={checkoutTextBoxClassName}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[color:var(--text)]">{t.recipientFullName}</span>
                  <input
                    value={form.recipientFullName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, recipientFullName: event.target.value }))
                    }
                    className={checkoutTextBoxClassName}
                  />
                </label>
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-[color:var(--text)]">{t.recipientPhone}</span>
                  <input
                    value={form.recipientPhone}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, recipientPhone: event.target.value }))
                    }
                    className={checkoutTextBoxClassName}
                  />
                </label>
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-[color:var(--text)]">{t.notes}</span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                    rows={3}
                    className={checkoutTextBoxClassName}
                  />
                </label>
              </div>
            </div>
            ) : null}

            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 text-center shadow-sm">
              <h3 className="text-base font-semibold text-[color:var(--text)]">{hasShopItems ? t.orderSummary : t.bookingsSummary}</h3>
              <div className="mt-3 space-y-2">
                {(cart?.items ?? []).map((item) => {
                  const shopItem = hasRenderableProduct(item) ? item : null;
                  const product = shopItem?.product ?? null;
                  const shopHref = product ? `/${locale}/shop/product/${product.slug}` : null;
                  const shopQuantityLabel = shopItem ? ` x${shopItem.quantity}` : '';
                  const itemLabel = product
                    ? `${isArabic ? product.name_ar : product.name_en}${shopQuantityLabel}`
                    : item.kind === 'CLASS_BOOKING'
                      ? `${isArabic && item.titleAr ? item.titleAr : item.title} • ${t.participants}: ${item.numberOfParticipants}`
                      : item.kind === 'EVENT_BOOKING'
                        ? `${isArabic ? item.titleAr : item.title} • ${item.selectedDate} ${item.selectedTime}`
                        : t.items;
                  const lineTotalLabel = item.lineTotal != null
                    ? formatAmountWithCurrency(item.lineTotal, product ? product.currency : item.kind === 'SHOP_PRODUCT' ? currency : item.currency)
                    : t.requestOnlyTotal;

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-2 text-sm"
                    >
                      {product && shopHref ? (
                        <Link
                          href={shopHref}
                          className="line-clamp-1 max-w-[75%] font-medium text-[color:var(--text)] hover:underline"
                        >
                          {itemLabel}
                        </Link>
                      ) : item.kind === 'CLASS_BOOKING' ? (
                        <Link href={`/${locale}/classes/${item.slug}`} className="line-clamp-1 max-w-[75%] font-medium text-[color:var(--text)] hover:underline">
                          {itemLabel}
                        </Link>
                      ) : (
                        <span className="line-clamp-1 max-w-[75%] font-medium text-[color:var(--text)]">
                          {itemLabel}
                        </span>
                      )}
                      <span className="text-[color:var(--text-muted)]">{lineTotalLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <aside className="h-fit rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 text-center shadow-sm lg:sticky lg:top-24">
            <h2 className="text-lg font-semibold text-[color:var(--text)]">{t.orderSummary}</h2>
            <div className="mt-4 space-y-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4 text-sm text-[color:var(--text)]">
              {hasShopItems ? (
              <div className="space-y-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
                <label className="block text-xs font-medium text-[color:var(--text-muted)]">{t.promoCode}</label>
                <div className="flex gap-2">
                  <input
                    value={promoCodeInput}
                    onChange={(event) => setPromoCodeInput(event.target.value.toUpperCase())}
                    placeholder={t.promoPlaceholder}
                    className="min-w-0 flex-1 rounded-xl border border-solid border-[#b5ada4] bg-[color:var(--muted)] px-3 py-2 text-sm text-[color:var(--text)] focus:border-[color:var(--primary)] focus:outline-2 focus:outline-[color:var(--focus)]"
                  />
                  <button
                    type="button"
                    onClick={() => void applyPromoCode()}
                    disabled={promoLoading}
                    className="inline-flex shrink-0 rounded-xl border border-[color:var(--border)] px-3 py-2 text-xs font-semibold text-[color:var(--text)] transition hover:bg-[color:var(--muted)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {promoLoading ? t.processing : t.applyPromo}
                  </button>
                </div>
                {appliedPromo ? (
                  <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300">
                    <span>{appliedPromo.promoCode}</span>
                    <button
                      type="button"
                      onClick={removePromoCode}
                      className="rounded-md border border-emerald-300/60 px-2 py-1 font-medium transition hover:bg-emerald-500/10"
                    >
                      {t.removePromo}
                    </button>
                  </div>
                ) : null}
              </div>
              ) : null}
              {!isRequestOnlyCart && hasEnoughBalance ? (
              <div className="flex items-center justify-between">
                <span>{t.walletBalance}</span>
                <span className="font-semibold">
                  {formatAmountWithCurrency(walletBalance, currency)}
                </span>
              </div>
              ) : null}
              <div className="flex items-center justify-between">
                <span>{hasShopItems || hasClassItems ? t.payableNow : t.requestOnlyTotal}</span>
                <span>{formatAmountWithCurrency(total, currency)}</span>
              </div>
              {hasShopItems && discountAmount > 0 ? (
                <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
                  <span>{t.discount}</span>
                  <span>-{formatAmountWithCurrency(discountAmount, currency)}</span>
                </div>
              ) : null}
              {hasShopItems ? (
              <div className="flex items-center justify-between">
                <span>{t.shipping}</span>
                <span>{formatAmountWithCurrency(SHIPPING_FEE, currency)}</span>
              </div>
              ) : null}
              {hasEventItems ? (
                <div className="flex items-center justify-between">
                  <span>{t.requestOnlyTotal}</span>
                  <span>{formatAmountWithCurrency(cart?.summary.requestOnlyTotal ?? 0, currency)}</span>
                </div>
              ) : null}
              <div className="mt-2 border-t border-[color:var(--border)] pt-2 text-base font-semibold">
                <div className="flex items-center justify-between">
                  <span>{t.total}</span>
                  <span>
                    {formatAmountWithCurrency(total, currency)}
                  </span>
                </div>
                <p className="mt-1 text-xs font-normal text-[color:var(--text-subtle)]">
                  {(cart?.summary.totalQuantity ?? 0).toString()} {t.items}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void submitCheckout()}
              disabled={processing || requiredMissing || isLocationMissing}
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[color:var(--primary)] px-4 py-2.5 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processing ? t.processing : isRequestOnlyCart ? t.submitRequests : hasEnoughBalance ? t.payWallet : t.payNow}
            </button>

            {isRequestOnlyCart ? (
              <p className="mt-3 text-xs text-[color:var(--text-subtle)]">{t.requestOnlyHint}</p>
            ) : null}

            <Link
              href={`/${locale}/cart`}
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-medium text-[color:var(--text)] transition hover:bg-[color:var(--muted)]"
            >
              {t.backToCart}
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
