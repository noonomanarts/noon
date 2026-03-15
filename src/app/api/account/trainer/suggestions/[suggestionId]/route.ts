import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getUserById } from '@/lib/db/users';
import { updateTrainerWorkshopSuggestionByTrainer } from '@/lib/db/trainers';

async function requireTrainer() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;

  if (!sessionId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'TRAINER') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ suggestionId: string }> }
) {
  try {
    const auth = await requireTrainer();
    if (auth.error) return auth.error;

    const { suggestionId } = await context.params;
    if (!suggestionId) {
      return NextResponse.json({ error: 'Suggestion ID is required.' }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      title?: unknown;
      titleAr?: unknown;
      brief?: unknown;
      recipe?: unknown;
      recipePdf?: unknown;
      notes?: unknown;
      photos?: unknown;
    };

    const updateInput: {
      trainerId: string;
      suggestionId: string;
      title?: string;
      titleAr?: string | null;
      brief?: string | null;
      recipe?: string | null;
      recipePdf?: string | null;
      notes?: string | null;
      photos?: string[];
    } = {
      trainerId: auth.user.id,
      suggestionId,
    };

    if (body.title !== undefined) {
      if (typeof body.title !== 'string') {
        return NextResponse.json({ error: 'Invalid title format.' }, { status: 400 });
      }
      updateInput.title = body.title;
    }

    if (body.titleAr !== undefined) {
      if (body.titleAr !== null && typeof body.titleAr !== 'string') {
        return NextResponse.json({ error: 'Invalid titleAr format.' }, { status: 400 });
      }
      updateInput.titleAr = body.titleAr;
    }

    if (body.brief !== undefined) {
      if (body.brief !== null && typeof body.brief !== 'string') {
        return NextResponse.json({ error: 'Invalid brief format.' }, { status: 400 });
      }
      updateInput.brief = body.brief;
    }

    if (body.recipe !== undefined) {
      if (body.recipe !== null && typeof body.recipe !== 'string') {
        return NextResponse.json({ error: 'Invalid recipe format.' }, { status: 400 });
      }
      updateInput.recipe = body.recipe;
    }

    if (body.recipePdf !== undefined) {
      if (body.recipePdf !== null && typeof body.recipePdf !== 'string') {
        return NextResponse.json({ error: 'Invalid recipePdf format.' }, { status: 400 });
      }
      updateInput.recipePdf = body.recipePdf;
    }

    if (body.notes !== undefined) {
      if (body.notes !== null && typeof body.notes !== 'string') {
        return NextResponse.json({ error: 'Invalid notes format.' }, { status: 400 });
      }
      updateInput.notes = body.notes;
    }

    if (body.photos !== undefined) {
      if (!Array.isArray(body.photos)) {
        return NextResponse.json({ error: 'Invalid photos format.' }, { status: 400 });
      }
      updateInput.photos = body.photos.filter((item): item is string => typeof item === 'string');
    }

    const suggestion = await updateTrainerWorkshopSuggestionByTrainer(updateInput);
    if (!suggestion) {
      return NextResponse.json(
        { error: 'Suggested workshop not found or not editable in current status.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, suggestion });
  } catch (error) {
    console.error('Failed to update trainer workshop suggestion:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update suggestion' },
      { status: 400 }
    );
  }
}
