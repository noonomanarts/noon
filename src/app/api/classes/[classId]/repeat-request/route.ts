import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import { createClassRepeatRequest } from '@/lib/db/classRepeatRequests';

export async function POST(
  _request: Request,
  context: { params: Promise<{ classId: string }> }
) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  if (!sessionId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getUserById(sessionId);
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { classId } = await context.params;
    const result = await createClassRepeatRequest({
      classId,
      userId: user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit repeat request.';
    const status = message.startsWith('Repeat requests') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
