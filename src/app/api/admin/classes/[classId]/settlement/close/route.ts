import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getUserById } from '@/lib/db/users';
import { closeClassSettlement } from '@/lib/db/classFinance';

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
      expenseItems?: unknown;
      inventoryUsageItems?: unknown;
      notes?: unknown;
    };

    const snapshot = await closeClassSettlement({
      classId,
      adminUserId: admin.id,
      expenseItems: body.expenseItems,
      inventoryUsageItems: body.inventoryUsageItems,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, snapshot });
  } catch (error) {
    console.error('Failed to close class settlement:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to close class settlement' },
      { status: 400 }
    );
  }
}
