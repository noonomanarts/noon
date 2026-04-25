import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isLocale, type Locale } from "@/lib/locale";
import { ensureDefaultAdmin, verifyLogin } from "@/lib/authStore";
import { sendUserWhatsAppTemplate } from "@/lib/whatsapp/transactionNotifications";
import { getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/sessionCookie";
import WhatsAppAuthCard from "@/components/site/WhatsAppAuthCard";
import PasswordInput from "@/components/site/PasswordInput";

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
  const nextPathRaw = typeof queryParams.next === "string" ? queryParams.next : "";
  const methodRaw = typeof queryParams.method === "string" ? queryParams.method : "";
  const authMethod = methodRaw === "whatsapp" ? "whatsapp" : "password";
  const isValidNextPath =
    nextPathRaw.startsWith(`/${locale}/`) &&
    !nextPathRaw.startsWith("//") &&
    !nextPathRaw.includes("://");
  const nextPath = isValidNextPath ? nextPathRaw : "";

  await ensureDefaultAdmin();

  async function handleLogin(formData: FormData) {
    "use server";
    const localeValue = formData.get("locale");
    const identifier = formData.get("identifier");
    const password = formData.get("password");
    const nextValue = formData.get("nextPath");

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
    cookieStore.set(SESSION_COOKIE_NAME, user.id, getSessionCookieOptions());

    // Login must not depend on the WhatsApp gateway being reachable.
    void sendUserWhatsAppTemplate({
      userId: user.id,
      key: "login_success",
    });

    const localeString = typeof localeValue === "string" ? localeValue : "en";
    const nextTarget =
      typeof nextValue === "string" &&
      nextValue.startsWith(`/${localeString}/`) &&
      !nextValue.startsWith("//") &&
      !nextValue.includes("://")
        ? nextValue
        : "";

    if (user.role === "ADMIN") {
      redirect(`/${localeString}/admin`);
    }

    if (nextTarget) {
      redirect(nextTarget);
    }

    redirect(`/${localeString}/account`);
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
    tabPassword: locale === "ar" ? "الدخول بكلمة المرور" : "Password Login",
    tabWhatsApp: locale === "ar" ? "الدخول عبر واتساب" : "WhatsApp Login",
    errorMessage: locale === "ar" ? "بيانات الدخول غير صحيحة" : "Invalid email or password",
    logoutSuccess: locale === 'ar' ? 'تم تسجيل الخروج بنجاح. يمكنك تسجيل الدخول مرة أخرى.' : 'You have been logged out successfully. You can sign in again.',
  };

  const passwordTabHref = nextPath
    ? `/${locale}/login?method=password&next=${encodeURIComponent(nextPath)}`
    : `/${locale}/login?method=password`;
  const whatsappTabHref = nextPath
    ? `/${locale}/login?method=whatsapp&next=${encodeURIComponent(nextPath)}`
    : `/${locale}/login?method=whatsapp`;

  return (
    <div className="home-sharp bg-[color:var(--muted)] px-4 py-12 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mx-auto w-full max-w-xl">
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

          {authMethod === "password" ? (
            <form action={handleLogin} className="grid gap-6">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="nextPath" value={nextPath} />

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
                  className="w-full rounded-xl border border-zinc-300 bg-[color:var(--surface)] px-4 py-2.5 text-sm text-[color:var(--text)] shadow-sm transition-all placeholder:text-zinc-400 hover:border-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-[color:var(--text-subtle)] dark:hover:border-zinc-600 dark:focus:border-white dark:focus:ring-white/10"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <span className="flex items-center gap-1">
                  {t.password}
                  <span className="text-red-500">*</span>
                </span>
                <PasswordInput
                  locale={locale}
                  name="password"
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  inputClassName="w-full rounded-xl border border-zinc-300 bg-[color:var(--surface)] px-4 py-2.5 text-sm text-[color:var(--text)] shadow-sm transition-all placeholder:text-zinc-400 hover:border-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-[color:var(--text-subtle)] dark:hover:border-zinc-600 dark:focus:border-white dark:focus:ring-white/10"
                />
              </label>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-zinc-900/20 transition-all hover:bg-zinc-800 hover:shadow-xl hover:shadow-zinc-900/30 active:scale-[0.98] dark:bg-[color:var(--surface)] dark:text-[color:var(--text)] dark:shadow-white/20 dark:hover:bg-[color:var(--muted)] dark:hover:shadow-white/30"
              >
                {t.signIn}
              </button>
            </form>
          ) : (
            <WhatsAppAuthCard locale={locale} purpose="login" />
          )}

          {/* Register Link */}
          <div className="mt-8 border-t border-[color:var(--border)] pt-6 text-center text-sm text-[color:var(--text-subtle)] dark:border-zinc-800 dark:text-zinc-400">
            {t.noAccount}{" "}
            <Link
              href={`/${locale}/register`}
              className="font-semibold text-[color:var(--text)] transition hover:text-zinc-700 dark:text-white dark:hover:text-zinc-300"
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
