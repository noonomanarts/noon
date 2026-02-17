import { NextResponse } from 'next/server';
import { listShopCategoriesForPublic } from '@/lib/db/shop';

export async function GET() {
  try {
    const categories = await listShopCategoriesForPublic();
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching public shop categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
