import { NextResponse } from 'next/server';
import { getUserByEmail, getUserByPhoneNormalized } from '@/lib/db/users';
import { query } from '@/lib/db/pool';
import { issueWhatsAppVerificationCode, type WhatsAppVerificationPurpose } from '@/lib/db/whatsappAuth';
import { sendWhatsAppOtp } from '@/lib/whatsapp/otpSender';

export const runtime = 'nodejs';

type RequestPayload = {
  purpose?: 'login' | 'register';
  phoneNumber?: string;
  locale?: 'en' | 'ar';
  email?: string;
};

function getClientIp(request: Request): string | undefined {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined;
}

async function invalidateVerificationCode(verificationId: string): Promise<void> {
  await query(
    `UPDATE whatsapp_verification_codes
     SET consumed_at = NOW(), updated_at = NOW()
     WHERE id = $1
       AND consumed_at IS NULL`,
    [verificationId]
  );
}

export async function POST(request: Request) {
  let isArabic = false;

  try {
    const body = (await request.json().catch(() => ({}))) as RequestPayload;

    const purpose = body.purpose === 'register' ? 'REGISTER' : body.purpose === 'login' ? 'LOGIN' : null;
    isArabic = body.locale === 'ar';
    const phoneNumber = typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!purpose || !phoneNumber) {
      return NextResponse.json({ error: 'Purpose and phone number are required.' }, { status: 400 });
    }

    if (purpose === 'LOGIN') {
      const user = await getUserByPhoneNormalized(phoneNumber);
      if (!user || user.status !== 'ACTIVE') {
        return NextResponse.json(
          {
            error: isArabic
              ? 'لا يوجد حساب مفعل بهذا الرقم.'
              : 'No active account found with this phone number.',
          },
          { status: 404 }
        );
      }
    }

    if (purpose === 'REGISTER') {
      const existingByPhone = await getUserByPhoneNormalized(phoneNumber);
      if (existingByPhone) {
        return NextResponse.json(
          {
            error: isArabic
              ? 'رقم الهاتف مسجل بالفعل. استخدم تسجيل الدخول.'
              : 'Phone number is already registered. Please login instead.',
          },
          { status: 409 }
        );
      }

      if (email) {
        const existingByEmail = await getUserByEmail(email);
        if (existingByEmail) {
          return NextResponse.json(
            {
              error: isArabic ? 'البريد الإلكتروني مسجل بالفعل.' : 'Email is already registered.',
            },
            { status: 409 }
          );
        }
      }
    }

    const issued = await issueWhatsAppVerificationCode({
      purpose: purpose as WhatsAppVerificationPurpose,
      phoneNumber,
      requestedIp: getClientIp(request),
      ttlMinutes: 10,
      maxAttempts: 5,
    });

    const codeMessage = isArabic
      ? `رمز التحقق الخاص بك في Noon هو: ${issued.code}\nصالح لمدة 10 دقائق. لا تشارك هذا الرمز مع أي شخص.`
      : `Your Noon verification code is: ${issued.code}\nValid for 10 minutes. Do not share this code with anyone.`;

    const sendResult = await sendWhatsAppOtp({
      phoneNumber,
      text: codeMessage,
    });

    if (!sendResult.ok) {
      // Do not leave a failed delivery as an active code. This also prevents a
      // WAHA outage from trapping the customer behind the 45-second resend guard.
      await invalidateVerificationCode(issued.verificationId).catch((error) => {
        console.error('[whatsapp-auth] Failed to invalidate undelivered verification code:', error);
      });

      console.error('[whatsapp-auth] OTP delivery failed:', {
        httpStatus: sendResult.status,
        sessionId: sendResult.diagnostics.sessionId,
        sessionStatus: sendResult.diagnostics.sessionStatus,
        attempts: sendResult.diagnostics.attempts,
        recovery: sendResult.diagnostics.recovery,
        upstream: sendResult.internalError,
      });

      return NextResponse.json(
        {
          error: isArabic
            ? 'خدمة واتساب غير متاحة مؤقتًا. يرجى المحاولة مرة أخرى بعد قليل.'
            : 'WhatsApp is temporarily unavailable. Please try again shortly.',
          code: 'WHATSAPP_TEMPORARILY_UNAVAILABLE',
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      verificationId: issued.verificationId,
      expiresAt: issued.expiresAt.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to issue verification code.';

    if (message.includes('Please wait before requesting another code')) {
      return NextResponse.json(
        {
          error: isArabic
            ? 'يرجى الانتظار قليلاً قبل طلب رمز آخر.'
            : 'Please wait before requesting another code.',
        },
        { status: 429 }
      );
    }

    console.error('[whatsapp-auth] Failed to issue verification code:', error);
    return NextResponse.json(
      {
        error: isArabic
          ? 'تعذر إرسال رمز التحقق الآن. يرجى المحاولة مرة أخرى.'
          : 'Unable to send the verification code right now. Please try again.',
      },
      { status: 500 }
    );
  }
}
