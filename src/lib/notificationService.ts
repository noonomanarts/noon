import { createNotification } from '@/lib/db/notifications';
import { emitAdminEvent, emitUserEvent } from '@/lib/realtime/adminEvents';
import type { UserRole } from '@/lib/db/types';

interface NotifyInput {
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export async function notifyUser(userId: string, input: NotifyInput) {
  const notification = await createNotification({
    recipientUserId: userId,
    type: input.type,
    title: input.title,
    message: input.message,
    data: input.data,
  });

  emitUserEvent(userId, 'notification_created', {
    notification,
  });

  return notification;
}

export async function notifyRole(role: UserRole, input: NotifyInput) {
  const notification = await createNotification({
    recipientRole: role,
    type: input.type,
    title: input.title,
    message: input.message,
    data: input.data,
  });

  if (role === 'ADMIN') {
    emitAdminEvent('notification_created', {
      notification,
    });
  }

  return notification;
}
