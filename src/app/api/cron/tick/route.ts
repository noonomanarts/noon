import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cron/auth';
import { runCronTick } from '@/lib/cron/tick';

export const dynamic = 'force-dynamic';

async function handle(request: NextRequest) {
  if (!(await isAuthorizedCronRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const skipBirthday = request.nextUrl.searchParams.get('birthday') === 'false';
    const result = await runCronTick({ birthday: !skipBirthday });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[cron] tick failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron tick failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
