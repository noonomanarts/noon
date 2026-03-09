import { NextRequest, NextResponse } from 'next/server';
import {
  createAdminFinanceReason,
  listAdminFinanceReasons,
  type AdminFinanceEntryType,
} from '@/lib/db/finance';
import { requireAdminSession } from '../_auth';

const allowedTypes = new Set<AdminFinanceEntryType | 'ALL'>(['ALL', 'INCOME', 'EXPENSE']);

function parseType(value: string | null): AdminFinanceEntryType | 'ALL' {
  const normalized = (value ?? 'ALL').toUpperCase();
  return allowedTypes.has(normalized as AdminFinanceEntryType | 'ALL')
    ? (normalized as AdminFinanceEntryType | 'ALL')
    : 'ALL';
}

function parseBoolean(value: string | null, fallback: boolean): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes') return true;
  if (normalized === '0' || normalized === 'false' || normalized === 'no') return false;
  return fallback;
}

function mapValidationStatus(error: unknown): number {
  if (!(error instanceof Error)) return 500;
  const message = error.message.toLowerCase();
  if (
    message.includes('invalid')
    || message.includes('required')
    || message.includes('cannot be empty')
    || message.includes('duplicate')
    || message.includes('unique')
  ) {
    return 400;
  }
  return 500;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminSession();
    if (auth.error) return auth.error;

    const type = parseType(request.nextUrl.searchParams.get('type'));
    const includeInactive = parseBoolean(request.nextUrl.searchParams.get('includeInactive'), false);
    const search = request.nextUrl.searchParams.get('search') ?? '';

    const reasons = await listAdminFinanceReasons({
      type,
      includeInactive,
      search,
    });

    return NextResponse.json({ reasons });
  } catch (error) {
    console.error('Error listing finance reasons:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminSession();
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      type?: AdminFinanceEntryType;
      name?: string;
      description?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    };

    const reason = await createAdminFinanceReason({
      type: body.type as AdminFinanceEntryType,
      name: body.name ?? '',
      description: body.description,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
      createdByUserId: auth.user.id,
    });

    return NextResponse.json({ reason }, { status: 201 });
  } catch (error) {
    console.error('Error creating finance reason:', error);

    if (error instanceof Error) {
      const status = mapValidationStatus(error);
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
