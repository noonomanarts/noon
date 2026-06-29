import { query } from '@/lib/db/pool';
import { findUniqueClass } from '@/lib/db/classes';
import { getUserById } from '@/lib/db/users';
import { sendWhatsAppText } from '@/lib/whatsappClient';

function isArabic(language: string | null | undefined): boolean {
  return language?.toUpperCase().startsWith('AR') ?? false;
}

/**
 * Sends the workshop's fixed registration auto-message to a single participant
 * right after they register. No-op when the workshop has no message configured
 * or the user has no phone number.
 */
export async function sendClassRegistrationMessage(input: {
  userId: string;
  classId: string;
}): Promise<boolean> {
  const classItem = await findUniqueClass({ id: input.classId });
  if (!classItem) return false;

  const messageEn = typeof classItem.registrationMessage === 'string' ? classItem.registrationMessage.trim() : '';
  const messageAr = typeof classItem.registrationMessageAr === 'string' ? classItem.registrationMessageAr.trim() : '';
  if (!messageEn && !messageAr) return false;

  const user = await getUserById(input.userId);
  if (!user?.phoneNumber) return false;

  const useArabic = isArabic(user.preferredLanguage);
  const text = (useArabic ? messageAr || messageEn : messageEn || messageAr).trim();
  if (!text) return false;

  const result = await sendWhatsAppText({ phoneNumber: user.phoneNumber, text });
  return result.ok;
}

/**
 * Broadcasts an ad-hoc WhatsApp message to every participant registered for a
 * workshop. Each participant receives the message in their preferred language.
 */
export async function broadcastClassMessage(input: {
  classId: string;
  messageEn: string;
  messageAr: string;
}): Promise<{ recipientsCount: number; sentCount: number }> {
  const messageEn = input.messageEn.trim();
  const messageAr = input.messageAr.trim();
  if (!messageEn && !messageAr) {
    throw new Error('Message cannot be empty.');
  }

  const result = await query<{
    phone_number: string | null;
    preferred_language: string | null;
  }>(
    `SELECT DISTINCT ON (u.id) u.phone_number, u.preferred_language
     FROM bookings b
     INNER JOIN users u ON u.id = b.user_id
     WHERE b.class_id = $1
       AND b.status = 'CONFIRMED'
       AND u.phone_number IS NOT NULL`,
    [input.classId]
  );

  const recipients = result.rows.filter((row) => row.phone_number);
  let sentCount = 0;

  await Promise.all(
    recipients.map(async (row) => {
      const useArabic = isArabic(row.preferred_language);
      const text = (useArabic ? messageAr || messageEn : messageEn || messageAr).trim();
      if (!text || !row.phone_number) return;
      const sent = await sendWhatsAppText({ phoneNumber: row.phone_number, text }).catch(() => ({ ok: false }));
      if (sent.ok) sentCount += 1;
    })
  );

  return { recipientsCount: recipients.length, sentCount };
}
