import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { updateTrainerWorkshopSubmission } from '@/lib/db/trainers';
import { getUserById } from '@/lib/db/users';

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
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = await requireTrainer();
    if (auth.error) return auth.error;

    const { sessionId } = await context.params;
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      recipeSubmitted?: unknown;
      recipePdf?: unknown;
      groceryList?: unknown;
      workshopBrief?: unknown;
      trainerPhotos?: unknown;
      highlightedIngredients?: unknown;
    };

    const workshop = await updateTrainerWorkshopSubmission({
      trainerId: auth.user.id,
      classId: sessionId,
      submission: {
        recipeSubmitted: typeof body.recipeSubmitted === 'boolean' ? body.recipeSubmitted : undefined,
        recipePdf: typeof body.recipePdf === 'string' ? body.recipePdf : null,
        groceryList: typeof body.groceryList === 'string' ? body.groceryList : null,
        workshopBrief: typeof body.workshopBrief === 'string' ? body.workshopBrief : null,
        trainerPhotos: Array.isArray(body.trainerPhotos)
          ? body.trainerPhotos.filter((item): item is string => typeof item === 'string')
          : [],
        highlightedIngredients: Array.isArray(body.highlightedIngredients)
          ? body.highlightedIngredients
              .map((item) => {
                if (!item || typeof item !== 'object') return null;
                const row = item as Record<string, unknown>;
                return {
                  name: typeof row.name === 'string' ? row.name : '',
                  source: typeof row.source === 'string' ? row.source : '',
                  photo: typeof row.photo === 'string' ? row.photo : '',
                };
              })
              .filter((item): item is { name: string; source: string; photo: string } => Boolean(item))
          : [],
      },
    });

    if (!workshop) {
      return NextResponse.json({ error: 'Workshop session not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, workshop });
  } catch (error) {
    console.error('Failed to update trainer workshop submission:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save workshop submission' },
      { status: 400 }
    );
  }
}
