import { NextResponse } from 'next/server';
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { sessionId } = await context.params;
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      recipeSubmitted?: boolean;
      recipePdf?: string | null;
      groceryList?: string | null;
      workshopBrief?: string | null;
    };

    const recipeSubmitted = Boolean(body.recipeSubmitted);
    const recipePdf = typeof body.recipePdf === 'string' ? body.recipePdf.trim().slice(0, 500) : null;
    const groceryList = typeof body.groceryList === 'string' ? body.groceryList.trim().slice(0, 10000) : null;
    const workshopBrief = typeof body.workshopBrief === 'string' ? body.workshopBrief.trim().slice(0, 10000) : null;

    const result = await query(
      `UPDATE class_sessions
       SET recipe_submitted = $1,
           recipe_pdf = $2,
           grocery_list = $3,
           workshop_brief = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, recipe_submitted, recipe_pdf, grocery_list, workshop_brief, updated_at`,
      [recipeSubmitted, recipePdf || null, groceryList || null, workshopBrief || null, sessionId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    return NextResponse.json({ session: result.rows[0] });
  } catch (error) {
    console.error('Error updating recipe session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
