import { query } from '@/lib/db/pool';
import { sendWhatsAppText } from '@/lib/whatsappClient';

type AdminWhatsAppAudience = 'ADMIN_ONLY' | 'SHOP_ORDER_TEAM';

type RecipientRow = {
  id: string;
  full_name: string | null;
  phone_number: string | null;
};

async function getRecipients(audience: AdminWhatsAppAudience): Promise<RecipientRow[]> {
  const shopTeam = audience === 'SHOP_ORDER_TEAM';

  const result = await query<RecipientRow>(
    `SELECT DISTINCT u.id, u.full_name, u.phone_number
     FROM users u
     LEFT JOIN worker_permissions wp ON wp.user_id = u.id
     WHERE u.status = 'ACTIVE'
       AND NULLIF(TRIM(COALESCE(u.phone_number, '')), '') IS NOT NULL
       AND (
         u.role = 'ADMIN'
         OR (
           $1::boolean = TRUE
           AND (
             LOWER(TRIM(COALESCE(u.full_name, ''))) LIKE 'warda%'
             OR (u.role = 'WORKER' AND COALESCE(wp.can_manage_orders, FALSE) = TRUE)
           )
         )
       )
     ORDER BY u.id`,
    [shopTeam]
  );

  const byPhone = new Map<string, RecipientRow>();
  for (const row of result.rows) {
    const normalized = (row.phone_number ?? '').replace(/\D/g, '');
    if (!normalized || byPhone.has(normalized)) continue;
    byPhone.set(normalized, row);
  }

  return Array.from(byPhone.values());
}

export async function sendAdminEventWhatsApp(input: {
  audience?: AdminWhatsAppAudience;
  text: string;
}): Promise<{ recipients: number; sent: number }> {
  const text = input.text.trim();
  if (!text) return { recipients: 0, sent: 0 };

  const recipients = await getRecipients(input.audience ?? 'ADMIN_ONLY');
  let sent = 0;

  await Promise.all(
    recipients.map(async (recipient) => {
      if (!recipient.phone_number) return;
      try {
        const result = await sendWhatsAppText({
          phoneNumber: recipient.phone_number,
          text,
        });
        if (result.ok) sent += 1;
      } catch (error) {
        console.error(
          `[admin-whatsapp] failed for user ${recipient.id}:`,
          error
        );
      }
    })
  );

  return { recipients: recipients.length, sent };
}
