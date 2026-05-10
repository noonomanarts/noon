"use client";

import { useState } from "react";
import Link from "next/link";
import { HiStar } from "react-icons/hi2";

import type { Locale } from "@/lib/locale";

type ProductReview = {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  is_verified: boolean;
  created_at: string;
  user_full_name: string | null;
};

export default function ShopProductReviewsSection({
  productId,
  locale,
  isAuthenticated,
  canReview,
  loginHref,
  initialReviews,
  initialAverageRating,
  initialReviewsCount,
  initialViewerReview,
}: {
  productId: string;
  locale: Locale;
  isAuthenticated: boolean;
  canReview: boolean;
  loginHref: string;
  initialReviews: ProductReview[];
  initialAverageRating: number | null;
  initialReviewsCount: number;
  initialViewerReview: ProductReview | null;
}) {
  const isArabic = locale === "ar";
  const [reviews, setReviews] = useState<ProductReview[]>(initialReviews);
  const [averageRating, setAverageRating] = useState<number | null>(initialAverageRating);
  const [reviewsCount, setReviewsCount] = useState(initialReviewsCount);
  const [viewerReview, setViewerReview] = useState<ProductReview | null>(initialViewerReview);
  const [rating, setRating] = useState(initialViewerReview?.rating ?? 5);
  const [comment, setComment] = useState(initialViewerReview?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const t = {
    title: isArabic ? "التقييمات" : "Reviews",
    subtitle: isArabic ? "آراء العملاء الذين اشتروا هذا المنتج." : "Feedback from customers who bought this product.",
    noReviews: isArabic ? "لا توجد تقييمات لهذا المنتج بعد." : "No reviews for this product yet.",
    writeReview: viewerReview ? (isArabic ? "تعديل تقييمك" : "Edit your review") : (isArabic ? "أضف تقييمك" : "Write a review"),
    writeReviewSubtitle: isArabic
      ? "شارك رأيك وتجربتك مع المنتج لمساعدة العملاء الآخرين."
      : "Share your experience with this product to help other customers.",
    yourRating: isArabic ? "تقييمك" : "Your rating",
    yourComment: isArabic ? "تعليقك" : "Your comment",
    commentPlaceholder: isArabic ? "اكتب رأيك عن المنتج..." : "Share your thoughts about the product...",
    save: viewerReview ? (isArabic ? "حفظ التعديل" : "Update review") : (isArabic ? "إرسال التقييم" : "Submit review"),
    saving: isArabic ? "جارٍ الحفظ..." : "Saving...",
    loginPrompt: isArabic ? "سجّل الدخول لإضافة تقييم." : "Log in to leave a review.",
    login: isArabic ? "تسجيل الدخول" : "Log in",
    purchasePrompt: isArabic ? "يمكنك التقييم بعد شراء هذا المنتج." : "You can review this product after purchasing it.",
    verified: isArabic ? "مشتري موثق" : "Verified buyer",
    saved: isArabic ? "تم حفظ تقييمك." : "Your review was saved.",
    average: isArabic ? "متوسط التقييم" : "Average rating",
    reviewCount: isArabic ? "عدد التقييمات" : "Reviews",
    selectedRating: isArabic ? "التقييم المحدد" : "Selected rating",
    reviewHint: isArabic ? "يمكنك تعديل تقييمك لاحقًا في أي وقت." : "You can update your review any time later.",
  };

  const upsertReview = (review: ProductReview) => {
    setReviews((current) => {
      const existingIndex = current.findIndex((item) => item.id === review.id || item.user_id === review.user_id);
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
    if (!canReview) return;

    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(`/api/shop/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        review?: ProductReview;
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
      setReviewsCount(payload.summary.reviewsCount);
      setInfo(t.saved);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save review.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <div className="border-b border-[color:var(--border)] bg-[linear-gradient(135deg,rgba(15,135,124,0.08),rgba(250,204,21,0.08),rgba(255,255,255,0.6))] px-6 py-7 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-[color:var(--text)]">
              {t.title} ({reviewsCount})
            </h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">{t.subtitle}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/70 bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--text-subtle)]">
                {t.average}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff3cd] text-[#d97706]">
                  <HiStar className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-[color:var(--text)]">
                    {averageRating ? averageRating.toFixed(1) : "—"}
                  </p>
                  <p className="text-xs text-[color:var(--text-subtle)]">{reviewsCount} {t.reviewCount}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--text-subtle)]">
                {t.selectedRating}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <HiStar
                      key={`summary-star-${index}`}
                      className={`h-5 w-5 ${index < rating ? "text-yellow" : "text-[color:var(--text-subtle)]/40"}`}
                    />
                  ))}
                </div>
                <span className="text-lg font-semibold text-[color:var(--text)]">{rating}/5</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 sm:px-8 sm:py-8">
        {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
        ) : null}

        {info ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          {info}
        </div>
        ) : null}

        <div className="mt-1 rounded-[1.75rem] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,246,0.92))] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-2xl font-semibold tracking-tight text-[color:var(--text)]">{t.writeReview}</h3>
            <p className="max-w-3xl text-sm leading-6 text-[color:var(--text-muted)]">{t.writeReviewSubtitle}</p>
          </div>

          {!isAuthenticated ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-5 text-sm text-[color:var(--text-muted)]">
              {t.loginPrompt}{" "}
              <Link href={loginHref} className="font-semibold text-[color:var(--primary)] hover:underline">
                {t.login}
              </Link>
            </div>
          ) : !canReview ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-5 text-sm text-[color:var(--text-muted)]">
              {t.purchasePrompt}
            </div>
          ) : (
            <form onSubmit={submitReview} className="mt-6 space-y-6">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
                  <p className="text-sm font-semibold text-[color:var(--text)]">{t.yourRating}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <button
                        key={index + 1}
                        type="button"
                        onClick={() => setRating(index + 1)}
                        className={`group flex min-w-[84px] flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-4 text-sm font-semibold transition sm:flex-none ${
                          index + 1 <= rating
                            ? "border-[#f6c453] bg-[#fff7dc] text-[#b7791f] shadow-sm"
                            : "border-[color:var(--border)] bg-[color:var(--muted)] text-[color:var(--text-subtle)] hover:border-[#f6c453] hover:bg-[#fffaf0]"
                        }`}
                        aria-label={`Rate ${index + 1}`}
                      >
                        <HiStar className={`h-5 w-5 ${index + 1 <= rating ? "text-[#f4b400]" : "text-[color:var(--text-subtle)]/60 group-hover:text-[#f4b400]"}`} />
                        <span>{index + 1}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-[color:var(--text-muted)]">{t.reviewHint}</p>
                </div>

                <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--muted)] p-5">
                  <div className="flex items-center gap-2">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <HiStar
                        key={`active-rating-${index}`}
                        className={`h-5 w-5 ${index < rating ? "text-yellow" : "text-[color:var(--text-subtle)]/40"}`}
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-3xl font-semibold text-[color:var(--text)]">{rating}/5</p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">{t.writeReviewSubtitle}</p>
                </div>
              </div>

              <label className="block">
                <span className="mb-3 block text-sm font-semibold text-[color:var(--text)]">{t.yourComment}</span>
                <textarea
                  rows={6}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder={t.commentPlaceholder}
                  className="w-full rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3.5 text-sm leading-6 text-[color:var(--text)] shadow-sm transition focus:border-[color:var(--primary)] focus:outline-none focus:ring-4 focus:ring-[color:var(--primary)]/10"
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[color:var(--text-muted)]">{t.reviewHint}</p>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-w-[180px] items-center justify-center rounded-2xl bg-[color:var(--primary)] px-6 py-3 text-sm font-semibold text-[color:var(--primary-foreground)] shadow-[0_14px_30px_rgba(15,135,124,0.22)] transition hover:bg-[color:var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? t.saving : t.save}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-8">
          {reviews.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-[color:var(--border)] bg-[color:var(--muted)] px-6 py-12 text-center">
              <p className="text-sm text-[color:var(--text-muted)]">{t.noReviews}</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--muted)] p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <HiStar
                            key={`${review.id}-${index}`}
                            className={`h-4 w-4 ${index < review.rating ? "text-yellow" : "text-[color:var(--text-subtle)]/40"}`}
                          />
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
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
                      {new Date(review.created_at).toLocaleDateString(isArabic ? "ar-OM-u-nu-latn" : "en-OM", { timeZone: 'Asia/Muscat' })}
                    </p>
                  </div>
                  {review.comment ? (
                    <p className="mt-4 text-sm leading-7 text-[color:var(--text-muted)]">{review.comment}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
