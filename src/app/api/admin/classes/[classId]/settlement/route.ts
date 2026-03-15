import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getUserById } from '@/lib/db/users';
import { getClassSettlementSnapshot, saveClassSettlementDraft } from '@/lib/db/classFinance';

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

export async function GET(request: Request, props: Params) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { classId } = await props.params;
    const snapshot = await getClassSettlementSnapshot(classId);
    if (!snapshot) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    return NextResponse.json(snapshot);
  } catch (error) {
    console.error('Failed to load class settlement:', error);
    return NextResponse.json({ error: 'Failed to load class settlement' }, { status: 500 });
  }
}

export async function PUT(request: Request, props: Params) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { classId } = await props.params;
    const body = (await request.json().catch(() => ({}))) as {
      expenseItems?: unknown;
      inventoryUsageItems?: unknown;
      notes?: unknown;
    };

    const snapshot = await saveClassSettlementDraft({
      classId,
      adminUserId: admin.id,
      expenseItems: body.expenseItems,
      inventoryUsageItems: body.inventoryUsageItems,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, snapshot });
  } catch (error) {
    console.error('Failed to save class settlement draft:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save class settlement draft' },
      { status: 400 }
    );
  }
}
