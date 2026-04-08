import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db/pool';
import { getUserById } from '@/lib/db/users';
import { CART_COOKIE_NAME, emptyCart, parseCartCookie, serializeCartCookie } from '@/lib/cart';
import { validatePromoCode } from '@/lib/db/promoCodes';
import { sendUserTransactionWhatsApp } from '@/lib/whatsapp/transactionNotifications';

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

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();

  try {
    const sessionId = cookieStore.get('noon_session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(sessionId);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as {
      area?: string;
      streetAddress?: string;
      postalCode?: string;
      recipientFullName?: string;
      recipientPhone?: string;
      notes?: string;
      promoCode?: string;
      location?: {
        lat?: number;
        lng?: number;
      };
    };

    const city = DELIVERY_CITY;
    const area = typeof body.area === 'string' ? body.area.trim() : '';
    const streetAddress = typeof body.streetAddress === 'string' ? body.streetAddress.trim() : '';
    const postalCode = typeof body.postalCode === 'string' ? body.postalCode.trim() : '';
    const recipientFullName = typeof body.recipientFullName === 'string' ? body.recipientFullName.trim() : '';
    const recipientPhone = typeof body.recipientPhone === 'string' ? body.recipientPhone.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    const promoCodeInput = typeof body.promoCode === 'string' ? body.promoCode.trim() : '';
    const location = parseMuscatLocation(body.location);

    if (!area || !streetAddress || !recipientFullName || !recipientPhone) {
      return NextResponse.json({ error: 'Please complete all required address fields' }, { status: 400 });
    }

    if (!location) {
      return NextResponse.json({ error: 'Please select a valid delivery location in Muscat' }, { status: 400 });
    }

    const cartCookie = cookieStore.get(CART_COOKIE_NAME)?.value;
    const cart = parseCartCookie(cartCookie);

    if (!Array.isArray(cart.items) || cart.items.length === 0) {
      return NextResponse.json({ error: 'Your cart is empty' }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        `CREATE TABLE IF NOT EXISTS shop_orders (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          order_number VARCHAR(30) UNIQUE NOT NULL,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          status VARCHAR(20) NOT NULL DEFAULT 'PAID' CHECK (status IN ('PAID', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
          city VARCHAR(80) NOT NULL,
          area VARCHAR(120) NOT NULL,
          street_address TEXT NOT NULL,
          delivery_latitude DOUBLE PRECISION,
          delivery_longitude DOUBLE PRECISION,
          postal_code VARCHAR(30),
          recipient_full_name VARCHAR(160) NOT NULL,
          recipient_phone VARCHAR(30) NOT NULL,
          notes TEXT,
          subtotal DECIMAL(10, 3) NOT NULL CHECK (subtotal >= 0),
          discount_amount DECIMAL(10, 3) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
          promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
          promo_code VARCHAR(50),
          shipping_fee DECIMAL(10, 3) NOT NULL DEFAULT 2.000 CHECK (shipping_fee >= 0),
          total_amount DECIMAL(10, 3) NOT NULL CHECK (total_amount >= 0),
          currency VARCHAR(10) NOT NULL DEFAULT 'OMR',
          payment_method VARCHAR(20) NOT NULL DEFAULT 'WALLET' CHECK (payment_method IN ('WALLET')),
          wallet_transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
          tracking_number VARCHAR(120),
          admin_notes TEXT,
          cancellation_reason TEXT,
          paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          shipped_at TIMESTAMP WITH TIME ZONE,
          delivered_at TIMESTAMP WITH TIME ZONE,
          cancelled_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )`
      );

      await client.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(120)`);
      await client.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS admin_notes TEXT`);
      await client.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT`);
      await client.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS delivery_latitude DOUBLE PRECISION`);
      await client.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS delivery_longitude DOUBLE PRECISION`);
      await client.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 3) NOT NULL DEFAULT 0`);
      await client.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL`);
      await client.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50)`);
      await client.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE`);
      await client.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE`);
      await client.query(`ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE`);
      await client.query(`ALTER TABLE shop_orders DROP CONSTRAINT IF EXISTS shop_orders_status_check`);
      await client.query(`
        ALTER TABLE shop_orders
        ADD CONSTRAINT shop_orders_status_check
        CHECK (status IN ('PAID', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED'))
      `);

      await client.query(
        `CREATE TABLE IF NOT EXISTS shop_order_items (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          order_id UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
          product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE RESTRICT,
          quantity INTEGER NOT NULL CHECK (quantity > 0),
          unit_price DECIMAL(10, 3) NOT NULL CHECK (unit_price >= 0),
          line_total DECIMAL(10, 3) NOT NULL CHECK (line_total >= 0),
          product_name_en VARCHAR(255) NOT NULL,
          product_name_ar VARCHAR(255) NOT NULL,
          product_slug VARCHAR(255) NOT NULL,
          product_image TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )`
      );

      const walletResult = await client.query(
        `SELECT id, balance, available_balance, currency
         FROM wallets
         WHERE user_id = $1
         FOR UPDATE`,
        [user.id]
      );

      const walletRow = walletResult.rows[0];
      if (!walletRow) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
      }

      const productIds = cart.items.map((item) => item.productId.trim()).filter((id) => id.length > 0);
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

      for (const cartItem of cart.items) {
        const product = productMap.get(cartItem.productId);
        if (!product) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'A cart item is no longer available' }, { status: 409 });
        }

        const isActive = Boolean(product.is_active) && Boolean(product.category_is_active);
        if (!isActive) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'A cart item is inactive and cannot be purchased' }, { status: 409 });
        }

        const stock = Number(product.stock_quantity);
        const requestedQty = Math.max(1, Math.trunc(Number(cartItem.quantity)));

        if (!Number.isFinite(stock) || stock < requestedQty) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: `Insufficient stock for ${String(product.name_en)}` }, { status: 409 });
        }

        const unitPrice = Number(product.price);
        const lineTotal = unitPrice * requestedQty;
        subtotal += lineTotal;

        orderItems.push({
          productId: product.id as string,
          quantity: requestedQty,
          unitPrice,
          lineTotal,
          nameEn: String(product.name_en),
          nameAr: String(product.name_ar),
          slug: String(product.slug),
          image: product.image ? String(product.image) : null,
        });
      }

      if (orderItems.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Your cart is empty' }, { status: 400 });
      }

      subtotal = Number(subtotal.toFixed(3));
      const shippingFee = SHIPPING_FEE;

      let discountAmount = 0;
      let appliedPromo: { id: string; code: string } | null = null;

      if (promoCodeInput) {
        const promoValidation = await validatePromoCode(promoCodeInput, subtotal);
        if (!promoValidation.valid) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: promoValidation.reason }, { status: 400 });
        }

        discountAmount = Number(promoValidation.discountAmount.toFixed(3));
        appliedPromo = {
          id: promoValidation.promo.id,
          code: promoValidation.promo.code,
        };
      }

      const discountedSubtotal = Number(Math.max(0, subtotal - discountAmount).toFixed(3));
      const totalAmount = Number((discountedSubtotal + shippingFee).toFixed(3));

      const walletBalance = Number(walletRow.balance ?? 0);
      const walletAvailable = Number(walletRow.available_balance ?? walletRow.balance ?? 0);

      if (!Number.isFinite(walletBalance) || walletBalance < totalAmount) {
        await client.query('ROLLBACK');
        return NextResponse.json({
          error: 'Insufficient wallet balance',
          required: totalAmount,
          available: Number(walletBalance.toFixed(3)),
          withdrawable: Number(walletAvailable.toFixed(3)),
        }, { status: 409 });
      }

      const newBalance = Number((walletBalance - totalAmount).toFixed(3));
      const newAvailable = Number(Math.min(walletAvailable, newBalance).toFixed(3));

      const walletTxResult = await client.query(
        `INSERT INTO wallet_transactions (wallet_id, amount, type, reason, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [walletRow.id, -totalAmount, 'SHOP_PURCHASE', 'Shop checkout payment', 'COMPLETED']
      );

      await client.query(
        `UPDATE wallets
         SET balance = $1, available_balance = $2, updated_at = NOW()
         WHERE id = $3`,
        [newBalance, newAvailable, walletRow.id]
      );

      const orderNumber = generateOrderNumber();

      const orderInsert = await client.query(
        `INSERT INTO shop_orders (
          order_number, user_id, status, city, area, street_address, delivery_latitude, delivery_longitude, postal_code,
          recipient_full_name, recipient_phone, notes,
          subtotal, discount_amount, promo_code_id, promo_code, shipping_fee, total_amount, currency, payment_method, wallet_transaction_id, paid_at
        ) VALUES (
          $1, $2, 'PAID', $3, $4, $5, $6, $7, $8,
          $9, $10, $11,
          $12, $13, $14, $15, $16, $17, $18, 'WALLET', $19, NOW()
        ) RETURNING id, order_number`,
        [
          orderNumber,
          user.id,
          city,
          area,
          streetAddress,
          location.latitude,
          location.longitude,
          postalCode || null,
          recipientFullName,
          recipientPhone,
          notes || null,
          subtotal,
          discountAmount,
          appliedPromo?.id ?? null,
          appliedPromo?.code ?? null,
          shippingFee,
          totalAmount,
          walletRow.currency || 'OMR',
          walletTxResult.rows[0].id,
        ]
      );

      const orderId = orderInsert.rows[0].id as string;

      if (appliedPromo) {
        const usageResult = await client.query(
          `UPDATE promo_codes
           SET times_used = times_used + 1,
               updated_at = NOW()
           WHERE id = $1
             AND is_active = TRUE
             AND (starts_at IS NULL OR starts_at <= NOW())
             AND (expires_at IS NULL OR expires_at >= NOW())
             AND (max_uses IS NULL OR times_used < max_uses)`,
          [appliedPromo.id]
        );

        if ((usageResult.rowCount ?? 0) === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Promo code usage limit reached' }, { status: 409 });
        }
      }

      for (const item of orderItems) {
        await client.query(
          `INSERT INTO shop_order_items (
            order_id, product_id, quantity, unit_price, line_total,
            product_name_en, product_name_ar, product_slug, product_image
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            orderId,
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

      await client.query('COMMIT');

      await sendUserTransactionWhatsApp({
        userId: user.id,
        key: 'shop_purchase_paid',
        vars: {
          orderNumber: String(orderInsert.rows[0].order_number),
          amount: totalAmount,
          currency: String(walletRow.currency || 'OMR'),
          balance: newBalance,
        },
      }).catch((error) => {
        console.error('Failed to send shop purchase WhatsApp message:', error);
      });

      const response = NextResponse.json({
        success: true,
        order: {
          id: orderId,
          orderNumber: orderInsert.rows[0].order_number as string,
          subtotal,
          discountAmount,
          promoCode: appliedPromo?.code ?? null,
          shippingFee,
          totalAmount,
          currency: String(walletRow.currency || 'OMR'),
          itemsCount: orderItems.reduce((sum, item) => sum + item.quantity, 0),
          location: {
            lat: location.latitude,
            lng: location.longitude,
          },
        },
        wallet: {
          balance: newBalance,
          available_balance: newAvailable,
          currency: String(walletRow.currency || 'OMR'),
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
    console.error('Error during shop checkout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
