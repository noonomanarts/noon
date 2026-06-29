import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db/pool';
import { getUserById } from '@/lib/db/users';
import {
  CART_COOKIE_NAME,
  emptyCart,
  parseCartCookie,
  serializeCartCookie,
  type CartItem,
  type ClassCartItem,
  type EventCartItem,
  type ShopCartItem,
} from '@/lib/cart';
import { validatePromoCode, createPromoCode } from '@/lib/db/promoCodes';
import { sendPaymentAdminNotifications } from '@/lib/paymentAdminNotifications';
import { sendUserTransactionWhatsApp } from '@/lib/whatsapp/transactionNotifications';
import { sendClassRegistrationMessage } from '@/lib/classCustomMessages';
import { getWorkersWithOrdersPermission } from '@/lib/db/worker';
import { notifyUser } from '@/lib/notificationService';
import { createShopSaleFinanceEntry } from '@/lib/db/finance';
import { addBonusPoints } from '@/lib/db/wallet';
import { isRegistrationClosed } from '@/lib/classRegistration';
import { createEventBooking } from '@/lib/db/events';

const SHIPPING_FEE = 2;
const DELIVERY_CITY = 'Muscat';
const MUSCAT_BOUNDS = {
  west: 58.03,
  south: 23.2,
  east: 58.95,
  north: 23.9,
} as const;

function parseMuscatLocation(value: unknown): { latitude: number; longitude: number } | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const maybeLat = Number((value as { lat?: unknown }).lat);
  const maybeLng = Number((value as { lng?: unknown }).lng);

  if (!Number.isFinite(maybeLat) || !Number.isFinite(maybeLng)) {
    return null;
  }

  if (
    maybeLng < MUSCAT_BOUNDS.west ||
    maybeLng > MUSCAT_BOUNDS.east ||
    maybeLat < MUSCAT_BOUNDS.south ||
    maybeLat > MUSCAT_BOUNDS.north
  ) {
    return null;
  }

  return {
    latitude: Number(maybeLat.toFixed(6)),
    longitude: Number(maybeLng.toFixed(6)),
  };
}

function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SO-${y}${m}${d}-${random}`;
}

function generateClassBookingNumber(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CLS-${y}${m}${d}-${random}`;
}

function getShopItems(items: CartItem[]): ShopCartItem[] {
  return items.filter((item): item is ShopCartItem => item.kind === 'SHOP_PRODUCT');
}

function getClassItems(items: CartItem[]): ClassCartItem[] {
  return items.filter((item): item is ClassCartItem => item.kind === 'CLASS_BOOKING');
}

