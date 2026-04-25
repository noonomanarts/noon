import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAllUsers, getUserById } from '@/lib/db/users';
import { getAdminSettingsByKey, upsertAdminSettings } from '@/lib/db/adminSettings';
import {
  defaultPaymentAlertSettings,
  sanitizePaymentAlertSettings,
  type PaymentAlertSettings,
} from '@/lib/paymentAlertSettings';

const SETTINGS_KEY = 'payment-alerts';

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;

  if (!sessionId) return null;

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') return null;

  return user;
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [savedSettings, users] = await Promise.all([
      getAdminSettingsByKey<PaymentAlertSettings>(SETTINGS_KEY),
      getAllUsers({ status: 'ACTIVE' }),
    ]);

    return NextResponse.json({
      settings: sanitizePaymentAlertSettings(savedSettings ?? defaultPaymentAlertSettings),
      users: users.map((user) => ({
        id: user.id,
        full_name: user.fullName,
        email: user.email,
        phone_number: user.phoneNumber,
        role: user.role,
        profile_image: user.profileImage,
      })),
    });
  } catch (error) {
    console.error('Failed to load payment alert settings:', error);
    return NextResponse.json({ error: 'Failed to load payment alert settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Partial<PaymentAlertSettings>;
    const settings = sanitizePaymentAlertSettings(body);

    await upsertAdminSettings({
      key: SETTINGS_KEY,
      value: settings,
      updatedByUserId: admin.id,
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Failed to save payment alert settings:', error);
    return NextResponse.json({ error: 'Failed to save payment alert settings' }, { status: 500 });
  }
}