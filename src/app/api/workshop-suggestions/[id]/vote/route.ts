import { readSessionUserId } from '@/lib/sessionToken';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionUserById } from '@/lib/db/users';
import { voteForWorkshopSuggestion } from '@/lib/db/workshopSuggestions';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const sessionId = readSessionUserId(cookieStore);
  if (!sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getSessionUserById(sessionId);
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const result = await voteForWorkshopSuggestion({ suggestionId: id, userId: user.id });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to vote.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
