import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getUserPreferenceByKey, upsertUserPreference } from '@/lib/db/userPreferences';
import { getUserById } from '@/lib/db/users';

const PREF_KEY = 'notifications.ui.v1';

type NotificationPreferences = {
  soundEnabled: boolean;
  newOrderSoundEnabled: boolean;
  importantSoundEnabled: boolean;
  vibrateEnabled: boolean;
  badgeEnabled: boolean;
  pollingIntervalSeconds: number;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  soundEnabled: true,
  newOrderSoundEnabled: true,
  importantSoundEnabled: true,
  vibrateEnabled: true,
  badgeEnabled: true,
  pollingIntervalSeconds: 20,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizePreferences(input: unknown): NotificationPreferences {
  const value = (input && typeof input === 'object' ? input : {}) as Partial<NotificationPreferences>;
  return {
    soundEnabled: value.soundEnabled ?? DEFAULT_PREFERENCES.soundEnabled,
    newOrderSoundEnabled: value.newOrderSoundEnabled ?? DEFAULT_PREFERENCES.newOrderSoundEnabled,
    importantSoundEnabled: value.importantSoundEnabled ?? DEFAULT_PREFERENCES.importantSoundEnabled,
    vibrateEnabled: value.vibrateEnabled ?? DEFAULT_PREFERENCES.vibrateEnabled,
    badgeEnabled: value.badgeEnabled ?? DEFAULT_PREFERENCES.badgeEnabled,
    pollingIntervalSeconds: clamp(
      Number(value.pollingIntervalSeconds ?? DEFAULT_PREFERENCES.pollingIntervalSeconds),
      10,
      120
    ),
  };
}

async function requireAuthenticatedUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;

  if (!sessionId) return null;
  return getUserById(sessionId);
}

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const saved = await getUserPreferenceByKey<NotificationPreferences>(user.id, PREF_KEY);
    return NextResponse.json(sanitizePreferences(saved));
  } catch (error) {
    console.error('Failed to load notification preferences:', error);
    return NextResponse.json({ error: 'Failed to load preferences' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as unknown;
    const nextPreferences = sanitizePreferences(body);

    await upsertUserPreference({
      userId: user.id,
      key: PREF_KEY,
      value: nextPreferences,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save notification preferences:', error);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
}
