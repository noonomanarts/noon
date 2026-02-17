import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db/pool';
import { getUserById } from '@/lib/db/users';
import { CART_COOKIE_NAME, emptyCart, parseCartCookie, serializeCartCookie } from '@/lib/cart';

const SHIPPING_FEE = 2;

function isAllowedCity(city: string): boolean {
  const normalized = city.trim().toLowerCase();
  return normalized === 'muscat' || normalized === 'مسقط';
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
      city?: string;
      area?: string;
      streetAddress?: string;
      postalCode?: string;
      recipientFullName?: string;
      recipientPhone?: string;
      notes?: string;
    };

    const city = typeof body.city === 'string' ? body.city.trim() : '';
    const area = typeof body.area === 'string' ? body.area.trim() : '';
    const streetAddress = typeof body.streetAddress === 'string' ? body.streetAddress.trim() : '';
    const postalCode = typeof body.postalCode === 'string' ? body.postalCode.trim() : '';
    const recipientFullName = typeof body.recipientFullName === 'string' ? body.recipientFullName.trim() : '';
    const recipientPhone = typeof body.recipientPhone === 'string' ? body.recipientPhone.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';

    if (!city || !area || !streetAddress || !recipientFullName || !recipientPhone) {
      return NextResponse.json({ error: 'Please complete all required address fields' }, { status: 400 });
    }

    if (!isAllowedCity(city)) {
      return NextResponse.json({ error: 'Delivery is available in Muscat only' }, { status: 400 });
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
          status VARCHAR(20) NOT NULL DEFAULT 'PAID' CHECK (status IN ('PAID', 'CANCELLED')),
          city VARCHAR(80) NOT NULL,
          area VARCHAR(120) NOT NULL,
          street_address TEXT NOT NULL,
          postal_code VARCHAR(30),
          recipient_full_name VARCHAR(160) NOT NULL,
          recipient_phone VARCHAR(30) NOT NULL,
          notes TEXT,
          subtotal DECIMAL(10, 3) NOT NULL CHECK (subtotal >= 0),
          shipping_fee DECIMAL(10, 3) NOT NULL DEFAULT 2.000 CHECK (shipping_fee >= 0),
          total_amount DECIMAL(10, 3) NOT NULL CHECK (total_amount >= 0),
          currency VARCHAR(10) NOT NULL DEFAULT 'OMR',
          payment_method VARCHAR(20) NOT NULL DEFAULT 'WALLET' CHECK (payment_method IN ('WALLET')),
          wallet_transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
          paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )`
      );

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
      const totalAmount = Number((subtotal + shippingFee).toFixed(3));

      const walletBalance = Number(walletRow.balance);
      const walletAvailable = Number(walletRow.available_balance);

      if (walletBalance < totalAmount || walletAvailable < totalAmount) {
        await client.query('ROLLBACK');
        return NextResponse.json({
          error: 'Insufficient wallet balance',
          required: totalAmount,
          available: Number(walletAvailable.toFixed(3)),
        }, { status: 409 });
      }

      const newBalance = Number((walletBalance - totalAmount).toFixed(3));
      const newAvailable = Number((walletAvailable - totalAmount).toFixed(3));

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
          order_number, user_id, status, city, area, street_address, postal_code,
          recipient_full_name, recipient_phone, notes,
          subtotal, shipping_fee, total_amount, currency, payment_method, wallet_transaction_id, paid_at
        ) VALUES (
          $1, $2, 'PAID', $3, $4, $5, $6,
          $7, $8, $9,
          $10, $11, $12, $13, 'WALLET', $14, NOW()
        ) RETURNING id, order_number`,
        [
          orderNumber,
          user.id,
          city,
          area,
          streetAddress,
          postalCode || null,
          recipientFullName,
          recipientPhone,
          notes || null,
          subtotal,
          shippingFee,
          totalAmount,
          walletRow.currency || 'OMR',
          walletTxResult.rows[0].id,
        ]
      );

      const orderId = orderInsert.rows[0].id as string;

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

      const response = NextResponse.json({
        success: true,
        order: {
          id: orderId,
          orderNumber: orderInsert.rows[0].order_number as string,
          subtotal,
          shippingFee,
          totalAmount,
          currency: String(walletRow.currency || 'OMR'),
          itemsCount: orderItems.reduce((sum, item) => sum + item.quantity, 0),
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
