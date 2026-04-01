import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';

export async function requireAdminUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;

  if (!sessionId) {
    return null;
  }

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return user;
}
