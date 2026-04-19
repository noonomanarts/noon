/**
 * Rich WhatsApp broadcast endpoint.
 *
 * Supports every WAHA message type surfaced in the admin UI while keeping
 * the call semantics identical to the legacy text-only `/api/admin/whatsapp/send`:
 * the client sends one request with a list of recipients and receives a
 * per-recipient result array.
 *
 * Message payload schema:
 *   { type: 'text',          text }
 *   { type: 'image',         url | base64, caption?, mimetype?, filename? }
 *   { type: 'file',          url | base64, caption?, mimetype?, filename? }
 *   { type: 'video',         url | base64, caption?, mimetype?, filename? }
 *   { type: 'voice',         url | base64, mimetype? }
 *   { type: 'location',      latitude, longitude, title? }
 *   { type: 'contactVcard',  contacts: [{ name, phone }] }
 *   { type: 'linkPreview',   url, caption? }
 *
 * Options:
 *   - `simulateTyping`: shows a typing indicator for ~1.5s before sending,
 *                       then marks the chat as seen to emulate a human.
 *   - `delayBetweenMs`: minimum delay between sends (default 800ms) — helps
 *                       avoid WhatsApp anti-spam heuristics on large lists.
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { requireAdminUser } from '@/app/api/admin/whatsapp/_lib';
import {
  phoneToChatId,
  readWahaSettings,
  sendText,
  sendImage,
  sendFile,
  sendVideo,
  sendVoice,
  sendLocation,
  sendContactVcard,
  sendLinkPreview,
  startTyping,
  stopTyping,
  sendSeen,
  type WahaRequestResult,
} from '@/lib/whatsapp/wahaClient';
import type { WhatsAppAdminSettings } from '@/lib/db/adminSettings';

export const runtime = 'nodejs';

type MediaRef = { url?: string; base64?: string; mimetype?: string; filename?: string };

type MessagePayload =
  | { type: 'text'; text: string }
  | ({ type: 'image'; caption?: string } & MediaRef)
  | ({ type: 'file'; caption?: string } & MediaRef)
  | ({ type: 'video'; caption?: string } & MediaRef)
  | ({ type: 'voice' } & MediaRef)
  | { type: 'location'; latitude: number; longitude: number; title?: string }
  | { type: 'contactVcard'; contacts: Array<{ name: string; phone: string }> }
  | { type: 'linkPreview'; url: string; caption?: string };

type Body = {
  userIds?: string[];
  /**
   * Raw recipients by chatId (e.g. `96890000000@c.us`) or phone number.
   * Allows broadcasting to WhatsApp contacts and manually-provided lists
   * without requiring each recipient to be a registered user.
   */
  chatIds?: string[];
  /** Optional display labels for each chatId (aligned by index). */
  chatLabels?: string[];
  message?: MessagePayload;
  simulateTyping?: boolean;
  delayBetweenMs?: number;
};

