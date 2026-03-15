import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  countTrainerWorkshopSuggestionsPendingReview,
  listAllTrainerWorkshopSuggestions,
  type TrainerWorkshopSuggestionStatus,
} from '@/lib/db/trainers';
import { getUserById } from '@/lib/db/users';

const VALID_STATUSES = new Set(['ALL', 'PENDING_REVIEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED']);

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('noon_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await getUserById(sessionId);
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const rawStatus = (searchParams.get('status') || 'ALL').toUpperCase();
    const status = VALID_STATUSES.has(rawStatus) ? rawStatus : 'ALL';
    const limit = Number(searchParams.get('limit') ?? 300);

    const [suggestions, pendingReviewCount] = await Promise.all([
      listAllTrainerWorkshopSuggestions({
        status: status as TrainerWorkshopSuggestionStatus | 'ALL',
        limit: Number.isFinite(limit) ? limit : 300,
      }),
      countTrainerWorkshopSuggestionsPendingReview(),
    ]);

    return NextResponse.json({
      suggestions,
      pendingReviewCount,
    });
  } catch (error) {
    console.error('Error fetching trainer workshop suggestions for admin:', error);
    return NextResponse.json({ error: 'Failed to fetch suggested workshops' }, { status: 500 });
  }
}
