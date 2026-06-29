import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import {
  createWorkshopSuggestion,
  getPublishedWorkshopSuggestions,
} from '@/lib/db/workshopSuggestions';

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  let userId: string | null = null;
  if (sessionId) {
    const user = await getUserById(sessionId);
    userId = user?.id ?? null;
  }

  const suggestions = await getPublishedWorkshopSuggestions(userId);
  return NextResponse.json({ suggestions });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      title?: unknown;
      description?: unknown;
      submitterName?: unknown;
      submitterEmail?: unknown;
    };

    const title = typeof body.title === 'string' ? body.title : '';
    if (!title.trim()) {
      return NextResponse.json({ error: 'Workshop idea is required.' }, { status: 400 });
    }

    await createWorkshopSuggestion({
      title,
      description: typeof body.description === 'string' ? body.description : null,
      submitterName: typeof body.submitterName === 'string' ? body.submitterName : null,
      submitterEmail: typeof body.submitterEmail === 'string' ? body.submitterEmail : null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit suggestion.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
