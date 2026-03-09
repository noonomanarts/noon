import { NextRequest, NextResponse } from 'next/server';
import {
  archiveAdminFinanceReason,
  updateAdminFinanceReason,
  type AdminFinanceEntryType,
} from '@/lib/db/finance';
import { requireAdminSession } from '../../_auth';

function mapValidationStatus(error: unknown): number {
  if (!(error instanceof Error)) return 500;
  const message = error.message.toLowerCase();
  if (
    message.includes('invalid')
    || message.includes('required')
    || message.includes('cannot be empty')
    || message.includes('duplicate')
    || message.includes('unique')
    || message.includes('no changes')
  ) {
    return 400;
  }
  return 500;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reasonId: string }> }
) {
  try {
    const auth = await requireAdminSession();
    if (auth.error) return auth.error;

    const { reasonId } = await params;
    const body = (await request.json()) as {
      type?: AdminFinanceEntryType;
      name?: string;
      description?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    };

    const reason = await updateAdminFinanceReason(reasonId, {
      type: body.type,
      name: body.name,
      description: body.description,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
      updatedByUserId: auth.user.id,
    });

    if (!reason) {
      return NextResponse.json({ error: 'Finance reason not found' }, { status: 404 });
    }

    return NextResponse.json({ reason });
  } catch (error) {
    console.error('Error updating finance reason:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: mapValidationStatus(error) });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ reasonId: string }> }
) {
  try {
    const auth = await requireAdminSession();
    if (auth.error) return auth.error;

    const { reasonId } = await params;
    const archived = await archiveAdminFinanceReason(reasonId, auth.user.id);

    if (!archived) {
      return NextResponse.json({ error: 'Finance reason not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting finance reason:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
