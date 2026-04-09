import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db/pool';
import { getUserById } from '@/lib/db/users';
import { sendUserTransactionWhatsApp } from '@/lib/whatsapp/transactionNotifications';

class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const PAYABLE_EVENT_STATUSES = new Set(['CLIENT_CONFIRMED', 'PENDING_PAYMENT']);

type Params = {
  params: Promise<{ bookingId: string }>;
};

export async function POST(request: NextRequest, props: Params) {
  const params = await props.params;
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;

  if (!sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getUserById(sessionId);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const bookingResult = await client.query(
      `SELECT id, booking_number, status, total_amount, currency, payment_status, payment_method
       FROM event_bookings
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [params.bookingId, user.id]
    );

    const booking = bookingResult.rows[0];
    if (!booking) {
      throw new ApiError('Event booking not found', 404);
    }

    if ((booking.status as string) === 'CANCELLED') {
      throw new ApiError('Cancelled bookings cannot be paid', 409);
    }

    if ((booking.payment_status as string) === 'PAID') {
      throw new ApiError('This event booking has already been paid', 409);
    }

    if (!PAYABLE_EVENT_STATUSES.has(booking.status as string)) {
      throw new ApiError('This booking is not ready for payment yet', 409);
    }

    const totalAmount = Number(booking.total_amount ?? 0);
    const currency = String(booking.currency || 'OMR');

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw new ApiError('Final amount is not available for this booking yet', 409);
    }

    let walletResult = await client.query(
      `SELECT id, balance, available_balance, currency
       FROM wallets
       WHERE user_id = $1
       FOR UPDATE`,
      [user.id]
    );

    if (walletResult.rows.length === 0) {
      walletResult = await client.query(
        `INSERT INTO wallets (user_id, balance, available_balance, currency)
         VALUES ($1, 0, 0, $2)
         RETURNING id, balance, available_balance, currency`,
        [user.id, currency]
      );
    }

    const wallet = walletResult.rows[0];
    const walletBalance = Number(wallet.balance ?? 0);
    const walletAvailable = Number(wallet.available_balance ?? wallet.balance ?? 0);

    if ((wallet.currency as string) !== currency) {
      throw new ApiError('Wallet currency does not match booking currency', 409);
    }

    if (!Number.isFinite(walletBalance) || walletBalance < totalAmount) {
      throw new ApiError('Insufficient wallet balance', 409);
    }

    const newBalance = Number((walletBalance - totalAmount).toFixed(3));
    const newAvailable = Number(Math.min(walletAvailable, newBalance).toFixed(3));

    const walletTxResult = await client.query(
      `INSERT INTO wallet_transactions (wallet_id, amount, type, reason, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        wallet.id,
        -totalAmount,
        'EVENT_BOOKING',
        `Event booking payment - ${String(booking.booking_number)}`,
        'COMPLETED',
      ]
    );

    await client.query(
      `UPDATE wallets
       SET balance = $1, available_balance = $2, updated_at = NOW()
       WHERE id = $3`,
      [newBalance, newAvailable, wallet.id]
    );

    const updatedBookingResult = await client.query(
      `UPDATE event_bookings
       SET payment_status = 'PAID',
           payment_method = 'WALLET',
           paid_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, booking_number, status, total_amount, currency, payment_status, payment_method, paid_at`,
      [params.bookingId]
    );

    await client.query('COMMIT');

    const updatedBooking = updatedBookingResult.rows[0];

    void sendUserTransactionWhatsApp({
      userId: user.id,
      key: 'event_booking_paid',
      vars: {
        bookingNumber: String(updatedBooking.booking_number),
        amount: totalAmount,
        currency,
        balance: newBalance,
      },
    }).catch((error) => {
      console.error('Failed to send event booking WhatsApp message:', error);
    });

    return NextResponse.json({
      success: true,
      booking: {
        id: updatedBooking.id,
        bookingNumber: updatedBooking.booking_number,
        status: updatedBooking.status,
        totalAmount: Number(updatedBooking.total_amount ?? 0),
        currency: String(updatedBooking.currency || currency),
        paymentStatus: updatedBooking.payment_status,
        paymentMethod: updatedBooking.payment_method,
        paidAt: updatedBooking.paid_at,
      },
      wallet: {
        balance: newBalance,
        available_balance: newAvailable,
        currency,
      },
      transactionId: walletTxResult.rows[0]?.id ?? null,
    });
  } catch (error) {
    await client.query('ROLLBACK');

    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Error paying for event booking:', error);
    return NextResponse.json({ error: 'Failed to process event payment' }, { status: 500 });
  } finally {
    client.release();
  }
}
