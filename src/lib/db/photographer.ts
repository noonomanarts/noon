import { pool } from './pool';
import type { TaskPriority, TaskStatus } from './types';

// ── Task types ──────────────────────────────────────────
export interface PhotographerTaskPublic {
  id: string;
  photographerUserId: string;
  assignedByUserId: string;
  assignedByName: string;
  title: string;
  titleAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  completedAt: string | null;
  notes: string | null;
  notesAr: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Schedule item (classes + confirmed events + meetings) ──
export interface PhotographerScheduleItem {
  id: string;
  type: 'CLASS' | 'EVENT' | 'MEETING';
  title: string;
  titleAr: string | null;
  startDateTime: string;
  endDateTime: string;
  description: string | null;
  location: string | null;
  // For classes
  category: string | null;
  trainerName: string | null;
  seatsBooked: number | null;
  // For events
  eventType: string | null;
  companyName: string | null;
  participants: number | null;
  // For meetings
  contactName: string | null;
  contactPhone: string | null;
}

// ── Tasks CRUD ──────────────────────────────────────────

export async function listPhotographerTasks(
  photographerUserId: string,
  options?: { status?: TaskStatus; limit?: number; offset?: number }
): Promise<{ tasks: PhotographerTaskPublic[]; total: number }> {
  const conditions = ['pt.photographer_user_id = $1'];
  const params: (string | number)[] = [photographerUserId];
  let paramIdx = 2;

  if (options?.status) {
    conditions.push(`pt.status = $${paramIdx}`);
    params.push(options.status);
    paramIdx++;
  }

  const where = conditions.join(' AND ');

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM photographer_tasks pt WHERE ${where}`,
    params
  );

  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const result = await pool.query(
    `SELECT pt.*, u.full_name AS assigned_by_name
     FROM photographer_tasks pt
     LEFT JOIN users u ON u.id = pt.assigned_by_user_id
     WHERE ${where}
     ORDER BY
       CASE pt.priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
       CASE pt.status WHEN 'IN_PROGRESS' THEN 0 WHEN 'PENDING' THEN 1 ELSE 2 END,
       pt.due_date ASC NULLS LAST,
       pt.created_at DESC
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limit, offset]
  );

  return {
    tasks: result.rows.map(mapTaskRow),
    total: countResult.rows[0]?.total ?? 0,
  };
}

export async function getPhotographerTask(taskId: string): Promise<PhotographerTaskPublic | null> {
  const result = await pool.query(
    `SELECT pt.*, u.full_name AS assigned_by_name
     FROM photographer_tasks pt
     LEFT JOIN users u ON u.id = pt.assigned_by_user_id
     WHERE pt.id = $1`,
    [taskId]
  );
  if (result.rows.length === 0) return null;
  return mapTaskRow(result.rows[0]);
}

