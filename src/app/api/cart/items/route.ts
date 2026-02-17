import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { addToCart, CART_COOKIE_NAME, parseCartCookie, serializeCartCookie } from '@/lib/cart';
import { getShopProductById } from '@/lib/db/shop';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { productId?: string; quantity?: number };
    const productId = typeof body.productId === 'string' ? body.productId.trim() : '';
    const quantity = Number.isFinite(body.quantity) ? Number(body.quantity) : 1;

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const product = await getShopProductById(productId);
    if (!product || !product.is_active) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (product.stock_quantity <= 0) {
      return NextResponse.json({ error: 'Product is out of stock' }, { status: 409 });
    }

    const cookieStore = await cookies();
    const cartCookie = cookieStore.get(CART_COOKIE_NAME)?.value;
    const currentCart = parseCartCookie(cartCookie);
    const nextCart = addToCart(currentCart, productId, Math.max(1, quantity));

    const response = NextResponse.json({ success: true });
    response.cookies.set(CART_COOKIE_NAME, serializeCartCookie(nextCart), {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error('Error adding item to cart:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
