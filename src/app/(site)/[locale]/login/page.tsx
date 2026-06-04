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

  const isAr = locale === "ar";
  const fieldCls = "w-full border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-[color:var(--text)] placeholder-zinc-400 transition focus:border-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-800/60 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:bg-zinc-800";
  const labelCls = "block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1";

  return (
    <div className="home-sharp min-h-dvh bg-zinc-50 px-4 py-10 dark:bg-zinc-950" dir={isAr ? "rtl" : "ltr"}>
      <div className="mx-auto w-full max-w-sm">

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

        {error && (
          <div className="mb-4 border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300">
            {t.errorMessage}
          </div>
        )}
        {logoutSuccess && (
          <div className="mb-4 border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300">
            {t.logoutSuccess}
          </div>
        )}

        {authMethod === "password" ? (
          <form action={handleLogin} className="space-y-4 bg-white p-6 shadow-sm dark:bg-zinc-900">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="nextPath" value={nextPath} />

            <div>
              <label className={labelCls}>{t.identifier}</label>
              <input
                type="text"
                name="identifier"
                required
                autoComplete="username"
                lang="en"
                dir="ltr"
                placeholder="name@example.com"
                className={fieldCls}
              />
            </div>

            <div>
              <label className={labelCls}>{t.password}</label>
              <PasswordInput
                locale={locale}
                name="password"
                required
                placeholder="••••••••"
                autoComplete="current-password"
                inputClassName={fieldCls}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-zinc-900 py-3 text-sm font-bold text-white transition hover:bg-zinc-800 active:scale-[0.98] dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              {t.signIn}
            </button>
          </form>
        ) : (
          <div className="bg-white shadow-sm dark:bg-zinc-900">
            <WhatsAppAuthCard locale={locale} purpose="login" nextPath={nextPath} />
          </div>
        )}

        <p className="mt-5 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {t.noAccount}{" "}
          <Link
            href={nextPath ? `/${locale}/register?next=${encodeURIComponent(nextPath)}` : `/${locale}/register`}
            className="font-semibold text-[color:var(--text)] hover:underline"
          >
            {t.createAccount}
          </Link>
        </p>
      </div>
    </div>
  );
}
