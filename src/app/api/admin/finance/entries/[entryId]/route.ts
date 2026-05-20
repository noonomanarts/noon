import { NextRequest, NextResponse } from 'next/server';
import {
  archiveAdminFinanceEntry,
  updateAdminFinanceEntry,
  type AdminFinanceEntryType,
} from '@/lib/db/finance';
import { isQuarterHourDateTimeValue } from '@/lib/dateTime';
import { requireAdminSession } from '../../_auth';

function mapValidationStatus(error: unknown): number {
  if (!(error instanceof Error)) return 500;
  const message = error.message.toLowerCase();
  if (
    message.includes('invalid')
    || message.includes('required')
    || message.includes('cannot be empty')
    || message.includes('greater than zero')
    || message.includes('no changes provided')
  ) {
    return 400;
  }
  return 500;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const auth = await requireAdminSession();
    if (auth.error) return auth.error;

    const { entryId } = await params;
    const body = (await request.json()) as {
      type?: AdminFinanceEntryType;
      title?: string;
      category?: string | null;
      reasonId?: string | null;
      amount?: number;
      currency?: string | null;
      occurredAt?: string | null;
      paymentMethod?: string | null;
      reference?: string | null;
      counterparty?: string | null;
      notes?: string | null;
      metadata?: Record<string, unknown>;
    };

    if (body.occurredAt !== undefined && !isQuarterHourDateTimeValue(body.occurredAt)) {
      return NextResponse.json({ error: 'Finance date/time minutes must be 00, 15, 30, or 45' }, { status: 400 });
    }

    const entry = await updateAdminFinanceEntry(entryId, {
      type: body.type,
      title: body.title,
      category: body.category,
      reasonId: body.reasonId,
      amount: body.amount,
      currency: body.currency,
      occurredAt: body.occurredAt,
      paymentMethod: body.paymentMethod,
      reference: body.reference,
      counterparty: body.counterparty,
      notes: body.notes,
      metadata: body.metadata,
      updatedByUserId: auth.user.id,
    });

    if (!entry) {
      return NextResponse.json({ error: 'Finance entry not found' }, { status: 404 });
    }

    return NextResponse.json({ entry });
  } catch (error) {
    console.error('Error updating finance entry:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: mapValidationStatus(error) });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const auth = await requireAdminSession();
    if (auth.error) return auth.error;

    const { entryId } = await params;
    const archived = await archiveAdminFinanceEntry(entryId, auth.user.id);

    if (!archived) {
      return NextResponse.json({ error: 'Finance entry not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting finance entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
