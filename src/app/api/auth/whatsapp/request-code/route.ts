import { NextResponse } from 'next/server';
import { getUserByEmail, getUserByPhoneNormalized } from '@/lib/db/users';
import { issueWhatsAppVerificationCode, type WhatsAppVerificationPurpose } from '@/lib/db/whatsappAuth';
import { sendWhatsAppText } from '@/lib/whatsappClient';

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

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as RequestPayload;

    const purpose = body.purpose === 'register' ? 'REGISTER' : body.purpose === 'login' ? 'LOGIN' : null;
    const isArabic = body.locale === 'ar';
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
            error:
              isArabic
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
            error:
              isArabic
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

    const codeMessage =
      isArabic
        ? `رمز التحقق الخاص بك في Noon هو: ${issued.code}\nصالح لمدة 10 دقائق. لا تشارك هذا الرمز مع أي شخص.`
        : `Your Noon verification code is: ${issued.code}\nValid for 10 minutes. Do not share this code with anyone.`;

    const sendResult = await sendWhatsAppText({
      phoneNumber,
      text: codeMessage,
    });

    if (!sendResult.ok) {
      const sessionStatus = sendResult.diagnostics?.status;
      const sessionId = sendResult.diagnostics?.sessionId;
      const details = [
        sendResult.body.slice(0, 300),
        sessionId ? `session=${sessionId}` : null,
        sessionStatus ? `status=${sessionStatus}` : null,
      ]
        .filter(Boolean)
        .join(' | ');

      return NextResponse.json(
        {
          error: `Failed to send WhatsApp code (${sendResult.status}).`,
          details,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      verificationId: issued.verificationId,
      expiresAt: issued.expiresAt.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to issue verification code.';
    const status = message.includes('Please wait before requesting another code') ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
