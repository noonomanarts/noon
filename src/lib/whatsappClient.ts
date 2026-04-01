import { sendWhatsAppTextViaManagedSession } from '@/lib/whatsapp/wwebjsService';

export function normalizePhoneToChatId(phone: string): string | null {
  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (digits.length === 8) {
    digits = `968${digits}`;
  }

  if (digits.length < 8) return null;
  return `${digits}@c.us`;
}

export async function sendWhatsAppText(input: {
  phoneNumber: string;
  text: string;
  session?: string;
}): Promise<{
  ok: boolean;
  status: number;
  body: string;
  diagnostics?: {
    sessionId: string;
    status: string;
    hasClient: boolean;
    hasWid: boolean;
    updatedAt: string;
    attempts?: number;
  };
}> {
  return sendWhatsAppTextViaManagedSession({
    phoneNumber: input.phoneNumber,
    text: input.text,
    sessionId: input.session,
  });
}
