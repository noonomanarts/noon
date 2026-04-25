import { NextRequest, NextResponse } from 'next/server';
import { deleteInventoryItem } from '@/lib/db/inventory';
import { requireAdminSession } from '../../_auth';

type Params = {
  params: Promise<{ itemId: string }>;
};

export async function DELETE(request: NextRequest, props: Params) {
  try {
    const auth = await requireAdminSession();
    if (auth.error) return auth.error;

    const params = await props.params;
    const deleted = await deleteInventoryItem(params.itemId, auth.user.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 400 }
    );
  }
}