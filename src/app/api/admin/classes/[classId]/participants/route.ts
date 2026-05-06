import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { getUserById } from '@/lib/db/users';
import { removeClassParticipant } from '@/lib/db/classFinance';
import { sendUserTransactionWhatsApp } from '@/lib/whatsapp/transactionNotifications';

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;

  if (!sessionId) return null;

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') return null;

  return user;
}

type Params = {
  params: Promise<{ classId: string }>;
};

export async function POST(request: Request, props: Params) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { classId } = await props.params;
    const body = (await request.json().catch(() => ({}))) as {
      bookingId?: unknown;
      participantIndex?: unknown;
      refundToWallet?: unknown;
    };

    const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : '';
    const participantIndex = Number(body.participantIndex);
    const refundToWallet = body.refundToWallet === true;

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking is required' }, { status: 400 });
    }

    if (!Number.isInteger(participantIndex) || participantIndex < 1) {
      return NextResponse.json({ error: 'Participant index is invalid' }, { status: 400 });
    }

    const result = await removeClassParticipant({
      classId,
      bookingId,
      participantIndex,
      refundToWallet,
      adminUserId: admin.id,
    });

    if (refundToWallet && result.notifyUserId && result.refundedAmount > 0) {
      void sendUserTransactionWhatsApp({
        userId: result.notifyUserId,
        key: 'class_booking_cancelled',
        vars: {
          classTitle: result.classTitle,
          amount: result.refundedAmount,
          currency: result.currency,
          balance: result.walletBalance,
        },
      }).catch((error) => {
        console.error('Failed to send class cancellation WhatsApp message:', error);
      });
    }

    return NextResponse.json({
      success: true,
      removedParticipantName: result.removedParticipantName,
      refundedAmount: result.refundedAmount,
      currency: result.currency,
      refundToWallet,
    });
  } catch (error) {
    console.error('Failed to remove class participant:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove class participant' },
      { status: 400 }
    );
  }
}