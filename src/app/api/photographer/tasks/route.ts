import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import { listPhotographerTasks, updatePhotographerTask } from '@/lib/db/photographer';
import type { TaskStatus } from '@/lib/db/types';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'SOCIAL_MEDIA_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status') as TaskStatus | null;
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 50), 1), 200);
  const offset = Math.max(Number(url.searchParams.get('offset') ?? 0), 0);

  const result = await listPhotographerTasks(user.id, {
    status: status ?? undefined,
    limit,
    offset,
  });

  return NextResponse.json(result);
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'SOCIAL_MEDIA_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { taskId, status } = body;

  if (!taskId || !status) {
    return NextResponse.json({ error: 'taskId and status are required' }, { status: 400 });
  }

  const validStatuses: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status. Allowed: PENDING, IN_PROGRESS, COMPLETED' }, { status: 400 });
  }

  const task = await updatePhotographerTask(taskId, { status });
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  return NextResponse.json({ task });
}
