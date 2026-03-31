import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import {
  listPromoCodes,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
} from '@/lib/db/promoCodes';

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  if (!sessionId) return null;
  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') return null;
  return user;
}

// GET — list all promo codes
export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const codes = await listPromoCodes();
  return NextResponse.json({ promoCodes: codes });
}

// POST — create a new promo code
export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!code || code.length > 50) {
    return NextResponse.json({ error: 'Code is required (max 50 chars)' }, { status: 400 });
  }

  const discountType = body.discountType === 'FIXED' ? 'FIXED' : 'PERCENTAGE';
  const discountValue = Number(body.discountValue);
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return NextResponse.json({ error: 'Discount value must be a positive number' }, { status: 400 });
  }
  if (discountType === 'PERCENTAGE' && discountValue > 100) {
    return NextResponse.json({ error: 'Percentage discount cannot exceed 100' }, { status: 400 });
  }

  const maxUses = body.maxUses != null ? Number(body.maxUses) : null;
  const minOrderAmount = Number(body.minOrderAmount) || 0;
  const startsAt = typeof body.startsAt === 'string' && body.startsAt ? body.startsAt : null;
  const expiresAt = typeof body.expiresAt === 'string' && body.expiresAt ? body.expiresAt : null;

  try {
    const promo = await createPromoCode({
      code,
      discountType,
      discountValue,
      maxUses,
      minOrderAmount,
      startsAt,
      expiresAt,
    });
    return NextResponse.json({ promoCode: promo }, { status: 201 });
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === '23505') {
      return NextResponse.json({ error: 'A promo code with this code already exists' }, { status: 409 });
    }
    console.error('Error creating promo code:', error);
    return NextResponse.json({ error: 'Failed to create promo code' }, { status: 500 });
  }
}

// PUT — update an existing promo code
export async function PUT(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) {
    return NextResponse.json({ error: 'Missing promo code id' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (typeof body.code === 'string' && body.code.trim()) {
    updates.code = body.code.trim();
  }
  if (body.discountType === 'FIXED' || body.discountType === 'PERCENTAGE') {
    updates.discountType = body.discountType;
  }
  if (body.discountValue !== undefined) {
    const val = Number(body.discountValue);
    if (Number.isFinite(val) && val > 0) updates.discountValue = val;
  }
  if (body.maxUses !== undefined) {
    updates.maxUses = body.maxUses === null || body.maxUses === '' ? null : Number(body.maxUses) || null;
  }
  if (body.minOrderAmount !== undefined) {
    updates.minOrderAmount = Number(body.minOrderAmount) || 0;
  }
  if (body.startsAt !== undefined) {
    updates.startsAt = typeof body.startsAt === 'string' && body.startsAt ? body.startsAt : null;
  }
  if (body.expiresAt !== undefined) {
    updates.expiresAt = typeof body.expiresAt === 'string' && body.expiresAt ? body.expiresAt : null;
  }
  if (typeof body.isActive === 'boolean') {
    updates.isActive = body.isActive;
  }

  try {
    const updated = await updatePromoCode(id, updates as Parameters<typeof updatePromoCode>[1]);
    if (!updated) {
      return NextResponse.json({ error: 'Promo code not found' }, { status: 404 });
    }
    return NextResponse.json({ promoCode: updated });
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === '23505') {
      return NextResponse.json({ error: 'A promo code with this code already exists' }, { status: 409 });
    }
    console.error('Error updating promo code:', error);
    return NextResponse.json({ error: 'Failed to update promo code' }, { status: 500 });
  }
}

// DELETE — remove a promo code
export async function DELETE(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') ?? '';
  if (!id) {
    return NextResponse.json({ error: 'Missing promo code id' }, { status: 400 });
  }

  const deleted = await deletePromoCode(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Promo code not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