function validateMessage(message: unknown): MessagePayload | null {
  if (!message || typeof message !== 'object') return null;
  const row = message as Record<string, unknown>;
  const type = row.type;
  switch (type) {
    case 'text':
      return typeof row.text === 'string' && row.text.trim().length > 0
        ? { type: 'text', text: row.text }
        : null;
    case 'image':
    case 'file':
    case 'video': {
      const hasMedia = typeof row.url === 'string' || typeof row.base64 === 'string';
      if (!hasMedia) return null;
      return {
        type,
        url: typeof row.url === 'string' ? row.url : undefined,
        base64: typeof row.base64 === 'string' ? row.base64 : undefined,
        mimetype: typeof row.mimetype === 'string' ? row.mimetype : undefined,
        filename: typeof row.filename === 'string' ? row.filename : undefined,
        caption: typeof row.caption === 'string' ? row.caption : undefined,
      } as MessagePayload;
    }
    case 'voice': {
      const hasMedia = typeof row.url === 'string' || typeof row.base64 === 'string';
      if (!hasMedia) return null;
      return {
        type: 'voice',
        url: typeof row.url === 'string' ? row.url : undefined,
        base64: typeof row.base64 === 'string' ? row.base64 : undefined,
        mimetype: typeof row.mimetype === 'string' ? row.mimetype : undefined,
      };
    }
    case 'location': {
      const lat = Number(row.latitude);
      const lng = Number(row.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return {
        type: 'location',
        latitude: lat,
        longitude: lng,
        title: typeof row.title === 'string' ? row.title : undefined,
      };
    }
    case 'contactVcard': {
      if (!Array.isArray(row.contacts) || row.contacts.length === 0) return null;
      const contacts = row.contacts
        .map((raw) => {
          if (!raw || typeof raw !== 'object') return null;
          const c = raw as Record<string, unknown>;
          if (typeof c.name !== 'string' || typeof c.phone !== 'string') return null;
          return { name: c.name, phone: c.phone };
        })
        .filter((value): value is { name: string; phone: string } => Boolean(value));
      return contacts.length > 0 ? { type: 'contactVcard', contacts } : null;
    }
    case 'linkPreview': {
      if (typeof row.url !== 'string' || row.url.trim().length === 0) return null;
      return {
        type: 'linkPreview',
        url: row.url,
        caption: typeof row.caption === 'string' ? row.caption : undefined,
      };
    }
    default:
      return null;
  }
}

async function dispatchMessage(
  settings: WhatsAppAdminSettings,
  session: string,
  chatId: string,
  message: MessagePayload
): Promise<WahaRequestResult> {
  switch (message.type) {
    case 'text':
      return sendText(settings, session, chatId, message.text);
    case 'image':
      return sendImage(
        settings,
        session,
        chatId,
        { url: message.url, base64: message.base64, mimetype: message.mimetype, filename: message.filename },
        message.caption
      );
    case 'file':
      return sendFile(
        settings,
        session,
        chatId,
        { url: message.url, base64: message.base64, mimetype: message.mimetype, filename: message.filename },
        message.caption
      );
    case 'video':
      return sendVideo(
        settings,
        session,
        chatId,
        { url: message.url, base64: message.base64, mimetype: message.mimetype, filename: message.filename },
        message.caption
      );
    case 'voice':
      return sendVoice(
        settings,
        session,
        chatId,
        { url: message.url, base64: message.base64, mimetype: message.mimetype }
      );
    case 'location':
      return sendLocation(settings, session, chatId, {
        latitude: message.latitude,
        longitude: message.longitude,
        title: message.title,
      });
    case 'contactVcard':
      return sendContactVcard(settings, session, chatId, message.contacts);
    case 'linkPreview':
      return sendLinkPreview(settings, session, chatId, message.url, message.caption);
    default: {
      const exhaustive: never = message;
      throw new Error(`unknown message type: ${String(exhaustive)}`);
    }
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Body;
    const userIds = Array.isArray(body.userIds) ? body.userIds.filter(Boolean) : [];
    const rawChatIds = Array.isArray(body.chatIds) ? body.chatIds.filter(Boolean) : [];
    const rawChatLabels = Array.isArray(body.chatLabels) ? body.chatLabels : [];
    const message = validateMessage(body.message);

    if (userIds.length === 0 && rawChatIds.length === 0) {
      return NextResponse.json({ error: 'Please select at least one recipient.' }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ error: 'Invalid or empty message payload.' }, { status: 400 });
    }

    type Recipient = { id: string; name: string; chatId: string | null; error?: string };

    const recipients: Recipient[] = [];

    if (userIds.length > 0) {
      const rows = (
        await query<{ id: string; full_name: string; phone_number: string | null }>(
          `SELECT id, full_name, phone_number
             FROM users
            WHERE id = ANY($1::uuid[]) AND status = 'ACTIVE'`,
          [userIds]
        )
      ).rows;
      for (const row of rows) {
        recipients.push({
          id: row.id,
          name: row.full_name,
          chatId: row.phone_number ? phoneToChatId(row.phone_number) : null,
          error: row.phone_number ? undefined : 'Missing or invalid phone number',
        });
      }
    }

    for (let index = 0; index < rawChatIds.length; index++) {
      const raw = String(rawChatIds[index] ?? '').trim();
      if (!raw) continue;
      const chatId = raw.includes('@') ? raw : phoneToChatId(raw);
      const label = (rawChatLabels[index] ?? raw).toString();
      recipients.push({
        id: `chat:${raw}`,
        name: label,
        chatId,
        error: chatId ? undefined : 'Invalid phone number',
      });
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No valid recipients found.' }, { status: 400 });
    }

    const settings = await readWahaSettings();
    const session = settings.activeSession;
    if (!session) {
      return NextResponse.json({ error: 'No active WhatsApp session configured.' }, { status: 400 });
    }

    const simulateTyping = Boolean(body.simulateTyping);
    const delayBetweenMs = Math.max(0, Math.min(5_000, Number(body.delayBetweenMs) || 800));

    const results: Array<{
      userId: string;
      name: string;
      success: boolean;
      error?: string;
      status?: number;
    }> = [];

    for (const recipient of recipients) {
      const chatId = recipient.chatId;
      if (!chatId) {
        results.push({
          userId: recipient.id,
          name: recipient.name,
          success: false,
          error: recipient.error ?? 'Missing or invalid phone number',
        });
        continue;
      }

      try {
        if (simulateTyping) {
          await startTyping(settings, session, chatId).catch(() => undefined);
          await new Promise((resolve) => setTimeout(resolve, 1_200));
          await stopTyping(settings, session, chatId).catch(() => undefined);
        }

        const result = await dispatchMessage(settings, session, chatId, message);

        if (simulateTyping && result.ok) {
          await sendSeen(settings, session, chatId).catch(() => undefined);
        }

        if (result.ok) {
          results.push({ userId: recipient.id, name: recipient.name, success: true, status: 200 });
        } else {
          results.push({
            userId: recipient.id,
            name: recipient.name,
            success: false,
            status: result.status,
            error: `WAHA ${result.status}: ${result.text.slice(0, 300)}`,
          });
        }
      } catch (error) {
        results.push({
          userId: recipient.id,
          name: recipient.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      if (delayBetweenMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenMs));
      }
    }

    const sent = results.filter((item) => item.success).length;
    return NextResponse.json({
      success: sent === results.length,
      summary: { total: results.length, sent, failed: results.length - sent },
      results,
    });
  } catch (error) {
    console.error('[admin/whatsapp/send-rich] failed:', error);
    return NextResponse.json({ error: 'Failed to send WhatsApp messages' }, { status: 500 });
  }
}
