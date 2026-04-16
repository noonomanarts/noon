import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  createOrUpdateShopProductReview,
  getShopProductReviewSummary,
  listShopProductReviewsForPublic,
} from '@/lib/db/shop';
import { getUserById } from '@/lib/db/users';

async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  if (!sessionId) return null;
  return getUserById(sessionId);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const [reviews, summary] = await Promise.all([
      listShopProductReviewsForPublic(productId),
      getShopProductReviewSummary(productId),
    ]);

    return NextResponse.json({ reviews, summary });
  } catch (error) {
    console.error('Failed to load product reviews:', error);
    return NextResponse.json({ error: 'Failed to load product reviews' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      rating?: number;
      comment?: string | null;
    };

    const review = await createOrUpdateShopProductReview({
      productId,
      userId: user.id,
      rating: Number(body.rating ?? 0),
      comment: body.comment,
    });

    return NextResponse.json({ review, summary: review.summary });
  } catch (error) {
    console.error('Failed to save product review:', error);
    const message = error instanceof Error ? error.message : 'Failed to save product review';
    const status =
      message === 'Unauthorized'
        ? 401
        : message.includes('Product not found')
          ? 404
          : message.includes('Rating must')
            ? 400
            : message.includes('Only customers who ordered')
              ? 403
              : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
