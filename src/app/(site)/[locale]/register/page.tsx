import Link from "next/link";
import { redirect } from "next/navigation";

import { isLocale, type Locale } from "@/lib/locale";
import { registerUser } from "@/lib/authStore";
import { cookies } from "next/headers";
import WhatsAppAuthCard from "@/components/site/WhatsAppAuthCard";

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

  async function handleRegister(formData: FormData) {
    "use server";
    
    const localeValue = formData.get("locale") as string;
    const firstName = formData.get("firstName") as string;
    const middleName = formData.get("middleName") as string;
    const lastName = formData.get("lastName") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const dateOfBirth = formData.get("dateOfBirth") as string;
    const preferredLanguage = formData.get("preferredLanguage") as "en" | "ar";
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const acceptedTerms = formData.get("acceptedTerms") === "on";

    // Validation
    if (!firstName || !lastName || !email || !phone || !dateOfBirth || !password) {
      redirect(`/${localeValue ?? "en"}/register?error=missing_fields`);
    }

    if (password !== confirmPassword) {
      redirect(`/${localeValue ?? "en"}/register?error=password_mismatch`);
    }

    if (password.length < 8) {
      redirect(`/${localeValue ?? "en"}/register?error=password_weak`);
    }

    if (!acceptedTerms) {
      redirect(`/${localeValue ?? "en"}/register?error=terms_required`);
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      redirect(`/${localeValue ?? "en"}/register?error=invalid_email`);
    }

    // Phone validation (basic)
    const phoneRegex = /^[\d\s+()-]+$/;
    if (!phoneRegex.test(phone)) {
      redirect(`/${localeValue ?? "en"}/register?error=invalid_phone`);
    }

    try {
      const fullName = [firstName, middleName, lastName]
        .filter(Boolean)
        .map((part) => part.trim())
        .join(" ");
      
      const user = await registerUser({
        email: email.trim(),
        password,
        fullName,
        phoneNumber: phone.trim(),
        dateOfBirth,
        preferredLanguage: preferredLanguage === "ar" ? "ARABIC" : "ENGLISH",
      });

      if (!user) {
        redirect(`/${localeValue ?? "en"}/register?error=email_exists`);
      }

      // Auto-login after successful registration
      const cookieStore = await cookies();
      cookieStore.set("noon_session", user.id, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });

      redirect(`/${localeValue ?? "en"}/account`);
    } catch {
      redirect(`/${localeValue ?? "en"}/register?error=server_error`);
    }
  }

  const t = {
    title: locale === "ar" ? "إنشاء حساب جديد" : "Create New Account",
    subtitle: locale === "ar" 
      ? "انضم إلى عائلة نون واستمتع بتجربة فريدة في الطهي والفنون"
      : "Join the Noon family and enjoy unique cooking and arts experiences",
    firstName: locale === "ar" ? "الاسم الأول" : "First Name",
    middleName: locale === "ar" ? "الاسم الأوسط (اختياري)" : "Middle Name (optional)",
    lastName: locale === "ar" ? "الاسم الأخير" : "Last Name",
    email: locale === "ar" ? "البريد الإلكتروني" : "Email Address",
    phone: locale === "ar" ? "رقم الهاتف" : "Phone Number",
    dateOfBirth: locale === "ar" ? "تاريخ الميلاد" : "Date of Birth",
    preferredLanguage: locale === "ar" ? "اللغة المفضلة" : "Preferred Language",
    english: locale === "ar" ? "الإنجليزية" : "English",
    arabic: locale === "ar" ? "العربية" : "Arabic",
    password: locale === "ar" ? "كلمة المرور" : "Password",
    confirmPassword: locale === "ar" ? "تأكيد كلمة المرور" : "Confirm Password",
    passwordHint: locale === "ar" ? "يجب أن تكون 8 أحرف على الأقل" : "Must be at least 8 characters",
    acceptTermsPrefix: locale === "ar" ? "لقد قرأت" : "I have read and accept the",
    acceptTermsLink: locale === "ar" ? "الشروط والأحكام" : "Terms & Conditions",
    acceptTermsSuffix: locale === "ar" ? "وأوافق عليها" : "",
    register: locale === "ar" ? "إنشاء حساب" : "Create Account",
    tabPassword: locale === "ar" ? "العضوية بكلمة المرور" : "Password Signup",
    tabWhatsApp: locale === "ar" ? "العضوية عبر واتساب" : "WhatsApp Signup",
    haveAccount: locale === "ar" ? "لديك حساب بالفعل؟" : "Already have an account?",
    login: locale === "ar" ? "تسجيل الدخول" : "Sign in",
  };

  const errors = {
    missing_fields: locale === "ar" ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill in all required fields",
    password_mismatch: locale === "ar" ? "كلمات المرور غير متطابقة" : "Passwords do not match",
    password_weak: locale === "ar" ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل" : "Password must be at least 8 characters",
    invalid_email: locale === "ar" ? "البريد الإلكتروني غير صحيح" : "Invalid email address",
    invalid_phone: locale === "ar" ? "رقم الهاتف غير صحيح" : "Invalid phone number",
    email_exists: locale === "ar" ? "البريد الإلكتروني مسجل بالفعل" : "Email already registered",
    terms_required: locale === "ar" ? "يجب الموافقة على الشروط والأحكام لإكمال التسجيل" : "You must accept the Terms & Conditions to register",
    server_error: locale === "ar" ? "حدث خطأ، يرجى المحاولة مرة أخرى" : "An error occurred, please try again",
  };

  const passwordTabHref = `/${locale}/register?method=password`;
  const whatsappTabHref = `/${locale}/register?method=whatsapp`;

  return (
    <div className="home-sharp mx-auto w-full max-w-6xl px-4 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-3xl border border-[color:var(--border)]/70 bg-[color:var(--surface)] p-8 shadow-lg dark:border-zinc-800/60 dark:bg-zinc-950">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--text)] dark:text-zinc-100">
              {t.title}
            </h1>
            <p className="mt-2 text-sm text-[color:var(--text-subtle)] dark:text-zinc-400">
              {t.subtitle}
            </p>
          </div>

          <div className="mb-6 grid grid-cols-2 border border-zinc-300 dark:border-zinc-700">
            <Link
              href={passwordTabHref}
              className={`px-3 py-2 text-center text-sm font-semibold transition ${
                authMethod === "password"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {t.tabPassword}
            </Link>
            <Link
              href={whatsappTabHref}
              className={`border-s border-zinc-300 px-3 py-2 text-center text-sm font-semibold transition dark:border-zinc-700 ${
                authMethod === "whatsapp"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {t.tabWhatsApp}
            </Link>
          </div>

          {/* Error Message */}
          {authMethod === "password" && error && error in errors ? (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              {errors[error as keyof typeof errors]}
            </div>
          ) : null}

          {authMethod === "password" ? (
            <form action={handleRegister} className="grid gap-6">
            <input type="hidden" name="locale" value={locale} />

            {/* Name Fields */}
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <span className="flex items-center gap-1">
                  {t.firstName}
                  <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  name="firstName"
                  required
                  className="w-full rounded-xl border border-zinc-300 bg-[color:var(--surface)] px-4 py-2.5 text-sm text-[color:var(--text)] shadow-sm transition-all placeholder:text-zinc-400 hover:border-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-[color:var(--text-subtle)] dark:hover:border-zinc-600 dark:focus:border-white dark:focus:ring-white/10"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <span>{t.middleName}</span>
                <input
                  type="text"
                  name="middleName"
                  className="w-full rounded-xl border border-zinc-300 bg-[color:var(--surface)] px-4 py-2.5 text-sm text-[color:var(--text)] shadow-sm transition-all placeholder:text-zinc-400 hover:border-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-[color:var(--text-subtle)] dark:hover:border-zinc-600 dark:focus:border-white dark:focus:ring-white/10"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <span className="flex items-center gap-1">
                  {t.lastName}
                  <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  name="lastName"
                  required
                  className="w-full rounded-xl border border-zinc-300 bg-[color:var(--surface)] px-4 py-2.5 text-sm text-[color:var(--text)] shadow-sm transition-all placeholder:text-zinc-400 hover:border-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-[color:var(--text-subtle)] dark:hover:border-zinc-600 dark:focus:border-white dark:focus:ring-white/10"
                />
              </label>
            </div>

            {/* Contact Fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <span className="flex items-center gap-1">
                  {t.email}
                  <span className="text-red-500">*</span>
                </span>
                <input
                  type="email"
                  name="email"
                  required
                  lang="en"
                  dir="ltr"
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-zinc-300 bg-[color:var(--surface)] px-4 py-2.5 text-sm text-[color:var(--text)] shadow-sm transition-all placeholder:text-zinc-400 hover:border-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-[color:var(--text-subtle)] dark:hover:border-zinc-600 dark:focus:border-white dark:focus:ring-white/10"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <span className="flex items-center gap-1">
                  {t.phone}
                  <span className="text-red-500">*</span>
                </span>
                <input
                  type="tel"
                  name="phone"
                  required
                  lang="en"
                  dir="ltr"
                  placeholder="+966 50 000 0000"
                  className="w-full rounded-xl border border-zinc-300 bg-[color:var(--surface)] px-4 py-2.5 text-sm text-[color:var(--text)] shadow-sm transition-all placeholder:text-zinc-400 hover:border-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-[color:var(--text-subtle)] dark:hover:border-zinc-600 dark:focus:border-white dark:focus:ring-white/10"
                />
              </label>
            </div>

            {/* Date of Birth & Language */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <span className="flex items-center gap-1">
                  {t.dateOfBirth}
                  <span className="text-red-500">*</span>
                </span>
                <input
                  type="date"
                  name="dateOfBirth"
                  required
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-xl border border-zinc-300 bg-[color:var(--surface)] px-4 py-2.5 text-sm text-[color:var(--text)] shadow-sm transition-all placeholder:text-zinc-400 hover:border-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-[color:var(--text-subtle)] dark:hover:border-zinc-600 dark:focus:border-white dark:focus:ring-white/10"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <span className="flex items-center gap-1">
                  {t.preferredLanguage}
                  <span className="text-red-500">*</span>
                </span>
                <select
                  name="preferredLanguage"
                  required
                  defaultValue={locale}
                  className="w-full rounded-xl border border-zinc-300 bg-[color:var(--surface)] px-4 py-2.5 text-sm text-[color:var(--text)] shadow-sm transition-all hover:border-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600 dark:focus:border-white dark:focus:ring-white/10"
                >
                  <option value="en">{t.english}</option>
                  <option value="ar">{t.arabic}</option>
                </select>
              </label>
            </div>

            {/* Password Fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <span className="flex items-center gap-1">
                  {t.password}
                  <span className="text-red-500">*</span>
                </span>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-zinc-300 bg-[color:var(--surface)] px-4 py-2.5 text-sm text-[color:var(--text)] shadow-sm transition-all placeholder:text-zinc-400 hover:border-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-[color:var(--text-subtle)] dark:hover:border-zinc-600 dark:focus:border-white dark:focus:ring-white/10"
                />
                <span className="text-xs text-[color:var(--text-subtle)] dark:text-zinc-400">{t.passwordHint}</span>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <span className="flex items-center gap-1">
                  {t.confirmPassword}
                  <span className="text-red-500">*</span>
                </span>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-zinc-300 bg-[color:var(--surface)] px-4 py-2.5 text-sm text-[color:var(--text)] shadow-sm transition-all placeholder:text-zinc-400 hover:border-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-[color:var(--text-subtle)] dark:hover:border-zinc-600 dark:focus:border-white dark:focus:ring-white/10"
                />
              </label>
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)]/35 px-4 py-3 text-sm text-[color:var(--text)] dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200">
              <input
                type="checkbox"
                name="acceptedTerms"
                required
                className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:focus:ring-white"
              />
              <span className="leading-6">
                {t.acceptTermsPrefix}{" "}
                <Link href={`/${locale}/terms`} className="font-semibold underline underline-offset-4">
                  {t.acceptTermsLink}
                </Link>
                {t.acceptTermsSuffix ? ` ${t.acceptTermsSuffix}` : ""}
              </span>
            </label>

            {/* Submit Button */}
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-zinc-900/20 transition-all hover:bg-zinc-800 hover:shadow-xl hover:shadow-zinc-900/30 active:scale-[0.98] dark:bg-[color:var(--surface)] dark:text-[color:var(--text)] dark:shadow-white/20 dark:hover:bg-[color:var(--muted)] dark:hover:shadow-white/30"
            >
              {t.register}
            </button>
            </form>
          ) : (
            <WhatsAppAuthCard locale={locale} purpose="register" />
          )}

          {/* Login Link */}
          <div className="mt-8 border-t border-[color:var(--border)] pt-6 text-center text-sm text-[color:var(--text-subtle)] dark:border-zinc-800 dark:text-zinc-400">
            {t.haveAccount}{" "}
            <Link
              href={`/${locale}/login`}
              className="font-semibold text-[color:var(--text)] transition hover:text-zinc-700 dark:text-white dark:hover:text-zinc-300"
            >
              {t.login}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
