import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db/pool';
import { getUserById } from '@/lib/db/users';
import type { Gender } from '@/lib/db/types';

let savedParticipantsGenderSchemaReady: Promise<void> | null = null;

async function ensureSavedParticipantsGenderSchema(): Promise<void> {
  if (savedParticipantsGenderSchemaReady) return savedParticipantsGenderSchemaReady;

  savedParticipantsGenderSchemaReady = pool.query(
    `ALTER TABLE saved_participants ADD COLUMN IF NOT EXISTS gender VARCHAR(20)`
  ).then(() => undefined);

  return savedParticipantsGenderSchemaReady;
}

function parseGender(value: unknown): Gender | null {
  if (value === 'MALE' || value === 'FEMALE' || value === 'OTHER') return value;
  return null;
}

/** GET  – list saved participants for current user */
export async function GET() {
  await ensureSavedParticipantsGenderSchema();

  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getUserById(sessionId);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rows } = await pool.query(
    `SELECT id, label, full_name, date_of_birth, preferred_language, gender
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
      gender: parseGender(r.gender) ?? null,
    })),
  );
}

/** POST – upsert a saved participant (auto-save after booking) */
export async function POST(request: NextRequest) {
  await ensureSavedParticipantsGenderSchema();

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
  const gender = parseGender(body.gender);
  const label = typeof body.label === 'string' ? body.label.trim().slice(0, 120) || null : null;

  if (!fullName) return NextResponse.json({ error: 'Full name is required' }, { status: 400 });

  const dob = dateOfBirth ? new Date(`${dateOfBirth}T00:00:00`) : null;
  if (dob && Number.isNaN(dob.getTime())) {
    return NextResponse.json({ error: 'Invalid date of birth' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `INSERT INTO saved_participants (user_id, label, full_name, date_of_birth, preferred_language, gender)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, lower(full_name), date_of_birth) DO UPDATE
       SET label = COALESCE(EXCLUDED.label, saved_participants.label),
           preferred_language = EXCLUDED.preferred_language,
           gender = COALESCE(EXCLUDED.gender, saved_participants.gender),
           updated_at = NOW()
     RETURNING id, label, full_name, date_of_birth, preferred_language, gender`,
    [user.id, label, fullName, dob ? dateOfBirth : null, preferredLanguage, gender],
  );

  const r = rows[0];
  return NextResponse.json({
    id: r.id,
    label: r.label ?? null,
    fullName: r.full_name,
    dateOfBirth: r.date_of_birth ? String(r.date_of_birth).slice(0, 10) : '',
    preferredLanguage: r.preferred_language ?? 'en',
    gender: parseGender(r.gender) ?? null,
  });
}
