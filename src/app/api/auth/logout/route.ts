import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getExpiredSessionCookieOptions, SESSION_COOKIE_NAME } from '@/lib/sessionCookie';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', getExpiredSessionCookieOptions());

  return NextResponse.json({ success: true });
}