function getEventItems(items: CartItem[]): EventCartItem[] {
  return items.filter((item): item is EventCartItem => item.kind === 'EVENT_BOOKING');
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();

  try {
    const sessionId = cookieStore.get('noon_session')?.value;
    const user = sessionId ? await getUserById(sessionId) : null;

    const body = (await request.json()) as {
      area?: string;
      streetAddress?: string;
      postalCode?: string;
      recipientFullName?: string;
      recipientPhone?: string;
      notes?: string;
      promoCode?: string;
      location?: { lat?: number; lng?: number };
    };

    const cartCookie = cookieStore.get(CART_COOKIE_NAME)?.value;
    const cart = parseCartCookie(cartCookie);
    const shopItems = getShopItems(cart.items);
    const classItems = getClassItems(cart.items);
    const eventItems = getEventItems(cart.items);
    const requiresAuthenticatedCheckout = shopItems.length > 0 || classItems.length > 0;

    if (cart.items.length === 0) {
      return NextResponse.json({ error: 'Your cart is empty' }, { status: 400 });
    }

    if (requiresAuthenticatedCheckout && !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const city = DELIVERY_CITY;
    const area = typeof body.area === 'string' ? body.area.trim() : '';
    const streetAddress = typeof body.streetAddress === 'string' ? body.streetAddress.trim() : '';
    const postalCode = typeof body.postalCode === 'string' ? body.postalCode.trim() : '';
    const recipientFullName = typeof body.recipientFullName === 'string' ? body.recipientFullName.trim() : '';
    const recipientPhone = typeof body.recipientPhone === 'string' ? body.recipientPhone.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    const promoCodeInput = typeof body.promoCode === 'string' ? body.promoCode.trim() : '';
    const location = parseMuscatLocation(body.location);

    if (shopItems.length > 0) {
      if (!area || !streetAddress || !recipientFullName || !recipientPhone) {
        return NextResponse.json({ error: 'Please complete all required address fields' }, { status: 400 });
      }

      if (!location) {
        return NextResponse.json({ error: 'Please select a valid delivery location in Muscat' }, { status: 400 });
      }
    }

    if (!requiresAuthenticatedCheckout && eventItems.length > 0) {
      const createdEventBookings: Array<{ id: string; bookingNumber: string }> = [];

      for (const item of eventItems) {
        const payload = item.payload;
        if (!payload) {
          continue;
        }

        try {
          const created = await createEventBooking({
            eventType: item.eventType,
            selectedDate: new Date(`${item.selectedDate}T00:00:00`),
            selectedTime: item.selectedTime,
            packageType: payload.packageType === 'STANDARD' || payload.packageType === 'PREMIUM' ? payload.packageType : undefined,
            numberOfParticipants: Number(payload.numberOfParticipants ?? 0),
            numberOfGroups: typeof payload.numberOfGroups === 'number' ? payload.numberOfGroups : undefined,
            gifts: payload.gifts && typeof payload.gifts === 'object' ? payload.gifts as Record<string, unknown> : undefined,
            fullName: String(payload.fullName ?? ''),
            email: String(payload.email ?? ''),
            phoneNumber: String(payload.phoneNumber ?? ''),
            companyOrGroupName: typeof payload.companyOrGroupName === 'string' ? payload.companyOrGroupName : undefined,
            preferredDish: typeof payload.preferredDish === 'string' ? payload.preferredDish : undefined,
            specialRequests: typeof payload.specialRequests === 'string' ? payload.specialRequests : undefined,
            totalAmount: item.estimatedTotal ?? undefined,
          });

          createdEventBookings.push({
            id: String(created.id),
            bookingNumber: String(created.bookingNumber),
          });
        } catch (error) {
          console.error('Failed to create guest event booking from cart item:', error);
        }
      }

      const response = NextResponse.json({
        success: true,
        summary: {
          shopOrderId: null,
          shopOrderNumber: null,
          shopTotal: 0,
          payableTotal: 0,
          currency: 'OMR',
          classBookingsCount: 0,
          eventRequestsCount: createdEventBookings.length,
        },
        wallet: {
          balance: 0,
          available_balance: 0,
          currency: 'OMR',
        },
      });

      response.cookies.set(CART_COOKIE_NAME, serializeCartCookie(emptyCart()), {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      });

      return response;
    }

    const authenticatedUser = user;
    if (!authenticatedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();

    let shopOrderNumber: string | null = null;
    let shopOrderId: string | null = null;
    let shopTotal = 0;
    let discountAmount = 0;
    const shippingFee = shopItems.length > 0 ? SHIPPING_FEE : 0;
    const createdClassBookings: Array<{ id: string; bookingNumber: string; totalAmount: number; currency: string; classTitle: string; classId: string }> = [];

    try {
      await client.query('BEGIN');

      let walletResult = await client.query(
        `SELECT id, balance, available_balance, currency
         FROM wallets
         WHERE user_id = $1
         FOR UPDATE`,
        [authenticatedUser.id]
      );

      if (walletResult.rows.length === 0) {
        walletResult = await client.query(
          `INSERT INTO wallets (user_id, balance, available_balance, currency)
           VALUES ($1, 0, 0, 'OMR')
           RETURNING id, balance, available_balance, currency`,
          [authenticatedUser.id]
        );
      }

      const walletRow = walletResult.rows[0];
      const walletBalance = Number(walletRow.balance ?? 0);
      const walletAvailable = Number(walletRow.available_balance ?? walletRow.balance ?? 0);
      const currency = String(walletRow.currency || 'OMR');

      let subtotal = 0;
      const orderItems: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
        nameEn: string;
        nameAr: string;
        slug: string;
        image: string | null;
      }> = [];

      if (shopItems.length > 0) {
        const productIds = shopItems.map((item) => item.productId.trim()).filter((id) => id.length > 0);
        const productResult = await client.query(
          `SELECT p.id, p.slug, p.name_en, p.name_ar, p.image, p.price, p.currency, p.stock_quantity, p.is_active,
                  c.is_active AS category_is_active
           FROM shop_products p
           JOIN shop_categories c ON c.id = p.category_id
           WHERE p.id = ANY($1::uuid[])
           FOR UPDATE OF p`,
          [productIds]
        );

        const productMap = new Map<string, (typeof productResult.rows)[number]>();
        for (const row of productResult.rows) {
          productMap.set(row.id as string, row);
        }

        for (const cartItem of shopItems) {
          const product = productMap.get(cartItem.productId);
          if (!product) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'A cart item is no longer available' }, { status: 409 });
          }

          const stock = Number(product.stock_quantity);
          const requestedQty = Math.max(1, Math.trunc(Number(cartItem.quantity)));
          if (!Boolean(product.is_active) || !Boolean(product.category_is_active) || stock < requestedQty) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: `Insufficient stock for ${String(product.name_en)}` }, { status: 409 });
          }

          const unitPrice = Number(product.price);
          const lineTotal = unitPrice * requestedQty;
          subtotal += lineTotal;
          orderItems.push({
            productId: String(product.id),
            quantity: requestedQty,
            unitPrice,
            lineTotal,
            nameEn: String(product.name_en),
            nameAr: String(product.name_ar),
            slug: String(product.slug),
            image: product.image ? String(product.image) : null,
          });
        }

        subtotal = Number(subtotal.toFixed(3));

        if (promoCodeInput) {
          const promoValidation = await validatePromoCode(promoCodeInput, subtotal);
          if (!promoValidation.valid) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: promoValidation.reason }, { status: 400 });
          }
          discountAmount = Number(promoValidation.discountAmount.toFixed(3));
        }
      }

      const discountedSubtotal = Number(Math.max(0, subtotal - discountAmount).toFixed(3));

      // Summer Camp discount: 10% off when booking 2+ workshops or 2+ kids
      const summerCampItems = classItems.filter(item => item.subCategory === 'SUMMER_CAMP');
      let summerCampGetsDiscount = false;
      let shouldGenerateSummerCampPromo = false;
      if (summerCampItems.length > 0) {
        const totalSummerCampKids = summerCampItems.reduce((sum, item) => sum + item.numberOfParticipants, 0);
        const priorBookingResult = await client.query(
          `SELECT 1
           FROM bookings b
           INNER JOIN classes c ON c.id = b.class_id
           WHERE b.user_id = $1
             AND NOT (b.class_id = ANY($2::uuid[]))
             AND c.sub_category = 'SUMMER_CAMP'
             AND b.payment_status = 'PAID'
             AND b.status IN ('CONFIRMED', 'COMPLETED')
           LIMIT 1`,
          [authenticatedUser.id, summerCampItems.map(i => i.classId)]
        );
        const hasPriorBooking = priorBookingResult.rows.length > 0;
        summerCampGetsDiscount = summerCampItems.length >= 2 || totalSummerCampKids >= 2 || hasPriorBooking;
        shouldGenerateSummerCampPromo = !summerCampGetsDiscount && summerCampItems.length === 1 && totalSummerCampKids === 1;
      }

      const classTotal = Number(
        classItems.reduce((sum, item) => {
          const raw = Number((item.price * item.numberOfParticipants).toFixed(3));
          return sum + (item.subCategory === 'SUMMER_CAMP' && summerCampGetsDiscount ? Number((raw * 0.9).toFixed(3)) : raw);
        }, 0).toFixed(3)
      );
      const payableTotal = Number((discountedSubtotal + shippingFee + classTotal).toFixed(3));

      if (!Number.isFinite(walletBalance) || walletBalance < payableTotal) {
        await client.query('ROLLBACK');
        return NextResponse.json({
          error: 'Insufficient wallet balance',
          required: payableTotal,
          available: Number(walletBalance.toFixed(3)),
          withdrawable: Number(walletAvailable.toFixed(3)),
        }, { status: 409 });
      }

      const newBalance = Number((walletBalance - payableTotal).toFixed(3));
      const newAvailable = Number(Math.min(walletAvailable, newBalance).toFixed(3));
      let walletTransactionId: string | null = null;

      if (payableTotal > 0) {
        const walletTxResult = await client.query(
          `INSERT INTO wallet_transactions (wallet_id, amount, type, reason, status)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [walletRow.id, -payableTotal, 'SHOP_PURCHASE', 'Mixed checkout payment', 'COMPLETED']
        );

        walletTransactionId = String(walletTxResult.rows[0]?.id ?? '');

        await client.query(
          `UPDATE wallets
           SET balance = $1, available_balance = $2, updated_at = NOW()
           WHERE id = $3`,
          [newBalance, newAvailable, walletRow.id]
        );
      }

      if (orderItems.length > 0) {
        const orderNumber = generateOrderNumber();
        const orderInsert = await client.query(
          `INSERT INTO shop_orders (
            order_number, user_id, status, city, area, street_address, delivery_latitude, delivery_longitude, postal_code,
            recipient_full_name, recipient_phone, notes,
            subtotal, discount_amount, promo_code, shipping_fee, total_amount, currency, payment_method, wallet_transaction_id, paid_at
          ) VALUES (
            $1, $2, 'PAID', $3, $4, $5, $6, $7, $8,
            $9, $10, $11,
            $12, $13, $14, $15, $16, $17, 'WALLET', $18, NOW()
          ) RETURNING id, order_number`,
          [
            orderNumber,
            authenticatedUser.id,
            city,
            area,
            streetAddress,
            location?.latitude ?? null,
            location?.longitude ?? null,
            postalCode || null,
            recipientFullName,
            recipientPhone,
            notes || null,
            subtotal,
            discountAmount,
            promoCodeInput || null,
            shippingFee,
            Number((discountedSubtotal + shippingFee).toFixed(3)),
            currency,
            walletTransactionId,
          ]
        );

        shopOrderId = String(orderInsert.rows[0].id);
        shopOrderNumber = String(orderInsert.rows[0].order_number);
        shopTotal = Number((discountedSubtotal + shippingFee).toFixed(3));

        for (const item of orderItems) {
          await client.query(
            `INSERT INTO shop_order_items (
              order_id, product_id, quantity, unit_price, line_total,
              product_name_en, product_name_ar, product_slug, product_image
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              shopOrderId,
              item.productId,
              item.quantity,
              item.unitPrice,
              item.lineTotal,
              item.nameEn,
              item.nameAr,
              item.slug,
              item.image,
            ]
          );

          await client.query(
            `UPDATE shop_products
             SET stock_quantity = stock_quantity - $1, updated_at = NOW()
             WHERE id = $2`,
            [item.quantity, item.productId]
          );
        }

        await createShopSaleFinanceEntry({
          db: client,
          orderNumber: shopOrderNumber,
          orderId: shopOrderId,
          amount: shopTotal,
          currency,
          customerName: recipientFullName,
        });
      }

      for (const item of classItems) {
        const classResult = await client.query(
          `SELECT id, title, title_ar, price, currency, seats_total, seats_booked, status, start_date_time, registration_close_at
           FROM classes
           WHERE id = $1
           FOR UPDATE`,
          [item.classId]
        );
        const classRow = classResult.rows[0];
        if (!classRow || classRow.status !== 'PUBLISHED') {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'A class in your cart is no longer available' }, { status: 409 });
        }

        if (classRow.start_date_time && new Date(classRow.start_date_time as string).getTime() < Date.now()) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'A class in your cart has already started' }, { status: 409 });
        }

        if (isRegistrationClosed(classRow.start_date_time, classRow.registration_close_at)) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Registration for a class in your cart is closed' }, { status: 409 });
        }

        const seatsAvailable = Math.max(0, Number(classRow.seats_total ?? 0) - Number(classRow.seats_booked ?? 0));
        if (item.numberOfParticipants > seatsAvailable) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Not enough seats available for a class in your cart' }, { status: 409 });
        }

        let bookingNumber = '';
        for (let attempt = 0; attempt < 5; attempt += 1) {
          bookingNumber = generateClassBookingNumber();
          try {
            const bookingInsert = await client.query(
              `INSERT INTO bookings (
                 booking_number, user_id, class_id, participants, number_of_participants,
                 total_amount, currency, status, payment_method, payment_status, paid_at,
                 terms_accepted, terms_accepted_at, special_requests, created_at, updated_at
               ) VALUES (
                 $1, $2, $3, $4::jsonb, $5, $6, $7, 'CONFIRMED', 'WALLET', 'PAID', NOW(),
                 TRUE, NOW(), $8, NOW(), NOW()
               )
               RETURNING id, booking_number, total_amount, currency`,
              [
                bookingNumber,
                authenticatedUser.id,
                item.classId,
                JSON.stringify([...item.participants, ...item.freePartners]),
                item.numberOfParticipants,
                (() => {
                  const raw = Number((item.price * item.numberOfParticipants).toFixed(3));
                  return item.subCategory === 'SUMMER_CAMP' && summerCampGetsDiscount
                    ? Number((raw * 0.9).toFixed(3))
                    : raw;
                })(),
                item.currency,
                item.specialRequests || null,
              ]
            );

            await client.query(
              `UPDATE classes
               SET seats_booked = seats_booked + $1, updated_at = NOW()
               WHERE id = $2`,
              [item.numberOfParticipants, item.classId]
            );

            createdClassBookings.push({
              id: String(bookingInsert.rows[0].id),
              bookingNumber: String(bookingInsert.rows[0].booking_number),
              totalAmount: Number(bookingInsert.rows[0].total_amount ?? 0),
              currency: String(bookingInsert.rows[0].currency || currency),
              classTitle: (classRow.title_ar as string | null) || String(classRow.title),
              classId: String(classRow.id),
            });
            break;
          } catch (error) {
            const pgError = error as { code?: string; constraint?: string };
            const isBookingNumberConflict = pgError.code === '23505' && pgError.constraint === 'bookings_booking_number_key';
            if (!isBookingNumberConflict || attempt === 4) {
              throw error;
            }
          }
        }
      }

      await client.query('COMMIT');

      // Generate a future 10% promo code for single Summer Camp registration
      let summerCampPromoCode: string | null = null;
      if (shouldGenerateSummerCampPromo && createdClassBookings.length > 0) {
        try {
          const expires = new Date();
          expires.setMonth(expires.getMonth() + 6);
          const firstBookingNumber = createdClassBookings[0]?.bookingNumber ?? '';
          const promoCodeStr = `SUMMER10-${authenticatedUser.id.slice(0, 6)}-${firstBookingNumber.slice(-6)}`.toUpperCase();
          const created = await createPromoCode({
            code: promoCodeStr,
            discountType: 'PERCENTAGE',
            discountValue: 10,
            maxUses: 1,
            expiresAt: expires.toISOString(),
          });
          summerCampPromoCode = created.code;
        } catch {
          // Non-blocking: promo code failure doesn't affect the completed booking
        }
      }

      const createdEventBookings: Array<{ id: string; bookingNumber: string }> = [];
      for (const item of eventItems) {
        const payload = item.payload;
        if (!payload) {
          continue;
        }

        try {
          const created = await createEventBooking({
            userId: authenticatedUser.id,
            eventType: item.eventType,
            selectedDate: new Date(`${item.selectedDate}T00:00:00`),
            selectedTime: item.selectedTime,
            packageType: payload.packageType === 'STANDARD' || payload.packageType === 'PREMIUM' ? payload.packageType : undefined,
            numberOfParticipants: Number(payload.numberOfParticipants ?? 0),
            numberOfGroups: typeof payload.numberOfGroups === 'number' ? payload.numberOfGroups : undefined,
            gifts: payload.gifts && typeof payload.gifts === 'object' ? payload.gifts as Record<string, unknown> : undefined,
            fullName: String(payload.fullName ?? authenticatedUser.fullName ?? ''),
            email: String(payload.email ?? authenticatedUser.email ?? ''),
            phoneNumber: String(payload.phoneNumber ?? authenticatedUser.phoneNumber ?? ''),
            companyOrGroupName: typeof payload.companyOrGroupName === 'string' ? payload.companyOrGroupName : undefined,
            preferredDish: typeof payload.preferredDish === 'string' ? payload.preferredDish : undefined,
            specialRequests: typeof payload.specialRequests === 'string' ? payload.specialRequests : undefined,
            totalAmount: item.estimatedTotal ?? undefined,
          });

          createdEventBookings.push({
            id: String(created.id),
            bookingNumber: String(created.bookingNumber),
          });
        } catch (error) {
          console.error('Failed to create event booking from cart item:', error);
        }
      }

      if (shopOrderId && shopOrderNumber) {
        void sendUserTransactionWhatsApp({
          userId: authenticatedUser.id,
          key: 'shop_purchase_paid',
          vars: {
            orderNumber: shopOrderNumber,
            amount: shopTotal,
            currency,
            balance: Number((walletBalance - payableTotal).toFixed(3)),
          },
        }).catch((error) => {
          console.error('Failed to send shop purchase WhatsApp message:', error);
        });

        void sendPaymentAdminNotifications({
          source: 'shopOrder',
          entityId: shopOrderId,
          reference: shopOrderNumber,
          amount: shopTotal,
          currency,
          customerName: recipientFullName,
          paymentMethod: 'Wallet',
          adminPath: '/admin/shop/orders',
        }).catch((error) => {
          console.error('Failed to send admin shop payment alerts:', error);
        });

        void (async () => {
          try {
            const workers = await getWorkersWithOrdersPermission();
            for (const worker of workers) {
              await notifyUser(worker.id, {
                title: 'New Website Order',
                message: `Order #${shopOrderNumber} has been placed (${shopTotal.toFixed(3)} OMR)`,
                type: 'shop_order',
                data: { link: '/worker/orders' },
              });
            }
          } catch (error) {
            console.error('Failed to notify workers about new order:', error);
          }
        })();
      }

      for (const booking of createdClassBookings) {
        void addBonusPoints(authenticatedUser.id, booking.totalAmount).catch(() => undefined);
        void sendUserTransactionWhatsApp({
          userId: authenticatedUser.id,
          key: 'class_booking_paid',
          vars: {
            amount: booking.totalAmount,
            currency: booking.currency,
            balance: Number((walletBalance - payableTotal).toFixed(3)),
            classTitle: booking.classTitle,
          },
        }).catch((error) => {
          console.error('Failed to send class booking WhatsApp message:', error);
        });

        void sendClassRegistrationMessage({
          userId: authenticatedUser.id,
          classId: booking.classId,
        }).catch(() => { /* ignore registration auto-message failure */ });

        void sendPaymentAdminNotifications({
          source: 'classBooking',
          entityId: booking.id,
          reference: booking.bookingNumber,
          amount: booking.totalAmount,
          currency: booking.currency,
          customerName: authenticatedUser.fullName,
          paymentMethod: 'Wallet',
          adminPath: '/admin/payments',
        }).catch((error) => {
          console.error('Failed to send admin class payment alerts:', error);
        });
      }

      const response = NextResponse.json({
        success: true,
        summary: {
          shopOrderId,
          shopOrderNumber,
          shopTotal,
          payableTotal,
          currency,
          classBookingsCount: createdClassBookings.length,
          eventRequestsCount: createdEventBookings.length,
          summerCampPromoCode,
        },
        wallet: {
          balance: Number((walletBalance - payableTotal).toFixed(3)),
          available_balance: Number(Math.min(walletAvailable, walletBalance - payableTotal).toFixed(3)),
          currency,
        },
      });

      response.cookies.set(CART_COOKIE_NAME, serializeCartCookie(emptyCart()), {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      });

      return response;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error during mixed checkout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}