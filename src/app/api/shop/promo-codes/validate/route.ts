import { NextRequest, NextResponse } from 'next/server';
import { validatePromoCode } from '@/lib/db/promoCodes';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      code?: string;
      subtotal?: number;
    };

    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const subtotal = Number(body.subtotal);

    if (!code) {
      return NextResponse.json({ error: 'Promo code is required' }, { status: 400 });
    }

    if (!Number.isFinite(subtotal) || subtotal < 0) {
      return NextResponse.json({ error: 'Invalid order subtotal' }, { status: 400 });
    }

    const result = await validatePromoCode(code, subtotal);
    if (!result.valid) {
      return NextResponse.json({ valid: false, error: result.reason }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      promoCode: result.promo.code,
      discountType: result.promo.discountType,
      discountValue: result.promo.discountValue,
      discountAmount: result.discountAmount,
    });
  } catch (error) {
    console.error('Error validating promo code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
