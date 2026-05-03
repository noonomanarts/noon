import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import { createWalletTopupPayment, updateWalletTopupPaymentGatewayData } from '@/lib/db/wallet';
import { prepareAmwalPayment } from '@/lib/amwal';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('noon_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(sessionId);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as {
      amount?: number;
      currency?: string;
      metadata?: Record<string, unknown>;
      returnUrl?: string;
    };

    const amount = typeof body.amount === 'number' ? body.amount : NaN;
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const currency = typeof body.currency === 'string' && body.currency.trim().length > 0
      ? body.currency.trim().toUpperCase()
      : 'OMR';

    const locale = typeof body.metadata?.locale === 'string' ? body.metadata.locale : 'en';
    const fallbackReturnUrl = `/${locale}/account/wallet`;
    const requestedReturnUrl = typeof body.returnUrl === 'string' ? body.returnUrl.trim() : '';
    const returnUrl = requestedReturnUrl.startsWith('/') ? requestedReturnUrl : fallbackReturnUrl;
    const absoluteReturnUrl = new URL(returnUrl, request.url).toString();

    const payment = await createWalletTopupPayment({
      userId: user.id,
      amount,
      currency,
      gateway: 'AMWAL',
      metadata: {
        ...(body.metadata ?? {}),
        locale,
        returnUrl,
      },
    });

    try {
      const amwalPayment = prepareAmwalPayment({
        amount,
        currency,
        reference: payment.reference,
        locale,
        purpose: 'WALLET_TOPUP',
        returnUrl: absoluteReturnUrl,
        contact: {
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber,
        },
      });

      const enrichedPayment = await updateWalletTopupPaymentGatewayData({
        reference: payment.reference,
        gateway: 'AMWAL',
        metadata: {
          ...amwalPayment.metadata,
        },
      });

      return NextResponse.json({
        payment: {
          ...enrichedPayment,
          checkout: {
            scriptUrl: amwalPayment.scriptUrl,
            config: amwalPayment.config,
          },
          returnUrl,
        },
      }, { status: 201 });
    } catch (gatewayError) {
      await updateWalletTopupPaymentGatewayData({
        reference: payment.reference,
        gateway: 'AMWAL',
        metadata: {
          amwal: {
            intentCreationFailedAt: new Date().toISOString(),
            intentCreationError:
              gatewayError instanceof Error ? gatewayError.message : 'Unknown Amwal error',
          },
        },
      });
      throw gatewayError;
    }
  } catch (error) {
    console.error('Error creating wallet topup payment:', error);
    if (error instanceof Error && error.message === 'Wallet not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'Topup payments table is not migrated') {
      return NextResponse.json({
        error: 'Top-up payments setup is incomplete. Please run database migrations.',
      }, { status: 503 });
    }
    if (
      error instanceof Error &&
      (error.message.includes('Amwal') || error.message.startsWith('AMWAL_'))
    ) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
