import { pool } from './pool';
import type { AppNotification, UserRole } from './types';

interface CreateNotificationInput {
  recipientUserId?: string;
  recipientRole?: UserRole;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput): Promise<AppNotification> {
  const result = await pool.query(
    `INSERT INTO app_notifications (recipient_user_id, recipient_role, type, title, message, data)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.recipientUserId ?? null,
      input.recipientRole ?? null,
      input.type,
      input.title,
      input.message,
      input.data ?? null,
    ]
  );

  return result.rows[0];
}

export async function listNotificationsForUser(userId: string, userRole: UserRole, limit = 30): Promise<AppNotification[]> {
  const result = await pool.query(
    `SELECT *
     FROM app_notifications
     WHERE recipient_user_id = $1 OR recipient_role = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [userId, userRole, limit]
  );

  return result.rows;
}

export async function getUnreadNotificationCount(userId: string, userRole: UserRole): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM app_notifications
     WHERE is_read = false
       AND (recipient_user_id = $1 OR recipient_role = $2)`,
    [userId, userRole]
  );

  return result.rows[0]?.count ?? 0;
}

export async function markNotificationAsRead(notificationId: string, userId: string, userRole: UserRole): Promise<boolean> {
  const result = await pool.query(
    `UPDATE app_notifications
     SET is_read = true, read_at = NOW()
     WHERE id = $1
       AND (recipient_user_id = $2 OR recipient_role = $3)
     RETURNING id`,
    [notificationId, userId, userRole]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function markAllNotificationsAsRead(userId: string, userRole: UserRole): Promise<number> {
  const result = await pool.query(
    `UPDATE app_notifications
     SET is_read = true, read_at = NOW()
     WHERE is_read = false
       AND (recipient_user_id = $1 OR recipient_role = $2)
     RETURNING id`,
    [userId, userRole]
  );

  return result.rowCount ?? 0;
}
