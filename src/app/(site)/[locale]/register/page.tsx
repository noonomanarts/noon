import Link from "next/link";
import { redirect } from "next/navigation";

import { isLocale, type Locale } from "@/lib/locale";
import { registerUser } from "@/lib/authStore";
import { cookies } from "next/headers";

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
  const success = typeof queryParams.success === "string" ? queryParams.success : "";

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
    } catch (err) {
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
    register: locale === "ar" ? "إنشاء حساب" : "Create Account",
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
    server_error: locale === "ar" ? "حدث خطأ، يرجى المحاولة مرة أخرى" : "An error occurred, please try again",
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-3xl border border-zinc-200/70 bg-white p-8 shadow-lg dark:border-zinc-800/60 dark:bg-zinc-950">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {t.title}
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {t.subtitle}
            </p>
          </div>

          {/* Error Message */}
          {error && error in errors ? (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              {errors[error as keyof typeof errors]}
            </div>
          ) : null}

          {/* Registration Form */}
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
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 hover:border-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-white dark:focus:ring-white/10"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <span>{t.middleName}</span>
                <input
                  type="text"
                  name="middleName"
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 hover:border-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-white dark:focus:ring-white/10"
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
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 hover:border-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-white dark:focus:ring-white/10"
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
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 hover:border-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-white dark:focus:ring-white/10"
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
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 hover:border-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-white dark:focus:ring-white/10"
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
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 hover:border-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-white dark:focus:ring-white/10"
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
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm transition-all hover:border-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600 dark:focus:border-white dark:focus:ring-white/10"
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
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 hover:border-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-white dark:focus:ring-white/10"
                />
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{t.passwordHint}</span>
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
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 hover:border-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-white dark:focus:ring-white/10"
                />
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-zinc-900/20 transition-all hover:bg-zinc-800 hover:shadow-xl hover:shadow-zinc-900/30 active:scale-[0.98] dark:bg-white dark:text-zinc-900 dark:shadow-white/20 dark:hover:bg-zinc-100 dark:hover:shadow-white/30"
            >
              {t.register}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-8 border-t border-zinc-200 pt-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            {t.haveAccount}{" "}
            <Link
              href={`/${locale}/login`}
              className="font-semibold text-zinc-900 transition hover:text-zinc-700 dark:text-white dark:hover:text-zinc-300"
            >
              {t.login}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
