import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import { query } from '@/lib/db/pool';
import { ensureRecipeManagementSchema } from '@/lib/db/recipeManagement';

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

type HighlightedIngredient = {
  name: string;
  source: string;
  photo: string;
};

function sanitizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function sanitizeStringArray(value: unknown, maxLength: number, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => (typeof item === 'string' ? item.trim().slice(0, maxLength) : ''))
    .filter((item) => item.length > 0)
    .slice(0, maxItems);
}

function parseHighlightedIngredients(value: unknown): HighlightedIngredient[] {
  if (!Array.isArray(value)) return [];

  const ingredients: HighlightedIngredient[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;

    const record = item as Record<string, unknown>;
    const name = sanitizeText(record.name, 120) ?? '';
    const source = sanitizeText(record.source, 240) ?? '';
    const photo = sanitizeText(record.photo, 500) ?? '';

    if (!name && !source && !photo) {
      continue;
    }

    ingredients.push({
      name,
      source,
      photo,
    });

    if (ingredients.length >= 100) {
      break;
    }
  }

  return ingredients;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    await ensureRecipeManagementSchema();

    const { sessionId } = await context.params;
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    }

    const [sessionResult, bookingsResult, feedbackResult] = await Promise.all([
      query(
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
          cs.final_recipe_title_ar,
          cs.final_recipe_pdf_ar,
          cs.final_recipe_brief_ar,
          cs.final_recipe_visible_to_customers,
          cs.final_recipe_published_at,
          cs.admin_workshop_notes,
          cs.admin_workshop_notes_photo,
          cs.updated_at,
          COALESCE(cs.seats_total, c.seats_total) AS seats_total_effective,
          COALESCE(cs.seats_booked, 0) AS seats_booked,
          c.title AS class_title,
          c.title_ar AS class_title_ar,
          c.slug AS class_slug,
          c.image AS class_image,
          u.full_name AS trainer_name,
          u.profile_image AS trainer_image,
          COALESCE(booking_stats.bookings_count, 0) AS bookings_count,
          COALESCE(booking_stats.participants_count, 0) AS participants_count,
          COALESCE(review_stats.feedback_count, 0) AS feedback_count,
          review_stats.average_rating
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
        WHERE cs.id = $1
        LIMIT 1`,
        [sessionId]
      ),
      query(
        `SELECT
          b.id,
          b.booking_number,
          b.number_of_participants,
          b.status,
          b.payment_status,
          b.created_at,
          COALESCE(u.full_name, 'Guest Customer') AS customer_name
         FROM bookings b
         LEFT JOIN users u ON u.id = b.user_id
         WHERE b.session_id = $1
           AND b.status <> 'CANCELLED'
         ORDER BY b.created_at DESC
         LIMIT 100`,
        [sessionId]
      ),
      query(
        `SELECT
          r.id,
          r.rating,
          r.comment,
          r.created_at,
          COALESCE(u.full_name, 'Customer') AS customer_name
         FROM reviews r
         LEFT JOIN users u ON u.id = r.user_id
         WHERE r.session_id = $1
           AND r.is_visible = true
         ORDER BY r.created_at DESC
         LIMIT 100`,
        [sessionId]
      ),
    ]);

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    return NextResponse.json({
      session: {
        ...sessionResult.rows[0],
        bookings: bookingsResult.rows,
        feedback: feedbackResult.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching recipe session details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    await ensureRecipeManagementSchema();

    const { sessionId } = await context.params;
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      recipeSubmitted?: boolean;
      recipePdf?: string | null;
      groceryList?: string | null;
      workshopBrief?: string | null;
      trainerRecipePdf?: string | null;
      trainerGroceryList?: string | null;
      trainerWorkshopBrief?: string | null;
      trainerPhotos?: string[];
      photos?: string[];
      highlightedIngredients?: Array<{ name?: string; source?: string; photo?: string }>;
      finalRecipeTitle?: string | null;
      finalRecipePdf?: string | null;
      finalRecipeBrief?: string | null;
      finalRecipeTitleAr?: string | null;
      finalRecipePdfAr?: string | null;
      finalRecipeBriefAr?: string | null;
      finalRecipeVisibleToCustomers?: boolean;
      adminWorkshopNotes?: string | null;
      adminWorkshopNotesPhoto?: string | null;
    };

    const recipeSubmitted = typeof body.recipeSubmitted === 'boolean' ? body.recipeSubmitted : false;

    const trainerRecipePdf = sanitizeText(body.trainerRecipePdf ?? body.recipePdf, 500);
    const trainerGroceryList = sanitizeText(body.trainerGroceryList ?? body.groceryList, 10000);
    const trainerWorkshopBrief = sanitizeText(body.trainerWorkshopBrief ?? body.workshopBrief, 10000);
    const trainerPhotos = sanitizeStringArray(body.trainerPhotos ?? body.photos, 500, 30);
    const highlightedIngredients = parseHighlightedIngredients(body.highlightedIngredients);

    const finalRecipeTitle = sanitizeText(body.finalRecipeTitle, 255);
    const finalRecipePdf = sanitizeText(body.finalRecipePdf, 500);
    const finalRecipeBrief = sanitizeText(body.finalRecipeBrief, 10000);
    const finalRecipeTitleAr = sanitizeText(body.finalRecipeTitleAr, 255);
    const finalRecipePdfAr = sanitizeText(body.finalRecipePdfAr, 500);
    const finalRecipeBriefAr = sanitizeText(body.finalRecipeBriefAr, 10000);
    const finalRecipeVisibleToCustomers =
      typeof body.finalRecipeVisibleToCustomers === 'boolean' ? body.finalRecipeVisibleToCustomers : false;

    const adminWorkshopNotes = sanitizeText(body.adminWorkshopNotes, 12000);
    const adminWorkshopNotesPhoto = sanitizeText(body.adminWorkshopNotesPhoto, 500);

    const result = await query(
      `UPDATE class_sessions
       SET recipe_submitted = $1,
           recipe_pdf = $2,
           grocery_list = $3,
           workshop_brief = $4,
           trainer_photos = $5::text[],
           photos = $5::text[],
           highlighted_ingredients = $6::jsonb,
           final_recipe_title = $7,
           final_recipe_pdf = $8,
           final_recipe_brief = $9,
           final_recipe_title_ar = $10,
           final_recipe_pdf_ar = $11,
           final_recipe_brief_ar = $12,
           final_recipe_visible_to_customers = $13,
           final_recipe_published_at = CASE
             WHEN $13 = true AND final_recipe_visible_to_customers = false THEN NOW()
             WHEN $13 = false THEN NULL
             ELSE final_recipe_published_at
           END,
           admin_workshop_notes = $14,
           admin_workshop_notes_photo = $15,
           updated_at = NOW()
       WHERE id = $16
       RETURNING
         id,
         class_id,
         start_date_time,
         end_date_time,
         recipe_submitted,
         recipe_pdf,
         grocery_list,
         workshop_brief,
         photos,
         trainer_photos,
         highlighted_ingredients,
         final_recipe_title,
         final_recipe_pdf,
         final_recipe_brief,
         final_recipe_title_ar,
         final_recipe_pdf_ar,
         final_recipe_brief_ar,
         final_recipe_visible_to_customers,
         final_recipe_published_at,
         admin_workshop_notes,
         admin_workshop_notes_photo,
         updated_at`,
      [
        recipeSubmitted,
        trainerRecipePdf,
        trainerGroceryList,
        trainerWorkshopBrief,
        trainerPhotos,
        JSON.stringify(highlightedIngredients),
        finalRecipeTitle,
        finalRecipePdf,
        finalRecipeBrief,
        finalRecipeTitleAr,
        finalRecipePdfAr,
        finalRecipeBriefAr,
        finalRecipeVisibleToCustomers,
        adminWorkshopNotes,
        adminWorkshopNotesPhoto,
        sessionId,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    const session = result.rows[0] as {
      class_id: string;
      final_recipe_title: string | null;
      final_recipe_pdf: string | null;
      final_recipe_brief: string | null;
      final_recipe_title_ar: string | null;
      final_recipe_pdf_ar: string | null;
      final_recipe_brief_ar: string | null;
      final_recipe_visible_to_customers: boolean;
      final_recipe_published_at: string | null;
      admin_workshop_notes: string | null;
      admin_workshop_notes_photo: string | null;
    };

    await query(
      `UPDATE classes
       SET final_recipe_title = $1,
           final_recipe_pdf = $2,
           final_recipe_brief = $3,
           final_recipe_title_ar = $4,
           final_recipe_pdf_ar = $5,
           final_recipe_brief_ar = $6,
           final_recipe_visible_to_customers = $7,
           final_recipe_published_at = CASE WHEN $7 = true THEN COALESCE($8::timestamptz, NOW()) ELSE NULL END,
           admin_workshop_notes = COALESCE($9, admin_workshop_notes),
           admin_workshop_notes_photo = COALESCE($10, admin_workshop_notes_photo),
           updated_at = NOW()
       WHERE id = $11`,
      [
        session.final_recipe_title,
        session.final_recipe_pdf,
        session.final_recipe_brief,
        session.final_recipe_title_ar,
        session.final_recipe_pdf_ar,
        session.final_recipe_brief_ar,
        session.final_recipe_visible_to_customers,
        session.final_recipe_published_at,
        session.admin_workshop_notes,
        session.admin_workshop_notes_photo,
        session.class_id,
      ]
    );

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error updating recipe session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
