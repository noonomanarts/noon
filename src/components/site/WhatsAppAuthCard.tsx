'use client';

import Link from 'next/link';
import { useCallback, useMemo, useRef, useState } from 'react';
import PasswordInput from '@/components/site/PasswordInput';
import CountryCodeSelect from '@/components/site/CountryCodeSelect';
import type { Gender } from '@/lib/db/types';
import { isEnglishPassword } from '@/lib/passwordPolicy';

type Locale = 'en' | 'ar';

type RegisterForm = {
  fullName: string;
  email: string;
  dateOfBirth: string;
  gender: Gender | '';
  preferredLanguage: 'en' | 'ar';
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
};

type Purpose = 'login' | 'register';

const fld = "w-full border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-[color:var(--text)] placeholder-zinc-400 transition focus:border-zinc-400 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/60 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:bg-zinc-800";
const lbl = "block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={lbl}>{label}</p>
      {children}
    </div>
  );
}

export default function WhatsAppAuthCard({
  locale,
  purpose,
  nextPath = '',
}: {
  locale: Locale;
  purpose: Purpose;
  nextPath?: string;
}) {
  const isArabic = locale === 'ar';
  const phoneRef = useRef('');
  const [verificationId, setVerificationId] = useState('');
  const [code, setCode] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [registerForm, setRegisterForm] = useState<RegisterForm>({
    fullName: '',
    email: '',
    dateOfBirth: '',
    gender: '',
    preferredLanguage: locale,
    password: '',
    confirmPassword: '',
    acceptedTerms: false,
  });

  // Update phoneRef when CountryCodeSelect changes
  const handlePhoneChange = useCallback((fullPhone: string) => {
    phoneRef.current = fullPhone;
  }, []);

  const t = useMemo(
    () => ({
      title:
        purpose === 'login'
          ? isArabic
            ? 'تسجيل الدخول عبر واتساب'
            : 'Login with WhatsApp'
          : isArabic
            ? 'إنشاء حساب عبر واتساب'
            : 'Register with WhatsApp',
      subtitle:
        purpose === 'login'
          ? isArabic
            ? 'أدخل رقم الهاتف وسنرسل لك رمز تحقق عبر واتساب.'
            : 'Enter your phone and we will send a verification code via WhatsApp.'
          : isArabic
            ? 'أكمل بياناتك ثم استلم رمز التحقق على واتساب لإتمام إنشاء الحساب.'
            : 'Complete your details and receive a WhatsApp verification code to finish registration.',
      phone: isArabic ? 'رقم الهاتف' : 'Phone Number',
      code: isArabic ? 'رمز التحقق' : 'Verification Code',
      requestCode: isArabic ? 'إرسال رمز التحقق' : 'Send Verification Code',
      resendCode: isArabic ? 'إعادة إرسال الكود' : 'Resend Code',
      verifyAndContinue: isArabic ? 'تحقق ومتابعة' : 'Verify & Continue',
      sending: isArabic ? 'جارٍ الإرسال...' : 'Sending...',
      verifying: isArabic ? 'جارٍ التحقق...' : 'Verifying...',
      codeSent: isArabic
        ? 'تم إرسال الكود عبر واتساب. أدخل الرمز خلال 10 دقائق.'
        : 'Code sent via WhatsApp. Enter it within 10 minutes.',
      fullName: isArabic ? 'الاسم الكامل' : 'Full name',
      email: isArabic ? 'البريد الإلكتروني' : 'Email address',
      dateOfBirth: isArabic ? 'تاريخ الميلاد' : 'Date of Birth',
      gender: isArabic ? 'الجنس' : 'Gender',
      preferredLanguage: isArabic ? 'اللغة المفضلة' : 'Preferred Language',
      password: isArabic ? 'كلمة المرور' : 'Password',
      confirmPassword: isArabic ? 'تأكيد كلمة المرور' : 'Confirm Password',
      male: isArabic ? 'ذكر' : 'Male',
      female: isArabic ? 'أنثى' : 'Female',
      english: isArabic ? 'الإنجليزية' : 'English',
      arabic: isArabic ? 'العربية' : 'Arabic',
      needPhone: isArabic ? 'يرجى إدخال رقم الهاتف.' : 'Please enter a phone number.',
      needCode: isArabic ? 'يرجى إدخال رمز التحقق.' : 'Please enter verification code.',
      needCodeFirst: isArabic ? 'اطلب رمز التحقق أولاً.' : 'Please request a verification code first.',
      passMismatch: isArabic ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.',
      passWeak: isArabic ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.' : 'Password must be at least 8 characters.',
      passEnglishOnly: isArabic
        ? 'كلمة المرور يجب أن تحتوي على أحرف إنجليزية فقط (A-Z, a-z, 0-9 والرموز الإنجليزية).'
        : 'Password must contain English characters only (A-Z, a-z, 0-9, and English symbols).',
      passRuleHint: isArabic
        ? 'استخدم لوحة مفاتيح إنجليزية فقط. لن يتم قبول أحرف عربية في كلمة المرور.'
        : 'Use English keyboard only. Arabic characters are not accepted in password.',
      genderRequired: isArabic ? 'يرجى تحديد الجنس.' : 'Please select a gender.',
      missingRegisterFields: isArabic ? 'يرجى إكمال بيانات التسجيل المطلوبة.' : 'Please complete required registration fields.',
      invalidEmail: isArabic ? 'البريد الإلكتروني غير صحيح.' : 'Invalid email address.',
      termsRequired: isArabic ? 'يجب الموافقة على الشروط والأحكام لإكمال التسجيل.' : 'You must accept the Terms & Conditions to register.',
      acceptTermsPrefix: isArabic ? 'لقد قرأت' : 'I have read and accept the',
      acceptTermsLink: isArabic ? 'الشروط والأحكام' : 'Terms & Conditions',
      acceptTermsSuffix: isArabic ? 'وأوافق عليها.' : '',
    }),
    [isArabic, purpose]
  );

  const requestCode = async () => {
    setError(null);
    setInfo(null);

    // Phone format from CountryCodeSelect: "+968 12345678"
    const phone = phoneRef.current.trim();
    // Check if there are digits after the dial code
    const hasNumber = phone.replace(/^\+\d+\s*/, '').trim().length > 0;
    if (!hasNumber) {
      setError(t.needPhone);
      return;
    }

    if (purpose === 'register') {
      const { fullName, email, dateOfBirth, gender, password, confirmPassword, acceptedTerms } = registerForm;
      if (!fullName.trim() || !email.trim() || !dateOfBirth || !password) {
        setError(t.missingRegisterFields);
        return;
      }
      if (!gender) {
        setError(t.genderRequired);
        return;
      }
      if (password.length < 8) {
        setError(t.passWeak);
        return;
      }
      if (!isEnglishPassword(password)) {
        setError(t.passEnglishOnly);
        return;
      }
      if (password !== confirmPassword) {
        setError(t.passMismatch);
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setError(t.invalidEmail);
        return;
      }
      if (!acceptedTerms) {
        setError(t.termsRequired);
        return;
      }
    }

    setRequesting(true);

    // Remove spaces from phone for API
    const fullPhoneNumber = phoneRef.current.replace(/\s+/g, '');

    try {
      const response = await fetch('/api/auth/whatsapp/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose,
          phoneNumber: fullPhoneNumber,
          locale,
          email: purpose === 'register' ? registerForm.email.trim() : undefined,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        verificationId?: string;
        error?: string;
        details?: string;
      };

      if (!response.ok || !payload.verificationId) {
        throw new Error(
          [payload.error, payload.details].filter(Boolean).join(' ') || 'Failed to send verification code.'
        );
      }

      setVerificationId(payload.verificationId);
      setInfo(t.codeSent);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to send verification code.');
    } finally {
      setRequesting(false);
    }
  };

  const verifyCode = async () => {
    setError(null);
    setInfo(null);

    if (!verificationId) {
      setError(t.needCodeFirst);
      return;
    }
    if (!code.trim()) {
      setError(t.needCode);
      return;
    }

    setVerifying(true);

    // Remove spaces from phone for API
    const fullPhoneNumber = phoneRef.current.replace(/\s+/g, '');

    try {
      const response = await fetch('/api/auth/whatsapp/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose,
          verificationId,
          code: code.trim(),
          phoneNumber: fullPhoneNumber,
          locale,
          registerData:
            purpose === 'register'
              ? {
                  fullName: registerForm.fullName,
                  email: registerForm.email,
                  dateOfBirth: registerForm.dateOfBirth,
                  gender: registerForm.gender,
                  preferredLanguage: registerForm.preferredLanguage,
                  password: registerForm.password,
                  acceptedTerms: registerForm.acceptedTerms,
                }
              : undefined,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        redirectTo?: string;
        error?: string;
      };

      if (!response.ok || !payload.success || !payload.redirectTo) {
        throw new Error(payload.error || 'Verification failed.');
      }

      const destination =
        nextPath && payload.redirectTo === '/account'
          ? nextPath
          : `/${locale}${payload.redirectTo}`;

      window.location.href = destination;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <section className="p-5 dark:bg-zinc-900/40">
      <h3 className="text-base font-semibold text-[color:var(--text)] dark:text-zinc-100">{t.title}</h3>
      <p className="mt-1 text-sm text-[color:var(--text-muted)] dark:text-zinc-400">{t.subtitle}</p>

      {error ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {info ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          {info}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {purpose === 'register' ? (
          <>
            {/* Full name */}
            <Field label={t.fullName}>
              <input
                value={registerForm.fullName}
                onChange={(e) => setRegisterForm((p) => ({ ...p, fullName: e.target.value }))}
                placeholder={t.fullName}
                autoComplete="name"
                className={fld}
              />
            </Field>

            {/* Email */}
            <Field label={t.email}>
              <input
                type="email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))}
                placeholder={t.email}
                lang="en"
                dir="ltr"
                className={fld}
              />
            </Field>

            {/* Date of Birth */}
            <Field label={t.dateOfBirth}>
              <input
                type="date"
                value={registerForm.dateOfBirth}
                onChange={(e) => setRegisterForm((p) => ({ ...p, dateOfBirth: e.target.value }))}
                max={new Date().toISOString().split('T')[0]}
                className={fld}
              />
            </Field>

            {/* Gender */}
            <Field label={t.gender}>
              <select
                value={registerForm.gender}
                onChange={(e) => setRegisterForm((p) => ({ ...p, gender: e.target.value as Gender | '' }))}
                className={fld}
              >
                <option value="">{t.gender}</option>
                <option value="MALE">{t.male}</option>
                <option value="FEMALE">{t.female}</option>
              </select>
            </Field>

            {/* Preferred Language */}
            <Field label={t.preferredLanguage}>
              <select
                value={registerForm.preferredLanguage}
                onChange={(e) => setRegisterForm((p) => ({ ...p, preferredLanguage: e.target.value as 'en' | 'ar' }))}
                className={fld}
              >
                <option value="en">{t.english}</option>
                <option value="ar">{t.arabic}</option>
              </select>
            </Field>

            {/* Password */}
            <Field label={t.password}>
              <PasswordInput
                locale={locale}
                value={registerForm.password}
                onValueChange={(v) => setRegisterForm((p) => ({ ...p, password: v }))}
                placeholder={t.password}
                autoComplete="new-password"
                restrictEnglish
                inputClassName={fld}
              />
            </Field>

            {/* Confirm Password */}
            <Field label={t.confirmPassword}>
              <PasswordInput
                locale={locale}
                value={registerForm.confirmPassword}
                onValueChange={(v) => setRegisterForm((p) => ({ ...p, confirmPassword: v }))}
                placeholder={t.confirmPassword}
                autoComplete="new-password"
                restrictEnglish
                inputClassName={fld}
              />
            </Field>

            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{t.passRuleHint}</p>

            {/* Terms */}
            <label className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={registerForm.acceptedTerms}
                onChange={(e) => setRegisterForm((p) => ({ ...p, acceptedTerms: e.target.checked }))}
                className="mt-0.5 h-4 w-4 flex-shrink-0 border-zinc-300 dark:border-zinc-600"
              />
              <span>
                {t.acceptTermsPrefix}{' '}
                <Link href={`/${locale}/terms`} className="font-semibold underline underline-offset-2">
                  {t.acceptTermsLink}
                </Link>
                {t.acceptTermsSuffix ? ` ${t.acceptTermsSuffix}` : ''}
              </span>
            </label>
          </>
        ) : null}

        {/* Phone */}
        <Field label={t.phone}>
          <CountryCodeSelect
            locale={locale}
            onChange={handlePhoneChange}
            inputClassName={fld}
          />
        </Field>

        {/* Send code + code input */}
        <button
          type="button"
          onClick={() => void requestCode()}
          disabled={requesting}
          className="w-full bg-[color:var(--noon-teal)] py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {requesting ? t.sending : verificationId ? t.resendCode : t.requestCode}
        </button>

        <Field label={t.code}>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder={t.code}
            lang="en"
            dir="ltr"
            className={fld}
          />
        </Field>

        <button
          type="button"
          onClick={() => void verifyCode()}
          disabled={verifying}
          className="w-full bg-zinc-900 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          {verifying ? t.verifying : t.verifyAndContinue}
        </button>
      </div>
    </section>
  );
}
