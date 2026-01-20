import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isLocale, type Locale } from "@/lib/locale";
import { ensureDefaultAdmin, verifyLogin } from "@/lib/authStore";

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

  ensureDefaultAdmin();

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

    const user = verifyLogin(identifier.trim(), password);
    if (!user) {
      redirect(`/${localeValue ?? "en"}/login?error=invalid`);
    }

    const cookieStore = await cookies();
    cookieStore.set("noon_session", user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    const target = user.role === "admin" ? "admin" : "account";
    redirect(`/${localeValue ?? "en"}/${target}`);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="mx-auto w-full max-w-xl rounded-3xl border border-zinc-200/70 bg-white p-8 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-950">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {locale === "ar" ? "تسجيل الدخول" : "Login"}
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {locale === "ar"
            ? "قم بتسجيل الدخول للوصول إلى حسابك ولوحة التحكم." 
            : "Sign in to access your account and dashboards."}
        </p>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {locale === "ar"
              ? "بيانات الدخول غير صحيحة."
              : "Invalid email or password."}
          </div>
        ) : null}

        <form action={handleLogin} className="mt-6 grid gap-4">
          <input type="hidden" name="locale" value={locale} />

          <label className="flex flex-col gap-2 text-sm">
            <span>
              {locale === "ar"
                ? "البريد الإلكتروني أو رقم الهاتف"
                : "Email or phone"}
            </span>
            <input
              type="text"
              name="identifier"
              required
              lang="en"
              dir="ltr"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm transition-colors placeholder:text-zinc-400 hover:border-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-white dark:focus:ring-white/10"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span>{locale === "ar" ? "كلمة المرور" : "Password"}</span>
            <input
              type="password"
              name="password"
              required
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm transition-colors placeholder:text-zinc-400 hover:border-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-white dark:focus:ring-white/10"
            />
          </label>

          <button type="submit" className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100">
            {locale === "ar" ? "تسجيل الدخول" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          {locale === "ar" ? "ليس لديك حساب؟" : "Don’t have an account?"} {" "}
          <Link href={`/${locale}/register`} className="font-semibold text-zinc-900 dark:text-white">
            {locale === "ar" ? "إنشاء حساب" : "Create one"}
          </Link>
        </div>
      </div>
    </div>
  );
}
