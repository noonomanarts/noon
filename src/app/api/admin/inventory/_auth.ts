import { readSessionUserId } from '@/lib/sessionToken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSessionUserById } from '@/lib/db/users';

export async function requireAdminSession() {
  const cookieStore = await cookies();
  const sessionId = readSessionUserId(cookieStore);

  if (!sessionId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const user = await getSessionUserById(sessionId);
  if (!user || user.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user };
}
