import { readSessionUserId } from '@/lib/sessionToken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSessionUserById } from '@/lib/db/users';
import {
  getNoonRecommendationsContent,
  updateNoonRecommendationsContent,
  type NoonRecommendationsContent,
} from '@/lib/recommendationsContent';

async function requireAdmin() {
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

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const content = getNoonRecommendationsContent();
    return NextResponse.json({ content });
  } catch (error) {
    console.error('Failed to load recommendations content:', error);
    return NextResponse.json({ error: 'Failed to load recommendations content' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      content?: NoonRecommendationsContent;
    };

    if (!body.content) {
      return NextResponse.json({ error: 'Content payload is required.' }, { status: 400 });
    }

    const updated = updateNoonRecommendationsContent(body.content);
    return NextResponse.json({ success: true, content: updated });
  } catch (error) {
    console.error('Failed to update recommendations content:', error);
    return NextResponse.json({ error: 'Failed to update recommendations content' }, { status: 500 });
  }
}
