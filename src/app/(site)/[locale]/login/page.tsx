import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isLocale, type Locale } from "@/lib/locale";
import { ensureDefaultAdmin, verifyLogin } from "@/lib/authStore";
import ThemeToggle from "@/components/site/ThemeToggle";

export default async function LoginPage({
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
  const logoutSuccess = queryParams.logout === 'success';

  await ensureDefaultAdmin();

  async function handleLogin(formData: FormData) {
    "use server";
    const localeValue = formData.get("locale");
    const identifier = formData.get("identifier");
    const password = formData.get("password");

    if (
      typeof identifier !== "string" ||
      typeof password !== "string"
    ) {
      redirect(`/${localeValue ?? "en"}/login?error=invalid`);
    }

    const user = await verifyLogin(identifier.trim(), password);
    if (!user) {
      redirect(`/${localeValue ?? "en"}/login?error=invalid`);
    }

    const cookieStore = await cookies();
    cookieStore.set("noon_session", user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    const target = user.role === "ADMIN" ? "admin" : "account";
    redirect(`/${localeValue ?? "en"}/${target}`);
  }

  const t = {
    title: locale === "ar" ? "تسجيل الدخول" : "Welcome Back",
    subtitle: locale === "ar" 
      ? "قم بتسجيل الدخول للوصول إلى حسابك ولوحة التحكم"
      : "Sign in to access your account and dashboards",
    identifier: locale === "ar" ? "البريد الإلكتروني أو رقم الهاتف" : "Email or Phone",
    password: locale === "ar" ? "كلمة المرور" : "Password",
    signIn: locale === "ar" ? "تسجيل الدخول" : "Sign in",
    noAccount: locale === "ar" ? "ليس لديك حساب؟" : "Don't have an account?",
    createAccount: locale === "ar" ? "إنشاء حساب" : "Create one",
    errorMessage: locale === "ar" ? "بيانات الدخول غير صحيحة" : "Invalid email or password",
    logoutSuccess: locale === 'ar' ? 'تم تسجيل الخروج بنجاح. يمكنك تسجيل الدخول مرة أخرى.' : 'You have been logged out successfully. You can sign in again.',
    adminNote: locale === "ar" ? "ملاحظة: استخدم admin@noon.com / admin123 للتجربة" : "Note: Use admin@noon.com / admin123 for testing",
    theme: locale === "ar" ? "المظهر" : "Theme",
    themeLight: locale === "ar" ? "فاتح" : "Light",
    themeDark: locale === "ar" ? "داكن" : "Dark",
    themeSystem: locale === "ar" ? "حسب النظام" : "System",
  };

  return (
    <div className="min-h-dvh bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-6xl">
      <div className="mb-4 flex justify-end">
        <ThemeToggle
          label={t.theme}
          lightLabel={t.themeLight}
          darkLabel={t.themeDark}
          systemLabel={t.themeSystem}
        />
      </div>
        <div className="mx-auto w-full max-w-xl">
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
          {error ? (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              {t.errorMessage}
            </div>
          ) : null}

          {logoutSuccess ? (
            <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
              {t.logoutSuccess}
            </div>
          ) : null}

          {/* Admin Note */}
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
            <div className="flex items-start gap-2">
              <svg className="mt-0.5 size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{t.adminNote}</span>
            </div>
          </div>

          {/* Login Form */}
          <form action={handleLogin} className="grid gap-6">
            <input type="hidden" name="locale" value={locale} />

            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              <span className="flex items-center gap-1">
                {t.identifier}
                <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                name="identifier"
                required
                lang="en"
                dir="ltr"
                placeholder="name@example.com"
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 hover:border-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-white dark:focus:ring-white/10"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              <span className="flex items-center gap-1">
                {t.password}
                <span className="text-red-500">*</span>
              </span>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 hover:border-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-white dark:focus:ring-white/10"
              />
            </label>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-zinc-900/20 transition-all hover:bg-zinc-800 hover:shadow-xl hover:shadow-zinc-900/30 active:scale-[0.98] dark:bg-white dark:text-zinc-900 dark:shadow-white/20 dark:hover:bg-zinc-100 dark:hover:shadow-white/30"
            >
              {t.signIn}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-8 border-t border-zinc-200 pt-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            {t.noAccount}{" "}
            <Link
              href={`/${locale}/register`}
              className="font-semibold text-zinc-900 transition hover:text-zinc-700 dark:text-white dark:hover:text-zinc-300"
            >
              {t.createAccount}
            </Link>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
