import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { CART_COOKIE_NAME, parseCartCookie } from '@/lib/cart';
import { getShopProductsByIdsForPublic } from '@/lib/db/shop';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const cartCookie = cookieStore.get(CART_COOKIE_NAME)?.value;
    const cart = parseCartCookie(cartCookie);

    const productIds = cart.items.map((item) => item.productId);
    const products = await getShopProductsByIdsForPublic(productIds);
    const productMap = new Map(products.map((product) => [product.id, product]));

    const items = cart.items
      .map((item) => {
        const product = productMap.get(item.productId);
        if (!product) return null;

        const quantity = Math.max(1, Math.min(item.quantity, Math.max(0, product.stock_quantity)));
        if (quantity <= 0) return null;

        const lineTotal = product.price * quantity;

        return {
          productId: product.id,
          quantity,
          lineTotal,
          product: {
            id: product.id,
            slug: product.slug,
            name_en: product.name_en,
            name_ar: product.name_ar,
            image: product.image,
            price: product.price,
            currency: product.currency,
            stock_quantity: product.stock_quantity,
            category_name_en: product.category_name_en,
            category_name_ar: product.category_name_ar,
            category_slug: product.category_slug,
          },
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

    return NextResponse.json({
      items,
      summary: {
        totalQuantity,
        subtotal,
        currency: items[0]?.product.currency ?? 'OMR',
      },
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
