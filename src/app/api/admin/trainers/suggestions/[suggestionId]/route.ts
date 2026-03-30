import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  countTrainerWorkshopSuggestionsPendingReview,
  updateTrainerWorkshopSuggestionByAdmin,
  type TrainerWorkshopSuggestionStatus,
} from '@/lib/db/trainers';
import { getUserById } from '@/lib/db/users';

const VALID_STATUSES = new Set(['PENDING_REVIEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED']);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ suggestionId: string }> }
) {
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

    const { suggestionId } = await context.params;
    if (!suggestionId) {
      return NextResponse.json({ error: 'Suggestion ID is required' }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      status?: unknown;
      adminNotes?: unknown;
      liveClassId?: unknown;
    };

    let status: TrainerWorkshopSuggestionStatus | undefined;
    if (body.status !== undefined) {
      if (typeof body.status !== 'string') {
        return NextResponse.json({ error: 'Invalid status format' }, { status: 400 });
      }
      const normalized = body.status.trim().toUpperCase();
      if (!VALID_STATUSES.has(normalized)) {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
      }
      status = normalized as TrainerWorkshopSuggestionStatus;
    }

    if (body.adminNotes !== undefined && body.adminNotes !== null && typeof body.adminNotes !== 'string') {
      return NextResponse.json({ error: 'Invalid adminNotes format' }, { status: 400 });
    }
    const adminNotes =
      body.adminNotes === undefined ? undefined : body.adminNotes === null ? null : body.adminNotes;

    if (body.liveClassId !== undefined && body.liveClassId !== null && typeof body.liveClassId !== 'string') {
      return NextResponse.json({ error: 'Invalid liveClassId format' }, { status: 400 });
    }
    const liveClassId =
      body.liveClassId === undefined ? undefined : body.liveClassId === null ? null : body.liveClassId;

    if (status === 'PUBLISHED') {
      const normalizedLiveClassId =
        typeof liveClassId === 'string' ? liveClassId.trim() : '';
      if (!normalizedLiveClassId) {
        return NextResponse.json(
          { error: 'Published status requires a linked live class ID.' },
          { status: 400 }
        );
      }
    }

    const updateInput: {
      suggestionId: string;
      status?: TrainerWorkshopSuggestionStatus;
      adminNotes?: string | null;
      liveClassId?: string | null;
    } = { suggestionId };

    if (body.status !== undefined) {
      updateInput.status = status;
    }
    if (body.adminNotes !== undefined) {
      updateInput.adminNotes = adminNotes;
    }
    if (body.liveClassId !== undefined) {
      updateInput.liveClassId = liveClassId;
    }

    const suggestion = await updateTrainerWorkshopSuggestionByAdmin(updateInput);

    if (!suggestion) {
      return NextResponse.json({ error: 'Suggested workshop not found' }, { status: 404 });
    }

    const pendingReviewCount = await countTrainerWorkshopSuggestionsPendingReview();

    return NextResponse.json({
      success: true,
      suggestion,
      pendingReviewCount,
    });
  } catch (error) {
    console.error('Error updating trainer workshop suggestion:', error);
    if (error instanceof Error && error.message.includes('requires a linked live class')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update suggested workshop' }, { status: 500 });
  }
}
