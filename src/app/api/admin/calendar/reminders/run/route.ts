import { NextRequest, NextResponse } from 'next/server';
import { dispatchDueCalendarAppointmentReminders } from '@/lib/calendarReminders';
import { isAuthorizedCronRequest } from '@/lib/cron/auth';

async function run(request: NextRequest) {
  try {
    const allowed = await isAuthorizedCronRequest(request);
    if (!allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await dispatchDueCalendarAppointmentReminders(200);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Run calendar reminders error:', error);
    return NextResponse.json({ error: 'Failed to run calendar reminders' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
