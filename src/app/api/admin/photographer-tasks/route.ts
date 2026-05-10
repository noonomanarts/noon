import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/db/users';
import {
  createPhotographerTask,
  listPhotographerDashboardUsers,
  listPhotographerTasksForUsers,
  updatePhotographerTask,
  deletePhotographerTask,
} from '@/lib/db/photographer';
import { createNotification } from '@/lib/db/notifications';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const photographerUsers = await listPhotographerDashboardUsers();
  if (photographerUsers.length === 0) {
    return NextResponse.json({ tasks: [], total: 0 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status') ?? undefined;
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 50), 1), 200);
  const offset = Math.max(Number(url.searchParams.get('offset') ?? 0), 0);

  const result = await listPhotographerTasksForUsers(photographerUsers.map((item) => item.id), {
    status: status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | undefined,
    limit,
    offset,
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { photographerUserId, title, titleAr, description, descriptionAr, priority, dueDate, notes, notesAr } = body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const photographerUsers = await listPhotographerDashboardUsers();
  if (photographerUsers.length === 0) {
    return NextResponse.json({ error: 'No photographer dashboard user found. Create a user with PHOTOGRAPHER or SOCIAL_MEDIA_ADMIN role first.' }, { status: 400 });
  }

  const assignee =
    photographerUsers.find((item) => item.id === photographerUserId) ??
    photographerUsers[0];

  const task = await createPhotographerTask({
    photographerUserId: assignee.id,
    assignedByUserId: user.id,
    title: title.trim(),
    titleAr: titleAr?.trim() || undefined,
    description: description?.trim() || undefined,
    descriptionAr: descriptionAr?.trim() || undefined,
    priority,
    dueDate,
    notes: notes?.trim() || undefined,
    notesAr: notesAr?.trim() || undefined,
  });

  // Notify photographer
  await createNotification({
    recipientUserId: assignee.id,
    type: 'PHOTOGRAPHER_TASK_ASSIGNED',
    title: 'New Task Assigned',
    message: `You have a new task: "${title.trim()}"${dueDate ? ` — Due: ${new Date(dueDate).toLocaleDateString('en-OM', { timeZone: 'Asia/Muscat' })}` : ''}`,
    data: { taskId: task.id, priority, photographerUserId: assignee.id },
  });

  return NextResponse.json({ task }, { status: 201 });
}

export async function PUT(request: Request) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { taskId, ...updates } = body;

  if (!taskId) {
    return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
  }

  if (updates.photographerUserId) {
    const photographerUsers = await listPhotographerDashboardUsers();
    const isValidAssignee = photographerUsers.some((item) => item.id === updates.photographerUserId);
    if (!isValidAssignee) {
      return NextResponse.json({ error: 'Invalid photographer assignee' }, { status: 400 });
    }
  }

  const task = await updatePhotographerTask(taskId, updates);
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  return NextResponse.json({ task });
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const taskId = url.searchParams.get('taskId');
  if (!taskId) {
    return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
  }

  const deleted = await deletePhotographerTask(taskId);
  if (!deleted) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
