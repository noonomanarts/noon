import Link from "next/link";
import { redirect } from "next/navigation";

import { isLocale, type Locale } from "@/lib/locale";
import { registerUser } from "@/lib/authStore";
import { cookies } from "next/headers";
import WhatsAppAuthCard from "@/components/site/WhatsAppAuthCard";
import PasswordInput from "@/components/site/PasswordInput";
import CountryCodeSelect from "@/components/site/CountryCodeSelect";
import { isEnglishPassword } from "@/lib/passwordPolicy";
import { getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/sessionCookie";

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const queryParams = (await searchParams) ?? {};
  const error = typeof queryParams.error === "string" ? queryParams.error : "";
  const methodRaw = typeof queryParams.method === "string" ? queryParams.method : "";
  const authMethod = methodRaw === "whatsapp" ? "whatsapp" : "password";
  const nextPathRaw = typeof queryParams.next === "string" ? queryParams.next : "";
  const isValidNextPath =
    nextPathRaw.startsWith(`/${locale}/`) &&
    !nextPathRaw.startsWith("//") &&
    !nextPathRaw.includes("://");
  const nextPath = isValidNextPath ? nextPathRaw : "";

  async function handleRegister(formData: FormData) {
    "use server";

    const localeValue = formData.get("locale") as string;
    const fullName = (formData.get("fullName") as string)?.trim();
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const dateOfBirth = formData.get("dateOfBirth") as string;
    const preferredLanguage = formData.get("preferredLanguage") as "en" | "ar";
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const acceptedTerms = formData.get("acceptedTerms") === "on";
    const nextValue = formData.get("nextPath");
    const safeLocale = typeof localeValue === "string" ? localeValue : "en";
    const nextTarget =
      typeof nextValue === "string" &&
      nextValue.startsWith(`/${safeLocale}/`) &&
      !nextValue.startsWith("//") &&
      !nextValue.includes("://")
        ? nextValue
        : "";

    if (!fullName || !email || !phone || !dateOfBirth || !password) {
      redirect(`/${safeLocale}/register?error=missing_fields`);
    }
    if (password !== confirmPassword) {
      redirect(`/${safeLocale}/register?error=password_mismatch`);
    }
    if (password.length < 8) {
      redirect(`/${safeLocale}/register?error=password_weak`);
    }
    if (!isEnglishPassword(password)) {
      redirect(`/${safeLocale}/register?error=password_english_only`);
    }
    if (!acceptedTerms) {
      redirect(`/${safeLocale}/register?error=terms_required`);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      redirect(`/${safeLocale}/register?error=invalid_email`);
    }
    const phoneRegex = /^[\d\s+()-]+$/;
    if (!phoneRegex.test(phone)) {
      redirect(`/${safeLocale}/register?error=invalid_phone`);
    }

    let user;
    try {
      user = await registerUser({
        email: email.trim(),
        password,
        fullName,
        phoneNumber: phone.trim(),
        dateOfBirth,
        preferredLanguage: preferredLanguage === "ar" ? "ARABIC" : "ENGLISH",
      });
    } catch {
      redirect(`/${safeLocale}/register?error=server_error`);
    }

    if (!user) {
      redirect(`/${safeLocale}/register?error=email_exists`);
    }

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, user.id, getSessionCookieOptions());

    if (nextTarget) {
      redirect(nextTarget);
    }

    redirect(`/${safeLocale}/account`);
  }

  const isAr = locale === "ar";

  const t = {
    title:       isAr ? "إنشاء حساب" : "Create account",
    subtitle:    isAr ? "انضم إلى عائلة نون" : "Join the Noon family",
    fullName:    isAr ? "الاسم الكامل" : "Full name",
    email:       isAr ? "البريد الإلكتروني" : "Email address",
    phone:       isAr ? "رقم الهاتف" : "Phone number",
    dob:         isAr ? "تاريخ الميلاد" : "Date of birth",
    lang:        isAr ? "اللغة المفضلة" : "Preferred language",
    english:     isAr ? "الإنجليزية" : "English",
    arabic:      isAr ? "العربية" : "Arabic",
    password:    isAr ? "كلمة المرور" : "Password",
    confirm:     isAr ? "تأكيد كلمة المرور" : "Confirm password",
    passHint:    isAr ? "8 أحرف على الأقل بالإنجليزية فقط." : "At least 8 English characters.",
    terms:       isAr ? "أوافق على" : "I agree to the",
    termsLink:   isAr ? "الشروط والأحكام" : "Terms & Conditions",
    register:    isAr ? "إنشاء الحساب" : "Create account",
    tabPassword: isAr ? "بكلمة المرور" : "Password",
    tabWhatsApp: isAr ? "عبر واتساب" : "WhatsApp",
    haveAccount: isAr ? "لديك حساب؟" : "Already have an account?",
    login:       isAr ? "تسجيل الدخول" : "Sign in",
  };

  const errors: Record<string, string> = {
    missing_fields:       isAr ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill in all required fields",
    password_mismatch:    isAr ? "كلمات المرور غير متطابقة" : "Passwords do not match",
    password_weak:        isAr ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل" : "Password must be at least 8 characters",
    password_english_only: isAr ? "كلمة المرور يجب أن تكون بالإنجليزية فقط" : "Password must use English characters only",
    invalid_email:        isAr ? "البريد الإلكتروني غير صحيح" : "Invalid email address",
    invalid_phone:        isAr ? "رقم الهاتف غير صحيح" : "Invalid phone number",
    email_exists:         isAr ? "البريد الإلكتروني مسجل مسبقاً" : "Email already registered",
    terms_required:       isAr ? "يجب الموافقة على الشروط والأحكام" : "You must accept the Terms & Conditions",
    server_error:         isAr ? "حدث خطأ، يرجى المحاولة مرة أخرى" : "An error occurred, please try again",
  };

  const dir = isAr ? "rtl" : "ltr";
  const fieldCls = "w-full border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-[color:var(--text)] placeholder-zinc-400 transition focus:border-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-800/60 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:bg-zinc-800";
  const labelCls = "block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1";

  const passwordTabHref = nextPath
    ? `/${locale}/register?method=password&next=${encodeURIComponent(nextPath)}`
    : `/${locale}/register?method=password`;
  const whatsappTabHref = nextPath
    ? `/${locale}/register?method=whatsapp&next=${encodeURIComponent(nextPath)}`
    : `/${locale}/register?method=whatsapp`;

  return (
    <div className="home-sharp min-h-dvh bg-zinc-50 px-4 py-10 dark:bg-zinc-950" dir={dir}>
      <div className="mx-auto w-full max-w-md">

        {/* Logo/brand area */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--text)]">{t.title}</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
        </div>

        {/* Tab switcher */}
        <div className="mb-5 flex border border-zinc-200 dark:border-zinc-700">
          <Link
            href={passwordTabHref}
            className={`flex-1 py-2.5 text-center text-sm font-semibold transition ${
              authMethod === "password"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "bg-white text-zinc-500 hover:text-zinc-900 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            {t.tabPassword}
          </Link>
          <Link
            href={whatsappTabHref}
            className={`flex-1 border-s border-zinc-200 py-2.5 text-center text-sm font-semibold transition dark:border-zinc-700 ${
              authMethod === "whatsapp"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "bg-white text-zinc-500 hover:text-zinc-900 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            {t.tabWhatsApp}
          </Link>
        </div>

        {/* Error */}
        {authMethod === "password" && error && error in errors && (
          <div className="mb-4 border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300">
            {errors[error]}
          </div>
        )}

        {authMethod === "password" ? (
          <form action={handleRegister} className="space-y-4 bg-white p-6 shadow-sm dark:bg-zinc-900">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="nextPath" value={nextPath} />

            {/* Full Name */}
            <div>
              <label className={labelCls}>{t.fullName} <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="fullName"
                required
                autoComplete="name"
                placeholder={isAr ? "الاسم الكامل" : "Your full name"}
                className={fieldCls}
              />
            </div>

            {/* Email */}
            <div>
              <label className={labelCls}>{t.email} <span className="text-red-500">*</span></label>
              <input
                type="email"
                name="email"
                required
                lang="en"
                dir="ltr"
                autoComplete="email"
                placeholder="name@example.com"
                className={fieldCls}
              />
            </div>

            {/* Phone */}
            <div>
              <label className={labelCls}>{t.phone} <span className="text-red-500">*</span></label>
              <CountryCodeSelect
                locale={locale}
                name="phone"
                required
                inputClassName={fieldCls}
              />
            </div>

            {/* DOB */}
            <div>
              <label className={labelCls}>{t.dob} <span className="text-red-500">*</span></label>
              <input
                type="date"
                name="dateOfBirth"
                required
                max={new Date().toISOString().split("T")[0]}
                className={fieldCls}
              />
            </div>

            {/* Language */}
            <div>
              <label className={labelCls}>{t.lang}</label>
              <select name="preferredLanguage" defaultValue={locale} className={fieldCls}>
                <option value="en">{t.english}</option>
                <option value="ar">{t.arabic}</option>
              </select>
            </div>

            {/* Password */}
            <div>
              <label className={labelCls}>{t.password} <span className="text-red-500">*</span></label>
              <PasswordInput
                locale={locale}
                name="password"
                required
                minLength={8}
                autoComplete="new-password"
                restrictEnglish
                inputClassName={fieldCls}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className={labelCls}>{t.confirm} <span className="text-red-500">*</span></label>
              <PasswordInput
                locale={locale}
                name="confirmPassword"
                required
                minLength={8}
                autoComplete="new-password"
                restrictEnglish
                inputClassName={fieldCls}
              />
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{t.passHint}</p>

            {/* Terms */}
            <label className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-300">
              <input
                type="checkbox"
                name="acceptedTerms"
                required
                className="mt-0.5 h-4 w-4 flex-shrink-0 border-zinc-300 dark:border-zinc-600"
              />
              <span>
                {t.terms}{" "}
                <Link href={`/${locale}/terms`} className="font-semibold text-[color:var(--text)] underline underline-offset-2">
                  {t.termsLink}
                </Link>
              </span>
            </label>

            <button
              type="submit"
              className="mt-1 w-full bg-zinc-900 py-3 text-sm font-bold text-white transition hover:bg-zinc-800 active:scale-[0.98] dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              {t.register}
            </button>
          </form>
        ) : (
          <div className="bg-white shadow-sm dark:bg-zinc-900">
            <WhatsAppAuthCard locale={locale} purpose="register" nextPath={nextPath} />
          </div>
        )}

        <p className="mt-5 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {t.haveAccount}{" "}
          <Link href={`/${locale}/login`} className="font-semibold text-[color:var(--text)] hover:underline">
            {t.login}
          </Link>
        </p>
      </div>
    </div>
  );
}
