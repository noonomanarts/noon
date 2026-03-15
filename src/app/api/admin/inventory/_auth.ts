import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getUserById } from '@/lib/db/users';

export async function requireAdminSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;

  if (!sessionId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user };
}
