import { readSessionUserId } from '@/lib/sessionToken';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionUserById } from '@/lib/db/users';
import { getPhotographerStats, isPhotographerDashboardRole } from '@/lib/db/photographer';

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = readSessionUserId(cookieStore);
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getSessionUserById(sessionId);
  if (!user || !isPhotographerDashboardRole(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const stats = await getPhotographerStats(user.id);
  return NextResponse.json(stats);
}
