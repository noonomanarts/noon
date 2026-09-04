import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import { deleteShopProduct, getShopProductById, updateShopProduct } from '@/lib/db/shop';

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
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { productId } = await params;
    const product = await getShopProductById(productId);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error fetching shop product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { productId } = await params;
    const body = (await request.json()) as {
      categoryId?: string;
      slug?: string;
      nameEn?: string;
      nameAr?: string;
      descriptionEn?: string | null;
      descriptionAr?: string | null;
      price?: number;
      cost?: number;
      currency?: string;
      sku?: string | null;
      image?: string | null;
      galleryImages?: string[];
      stockQuantity?: number;
      availableOnline?: boolean;
      isActive?: boolean;
      isFeatured?: boolean;
      sortOrder?: number;
    };

    if (body.nameEn !== undefined && !body.nameEn.trim()) {
      return NextResponse.json({ error: 'English name cannot be empty.' }, { status: 400 });
    }
    if (body.nameAr !== undefined && !body.nameAr.trim()) {
      return NextResponse.json({ error: 'Arabic name cannot be empty.' }, { status: 400 });
    }
    if (body.price !== undefined && (Number.isNaN(Number(body.price)) || Number(body.price) < 0)) {
      return NextResponse.json({ error: 'Price must be zero or more.' }, { status: 400 });
    }
    if (body.cost !== undefined && (Number.isNaN(Number(body.cost)) || Number(body.cost) < 0)) {
      return NextResponse.json({ error: 'Cost must be zero or more.' }, { status: 400 });
    }

    const updated = await updateShopProduct(productId, {
      categoryId: body.categoryId,
      slug: body.slug,
      nameEn: body.nameEn,
      nameAr: body.nameAr,
      descriptionEn: body.descriptionEn,
      descriptionAr: body.descriptionAr,
      price: body.price !== undefined ? Number(body.price) : undefined,
      cost: body.cost !== undefined ? Number(body.cost) : undefined,
      currency: body.currency,
      sku: body.sku,
      image: body.image,
      galleryImages: Array.isArray(body.galleryImages) ? body.galleryImages : undefined,
      stockQuantity: body.stockQuantity !== undefined ? Number(body.stockQuantity) : undefined,
      availableOnline: body.availableOnline,
      isActive: body.isActive,
      isFeatured: body.isFeatured,
      sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product: updated });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Category not found') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (/duplicate key|unique/i.test(error.message)) {
        return NextResponse.json({ error: 'Slug or SKU already exists.' }, { status: 409 });
      }
    }

    console.error('Error updating shop product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { productId } = await params;
    const deleted = await deleteShopProduct(productId);

    if (!deleted) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting shop product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
