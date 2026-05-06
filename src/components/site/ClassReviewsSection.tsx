"use client";

import Link from "next/link";
import { useState } from "react";
import { HiStar } from "react-icons/hi2";

import type { Locale } from "@/lib/locale";

type ClassReview = {
  id: string;
  rating: number | null;
  comment: string | null;
  created_at: string;
  user_full_name: string | null;
  is_verified: boolean;
};

export default function ClassReviewsSection({
  classId,
  locale,
  isAuthenticated,
  canReview,
  loginHref,
  initialReviews,
  initialAverageRating,
  initialViewerReview,
}: {
  classId: string;
  locale: Locale;
  isAuthenticated: boolean;
  canReview: boolean;
  loginHref: string;
  initialReviews: ClassReview[];
  initialAverageRating: number | null;
  initialViewerReview: ClassReview | null;
}) {
  const isArabic = locale === "ar";
  const [reviews, setReviews] = useState(initialReviews);
  const [averageRating, setAverageRating] = useState<number | null>(initialAverageRating);
  const [viewerReview, setViewerReview] = useState(initialViewerReview);
  const [rating, setRating] = useState(initialViewerReview?.rating ?? 5);
  const [comment, setComment] = useState(initialViewerReview?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const t = {
    title: isArabic ? "التقييمات" : "Reviews",
    subtitle: isArabic ? "آراء الحضور بعد انتهاء الورشة." : "Feedback from attendees after the workshop.",
    noReviews: isArabic ? "لا توجد تقييمات بعد." : "No reviews yet.",
    writeReview: viewerReview ? (isArabic ? "تعديل تقييمك" : "Edit your review") : (isArabic ? "اكتب تقييمك" : "Write a review"),
    writeReviewSubtitle: isArabic
      ? "إذا حضرت الورشة، يمكنك مشاركة تجربتك لمساعدة الآخرين."
      : "If you attended this workshop, share your experience to help others.",
    yourRating: isArabic ? "تقييمك" : "Your rating",
    yourComment: isArabic ? "تعليقك" : "Your comment",
    commentPlaceholder: isArabic ? "كيف كانت تجربتك في الورشة؟" : "How was your workshop experience?",
    save: viewerReview ? (isArabic ? "حفظ التعديل" : "Update review") : (isArabic ? "إرسال التقييم" : "Submit review"),
    saving: isArabic ? "جارٍ الحفظ..." : "Saving...",
    loginPrompt: isArabic ? "سجّل الدخول لإضافة تقييمك." : "Log in to leave your review.",
    login: isArabic ? "تسجيل الدخول" : "Log in",
    bookingPrompt: isArabic ? "يمكنك كتابة تقييم بعد حضور الورشة في حجز مؤكد ومدفوع." : "You can review this workshop after attending it with a confirmed paid booking.",
    verified: isArabic ? "حضور موثق" : "Verified attendee",
    saved: isArabic ? "تم حفظ تقييمك." : "Your review was saved.",
    average: isArabic ? "متوسط التقييم" : "Average rating",
    selectedRating: isArabic ? "التقييم المحدد" : "Selected rating",
    reviewHint: isArabic ? "يمكنك تعديل تقييمك لاحقاً." : "You can update your review later.",
  };

  const upsertReview = (review: ClassReview) => {
    setReviews((current) => {
      const existingIndex = current.findIndex((item) => item.id === review.id);
      if (existingIndex === -1) {
        return [review, ...current];
      }

      const next = [...current];
      next[existingIndex] = review;
      return next;
    });
  };

  const submitReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canReview) {
      return;
    }

    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(`/api/classes/${classId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        review?: ClassReview;
        summary?: {
          averageRating: number | null;
          reviewsCount: number;
        };
      };

      if (!response.ok || !payload.review || !payload.summary) {
        throw new Error(payload.error || "Failed to save review.");
      }

      upsertReview(payload.review);
      setViewerReview(payload.review);
      setAverageRating(payload.summary.averageRating);
      setInfo(t.saved);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save review.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[color:var(--text)]">
            {t.title} ({reviews.length})
          </h2>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">{t.subtitle}</p>
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
            {t.average}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <HiStar className="h-5 w-5 text-yellow" />
            <span className="text-lg font-semibold text-[color:var(--text)]">
              {averageRating ? averageRating.toFixed(1) : "—"}
            </span>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {info ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          {info}
        </div>
      ) : null}

      <div className="mt-5 rounded-3xl border border-[color:var(--border)] bg-[color:var(--muted)] p-5">
        <h3 className="text-xl font-semibold text-[color:var(--text)]">{t.writeReview}</h3>
        <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">{t.writeReviewSubtitle}</p>

        {!isAuthenticated ? (
          <div className="mt-5 rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-5 text-sm text-[color:var(--text-muted)]">
            {t.loginPrompt}{" "}
            <Link href={loginHref} className="font-semibold text-[color:var(--primary)] hover:underline">
              {t.login}
            </Link>
          </div>
        ) : !canReview ? (
          <div className="mt-5 rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-5 text-sm text-[color:var(--text-muted)]">
            {t.bookingPrompt}
          </div>
        ) : (
          <form onSubmit={submitReview} className="mt-6 space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                <p className="text-sm font-semibold text-[color:var(--text)]">{t.yourRating}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <button
                      key={index + 1}
                      type="button"
                      onClick={() => setRating(index + 1)}
                      className={`flex min-w-[72px] items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                        index + 1 <= rating
                          ? "border-[#f6c453] bg-[#fff7dc] text-[#b7791f]"
                          : "border-[color:var(--border)] bg-[color:var(--muted)] text-[color:var(--text-subtle)] hover:border-[#f6c453]"
                      }`}
                      aria-label={`Rate ${index + 1}`}
                    >
                      <HiStar className={`h-5 w-5 ${index + 1 <= rating ? "text-[#f4b400]" : "text-[color:var(--text-subtle)]/60"}`} />
                      <span>{index + 1}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{t.selectedRating}</p>
                <div className="mt-3 flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <HiStar
                      key={`selected-${index}`}
                      className={`h-5 w-5 ${index < rating ? "text-yellow" : "text-[color:var(--text-subtle)]/40"}`}
                    />
                  ))}
                </div>
                <p className="mt-3 text-3xl font-semibold text-[color:var(--text)]">{rating}/5</p>
                <p className="mt-2 text-sm text-[color:var(--text-muted)]">{t.reviewHint}</p>
              </div>
            </div>

            <label className="block">
              <span className="mb-3 block text-sm font-semibold text-[color:var(--text)]">{t.yourComment}</span>
              <textarea
                rows={5}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder={t.commentPlaceholder}
                className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm leading-6 text-[color:var(--text)] transition focus:border-[color:var(--primary)] focus:outline-none focus:ring-4 focus:ring-[color:var(--primary)]/10"
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[color:var(--text-muted)]">{t.reviewHint}</p>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-w-[180px] items-center justify-center rounded-2xl bg-[color:var(--primary)] px-6 py-3 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? t.saving : t.save}
              </button>
            </div>
          </form>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="mt-6 text-sm text-[color:var(--text-muted)]">{t.noReviews}</p>
      ) : (
        <div className="mt-6 grid gap-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <HiStar
                        key={`${review.id}-${index}`}
                        className={`h-4 w-4 ${index < (review.rating || 0) ? "text-yellow" : "text-[color:var(--text-subtle)]/40"}`}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {review.user_full_name ? (
                      <span className="font-semibold text-[color:var(--text)]">{review.user_full_name}</span>
                    ) : null}
                    {review.is_verified ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        {t.verified}
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="text-xs text-[color:var(--text-subtle)]">
                  {new Date(review.created_at).toLocaleDateString(isArabic ? "ar-OM-u-nu-latn" : "en-OM")}
                </p>
              </div>
              {review.comment ? (
                <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">{review.comment}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}