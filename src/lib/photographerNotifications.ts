import { createNotification } from '@/lib/db/notifications';
import { listPhotographerDashboardUsers } from '@/lib/db/photographer';

type PhotographerNotificationInput = {
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
};

export async function notifyPhotographerDashboardUsers(input: PhotographerNotificationInput): Promise<void> {
  const users = await listPhotographerDashboardUsers();
  if (users.length === 0) return;

  await Promise.all(
    users.map((user) =>
      createNotification({
        recipientUserId: user.id,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data,
      })
    )
  );
}
