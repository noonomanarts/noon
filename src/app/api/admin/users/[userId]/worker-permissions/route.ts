import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import { getWorkerPermissions, upsertWorkerPermissions } from '@/lib/db/worker';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('noon_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await getUserById(sessionId);
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = await getWorkerPermissions(userId);
    return NextResponse.json(permissions);
  } catch (error) {
    console.error('Error fetching worker permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch worker permissions' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('noon_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await getUserById(sessionId);
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the target user exists and is a WORKER
    const targetUser = await getUserById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.role !== 'WORKER') {
      return NextResponse.json(
        { error: 'User is not a worker' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      can_restock = false,
      can_record_sales = false,
      can_manage_orders = false,
      can_print_labels = false,
      can_print_bills = false,
    } = body;

    const updated = await upsertWorkerPermissions(userId, {
      can_restock,
      can_record_sales,
      can_manage_orders,
      can_print_labels,
      can_print_bills,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating worker permissions:', error);
    return NextResponse.json(
      { error: 'Failed to update worker permissions' },
      { status: 500 }
    );
  }
}
