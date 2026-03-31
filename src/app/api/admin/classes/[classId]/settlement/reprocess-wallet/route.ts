import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getUserById } from '@/lib/db/users';
import { reprocessSettlementWalletCredits } from '@/lib/db/classFinance';

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  if (!sessionId) return null;
  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') return null;
  return user;
}

type Params = { params: Promise<{ classId: string }> };

export async function POST(_request: Request, props: Params) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { classId } = await props.params;

    const result = await reprocessSettlementWalletCredits({
      classId,
      adminUserId: admin.id,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Failed to reprocess settlement wallet credits:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reprocess wallet credits' },
      { status: 400 }
    );
  }
}
