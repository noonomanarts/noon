import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  createUser,
  getUserByEmail,
  getUserByPhoneNormalized,
  markUserWhatsAppVerified,
  normalizePhoneDigits,
} from '@/lib/db/users';
import type { UserRole } from '@/lib/db/types';
import { validateWhatsAppVerificationCode, type WhatsAppVerificationPurpose } from '@/lib/db/whatsappAuth';
import { isEnglishPassword } from '@/lib/passwordPolicy';

type RegisterData = {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  dateOfBirth?: string;
  preferredLanguage?: 'en' | 'ar';
  password?: string;
  acceptedTerms?: boolean;
};

type VerifyPayload = {
  purpose?: 'login' | 'register';
  verificationId?: string;
  code?: string;
  phoneNumber?: string;
  locale?: 'en' | 'ar';
  registerData?: RegisterData;
};

function getVerifyErrorMessage(reason: string, locale: 'en' | 'ar'): string {
  const map: Record<string, { en: string; ar: string }> = {
    NOT_FOUND: {
      en: 'Verification request not found. Please request a new code.',
      ar: 'لم يتم العثور على طلب التحقق. يرجى طلب رمز جديد.',
    },
    EXPIRED: {
      en: 'Verification code expired. Please request a new code.',
      ar: 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.',
    },
    ALREADY_USED: {
      en: 'This verification code has already been used.',
      ar: 'تم استخدام رمز التحقق هذا مسبقاً.',
    },
    ATTEMPTS_EXCEEDED: {
      en: 'Too many failed attempts. Please request a new code.',
      ar: 'تم تجاوز عدد المحاولات المسموح. يرجى طلب رمز جديد.',
    },
    MISMATCH: {
      en: 'Verification data mismatch.',
      ar: 'بيانات التحقق غير متطابقة.',
    },
    INVALID_CODE: {
      en: 'Incorrect verification code.',
      ar: 'رمز التحقق غير صحيح.',
    },
  };

  return map[reason]?.[locale] ?? map.INVALID_CODE[locale];
}

function toPreferredLanguage(value: 'en' | 'ar' | undefined): 'ENGLISH' | 'ARABIC' {
  return value === 'ar' ? 'ARABIC' : 'ENGLISH';
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as VerifyPayload;

    const purpose = body.purpose === 'register' ? 'REGISTER' : body.purpose === 'login' ? 'LOGIN' : null;
    const isArabic = body.locale === 'ar';
    const locale: 'en' | 'ar' = isArabic ? 'ar' : 'en';
    const verificationId = typeof body.verificationId === 'string' ? body.verificationId.trim() : '';
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const phoneNumber = typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : '';

    if (!purpose || !verificationId || !code || !phoneNumber) {
      return NextResponse.json({ error: 'Missing required verification fields.' }, { status: 400 });
    }

    const verified = await validateWhatsAppVerificationCode({
      verificationId,
      code,
      phoneNumber,
      purpose: purpose as WhatsAppVerificationPurpose,
    });

    if (!verified.ok) {
      return NextResponse.json({ error: getVerifyErrorMessage(verified.reason, locale) }, { status: 400 });
    }

    let userId = '';
    let userRole: UserRole = 'CUSTOMER';

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

      userId = user.id;
      userRole = user.role;
      await markUserWhatsAppVerified(user.id);
    }

    if (purpose === 'REGISTER') {
      const registerData = body.registerData ?? {};
      const firstName = typeof registerData.firstName === 'string' ? registerData.firstName.trim() : '';
      const middleName = typeof registerData.middleName === 'string' ? registerData.middleName.trim() : '';
      const lastName = typeof registerData.lastName === 'string' ? registerData.lastName.trim() : '';
      const email = typeof registerData.email === 'string' ? registerData.email.trim().toLowerCase() : '';
      const password = typeof registerData.password === 'string' ? registerData.password : '';
      const dateOfBirth = typeof registerData.dateOfBirth === 'string' ? registerData.dateOfBirth : '';
      const acceptedTerms = registerData.acceptedTerms === true;

      if (!firstName || !lastName || !email || !password || !dateOfBirth) {
        return NextResponse.json(
          {
            error: isArabic ? 'بيانات التسجيل غير مكتملة.' : 'Registration data is incomplete.',
          },
          { status: 400 }
        );
      }

      if (password.length < 8) {
        return NextResponse.json(
          {
            error: isArabic ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.' : 'Password must be at least 8 characters.',
          },
          { status: 400 }
        );
      }
      if (!isEnglishPassword(password)) {
        return NextResponse.json(
          {
            error:
              isArabic
                ? 'كلمة المرور يجب أن تحتوي على أحرف إنجليزية فقط (A-Z, a-z, 0-9 والرموز الإنجليزية).'
                : 'Password must contain English characters only (A-Z, a-z, 0-9, and English symbols).',
          },
          { status: 400 }
        );
      }

      if (!acceptedTerms) {
        return NextResponse.json(
          {
            error:
              isArabic
                ? 'يجب الموافقة على الشروط والأحكام لإكمال التسجيل.'
                : 'You must accept the Terms & Conditions to register.',
          },
          { status: 400 }
        );
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: isArabic ? 'البريد الإلكتروني غير صحيح.' : 'Invalid email address.' },
          { status: 400 }
        );
      }

      const existingByEmail = await getUserByEmail(email);
      if (existingByEmail) {
        return NextResponse.json(
          { error: isArabic ? 'البريد الإلكتروني مسجل بالفعل.' : 'Email is already registered.' },
          { status: 409 }
        );
      }

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

      const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();
      const normalizedPhone = `+${normalizePhoneDigits(phoneNumber)}`;

      const newUser = await createUser({
        email,
        password,
        fullName,
        phoneNumber: normalizedPhone,
        dateOfBirth,
        preferredLanguage: toPreferredLanguage(registerData.preferredLanguage),
      });

      if (!newUser) {
        return NextResponse.json(
          {
            error: isArabic ? 'تعذر إنشاء الحساب. حاول مرة أخرى.' : 'Failed to create account. Please try again.',
          },
          { status: 500 }
        );
      }

      userId = newUser.id;
      userRole = newUser.role;
      await markUserWhatsAppVerified(newUser.id);
    }

    if (!userId) {
      return NextResponse.json({ error: 'Verification failed.' }, { status: 500 });
    }

    const cookieStore = await cookies();
    cookieStore.set('noon_session', userId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });

    const redirectTo = userRole === 'ADMIN'
      ? '/admin'
      : userRole === 'SOCIAL_MEDIA_ADMIN'
        ? '/photographer'
        : '/account';

    return NextResponse.json({ success: true, redirectTo });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify WhatsApp code.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
