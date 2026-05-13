import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { addEventBookingToCart, CART_COOKIE_NAME, parseCartCookie, serializeCartCookie } from '@/lib/cart';

const EVENT_TYPE_LABELS = {
  COOKING_COMPETITION: {
    en: 'Cooking Competition',
    ar: 'مسابقة الطبخ',
  },
  PRIVATE_CLASS: {
    en: 'Private Class',
    ar: 'حصة خاصة',
  },
  BIRTHDAY_PARTY: {
    en: 'Birthday Party',
    ar: 'حفلة عيد ميلاد',
  },
} as const;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      eventType?: 'COOKING_COMPETITION' | 'PRIVATE_CLASS' | 'BIRTHDAY_PARTY';
      selectedDate?: string;
      selectedTime?: string;
      estimatedTotal?: number | null;
      currency?: string;
      payload?: Record<string, unknown>;
    };

    const eventType = body.eventType;
    const selectedDate = typeof body.selectedDate === 'string' ? body.selectedDate.trim() : '';
    const selectedTime = typeof body.selectedTime === 'string' ? body.selectedTime.trim() : '';
    const estimatedTotal = body.estimatedTotal == null ? null : Number(body.estimatedTotal);
    const currency = typeof body.currency === 'string' ? body.currency.trim() : 'OMR';
    const payload = body.payload && typeof body.payload === 'object' ? body.payload : null;

    if (!eventType || !(eventType in EVENT_TYPE_LABELS) || !selectedDate || !selectedTime || !payload) {
      return NextResponse.json({ error: 'Invalid event booking draft' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const cartCookie = cookieStore.get(CART_COOKIE_NAME)?.value;
    const currentCart = parseCartCookie(cartCookie);
    const nextCart = addEventBookingToCart(currentCart, {
      eventType,
      title: EVENT_TYPE_LABELS[eventType].en,
      titleAr: EVENT_TYPE_LABELS[eventType].ar,
      selectedDate,
      selectedTime,
      estimatedTotal: Number.isFinite(estimatedTotal ?? NaN) ? Number((estimatedTotal as number).toFixed(3)) : null,
      currency,
      payload,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set(CART_COOKIE_NAME, serializeCartCookie(nextCart), {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    console.error('Error adding event booking to cart:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}