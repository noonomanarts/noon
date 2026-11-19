import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import type { UserPublic } from '@/lib/db/users';

/**
 * Resolves the signed-in admin for an API route handler.
 * Returns the user, or a ready-to-return 401/403 response.
 */
export async function requireAdminApi(): Promise<
  { user: UserPublic; response: null } | { user: null; response: NextResponse }
> {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (user.role !== 'ADMIN') {
    return { user: null, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user, response: null };
}

/**
 * Parses a money amount from untrusted input: a finite number, rounded to the
 * 3 decimals OMR uses, and at least 0.001. Returns null for anything else
 * (strings such as "NaN", negative values, sub-baisa fractions).
 */
export function parseMoneyAmount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.round(value * 1000) / 1000;
  return rounded >= 0.001 ? rounded : null;
}
