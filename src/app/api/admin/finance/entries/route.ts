import { NextRequest, NextResponse } from 'next/server';
import {
  createAdminFinanceEntry,
  getAdminFinanceReport,
  getAdminFinanceSettings,
  listAdminFinanceCategories,
  listAdminFinanceEntries,
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

function sanitizeDate(value: string | null): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminSession();
    if (auth.error) return auth.error;

    const type = parseType(request.nextUrl.searchParams.get('type'));
    const search = request.nextUrl.searchParams.get('search') ?? '';
    const category = request.nextUrl.searchParams.get('category') ?? '';
    const startDate = sanitizeDate(request.nextUrl.searchParams.get('startDate'));
    const endDate = sanitizeDate(request.nextUrl.searchParams.get('endDate'));
    const pageRaw = Number(request.nextUrl.searchParams.get('page') ?? '1');
    const limitRaw = Number(request.nextUrl.searchParams.get('limit') ?? '20');

    const page = Number.isFinite(pageRaw) ? Math.max(1, pageRaw) : 1;
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, limitRaw)) : 20;

    const [listPayload, categories, reasons, settings, report] = await Promise.all([
      listAdminFinanceEntries({
        type,
        search,
        category,
        startDate,
        endDate,
        page,
        limit,
      }),
      listAdminFinanceCategories(),
      listAdminFinanceReasons({ includeInactive: false }),
      getAdminFinanceSettings(),
      getAdminFinanceReport({
        type,
        search,
        category,
        startDate,
        endDate,
      }),
    ]);

    return NextResponse.json({
      entries: listPayload.entries,
      categories,
      reasons,
      settings,
      summary: report.summary,
      pagination: {
        page: listPayload.page,
        limit: listPayload.limit,
        total: listPayload.total,
        totalPages: Math.max(1, Math.ceil(listPayload.total / listPayload.limit)),
      },
    });
  } catch (error) {
    console.error('Error listing admin finance entries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminSession();
    if (auth.error) return auth.error;

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

    const entry = await createAdminFinanceEntry({
      type: body.type as AdminFinanceEntryType,
      title: body.title ?? '',
      category: body.category,
      reasonId: body.reasonId,
      amount: Number(body.amount ?? 0),
      currency: body.currency,
      occurredAt: body.occurredAt,
      paymentMethod: body.paymentMethod,
      reference: body.reference,
      counterparty: body.counterparty,
      notes: body.notes,
      metadata: body.metadata,
      createdByUserId: auth.user.id,
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error('Error creating admin finance entry:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: mapValidationStatus(error) });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