export async function createPhotographerTask(data: {
  photographerUserId: string;
  assignedByUserId: string;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  priority?: TaskPriority;
  dueDate?: string;
  notes?: string;
  notesAr?: string;
}): Promise<PhotographerTaskPublic> {
  const result = await pool.query(
    `INSERT INTO photographer_tasks
       (photographer_user_id, assigned_by_user_id, title, title_ar, description, description_ar, priority, due_date, notes, notes_ar)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      data.photographerUserId,
      data.assignedByUserId,
      data.title,
      data.titleAr ?? null,
      data.description ?? null,
      data.descriptionAr ?? null,
      data.priority ?? 'MEDIUM',
      data.dueDate ?? null,
      data.notes ?? null,
      data.notesAr ?? null,
    ]
  );

  // Re-fetch with join for assigned_by_name
  return (await getPhotographerTask(result.rows[0].id))!;
}

export async function updatePhotographerTask(
  taskId: string,
  data: {
    title?: string;
    titleAr?: string | null;
    description?: string | null;
    descriptionAr?: string | null;
    priority?: TaskPriority;
    status?: TaskStatus;
    dueDate?: string | null;
    notes?: string | null;
    notesAr?: string | null;
  }
): Promise<PhotographerTaskPublic | null> {
  const sets: string[] = [];
  const params: (string | null)[] = [];
  let idx = 1;

  const fields: Array<[string, unknown]> = [
    ['title', data.title],
    ['title_ar', data.titleAr],
    ['description', data.description],
    ['description_ar', data.descriptionAr],
    ['priority', data.priority],
    ['status', data.status],
    ['due_date', data.dueDate],
    ['notes', data.notes],
    ['notes_ar', data.notesAr],
  ];

  for (const [col, val] of fields) {
    if (val !== undefined) {
      sets.push(`${col} = $${idx}`);
      params.push(val as string | null);
      idx++;
    }
  }

  // Auto-set completed_at
  if (data.status === 'COMPLETED') {
    sets.push(`completed_at = NOW()`);
  } else if (data.status) {
    sets.push(`completed_at = NULL`);
  }

  sets.push(`updated_at = NOW()`);

  if (sets.length === 1) return getPhotographerTask(taskId); // only updated_at

  const result = await pool.query(
    `UPDATE photographer_tasks SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id`,
    [...params, taskId]
  );

  if ((result.rowCount ?? 0) === 0) return null;
  return getPhotographerTask(taskId);
}

export async function deletePhotographerTask(taskId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM photographer_tasks WHERE id = $1`,
    [taskId]
  );
  return (result.rowCount ?? 0) > 0;
}

// ── Schedule: Unified view of classes + events + meetings ──

export async function getPhotographerSchedule(options?: {
  from?: string;
  to?: string;
}): Promise<PhotographerScheduleItem[]> {
  const from = options?.from ?? new Date().toISOString();
  const to = options?.to ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Published classes with sessions (using start_date_time from classes table)
  const classesResult = await pool.query(
    `SELECT
       c.id,
       c.title,
       c.title_ar,
       c.start_date_time,
       c.end_date_time,
       c.description,
       c.category,
       u.full_name AS trainer_name,
       COALESCE((SELECT COUNT(*)::int FROM bookings b WHERE b.class_id = c.id AND b.status NOT IN ('CANCELLED')), 0) AS seats_booked
     FROM classes c
     LEFT JOIN users u ON u.id = c.trainer_id
     WHERE c.status = 'PUBLISHED'
       AND c.start_date_time IS NOT NULL
       AND c.start_date_time >= $1
       AND c.start_date_time <= $2
     ORDER BY c.start_date_time ASC`,
    [from, to]
  );

  // 2. Confirmed events
  const eventsResult = await pool.query(
    `SELECT
       eb.id,
       eb.event_type,
       eb.full_name,
       eb.company_or_group_name,
       eb.number_of_participants,
       eb.special_requests,
       ce.start_date_time,
       ce.end_date_time,
       ce.title,
       ce.description
     FROM event_bookings eb
     JOIN calendar_events ce ON ce.event_booking_id = eb.id
     WHERE eb.status IN ('CLIENT_CONFIRMED', 'PENDING_PAYMENT', 'COMPLETED')
       AND ce.start_date_time >= $1
       AND ce.start_date_time <= $2
     ORDER BY ce.start_date_time ASC`,
    [from, to]
  );

  // 3. Meetings (APPOINTMENT/SCHEDULER calendar events with photographer notification)
  const meetingsResult = await pool.query(
    `SELECT
       ce.id,
       ce.title,
       ce.description,
       ce.start_date_time,
       ce.end_date_time,
       ce.appointment_contact_name,
       ce.appointment_contact_phone
     FROM calendar_events ce
     WHERE ce.type IN ('APPOINTMENT', 'SCHEDULER')
       AND ce.start_date_time >= $1
       AND ce.start_date_time <= $2
     ORDER BY ce.start_date_time ASC`,
    [from, to]
  );

  const items: PhotographerScheduleItem[] = [];

  for (const row of classesResult.rows) {
    items.push({
      id: row.id,
      type: 'CLASS',
      title: row.title,
      titleAr: row.title_ar,
      startDateTime: row.start_date_time?.toISOString() ?? '',
      endDateTime: row.end_date_time?.toISOString() ?? '',
      description: row.description,
      location: null,
      category: row.category,
      trainerName: row.trainer_name,
      seatsBooked: row.seats_booked,
      eventType: null,
      companyName: null,
      participants: null,
      contactName: null,
      contactPhone: null,
    });
  }

  for (const row of eventsResult.rows) {
    items.push({
      id: row.id,
      type: 'EVENT',
      title: row.title || `${row.event_type} - ${row.full_name}`,
      titleAr: null,
      startDateTime: row.start_date_time?.toISOString() ?? '',
      endDateTime: row.end_date_time?.toISOString() ?? '',
      description: row.description || row.special_requests,
      location: null,
      category: null,
      trainerName: null,
      seatsBooked: null,
      eventType: row.event_type,
      companyName: row.company_or_group_name,
      participants: row.number_of_participants,
      contactName: row.full_name,
      contactPhone: null,
    });
  }

  for (const row of meetingsResult.rows) {
    items.push({
      id: row.id,
      type: 'MEETING',
      title: row.title,
      titleAr: null,
      startDateTime: row.start_date_time?.toISOString() ?? '',
      endDateTime: row.end_date_time?.toISOString() ?? '',
      description: row.description,
      location: null,
      category: null,
      trainerName: null,
      seatsBooked: null,
      eventType: null,
      companyName: null,
      participants: null,
      contactName: row.appointment_contact_name,
      contactPhone: row.appointment_contact_phone,
    });
  }

  // Sort by startDateTime
  items.sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());

  return items;
}

