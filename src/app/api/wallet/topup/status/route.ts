import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import { getWalletTopupPaymentForUser, reprocessWalletTopupPaymentFromStoredPayload } from '@/lib/db/wallet';

function getDiagnostics(payment: { failure_reason?: string | null; metadata?: Record<string, unknown> | null }) {
  const amwal = payment.metadata?.amwal && typeof payment.metadata.amwal === 'object'
    ? payment.metadata.amwal as Record<string, unknown>
    : null;
  const rawPayload = amwal?.rawPayload && typeof amwal.rawPayload === 'object'
    ? amwal.rawPayload as Record<string, unknown>
    : null;
  const rawData = rawPayload?.data && typeof rawPayload.data === 'object'
    ? rawPayload.data as Record<string, unknown>
    : null;
  const rawNestedData = rawData?.data && typeof rawData.data === 'object'
    ? rawData.data as Record<string, unknown>
    : null;
  const errorList = rawNestedData?.errorList;
  const detail = Array.isArray(errorList)
    ? errorList.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).join(' ')
    : null;

  return {
    failureReason: payment.failure_reason ?? null,
    gatewayMessage: typeof amwal?.message === 'string' ? amwal.message : null,
    gatewayDetail: detail,
    environment: typeof amwal?.environment === 'string' ? amwal.environment : null,
    responseCode: typeof amwal?.responseCode === 'string' ? amwal.responseCode : null,
    systemReference: typeof amwal?.systemReference === 'string' ? amwal.systemReference : null,
    authorizationDateTime: typeof amwal?.authorizationDateTime === 'string' ? amwal.authorizationDateTime : null,
  };
}

export async function GET(request: NextRequest) {
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

    const reference = request.nextUrl.searchParams.get('reference')?.trim() ?? '';
    if (!reference) {
      return NextResponse.json({ error: 'Reference is required' }, { status: 400 });
    }

    const initialPayment = await getWalletTopupPaymentForUser(reference, user.id);
    const payment = initialPayment?.status === 'PENDING'
      ? (await reprocessWalletTopupPaymentFromStoredPayload(reference)).payment
      : initialPayment;
    if (!payment) {
      return NextResponse.json({ error: 'Top-up payment not found' }, { status: 404 });
    }

    return NextResponse.json({ payment, diagnostics: getDiagnostics(payment) });
  } catch (error) {
    console.error('Error loading wallet top-up status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
