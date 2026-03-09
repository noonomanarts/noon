import { NextRequest, NextResponse } from 'next/server';
import { getAdminFinanceSettings, updateAdminFinanceSettings } from '@/lib/db/finance';
import { requireAdminSession } from '../_auth';

function mapValidationStatus(error: unknown): number {
  if (!(error instanceof Error)) return 500;
  const message = error.message.toLowerCase();
  if (message.includes('invalid') || message.includes('no settings changes')) {
    return 400;
  }
  return 500;
}

export async function GET() {
  try {
    const auth = await requireAdminSession();
    if (auth.error) return auth.error;

    const settings = await getAdminFinanceSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching finance settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdminSession();
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      defaultCurrency?: string;
      requireReasonSelection?: boolean;
      allowCustomReason?: boolean;
    };

    const settings = await updateAdminFinanceSettings({
      defaultCurrency: body.defaultCurrency,
      requireReasonSelection: body.requireReasonSelection,
      allowCustomReason: body.allowCustomReason,
      updatedByUserId: auth.user.id,
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error updating finance settings:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: mapValidationStatus(error) });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
