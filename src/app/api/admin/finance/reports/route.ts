import { NextRequest, NextResponse } from 'next/server';
import { getAdminFinanceReport, type AdminFinanceEntryType } from '@/lib/db/finance';
import { requireAdminSession } from '../_auth';

const allowedTypes = new Set<AdminFinanceEntryType | 'ALL'>(['ALL', 'INCOME', 'EXPENSE']);

function parseType(value: string | null): AdminFinanceEntryType | 'ALL' {
  const normalized = (value ?? 'ALL').toUpperCase();
  return allowedTypes.has(normalized as AdminFinanceEntryType | 'ALL')
    ? (normalized as AdminFinanceEntryType | 'ALL')
    : 'ALL';
}

function sanitizeDate(value: string | null): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminSession();
    if (auth.error) return auth.error;

    const type = parseType(request.nextUrl.searchParams.get('type'));
    const search = request.nextUrl.searchParams.get('search') ?? '';
    const category = request.nextUrl.searchParams.get('category') ?? '';
    const startDate = sanitizeDate(request.nextUrl.searchParams.get('startDate'));
    const endDate = sanitizeDate(request.nextUrl.searchParams.get('endDate'));

    const report = await getAdminFinanceReport({
      type,
      search,
      category,
      startDate,
      endDate,
    });

    return NextResponse.json({
      range: {
        startDate: startDate ?? null,
        endDate: endDate ?? null,
      },
      report,
    });
  } catch (error) {
    console.error('Error generating admin finance report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
