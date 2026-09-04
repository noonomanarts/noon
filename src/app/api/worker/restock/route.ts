import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import { getWorkerPermissions, createStockRestock, getUsersReceivingStockNotifications } from '@/lib/db/worker';
import { notifyUser, notifyRole } from '@/lib/notificationService';
import { pool } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('noon_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(sessionId);
    if (!user || (user.role !== 'WORKER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const permissions = user.role === 'ADMIN' ? { can_restock: true } : await getWorkerPermissions(user.id);
    if (!permissions?.can_restock) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    const { productId, quantityAdded, expiryDate, productionDate, notes, notesAr } = body;

    if (!productId || !quantityAdded || quantityAdded <= 0 || !expiryDate) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Get product name for notification
    const productResult = await pool.query(
      `SELECT name_en, name_ar FROM shop_products WHERE id = $1`,
      [productId]
    );
    const product = productResult.rows[0];
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Create restock
    const restock = await createStockRestock({
      productId,
      workerUserId: user.id,
      quantityAdded,
      expiryDate,
      productionDate: typeof productionDate === 'string' && productionDate.trim().length > 0 ? productionDate : null,
      notes,
      notesAr,
    });

    // Send notifications to users who should receive stock notifications (like "Mum")
    const notificationRecipients = await getUsersReceivingStockNotifications();
    
    for (const recipient of notificationRecipients) {
      await notifyUser(recipient.id, {
        type: 'STOCK_RESTOCK',
        title: 'Stock Restocked',
        message: `${user.fullName} added ${quantityAdded} units of "${product.name_en}" (${restock.previous_quantity} → ${restock.new_quantity})`,
        data: {
          restockId: restock.id,
          productId,
          productNameEn: product.name_en,
          productNameAr: product.name_ar,
          quantityAdded,
          previousQuantity: restock.previous_quantity,
          newQuantity: restock.new_quantity,
          workerName: user.fullName,
        },
      });
    }

    // Also notify admins
    await notifyRole('ADMIN', {
      type: 'STOCK_RESTOCK',
      title: 'Stock Restocked',
      message: `${user.fullName} added ${quantityAdded} units of "${product.name_en}"`,
      data: {
        restockId: restock.id,
        productId,
        productNameEn: product.name_en,
        productNameAr: product.name_ar,
        quantityAdded,
        previousQuantity: restock.previous_quantity,
        newQuantity: restock.new_quantity,
        workerName: user.fullName,
      },
    });

    return NextResponse.json({
      success: true,
      restock: {
        ...restock,
        product_name_en: product.name_en,
        product_name_ar: product.name_ar,
        worker_name: user.fullName,
      },
    });
  } catch (error) {
    console.error('Error creating restock:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create restock' },
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
    if (!user || (user.role !== 'WORKER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const { getStockRestocks } = await import('@/lib/db/worker');
    const { restocks, total } = await getStockRestocks(user.role === 'ADMIN'
      ? { limit, offset }
      : { workerUserId: user.id, limit, offset });

    return NextResponse.json({ restocks, total });
  } catch (error) {
    console.error('Error fetching restocks:', error);
    return NextResponse.json({ error: 'Failed to fetch restocks' }, { status: 500 });
  }
}
