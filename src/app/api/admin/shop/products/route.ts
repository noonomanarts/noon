import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import { createShopProduct, listShopProductsForAdmin } from '@/lib/db/shop';

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
    const categoryId = request.nextUrl.searchParams.get('categoryId') ?? '';

    const products = await listShopProductsForAdmin({
      includeInactive: includeInactiveParam !== 'false',
      search,
      categoryId,
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching shop products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      categoryId?: string;
      slug?: string;
      nameEn?: string;
      nameAr?: string;
      descriptionEn?: string;
      descriptionAr?: string;
      price?: number;
      cost?: number;
      currency?: string;
      sku?: string;
      image?: string;
      galleryImages?: string[];
      stockQuantity?: number;
      availableOnline?: boolean;
      isActive?: boolean;
      isFeatured?: boolean;
      sortOrder?: number;
    };

    if (!body.categoryId?.trim()) {
      return NextResponse.json({ error: 'Category is required.' }, { status: 400 });
    }
    if (!body.nameEn?.trim() || !body.nameAr?.trim()) {
      return NextResponse.json({ error: 'English and Arabic names are required.' }, { status: 400 });
    }
    if (body.price === undefined || Number.isNaN(Number(body.price)) || Number(body.price) < 0) {
      return NextResponse.json({ error: 'Valid product price is required.' }, { status: 400 });
    }
    if (body.cost !== undefined && (Number.isNaN(Number(body.cost)) || Number(body.cost) < 0)) {
      return NextResponse.json({ error: 'Valid product cost is required.' }, { status: 400 });
    }

    const product = await createShopProduct({
      categoryId: body.categoryId,
      slug: body.slug,
      nameEn: body.nameEn,
      nameAr: body.nameAr,
      descriptionEn: body.descriptionEn,
      descriptionAr: body.descriptionAr,
      price: Number(body.price),
      cost: body.cost !== undefined ? Number(body.cost) : 0,
      currency: body.currency,
      sku: body.sku,
      image: body.image,
      galleryImages: Array.isArray(body.galleryImages) ? body.galleryImages : [],
      stockQuantity: Number.isFinite(body.stockQuantity) ? Number(body.stockQuantity) : 0,
      availableOnline: body.availableOnline,
      isActive: body.isActive,
      isFeatured: body.isFeatured,
      sortOrder: Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : 0,
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Category not found') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (/duplicate key|unique/i.test(error.message)) {
        return NextResponse.json({ error: 'Slug or SKU already exists.' }, { status: 409 });
      }
    }

    console.error('Error creating shop product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
