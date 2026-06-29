"use client";

import { useEffect, useState } from "react";
import { FiThumbsUp, FiCheckCircle, FiSend, FiPlus } from "react-icons/fi";
import type { Locale } from "@/lib/locale";

type Suggestion = {
  id: string;
  title: string;
  titleAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  votesCount: number;
  votedByCurrentUser: boolean;
};

export default function WorkshopSuggestionsSection({ locale }: { locale: Locale }) {
  const isArabic = locale === "ar";
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = {
    heading: isArabic ? "اقترح ورشة" : "Suggest a Workshop",
    sub: isArabic
      ? "صوّت على الأفكار التي تريدها أو شاركنا فكرتك."
      : "Vote for ideas you want, or share your own.",
    want: isArabic ? "نعم، أريد هذه الورشة" : "Yes, I want this",
    voted: isArabic ? "تم التصويت" : "Voted",
    votes: isArabic ? "صوت" : "votes",
    addIdea: isArabic ? "اقترح فكرة" : "Suggest an idea",
    title: isArabic ? "فكرة الورشة" : "Workshop idea",
    desc: isArabic ? "تفاصيل (اختياري)" : "Details (optional)",
    yourName: isArabic ? "اسمك (اختياري)" : "Your name (optional)",
    yourEmail: isArabic ? "بريدك (اختياري)" : "Your email (optional)",
    send: isArabic ? "إرسال" : "Send",
    thanks: isArabic ? "شكراً! سنراجع اقتراحك." : "Thanks! We'll review your idea.",
    loginFirst: isArabic ? "سجّل الدخول أولاً." : "Login first.",
    empty: isArabic ? "كن أول من يقترح ورشة!" : "Be the first to suggest a workshop!",
  };

  useEffect(() => {
    fetch("/api/workshop-suggestions")
      .then((r) => r.json())
      .then((d) => setSuggestions(Array.isArray(d.suggestions) ? d.suggestions : []))
      .catch(() => setSuggestions([]));
  }, []);

  async function vote(id: string) {
    setError(null);
    const res = await fetch(`/api/workshop-suggestions/${id}/vote`, { method: "POST" });
    if (res.status === 401) {
      const next = encodeURIComponent(window.location.pathname);
      window.location.href = `/${locale}/login?next=${next}`;
      return;
    }
    const data = (await res.json().catch(() => ({}))) as { votesCount?: number; error?: string };
    if (!res.ok) {
      setError(data.error || t.loginFirst);
      return;
    }
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, votedByCurrentUser: true, votesCount: data.votesCount ?? s.votesCount + 1 } : s
      )
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/workshop-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, submitterName: name, submitterEmail: email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed.");
        return;
      }
      setSubmitted(true);
      setTitle("");
      setDescription("");
      setName("");
      setEmail("");
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-10 border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm sm:p-8" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[color:var(--text)] dark:text-white">{t.heading}</h2>
          <p className="mt-1 text-sm text-[color:var(--text-muted)] dark:text-zinc-400">{t.sub}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 py-2.5 text-sm font-semibold text-[color:var(--primary-foreground)] hover:bg-[color:var(--primary-hover)]"
        >
          <FiPlus className="size-4" />
          {t.addIdea}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.title} required className="h-11 rounded-lg border border-[color:var(--border)] bg-white px-3 text-sm text-zinc-900 sm:col-span-2 dark:bg-zinc-950 dark:text-white" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.desc} rows={2} className="rounded-lg border border-[color:var(--border)] bg-white px-3 py-2 text-sm text-zinc-900 sm:col-span-2 dark:bg-zinc-950 dark:text-white" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.yourName} className="h-11 rounded-lg border border-[color:var(--border)] bg-white px-3 text-sm text-zinc-900 dark:bg-zinc-950 dark:text-white" />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.yourEmail} className="h-11 rounded-lg border border-[color:var(--border)] bg-white px-3 text-sm text-zinc-900 dark:bg-zinc-950 dark:text-white" />
          <button type="submit" disabled={submitting} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 sm:col-span-2 dark:bg-white dark:text-zinc-900">
            <FiSend className="size-4" />{t.send}
          </button>
        </form>
      )}

      {submitted && <p className="mt-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">{t.thanks}</p>}
      {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {suggestions.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)] dark:text-zinc-400">{t.empty}</p>
        ) : (
          suggestions.map((s) => {
            const title = isArabic && s.titleAr ? s.titleAr : s.title;
            const desc = isArabic && s.descriptionAr ? s.descriptionAr : s.description;
            return (
              <article key={s.id} className="flex flex-col gap-3 border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
                <div>
                  <h3 className="font-semibold text-[color:var(--text)] dark:text-white">{title}</h3>
                  {desc && <p className="mt-1 text-sm text-[color:var(--text-muted)] dark:text-zinc-400">{desc}</p>}
                </div>
                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[color:var(--text)] dark:text-white">{s.votesCount} {t.votes}</span>
                  <button
                    type="button"
                    onClick={() => void vote(s.id)}
                    disabled={s.votedByCurrentUser}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${s.votedByCurrentUser ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-[color:var(--primary)] text-[color:var(--primary-foreground)] hover:bg-[color:var(--primary-hover)]"}`}
                  >
                    {s.votedByCurrentUser ? <FiCheckCircle className="size-4" /> : <FiThumbsUp className="size-4" />}
                    {s.votedByCurrentUser ? t.voted : t.want}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
