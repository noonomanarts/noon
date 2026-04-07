import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import { getPhotographerSchedule } from '@/lib/db/photographer';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'PHOTOGRAPHER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get('from') ?? undefined;
  const to = url.searchParams.get('to') ?? undefined;

  const schedule = await getPhotographerSchedule({ from, to });
  return NextResponse.json({ schedule });
}
