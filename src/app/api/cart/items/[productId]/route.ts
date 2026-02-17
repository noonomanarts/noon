import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  CART_COOKIE_NAME,
  parseCartCookie,
  removeFromCart,
  serializeCartCookie,
  updateCartItemQuantity,
} from '@/lib/cart';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const body = (await request.json()) as { quantity?: number };
    const quantity = Number.isFinite(body.quantity) ? Number(body.quantity) : NaN;

    if (!Number.isFinite(quantity)) {
      return NextResponse.json({ error: 'Valid quantity is required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const cartCookie = cookieStore.get(CART_COOKIE_NAME)?.value;
    const currentCart = parseCartCookie(cartCookie);
    const nextCart = updateCartItemQuantity(currentCart, productId, quantity);

    const response = NextResponse.json({ success: true });
    response.cookies.set(CART_COOKIE_NAME, serializeCartCookie(nextCart), {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error('Error updating cart item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;

    const cookieStore = await cookies();
    const cartCookie = cookieStore.get(CART_COOKIE_NAME)?.value;
    const currentCart = parseCartCookie(cartCookie);
    const nextCart = removeFromCart(currentCart, productId);

    const response = NextResponse.json({ success: true });
    response.cookies.set(CART_COOKIE_NAME, serializeCartCookie(nextCart), {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error('Error removing cart item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
