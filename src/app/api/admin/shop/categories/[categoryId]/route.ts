import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import { deleteShopCategory, getShopCategoryById, updateShopCategory } from '@/lib/db/shop';

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;

  if (!sessionId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { categoryId } = await params;
    const category = await getShopCategoryById(categoryId);

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Error fetching shop category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { categoryId } = await params;
    const body = (await request.json()) as {
      slug?: string;
      nameEn?: string;
      nameAr?: string;
      descriptionEn?: string | null;
      descriptionAr?: string | null;
      image?: string | null;
      isActive?: boolean;
      sortOrder?: number;
    };

    if (body.nameEn !== undefined && !body.nameEn.trim()) {
      return NextResponse.json({ error: 'English name cannot be empty.' }, { status: 400 });
    }

    if (body.nameAr !== undefined && !body.nameAr.trim()) {
      return NextResponse.json({ error: 'Arabic name cannot be empty.' }, { status: 400 });
    }

    const updated = await updateShopCategory(categoryId, {
      slug: body.slug,
      nameEn: body.nameEn,
      nameAr: body.nameAr,
      descriptionEn: body.descriptionEn,
      descriptionAr: body.descriptionAr,
      image: body.image,
      isActive: body.isActive,
      sortOrder: body.sortOrder,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ category: updated });
  } catch (error) {
    if (error instanceof Error && /duplicate key|unique/i.test(error.message)) {
      return NextResponse.json({ error: 'Slug already exists. Please choose a different slug.' }, { status: 409 });
    }

    console.error('Error updating shop category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { categoryId } = await params;
    const deleted = await deleteShopCategory(categoryId);

    if (!deleted) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting shop category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
