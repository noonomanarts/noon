import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createTrainerWorkshopSuggestion, listTrainerWorkshopSuggestions } from '@/lib/db/trainers';
import { getUserById } from '@/lib/db/users';
import { notifyRole } from '@/lib/notificationService';

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

export async function GET() {
  try {
    const auth = await requireTrainer();
    if (auth.error) return auth.error;

    const suggestions = await listTrainerWorkshopSuggestions(auth.user.id, { limit: 300 });
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Failed to load trainer workshop suggestions:', error);
    return NextResponse.json({ error: 'Failed to load suggestions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireTrainer();
    if (auth.error) return auth.error;

    const body = (await request.json().catch(() => ({}))) as {
      title?: unknown;
      titleAr?: unknown;
      brief?: unknown;
      recipe?: unknown;
      recipePdf?: unknown;
      notes?: unknown;
      photos?: unknown;
    };

    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    }

    const suggestion = await createTrainerWorkshopSuggestion({
      trainerId: auth.user.id,
      title: body.title,
      titleAr: typeof body.titleAr === 'string' ? body.titleAr : null,
      brief: typeof body.brief === 'string' ? body.brief : null,
      recipe: typeof body.recipe === 'string' ? body.recipe : null,
      recipePdf: typeof body.recipePdf === 'string' ? body.recipePdf : null,
      notes: typeof body.notes === 'string' ? body.notes : null,
      photos: Array.isArray(body.photos) ? body.photos.filter((item): item is string => typeof item === 'string') : [],
    });

    try {
      await notifyRole('ADMIN', {
        type: 'trainer_workshop_suggestion_submitted',
        title: 'New Suggested Workshop',
        message: `${auth.user.fullName} submitted a suggested workshop for review.`,
        data: {
          suggestionId: suggestion.id,
          trainerId: auth.user.id,
          trainerName: auth.user.fullName,
          suggestionTitle: suggestion.title,
          reviewUrl: '/admin/trainers/suggestions',
        },
      });
    } catch (notifyError) {
      console.error('Failed to notify admins about suggested workshop:', notifyError);
    }

    return NextResponse.json({ success: true, suggestion }, { status: 201 });
  } catch (error) {
    console.error('Failed to create trainer workshop suggestion:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create suggestion' },
      { status: 400 }
    );
  }
}
