import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getEventSettlementSnapshot, saveEventSettlementDraft } from '@/lib/db/eventFinance';
import { getUserById } from '@/lib/db/users';

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;

  if (!sessionId) return null;

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') return null;

  return user;
}

type Params = {
  params: Promise<{ eventId: string }>;
};

export async function GET(request: Request, props: Params) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await props.params;
    const snapshot = await getEventSettlementSnapshot(eventId);
    if (!snapshot) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(snapshot);
  } catch (error) {
    console.error('Failed to load event settlement:', error);
    return NextResponse.json({ error: 'Failed to load event settlement' }, { status: 500 });
  }
}

export async function PUT(request: Request, props: Params) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await props.params;
    const body = (await request.json().catch(() => ({}))) as {
      expenseItems?: unknown;
      inventoryUsageItems?: unknown;
      notes?: unknown;
    };

    const snapshot = await saveEventSettlementDraft({
      eventId,
      adminUserId: admin.id,
      expenseItems: body.expenseItems,
      inventoryUsageItems: body.inventoryUsageItems,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, snapshot });
  } catch (error) {
    console.error('Failed to save event settlement draft:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save event settlement draft' },
      { status: 400 }
    );
  }
}