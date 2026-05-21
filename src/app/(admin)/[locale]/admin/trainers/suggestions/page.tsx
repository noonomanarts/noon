'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

type SuggestionStatus = 'PENDING_REVIEW' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
type StatusFilter = 'ALL' | SuggestionStatus;

type AdminSuggestion = {
  id: string;
  trainerId: string;
  trainerName: string;
  trainerEmail: string | null;
  trainerPhoneNumber: string | null;
  title: string;
  titleAr: string | null;
  brief: string | null;
  recipe: string | null;
  recipePdf: string | null;
  notes: string | null;
  photos: string[];
  adminNotes: string | null;
  status: SuggestionStatus;
  liveClassId: string | null;
  createdAt: string;
  updatedAt: string;
};

type SuggestionDraft = {
  status: SuggestionStatus;
  adminNotes: string;
};

const STATUS_OPTIONS: SuggestionStatus[] = ['PENDING_REVIEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED'];
const REVIEW_STATUS_OPTIONS: SuggestionStatus[] = ['PENDING_REVIEW', 'IN_REVIEW', 'APPROVED', 'REJECTED'];

function toLocalDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(locale === 'ar' ? 'ar-u-nu-latn' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Muscat',
  });
}

function statusClass(status: SuggestionStatus): string {
  if (status === 'PENDING_REVIEW') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  if (status === 'IN_REVIEW') return 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300';
  if (status === 'APPROVED') return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300';
  if (status === 'REJECTED') return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
  return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
}

export default function AdminTrainerSuggestionsPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'en';
  const isArabic = locale === 'ar';

  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [suggestions, setSuggestions] = useState<AdminSuggestion[]>([]);
  const [drafts, setDrafts] = useState<Record<string, SuggestionDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const t = useMemo(
    () => ({
      title: isArabic ? 'ورش مقترحة من المدربين' : 'Trainer Suggested Workshops',
      subtitle: isArabic
        ? 'مراجعة طلبات الورش الجديدة وتحديث حالتها'
        : 'Review incoming workshop suggestions and update their review status.',
      pendingReview: isArabic ? 'بانتظار المراجعة' : 'Pending Review',
      total: isArabic ? 'الإجمالي' : 'Total',
      noData: isArabic ? 'لا توجد ورش مقترحة ضمن هذا الفلتر.' : 'No suggested workshops for this filter.',
      trainer: isArabic ? 'المدرب' : 'Trainer',
      submittedAt: isArabic ? 'تاريخ الإرسال' : 'Submitted',
      updatedAt: isArabic ? 'آخر تحديث' : 'Updated',
      status: isArabic ? 'الحالة' : 'Status',
      adminNotes: isArabic ? 'ملاحظات الإدارة' : 'Admin Notes',
      save: isArabic ? 'حفظ التحديث' : 'Save Update',
      saving: isArabic ? 'جاري الحفظ...' : 'Saving...',
      refresh: isArabic ? 'تحديث' : 'Refresh',
      titleEn: isArabic ? 'العنوان (EN)' : 'Title (EN)',
      titleAr: isArabic ? 'العنوان (AR)' : 'Title (AR)',
      brief: isArabic ? 'الوصف المختصر' : 'Brief',
      recipe: isArabic ? 'الوصفة' : 'Recipe',
      recipePdf: isArabic ? 'ملف الوصفة (PDF)' : 'Recipe PDF',
      trainerNotes: isArabic ? 'ملاحظات المدرب' : 'Trainer Notes',
      photos: isArabic ? 'الصور' : 'Photos',
      contact: isArabic ? 'بيانات التواصل' : 'Contact',
      statusLabels: {
        ALL: isArabic ? 'الكل' : 'All',
        PENDING_REVIEW: isArabic ? 'بانتظار المراجعة' : 'Pending Review',
        IN_REVIEW: isArabic ? 'قيد المراجعة' : 'In Review',
        APPROVED: isArabic ? 'مقبول' : 'Approved',
        REJECTED: isArabic ? 'مرفوض' : 'Rejected',
        PUBLISHED: isArabic ? 'منشور' : 'Published',
      } as Record<StatusFilter, string>,
    }),
    [isArabic]
  );

  const fetchSuggestions = async (statusFilter: StatusFilter) => {
    try {
      setLoading(true);
      setFeedback(null);

      const response = await fetch(`/api/admin/trainers/suggestions?status=${statusFilter}&limit=400`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to fetch suggestions.');
      }

      const payload = (await response.json().catch(() => ({}))) as {
        suggestions?: AdminSuggestion[];
        pendingReviewCount?: number;
      };

      const nextSuggestions = Array.isArray(payload.suggestions) ? payload.suggestions : [];
      setSuggestions(nextSuggestions);
      setPendingReviewCount(typeof payload.pendingReviewCount === 'number' ? payload.pendingReviewCount : 0);
      setDrafts(
        Object.fromEntries(
          nextSuggestions.map((item) => [
            item.id,
            {
              status: item.status,
              adminNotes: item.adminNotes || '',
            },
          ])
        )
      );
    } catch (error) {
      setSuggestions([]);
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch suggestions.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSuggestions(filter);
  }, [filter]);

  const onDraftChange = (id: string, patch: Partial<SuggestionDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { status: 'PENDING_REVIEW' as SuggestionStatus, adminNotes: '' }),
        ...patch,
      },
    }));
  };

  const saveSuggestion = async (suggestion: AdminSuggestion) => {
    const draft = drafts[suggestion.id];
    if (!draft) return;

    try {
      setSavingId(suggestion.id);
      setFeedback(null);

      const response = await fetch(`/api/admin/trainers/suggestions/${suggestion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: draft.status,
          adminNotes: draft.adminNotes,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        suggestion?: AdminSuggestion;
        pendingReviewCount?: number;
        error?: string;
      };

      if (!response.ok || !payload.suggestion) {
        throw new Error(payload.error || 'Failed to save suggestion review.');
      }

      setPendingReviewCount(typeof payload.pendingReviewCount === 'number' ? payload.pendingReviewCount : pendingReviewCount);
      setSuggestions((prev) => {
        if (filter !== 'ALL' && payload.suggestion && payload.suggestion.status !== filter) {
          return prev.filter((item) => item.id !== suggestion.id);
        }
        return prev.map((item) => (item.id === suggestion.id ? payload.suggestion! : item));
      });
      setDrafts((prev) => ({
        ...prev,
        [suggestion.id]: {
          status: payload.suggestion!.status,
          adminNotes: payload.suggestion!.adminNotes || '',
        },
      }));
      setFeedback({
        type: 'success',
        message: isArabic ? 'تم تحديث حالة الورشة المقترحة بنجاح.' : 'Suggested workshop updated successfully.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save suggested workshop update.',
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{t.title}</h1>
        </div>
        <button
          type="button"
          onClick={() => void fetchSuggestions(filter)}
          className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {t.refresh}
        </button>
      </div>

      {feedback ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-300'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-[color:var(--noon-yellow)]/40 bg-[color:var(--noon-yellow-soft)]/70 p-3 dark:border-[color:var(--noon-yellow)]/45 dark:bg-[color:var(--noon-yellow)]/15">
          <p className="text-[10px] font-medium text-[color:var(--noon-yellow-strong)] dark:text-[color:var(--noon-yellow)]">{t.pendingReview}</p>
          <p className="mt-1 text-xl font-black text-[color:var(--noon-yellow-strong)] dark:text-[color:var(--noon-yellow)]">{pendingReviewCount}</p>
        </div>
        <div className="rounded-xl border border-[color:var(--noon-teal)]/35 bg-[color:var(--noon-teal-soft)]/60 p-3 dark:border-[color:var(--noon-teal)]/45 dark:bg-[color:var(--noon-teal)]/15">
          <p className="text-[10px] font-medium text-[color:var(--noon-teal-strong)] dark:text-[color:var(--noon-teal)]">{t.total}</p>
          <p className="mt-1 text-xl font-black text-[color:var(--noon-teal-strong)] dark:text-[color:var(--noon-teal)]">{suggestions.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
        {(['ALL', ...STATUS_OPTIONS] as StatusFilter[]).map((statusValue) => (
          <button
            key={statusValue}
            type="button"
            onClick={() => setFilter(statusValue)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              filter === statusValue
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            {t.statusLabels[statusValue]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          ...
        </div>
      ) : suggestions.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          {t.noData}
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((item) => {
            const draft = drafts[item.id] || { status: item.status, adminNotes: item.adminNotes || '' };
            const titleToShow = isArabic && item.titleAr ? item.titleAr : item.title;

            return (
              <article key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{titleToShow}</h2>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {t.trainer}: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{item.trainerName}</span>
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {t.contact}: {item.trainerEmail || '-'} | {item.trainerPhoneNumber || '-'}
                    </p>
                  </div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(item.status)}`}>
                    {t.statusLabels[item.status]}
                  </span>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.titleEn}</p>
                      <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">{item.title}</p>
                    </div>
                    {item.titleAr ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.titleAr}</p>
                        <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">{item.titleAr}</p>
                      </div>
                    ) : null}
                    {item.brief ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.brief}</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{item.brief}</p>
                      </div>
                    ) : null}
                    {item.recipe ? (
                      <details className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/60">
                        <summary className="cursor-pointer text-sm font-semibold text-zinc-800 dark:text-zinc-200">{t.recipe}</summary>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{item.recipe}</p>
                      </details>
                    ) : null}
                    {item.recipePdf ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.recipePdf}</p>
                        <a
                          href={item.recipePdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-sm font-medium text-[color:var(--noon-teal-strong)] hover:underline dark:text-[color:var(--noon-teal)]"
                        >
                          {isArabic ? 'فتح ملف PDF' : 'Open PDF'}
                        </a>
                      </div>
                    ) : null}
                    {item.notes ? (
                      <details className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/60">
                        <summary className="cursor-pointer text-sm font-semibold text-zinc-800 dark:text-zinc-200">{t.trainerNotes}</summary>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{item.notes}</p>
                      </details>
                    ) : null}
                    <div className="flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                      <p>{t.submittedAt}: {toLocalDate(item.createdAt, locale)}</p>
                      <p>{t.updatedAt}: {toLocalDate(item.updatedAt, locale)}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{t.status}</span>
                      <select
                        value={draft.status}
                        onChange={(event) =>
                          onDraftChange(item.id, { status: event.target.value as SuggestionStatus })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      >
                        {REVIEW_STATUS_OPTIONS.map((statusValue) => (
                          <option key={statusValue} value={statusValue}>
                            {t.statusLabels[statusValue]}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{t.adminNotes}</span>
                      <textarea
                        value={draft.adminNotes}
                        onChange={(event) => onDraftChange(item.id, { adminNotes: event.target.value })}
                        rows={5}
                        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                    </label>

                    {item.photos.length > 0 ? (
                      <div>
                        <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.photos}</p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {item.photos.map((photo, index) => (
                            <a
                              key={`${item.id}-photo-${index}`}
                              href={photo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60"
                            >
                              <img
                                src={photo}
                                alt={`Suggestion ${item.id} photo ${index + 1}`}
                                className="aspect-[3/4] w-full object-cover transition group-hover:scale-105"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void saveSuggestion(item)}
                      disabled={savingId === item.id}
                      className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      {savingId === item.id ? t.saving : t.save}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
