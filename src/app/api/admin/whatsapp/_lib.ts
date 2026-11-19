import { readSessionUserId } from '@/lib/sessionToken';
import { cookies } from 'next/headers';
import { getSessionUserById } from '@/lib/db/users';

export async function requireAdminUser() {
  const cookieStore = await cookies();
  const sessionId = readSessionUserId(cookieStore);

  if (!sessionId) {
    return null;
  }

  const user = await getSessionUserById(sessionId);
  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return user;
}