// ── Stats ──

export async function getPhotographerStats(photographerUserId: string): Promise<{
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  upcomingClasses: number;
  upcomingEvents: number;
  upcomingMeetings: number;
}> {
  const now = new Date().toISOString();

  const [tasksResult, classesResult, eventsResult, meetingsResult] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status IN ('PENDING', 'IN_PROGRESS'))::int AS pending,
         COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed
       FROM photographer_tasks
       WHERE photographer_user_id = $1`,
      [photographerUserId]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count
       FROM classes
       WHERE status = 'PUBLISHED'
         AND start_date_time IS NOT NULL
         AND start_date_time >= $1`,
      [now]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count
       FROM event_bookings eb
       JOIN calendar_events ce ON ce.event_booking_id = eb.id
       WHERE eb.status IN ('CLIENT_CONFIRMED', 'PENDING_PAYMENT', 'COMPLETED')
         AND ce.start_date_time >= $1`,
      [now]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count
       FROM calendar_events
       WHERE type IN ('APPOINTMENT', 'SCHEDULER')
         AND start_date_time >= $1`,
      [now]
    ),
  ]);

  const t = tasksResult.rows[0];
  return {
    totalTasks: t?.total ?? 0,
    pendingTasks: t?.pending ?? 0,
    completedTasks: t?.completed ?? 0,
    upcomingClasses: classesResult.rows[0]?.count ?? 0,
    upcomingEvents: eventsResult.rows[0]?.count ?? 0,
    upcomingMeetings: meetingsResult.rows[0]?.count ?? 0,
  };
}

// ── Helpers ──

function mapTaskRow(row: Record<string, unknown>): PhotographerTaskPublic {
  return {
    id: row.id as string,
    photographerUserId: row.photographer_user_id as string,
    assignedByUserId: row.assigned_by_user_id as string,
    assignedByName: (row.assigned_by_name as string) ?? 'Admin',
    title: row.title as string,
    titleAr: row.title_ar as string | null,
    description: row.description as string | null,
    descriptionAr: row.description_ar as string | null,
    priority: row.priority as TaskPriority,
    status: row.status as TaskStatus,
    dueDate: row.due_date ? (row.due_date as Date).toISOString() : null,
    completedAt: row.completed_at ? (row.completed_at as Date).toISOString() : null,
    notes: row.notes as string | null,
    notesAr: row.notes_ar as string | null,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}
