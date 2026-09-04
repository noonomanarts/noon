import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { CART_COOKIE_NAME, parseCartCookie } from '@/lib/cart';
import { getShopProductsByIdsForPublic } from '@/lib/db/shop';
import { findScheduleConflictsForClasses } from '@/lib/db/classes';
import { getUserById } from '@/lib/db/users';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const cartCookie = cookieStore.get(CART_COOKIE_NAME)?.value;
    const cart = parseCartCookie(cartCookie);

    const sessionId = cookieStore.get('noon_session')?.value;
    const authenticatedUser = sessionId ? await getUserById(sessionId) : null;

    const shopItems = cart.items.filter((item) => item.kind === 'SHOP_PRODUCT');
    const classItems = cart.items.filter((item) => item.kind === 'CLASS_BOOKING');
    const eventItems = cart.items.filter((item) => item.kind === 'EVENT_BOOKING');

    const productIds = shopItems.map((item) => item.productId);
    const products = await getShopProductsByIdsForPublic(productIds);
    const productMap = new Map(products.map((product) => [product.id, product]));

    const hydratedShopItems = shopItems
      .map((item) => {
        const product = productMap.get(item.productId);
        if (
          !product
          || typeof product.id !== 'string'
          || typeof product.slug !== 'string'
          || typeof product.name_en !== 'string'
          || typeof product.name_ar !== 'string'
          || typeof product.currency !== 'string'
          || typeof product.category_name_en !== 'string'
          || typeof product.category_name_ar !== 'string'
          || typeof product.category_slug !== 'string'
        ) {
          return null;
        }

        const quantity = Math.max(1, Math.min(item.quantity, Math.max(0, product.stock_quantity)));
        if (quantity <= 0) return null;

        const lineTotal = product.price * quantity;

        return {
          id: item.id,
          kind: item.kind,
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

    const scheduleConflicts = authenticatedUser && classItems.length > 0
      ? await findScheduleConflictsForClasses(
          authenticatedUser.id,
          classItems.map((item) => item.classId)
        ).catch(() => new Map())
      : new Map();

    const hydratedClassItems = classItems.map((item) => {
      const conflict = scheduleConflicts.get(item.classId);
      return {
        ...item,
        lineTotal: Number((item.price * item.numberOfParticipants).toFixed(3)),
        scheduleConflict: conflict
          ? {
              classId: conflict.classId,
              slug: conflict.slug,
              title: conflict.title,
              titleAr: conflict.titleAr,
              startDateTime: conflict.startDateTime.toISOString(),
              endDateTime: conflict.endDateTime ? conflict.endDateTime.toISOString() : null,
            }
          : null,
      };
    });

    const hydratedEventItems = eventItems.map((item) => ({
      ...item,
      lineTotal: item.estimatedTotal,
    }));

    const items = [...hydratedShopItems, ...hydratedClassItems, ...hydratedEventItems];
    const totalQuantity =
      hydratedShopItems.reduce((sum, item) => sum + item.quantity, 0) +
      hydratedClassItems.length +
      hydratedEventItems.length;
    const subtotal = items.reduce((sum, item) => sum + Number(item.lineTotal ?? 0), 0);
    const payableNowTotal =
      hydratedShopItems.reduce((sum, item) => sum + item.lineTotal, 0) +
      hydratedClassItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const requestOnlyTotal = hydratedEventItems.reduce((sum, item) => sum + Number(item.lineTotal ?? 0), 0);
    const firstItemCurrency = items[0]
      ? items[0].kind === 'SHOP_PRODUCT'
        ? items[0].product.currency
        : items[0].currency
      : 'OMR';

    return NextResponse.json({
      items,
      summary: {
        totalQuantity,
        subtotal,
        payableNowTotal,
        requestOnlyTotal,
        shopItemsCount: hydratedShopItems.length,
        classItemsCount: hydratedClassItems.length,
        eventItemsCount: hydratedEventItems.length,
        currency: firstItemCurrency,
      },
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
