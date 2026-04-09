'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/lib/locale';
import { MuscatLocationPicker } from '@/components/site/MuscatLocationPicker';
import { formatAmountWithCurrency } from '@/lib/formatNumber';

type CartApiItem = {
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

type CartPayload = {
  items: CartApiItem[];
  summary: {
    totalQuantity: number;
    subtotal: number;
    currency: string;
  };
};

type WalletPayload = {
  balance: number;
  available_balance: number;
  currency: string;
};

type CheckoutResult = {
  success: boolean;
  order: {
    id: string;
    orderNumber: string;
    subtotal: number;
    discountAmount: number;
    promoCode: string | null;
    shippingFee: number;
    totalAmount: number;
    currency: string;
    itemsCount: number;
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

export default function CheckoutPageClient({ locale }: { locale: Locale }) {
  const searchParams = useSearchParams();
  const isArabic = locale === 'ar';
  const [cart, setCart] = useState<CartPayload | null>(null);
  const [wallet, setWallet] = useState<WalletPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
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
      ? 'راجعي بيانات التوصيل ثم أكملي الدفع من المحفظة.'
      : 'Review shipping details and complete payment with your wallet.',
    loading: isArabic ? 'جاري تحميل بيانات الطلب...' : 'Loading checkout data...',
    loginRequired: isArabic ? 'يرجى تسجيل الدخول لإتمام الطلب.' : 'Please login to complete checkout.',
    goToLogin: isArabic ? 'تسجيل الدخول' : 'Go to login',
    empty: isArabic ? 'السلة فارغة. أضف منتجات أولاً.' : 'Your cart is empty. Add products first.',
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
    walletBalance: isArabic ? 'رصيد المحفظة' : 'Wallet Balance',
    subtotal: isArabic ? 'الإجمالي الفرعي' : 'Subtotal',
    shipping: isArabic ? 'رسوم التوصيل' : 'Shipping Fee',
    discount: isArabic ? 'الخصم' : 'Discount',
    promoCode: isArabic ? 'كود الخصم' : 'Promo Code',
    applyPromo: isArabic ? 'تطبيق' : 'Apply',
    removePromo: isArabic ? 'إزالة' : 'Remove',
    promoApplied: isArabic ? 'تم تطبيق كود الخصم' : 'Promo code applied',
    promoPlaceholder: isArabic ? 'مثال: NOON20' : 'Example: NOON20',
    total: isArabic ? 'الإجمالي النهائي' : 'Total',
    payWallet: isArabic ? 'الدفع من المحفظة' : 'Pay with Wallet',
    processing: isArabic ? 'جاري المعالجة...' : 'Processing...',
    insufficient: isArabic ? 'رصيد المحفظة غير كافٍ للدفع. قم بشحن المحفظة.' : 'Wallet balance is insufficient for payment. Top up your wallet.',
    topupTitle: isArabic ? 'شحن المحفظة' : 'Top Up Wallet',
    topupHint: isArabic ? 'يمكنك زيادة الرصيد مباشرة قبل الدفع.' : 'You can increase your balance before payment.',
    topupAmount: isArabic ? 'مبلغ الشحن' : 'Top Up Amount',
    topupAction: isArabic ? 'شحن الآن' : 'Top Up Now',
    topupRedirect: isArabic
      ? 'سيتم تحويلك الآن إلى بوابة Paymob الآمنة.'
      : 'You will now be redirected to Paymob secure checkout.',
    successTitle: isArabic ? 'تم تأكيد الطلب بنجاح' : 'Order confirmed successfully',
    orderNumber: isArabic ? 'رقم الطلب' : 'Order Number',
    continueShopping: isArabic ? 'متابعة التسوق' : 'Continue shopping',
    backToCart: isArabic ? 'العودة للسلة' : 'Back to cart',
    required: isArabic ? 'هذا الحقل مطلوب' : 'This field is required',
    locationRequired: isArabic ? 'يرجى تحديد لوكيشن التوصيل على الخريطة.' : 'Please pick the delivery location on the map.',
    items: isArabic ? 'منتجات' : 'items',
  };
  const checkoutTextBoxClassName =
    'w-full rounded-xl border border-solid border-[#b5ada4] bg-[color:var(--muted)] px-3 py-2 text-[color:var(--text)] focus:border-[color:var(--primary)] focus:outline-2 focus:outline-[color:var(--focus)]';

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUnauthorized(false);

    try {
      const [cartRes, walletRes] = await Promise.all([
        fetch('/api/cart', { cache: 'no-store' }),
        fetch('/api/wallet/balance', { cache: 'no-store' }),
      ]);

      if (!cartRes.ok) {
        const errPayload = await cartRes.json().catch(() => ({}));
        throw new Error(typeof errPayload?.error === 'string' ? errPayload.error : 'Failed to load cart');
      }

      if (walletRes.status === 401) {
        setUnauthorized(true);
      } else if (!walletRes.ok) {
        const errPayload = await walletRes.json().catch(() => ({}));
        throw new Error(typeof errPayload?.error === 'string' ? errPayload.error : 'Failed to load wallet');
      }

      const cartPayload = (await cartRes.json()) as CartPayload;
      setCart(cartPayload);

      if (walletRes.ok) {
        const walletPayload = (await walletRes.json()) as WalletPayload;
        setWallet(walletPayload);
      } else {
        setWallet(null);
      }
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
  const discountAmount = appliedPromo?.discountAmount ?? 0;
  const discountedSubtotal = Number(Math.max(0, subtotal - discountAmount).toFixed(3));
  const total = Number((discountedSubtotal + SHIPPING_FEE).toFixed(3));
  const walletBalance = wallet?.balance ?? 0;
  const hasEnoughBalance = walletBalance >= total;
  const hasItems = (cart?.items.length ?? 0) > 0;
  const isLocationMissing = selectedLocation === null;

  const requiredMissing = useMemo(() => {
    return (
      form.area.trim().length === 0 ||
      form.streetAddress.trim().length === 0 ||
      form.recipientFullName.trim().length === 0 ||
      form.recipientPhone.trim().length === 0
    );
  }, [form]);

  useEffect(() => {
    const topupStatus = searchParams.get('topup');
    if (!topupStatus) return;

    if (topupStatus === 'paid') {
      setMessage(isArabic ? 'تم شحن المحفظة بنجاح.' : 'Wallet topped up successfully.');
      setError(null);
      void loadData();
      return;
    }

    if (topupStatus === 'failed') {
      setError(isArabic ? 'فشلت عملية شحن المحفظة.' : 'Wallet top-up payment failed.');
      setMessage(null);
      return;
    }

    if (topupStatus === 'cancelled') {
      setError(isArabic ? 'تم إلغاء عملية شحن المحفظة.' : 'Wallet top-up was cancelled.');
      setMessage(null);
      return;
    }

    if (topupStatus === 'pending') {
      setMessage(
        isArabic
          ? 'تم استلام طلب الدفع، ويتم تحديث الرصيد عند تأكيد Paymob.'
          : 'Payment was received and your balance will update once Paymob confirms it.'
      );
      setError(null);
    }
  }, [isArabic, loadData, searchParams]);

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

  const handleTopup = async () => {
    setMessage(null);
    setError(null);

    const amount = Number(topupAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(isArabic ? 'مبلغ الشحن غير صحيح.' : 'Invalid top-up amount.');
      return;
    }

    setTopupLoading(true);
    try {
      const response = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          returnUrl: `/${locale}/checkout`,
          metadata: {
            source: 'checkout_sidebar',
            locale,
          },
        }),
      });

      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        throw new Error(typeof errPayload?.error === 'string' ? errPayload.error : 'Failed to top up wallet');
      }

      const payload = (await response.json()) as { payment?: { redirectUrl?: string } };
      const redirectUrl = payload?.payment?.redirectUrl;

      if (!redirectUrl) {
        throw new Error(isArabic ? 'رابط الدفع غير متوفر.' : 'Payment URL is missing.');
      }

      setTopupAmount('');
      setMessage(t.topupRedirect);
      window.location.href = redirectUrl;
    } catch (topupError) {
      setError(topupError instanceof Error ? topupError.message : 'Failed to top up wallet');
    } finally {
      setTopupLoading(false);
    }
  };

  const submitCheckout = async () => {
    setError(null);
    setMessage(null);

    if (!hasItems) {
      setError(isArabic ? 'السلة فارغة.' : 'Your cart is empty.');
      return;
    }

    if (requiredMissing) {
      setError(t.required);
      return;
    }

    if (isLocationMissing) {
      setError(t.locationRequired);
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/shop/checkout', {
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

      setCheckoutResult(payload);
      setWallet(payload.wallet);
      setCart({
        items: [],
        summary: {
          totalQuantity: 0,
          subtotal: 0,
          currency: payload.order.currency,
        },
      });
      window.dispatchEvent(new CustomEvent('cart:changed', { detail: { count: 0 } }));
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout failed');
    } finally {
      setProcessing(false);
    }
  };

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

  if (unauthorized) {
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
            <p className="mt-3 text-sm text-emerald-800 dark:text-emerald-300">
              {t.orderNumber}: <span className="font-semibold">{checkoutResult.order.orderNumber}</span>
            </p>
            <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-300">
              {t.total}: {formatAmountWithCurrency(checkoutResult.order.totalAmount, checkoutResult.order.currency)}
            </p>
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

            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 text-center shadow-sm">
              <h3 className="text-base font-semibold text-[color:var(--text)]">{t.orderSummary}</h3>
              <div className="mt-3 space-y-2">
                {(cart?.items ?? []).map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-2 text-sm"
                  >
                    <Link
                      href={`/${locale}/shop/product/${item.product.slug}`}
                      className="line-clamp-1 max-w-[75%] font-medium text-[color:var(--text)] hover:underline"
                    >
                      {isArabic ? item.product.name_ar : item.product.name_en} x{item.quantity}
                    </Link>
                    <span className="text-[color:var(--text-muted)]">
                      {formatAmountWithCurrency(item.lineTotal, item.product.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="h-fit rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 text-center shadow-sm lg:sticky lg:top-24">
            <h2 className="text-lg font-semibold text-[color:var(--text)]">{t.orderSummary}</h2>
            <div className="mt-4 space-y-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4 text-sm text-[color:var(--text)]">
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
              <div className="flex items-center justify-between">
                <span>{t.walletBalance}</span>
                <span className="font-semibold">
                  {formatAmountWithCurrency(walletBalance, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t.subtotal}</span>
                <span>{formatAmountWithCurrency(subtotal, currency)}</span>
              </div>
              {discountAmount > 0 ? (
                <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
                  <span>{t.discount}</span>
                  <span>-{formatAmountWithCurrency(discountAmount, currency)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <span>{t.shipping}</span>
                <span>{formatAmountWithCurrency(SHIPPING_FEE, currency)}</span>
              </div>
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

            {!hasEnoughBalance ? (
              <p className="mt-3 text-xs text-rose-700 dark:text-rose-300">{t.insufficient}</p>
            ) : null}

            <button
              type="button"
              onClick={() => void submitCheckout()}
              disabled={processing || requiredMissing || isLocationMissing || !hasEnoughBalance}
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[color:var(--primary)] px-4 py-2.5 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processing ? t.processing : t.payWallet}
            </button>

            {!hasEnoughBalance ? (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center dark:border-emerald-900/40 dark:bg-emerald-900/20">
                <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">{t.topupTitle}</h3>
                <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">{t.topupHint}</p>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={topupAmount}
                    onChange={(event) => setTopupAmount(event.target.value)}
                    placeholder={t.topupAmount}
                    className="min-w-0 flex-1 rounded-xl border border-solid border-[#b5ada4] bg-[color:var(--muted)] px-3 py-2 text-sm text-[color:var(--text)] focus:border-[color:var(--primary)] focus:outline-2 focus:outline-[color:var(--focus)]"
                  />
                  <button
                    type="button"
                    onClick={() => void handleTopup()}
                    disabled={topupLoading}
                    className="inline-flex shrink-0 whitespace-nowrap rounded-xl border border-emerald-400/60 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-500/10 disabled:opacity-60"
                  >
                    {topupLoading ? t.processing : t.topupAction}
                  </button>
                </div>
              </div>
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
