import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import { query } from '@/lib/db/pool';

async function requireAdmin() {
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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const search = (request.nextUrl.searchParams.get('search') ?? '').trim();
    const status = (request.nextUrl.searchParams.get('status') ?? 'all').trim();

    const values: unknown[] = [];
    const conditions: string[] = [];

    if (search) {
      values.push(`%${search}%`);
      const index = values.length;
      conditions.push(`(
        c.title ILIKE $${index}
        OR COALESCE(c.title_ar, '') ILIKE $${index}
        OR COALESCE(u.full_name, '') ILIKE $${index}
      )`);
    }

    if (status === 'submitted') {
      conditions.push('cs.recipe_submitted = true');
    } else if (status === 'missing') {
      conditions.push('cs.recipe_submitted = false');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT
        cs.id,
        cs.class_id,
        cs.start_date_time,
        cs.end_date_time,
        cs.recipe_submitted,
        cs.recipe_pdf,
        cs.grocery_list,
        cs.workshop_brief,
        cs.updated_at,
        c.title AS class_title,
        c.title_ar AS class_title_ar,
        c.slug AS class_slug,
        c.image AS class_image,
        u.full_name AS trainer_name,
        u.profile_image AS trainer_image
      FROM class_sessions cs
      INNER JOIN classes c ON c.id = cs.class_id
      LEFT JOIN users u ON u.id = c.trainer_id
      ${whereClause}
      ORDER BY cs.start_date_time DESC
      LIMIT 200`,
      values
    );

    return NextResponse.json({ sessions: result.rows });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
