import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import { getWorkerPermissions, createInShopSale, getInShopSales } from '@/lib/db/worker';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('noon_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(sessionId);
    if (!user || user.role !== 'WORKER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const permissions = await getWorkerPermissions(user.id);
    if (!permissions?.can_record_sales) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    const { items, customerName, customerPhone, discountAmount, discountReason, paymentMethod, notes, notesAr } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items in sale' }, { status: 400 });
    }

    // Validate items
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return NextResponse.json({ error: 'Invalid item in sale' }, { status: 400 });
      }
    }

    // Create sale
    const sale = await createInShopSale({
      workerUserId: user.id,
      items,
      customerName,
      customerPhone,
      discountAmount,
      discountReason,
      paymentMethod,
      notes,
      notesAr,
    });

    return NextResponse.json({
      success: true,
      sale,
    });
  } catch (error) {
    console.error('Error creating sale:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create sale' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('noon_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(sessionId);
    if (!user || user.role !== 'WORKER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const { sales, total } = await getInShopSales({
      workerUserId: user.id,
      limit,
      offset,
    });

    return NextResponse.json({ sales, total });
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}
