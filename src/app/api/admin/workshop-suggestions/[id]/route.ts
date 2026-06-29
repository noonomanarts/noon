import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getUserById } from '@/lib/db/users';
import {
  updateWorkshopSuggestionStatus,
  deleteWorkshopSuggestion,
  type WorkshopSuggestionStatus,
} from '@/lib/db/workshopSuggestions';

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  if (!sessionId) return null;
  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') return null;
  return user;
}

type Params = { params: Promise<{ id: string }> };

const VALID_STATUSES: WorkshopSuggestionStatus[] = ['PENDING', 'PUBLISHED', 'HIDDEN'];

export async function PATCH(request: Request, props: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await props.params;
  const body = (await request.json().catch(() => ({}))) as { status?: unknown };
  const status = body.status as WorkshopSuggestionStatus;
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
  }

  await updateWorkshopSuggestionStatus(id, status);
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, props: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await props.params;
  await deleteWorkshopSuggestion(id);
  return NextResponse.json({ success: true });
}
