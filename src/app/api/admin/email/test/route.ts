import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/db/users';
import { sendTestEmail, testEmailConnection } from '@/lib/email/emailClient';

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  if (!sessionId) return null;
  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') return null;
  return user;
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, to } = body;

    if (action === 'test-connection') {
      const result = await testEmailConnection();
      if (result.ok) {
        return NextResponse.json({ success: true, message: 'SMTP connection successful' });
      } else {
        return NextResponse.json(
          { success: false, error: result.error || 'SMTP connection failed' },
          { status: 400 }
        );
      }
    }

    if (action === 'send-test') {
      if (!to || typeof to !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Email address is required' },
          { status: 400 }
        );
      }

      const result = await sendTestEmail(to);
      if (result.ok) {
        return NextResponse.json({ success: true, message: `Test email sent to ${to}` });
      } else {
        return NextResponse.json(
          { success: false, error: result.error || 'Failed to send test email' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use "test-connection" or "send-test"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in email test:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Email test failed' },
      { status: 500 }
    );
  }
}
