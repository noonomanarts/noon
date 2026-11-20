import Link from "next/link";

// Shown for addresses outside /ar and /en (typos, old links). The visitor's
// language is unknown here, so both are offered.
export default function RootNotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[color:var(--background)] px-4 py-16">
      <div className="w-full max-w-md text-center">
        <p className="text-6xl font-black tracking-tight text-[color:var(--text)]" dir="ltr">404</p>
        <h1 className="mt-4 text-2xl font-bold text-[color:var(--text)]">الصفحة غير موجودة</h1>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--text-muted)]">
          عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
        </p>
        <p className="mt-1 text-sm leading-relaxed text-[color:var(--text-muted)]" dir="ltr" lang="en">
          Sorry, this page does not exist or has been moved.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/ar"
            className="inline-flex min-h-11 items-center rounded-xl bg-[color:var(--primary)] px-6 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)]"
          >
            الصفحة الرئيسية
          </Link>
          <Link
            href="/en"
            lang="en"
            className="inline-flex min-h-11 items-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-6 text-sm font-semibold text-[color:var(--text)] transition hover:bg-[color:var(--muted)]"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
