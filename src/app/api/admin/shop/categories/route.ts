import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import { createShopCategory, listShopCategoriesForAdmin } from '@/lib/db/shop';

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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const includeInactiveParam = request.nextUrl.searchParams.get('includeInactive');
    const search = request.nextUrl.searchParams.get('search') ?? '';

    const categories = await listShopCategoriesForAdmin({
      includeInactive: includeInactiveParam !== 'false',
      search,
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching shop categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      slug?: string;
      nameEn?: string;
      nameAr?: string;
      descriptionEn?: string;
      descriptionAr?: string;
      image?: string;
      isActive?: boolean;
      sortOrder?: number;
    };

    if (!body.nameEn?.trim() || !body.nameAr?.trim()) {
      return NextResponse.json({ error: 'English and Arabic names are required.' }, { status: 400 });
    }

    const created = await createShopCategory({
      slug: body.slug,
      nameEn: body.nameEn,
      nameAr: body.nameAr,
      descriptionEn: body.descriptionEn,
      descriptionAr: body.descriptionAr,
      image: body.image,
      isActive: body.isActive,
      sortOrder: body.sortOrder,
    });

    return NextResponse.json({ category: created }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && /duplicate key|unique/i.test(error.message)) {
      return NextResponse.json({ error: 'Slug already exists. Please choose a different slug.' }, { status: 409 });
    }

    console.error('Error creating shop category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
