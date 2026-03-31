import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db/pool';
import { getUserById } from '@/lib/db/users';

/** GET  – list saved participants for current user */
export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getUserById(sessionId);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rows } = await pool.query(
    `SELECT id, label, full_name, date_of_birth, preferred_language
     FROM saved_participants
     WHERE user_id = $1
     ORDER BY updated_at DESC`,
    [user.id],
  );

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      label: r.label ?? null,
      fullName: r.full_name,
      dateOfBirth: r.date_of_birth ? String(r.date_of_birth).slice(0, 10) : '',
      preferredLanguage: r.preferred_language ?? 'en',
    })),
  );
}

/** POST – upsert a saved participant (auto-save after booking) */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getUserById(sessionId);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const fullName = typeof body.fullName === 'string' ? body.fullName.trim().slice(0, 255) : '';
  const dateOfBirth = typeof body.dateOfBirth === 'string' ? body.dateOfBirth.trim().slice(0, 20) : '';
  const preferredLanguage =
    typeof body.preferredLanguage === 'string' && ['en', 'ar'].includes(body.preferredLanguage)
      ? body.preferredLanguage
      : 'en';
  const label = typeof body.label === 'string' ? body.label.trim().slice(0, 120) || null : null;

  if (!fullName) return NextResponse.json({ error: 'Full name is required' }, { status: 400 });

  const dob = dateOfBirth ? new Date(`${dateOfBirth}T00:00:00`) : null;
  if (dob && Number.isNaN(dob.getTime())) {
    return NextResponse.json({ error: 'Invalid date of birth' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `INSERT INTO saved_participants (user_id, label, full_name, date_of_birth, preferred_language)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, lower(full_name), date_of_birth) DO UPDATE
       SET label = COALESCE(EXCLUDED.label, saved_participants.label),
           preferred_language = EXCLUDED.preferred_language,
           updated_at = NOW()
     RETURNING id, label, full_name, date_of_birth, preferred_language`,
    [user.id, label, fullName, dob ? dateOfBirth : null, preferredLanguage],
  );

  const r = rows[0];
  return NextResponse.json({
    id: r.id,
    label: r.label ?? null,
    fullName: r.full_name,
    dateOfBirth: r.date_of_birth ? String(r.date_of_birth).slice(0, 10) : '',
    preferredLanguage: r.preferred_language ?? 'en',
  });
}
