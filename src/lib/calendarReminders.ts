import { query } from '@/lib/db/pool';
import { notifyRole, notifyUser } from '@/lib/notificationService';

type AppointmentReminderRow = {
  id: string;
  type: 'APPOINTMENT' | 'SCHEDULER';
  title: string;
  start_date_time: string;
  end_date_time: string;
  appointment_contact_name: string | null;
  appointment_contact_phone: string | null;
  notifications_enabled: boolean;
  reminder_minutes_before: number | null;
  notify_at_start: boolean;
  reminder_sent_at: string | null;
  start_notification_sent_at: string | null;
  visible_to_trainers: boolean;
  visible_trainer_ids: string[] | null;
};

function toTimeLabel(value: string): string {
  return new Date(value).toLocaleString('en-OM', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

async function resolveTrainerRecipients(row: AppointmentReminderRow): Promise<string[]> {
  if (!row.visible_to_trainers) return [];
  if (Array.isArray(row.visible_trainer_ids) && row.visible_trainer_ids.length > 0) {
    return row.visible_trainer_ids;
  }

  const trainersResult = await query<{ id: string }>(
    `SELECT id
     FROM users
     WHERE role = 'TRAINER' AND status = 'ACTIVE'`
  );

  return trainersResult.rows.map((trainer) => String(trainer.id));
}

async function notifyAppointment(row: AppointmentReminderRow, stage: 'before' | 'start') {
  const startsAt = toTimeLabel(row.start_date_time);
  const contactBits = [row.appointment_contact_name, row.appointment_contact_phone].filter(Boolean).join(' • ');
  const itemLabel = row.type === 'SCHEDULER' ? 'scheduler item' : 'appointment';

  const title =
    stage === 'before'
      ? `Upcoming ${itemLabel}: ${row.title}`
      : `${itemLabel === 'appointment' ? 'Appointment' : 'Scheduler item'} now: ${row.title}`;
  const message =
    stage === 'before'
      ? `Starts at ${startsAt}${contactBits ? ` • ${contactBits}` : ''}`
      : `Started at ${startsAt}${contactBits ? ` • ${contactBits}` : ''}`;

  await notifyRole('ADMIN', {
    type: 'calendar_appointment_reminder',
    title,
    message,
    data: {
      calendarEventId: row.id,
      stage,
      startDateTime: row.start_date_time,
      endDateTime: row.end_date_time,
      contactName: row.appointment_contact_name,
      contactPhone: row.appointment_contact_phone,
    },
  });

  const trainerRecipients = await resolveTrainerRecipients(row);
  await Promise.all(
    trainerRecipients.map((trainerId) =>
      notifyUser(trainerId, {
        type: 'calendar_appointment_reminder',
        title,
        message,
        data: {
          calendarEventId: row.id,
          stage,
          startDateTime: row.start_date_time,
          endDateTime: row.end_date_time,
          contactName: row.appointment_contact_name,
          contactPhone: row.appointment_contact_phone,
        },
      })
    )
  );
}

export async function dispatchDueCalendarAppointmentReminders(limit = 100): Promise<{
  scanned: number;
  reminderSent: number;
  startSent: number;
}> {
  const dueResult = await query<AppointmentReminderRow>(
    `SELECT
       ce.id,
       ce.type,
       ce.title,
       ce.start_date_time,
       ce.end_date_time,
       ce.appointment_contact_name,
       ce.appointment_contact_phone,
       ce.notifications_enabled,
       ce.reminder_minutes_before,
       ce.notify_at_start,
       ce.reminder_sent_at,
       ce.start_notification_sent_at,
       ce.visible_to_trainers,
       ce.visible_trainer_ids
     FROM calendar_events ce
     WHERE ce.type IN ('APPOINTMENT', 'SCHEDULER')
       AND ce.notifications_enabled = true
       AND ce.end_date_time >= NOW() - INTERVAL '1 day'
       AND (
         (
           ce.reminder_minutes_before IS NOT NULL
           AND ce.reminder_sent_at IS NULL
           AND NOW() >= ce.start_date_time - make_interval(mins => ce.reminder_minutes_before)
         )
         OR
         (
           ce.notify_at_start = true
           AND ce.start_notification_sent_at IS NULL
           AND NOW() >= ce.start_date_time
         )
       )
     ORDER BY ce.start_date_time ASC
     LIMIT $1`,
    [limit]
  );

  let reminderSent = 0;
  let startSent = 0;

  for (const row of dueResult.rows) {
    const nowMs = Date.now();
    const startMs = new Date(row.start_date_time).getTime();

    const beforeDue =
      row.reminder_minutes_before !== null &&
      !row.reminder_sent_at &&
      nowMs >= startMs - row.reminder_minutes_before * 60_000;
    const startDue = row.notify_at_start && !row.start_notification_sent_at && nowMs >= startMs;

    if (beforeDue) {
      await notifyAppointment(row, 'before');
      await query(
        `UPDATE calendar_events
         SET reminder_sent_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [row.id]
      );
      reminderSent += 1;
    }

    if (startDue) {
      await notifyAppointment(row, 'start');
      await query(
        `UPDATE calendar_events
         SET start_notification_sent_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [row.id]
      );
      startSent += 1;
    }
  }

  return {
    scanned: dueResult.rows.length,
    reminderSent,
    startSent,
  };
}
