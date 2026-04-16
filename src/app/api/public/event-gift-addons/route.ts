import { NextRequest, NextResponse } from 'next/server';

import { getActiveEventGiftAddOns } from '@/lib/eventGiftAddOns';
import type { EventType } from '@/lib/db/types';

const EVENT_TYPES = new Set(['COOKING_COMPETITION', 'PRIVATE_CLASS', 'BIRTHDAY_PARTY']);

export async function GET(request: NextRequest) {
  try {
    const eventType = request.nextUrl.searchParams.get('eventType')?.trim() || '';
    if (!EVENT_TYPES.has(eventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    const items = await getActiveEventGiftAddOns(eventType as EventType);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error loading public event gift add-ons:', error);
    return NextResponse.json({ error: 'Failed to load gift add-ons' }, { status: 500 });
  }
}