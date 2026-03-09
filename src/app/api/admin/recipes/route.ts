import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import { query } from '@/lib/db/pool';
import { ensureRecipeManagementSchema } from '@/lib/db/recipeManagement';

type RecipeFilterStatus = 'all' | 'submitted' | 'missing' | 'finalized';
type RecipeTimelineFilter = 'all' | 'upcoming' | 'past';

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

function parseStatus(value: string | null): RecipeFilterStatus {
  if (value === 'submitted' || value === 'missing' || value === 'finalized') {
    return value;
  }
  return 'all';
}

function parseTimeline(value: string | null): RecipeTimelineFilter {
  if (value === 'upcoming' || value === 'past') {
    return value;
  }
  return 'all';
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    await ensureRecipeManagementSchema();

    const search = (request.nextUrl.searchParams.get('search') ?? '').trim();
    const status = parseStatus(request.nextUrl.searchParams.get('status'));
    const timeline = parseTimeline(request.nextUrl.searchParams.get('timeline'));

    const values: unknown[] = [];
    const conditions: string[] = [];

    if (search) {
      values.push(`%${search}%`);
      const idx = values.length;
      conditions.push(`(
        c.title ILIKE $${idx}
        OR COALESCE(c.title_ar, '') ILIKE $${idx}
        OR COALESCE(c.slug, '') ILIKE $${idx}
        OR COALESCE(u.full_name, '') ILIKE $${idx}
      )`);
    }

    if (status === 'submitted') {
      conditions.push('cs.recipe_submitted = true');
    } else if (status === 'missing') {
      conditions.push('cs.recipe_submitted = false');
    } else if (status === 'finalized') {
      conditions.push('cs.final_recipe_visible_to_customers = true');
    }

    if (timeline === 'upcoming') {
      conditions.push('cs.start_date_time >= NOW()');
    } else if (timeline === 'past') {
      conditions.push('cs.start_date_time < NOW()');
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
        cs.photos,
        cs.trainer_photos,
        cs.highlighted_ingredients,
        cs.final_recipe_title,
        cs.final_recipe_pdf,
        cs.final_recipe_brief,
        cs.final_recipe_visible_to_customers,
        cs.final_recipe_published_at,
        cs.admin_workshop_notes,
        cs.admin_workshop_notes_photo,
        cs.updated_at,
        COALESCE(cs.seats_total, c.seats_total) AS seats_total_effective,
        COALESCE(cs.seats_booked, 0) AS seats_booked,
        COALESCE(booking_stats.bookings_count, 0) AS bookings_count,
        COALESCE(booking_stats.participants_count, 0) AS participants_count,
        COALESCE(review_stats.feedback_count, 0) AS feedback_count,
        review_stats.average_rating,
        c.title AS class_title,
        c.title_ar AS class_title_ar,
        c.slug AS class_slug,
        c.image AS class_image,
        u.full_name AS trainer_name,
        u.profile_image AS trainer_image
      FROM class_sessions cs
      INNER JOIN classes c ON c.id = cs.class_id
      LEFT JOIN users u ON u.id = c.trainer_id
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS bookings_count,
          COALESCE(SUM(b.number_of_participants), 0)::int AS participants_count
        FROM bookings b
        WHERE b.session_id = cs.id
          AND b.status <> 'CANCELLED'
      ) AS booking_stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS feedback_count,
          ROUND(AVG(r.rating)::numeric, 2)::float8 AS average_rating
        FROM reviews r
        WHERE r.session_id = cs.id
          AND r.is_visible = true
      ) AS review_stats ON TRUE
      ${whereClause}
      ORDER BY cs.start_date_time DESC
      LIMIT 200`,
      values
    );

    return NextResponse.json({
      sessions: result.rows,
      filters: {
        status,
        timeline,
        search,
      },
    });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
