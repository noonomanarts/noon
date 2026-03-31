'use client';

import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiCalendar, FiCheckCircle, FiFileText, FiMessageSquare, FiStar, FiUsers } from 'react-icons/fi';
import type { Locale } from '@/lib/locale';
import type {
  TrainerDashboardData,
  TrainerDashboardWorkshopPublic,
  TrainerHighlightedIngredient,
  TrainerWorkshopSuggestionPublic,
} from '@/lib/db/trainers';
import { formatAmountWithCurrency } from '@/lib/formatNumber';

type SubmissionDraft = {
  recipePdf: string;
  groceryList: string;
  workshopBrief: string;
  photosText: string;
  ingredientsText: string;
};

type SuggestionStatus = TrainerWorkshopSuggestionPublic['status'];

interface TrainerDashboardPageClientProps {
  locale: Locale;
  dashboard: TrainerDashboardData;
}

function formatDateTime(value: string | null, locale: Locale): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString(locale === 'ar' ? 'ar-u-nu-latn' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatMoney(value: number, currency: string): string {
  return formatAmountWithCurrency(value, currency);
}

function formatRating(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  return value.toFixed(1);
}

function formatCategoryLabel(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ');
}

function ingredientsToText(ingredients: TrainerHighlightedIngredient[]): string {
  return ingredients.map((item) => `${item.name} | ${item.source} | ${item.photo}`).join('\n');
}

function parseIngredients(text: string): TrainerHighlightedIngredient[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [name = '', source = '', photo = ''] = line.split('|').map((item) => item.trim());
      return { name, source, photo };
    })
    .filter((item) => item.name || item.source || item.photo)
    .slice(0, 100);
}

function workshopToDraft(workshop: TrainerDashboardWorkshopPublic): SubmissionDraft {
  return {
    recipePdf: workshop.submission.recipePdf || '',
    groceryList: workshop.submission.groceryList || '',
    workshopBrief: workshop.submission.workshopBrief || '',
    photosText: (workshop.submission.trainerPhotos || []).join('\n'),
    ingredientsText: ingredientsToText(workshop.submission.highlightedIngredients || []),
  };
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        reject(new Error('Unable to read image dimensions.'));
      };
      img.src = objectUrl;
    });
    return dimensions;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function getSuggestionStatusMeta(status: SuggestionStatus, isArabic: boolean, hasLiveClassId: boolean) {
  const selectLabels = (english: string, arabic: string) => ({
    label: isArabic ? arabic : english,
    secondaryLabel: isArabic ? english : arabic,
  });

  if (status === 'PENDING_REVIEW') {
    return {
      ...selectLabels('Pending Admin Review', 'بانتظار مراجعة الإدارة'),
      className: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/25 dark:text-amber-300',
      dotClassName: 'bg-amber-500',
    };
  }
  if (status === 'IN_REVIEW') {
    return {
      ...selectLabels('Under Review', 'قيد المراجعة'),
      className: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800/60 dark:bg-sky-900/25 dark:text-sky-300',
      dotClassName: 'bg-sky-500',
    };
  }
  if (status === 'APPROVED') {
    return {
      ...selectLabels('Approved For Scheduling', 'معتمد للجدولة'),
      className: 'border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-800/60 dark:bg-teal-900/25 dark:text-teal-300',
      dotClassName: 'bg-teal-500',
    };
  }
  if (status === 'REJECTED') {
    return {
      ...selectLabels('Revision Required', 'يحتاج تعديل'),
      className: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800/60 dark:bg-rose-900/25 dark:text-rose-300',
      dotClassName: 'bg-rose-500',
    };
  }

  if (hasLiveClassId) {
    return {
      ...selectLabels('Published As Workshop', 'تم النشر كورشة'),
      className: 'border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-800/60 dark:bg-purple-900/25 dark:text-purple-300',
      dotClassName: 'bg-purple-500',
    };
  }

  return {
    ...selectLabels('Status Updated', 'تم تحديث الحالة'),
    className: 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800/60 dark:bg-indigo-900/25 dark:text-indigo-300',
    dotClassName: 'bg-indigo-500',
  };
}

export default function TrainerDashboardPageClient({ locale, dashboard }: TrainerDashboardPageClientProps) {
  const isArabic = locale === 'ar';
  const [ongoingWorkshops, setOngoingWorkshops] = useState(dashboard.ongoingWorkshops);
  const [previousWorkshops] = useState(dashboard.previousWorkshops);
  const [suggestedWorkshops, setSuggestedWorkshops] = useState(dashboard.suggestedWorkshops);
  const [submittingSessionId, setSubmittingSessionId] = useState<string | null>(null);
  const [savingSuggestion, setSavingSuggestion] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [submissionDrafts, setSubmissionDrafts] = useState<Record<string, SubmissionDraft>>(() => {
    const initial: Record<string, SubmissionDraft> = {};
    for (const workshop of dashboard.ongoingWorkshops) {
      initial[workshop.sessionId] = workshopToDraft(workshop);
    }
    return initial;
  });

  const [suggestionTitle, setSuggestionTitle] = useState('');
  const [suggestionTitleAr, setSuggestionTitleAr] = useState('');
  const [suggestionBrief, setSuggestionBrief] = useState('');
  const [suggestionRecipe, setSuggestionRecipe] = useState('');
  const [suggestionRecipePdf, setSuggestionRecipePdf] = useState('');
  const [suggestionNotes, setSuggestionNotes] = useState('');
  const [suggestionPhotos, setSuggestionPhotos] = useState<string[]>([]);
  const [uploadingSuggestionPhoto, setUploadingSuggestionPhoto] = useState(false);
  const [uploadingSuggestionRecipePdf, setUploadingSuggestionRecipePdf] = useState(false);
  const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(null);

  const summary = useMemo(() => {
    const totalSuggested = suggestedWorkshops.length;
    const totalUpcoming = ongoingWorkshops.length;

    return {
      ...dashboard.summary,
      totalSuggestedWorkshops: totalSuggested,
      totalUpcomingWorkshops: totalUpcoming,
    };
  }, [dashboard.summary, ongoingWorkshops.length, suggestedWorkshops.length]);

  const onDraftChange = (sessionId: string, patch: Partial<SubmissionDraft>) => {
    setSubmissionDrafts((prev) => ({
      ...prev,
      [sessionId]: {
        ...(prev[sessionId] || {
          recipePdf: '',
          groceryList: '',
          workshopBrief: '',
          photosText: '',
          ingredientsText: '',
        }),
        ...patch,
      },
    }));
  };

  const saveWorkshopSubmission = async (sessionId: string) => {
    const draft = submissionDrafts[sessionId];
    if (!draft) return;

    try {
      setSubmittingSessionId(sessionId);
      setMessage(null);

      const photos = draft.photosText
        .split('\n')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .slice(0, 30);

      const highlightedIngredients = parseIngredients(draft.ingredientsText);
      const isReadyToSubmit = Boolean(
        draft.recipePdf.trim()
        && draft.groceryList.trim()
        && draft.workshopBrief.trim()
        && photos.length > 0
        && highlightedIngredients.length > 0
      );

      const response = await fetch(`/api/account/trainer/workshops/${sessionId}/submission`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipePdf: draft.recipePdf,
          groceryList: draft.groceryList,
          workshopBrief: draft.workshopBrief,
          trainerPhotos: photos,
          highlightedIngredients,
          recipeSubmitted: isReadyToSubmit,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        workshop?: TrainerDashboardWorkshopPublic;
        error?: string;
      };

      if (!response.ok || !payload.workshop) {
        throw new Error(payload.error || 'Failed to save workshop submission.');
      }

      setOngoingWorkshops((prev) =>
        prev.map((workshop) =>
          workshop.sessionId === sessionId
            ? {
                ...workshop,
                submission: payload.workshop!.submission,
              }
            : workshop
        )
      );

      setMessage({
        type: 'success',
        text: isReadyToSubmit
          ? (isArabic ? 'تم إرسال الورشة بنجاح.' : 'Workshop submitted successfully.')
          : (isArabic ? 'تم حفظ المسودة. أكمل الحقول المتبقية للإرسال النهائي.' : 'Draft saved. Complete the remaining fields to submit.'),
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save workshop submission.',
      });
    } finally {
      setSubmittingSessionId(null);
    }
  };

  const uploadTrainerSuggestionAsset = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/account/trainer/uploads', {
      method: 'POST',
      body: formData,
    });

    const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!response.ok || !payload.url) {
      throw new Error(payload.error || 'Failed to upload file.');
    }

    return payload.url;
  };

  const handleSuggestionPhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingSuggestionPhoto(true);
      setMessage(null);

      const { width, height } = await getImageDimensions(file);
      const ratio = width / height;
      const targetRatio = 3 / 4;
      const ratioTolerance = 0.02;
      if (Math.abs(ratio - targetRatio) > ratioTolerance) {
        throw new Error(
          isArabic
            ? 'يرجى رفع صورة بنسبة 3:4 فقط.'
            : 'Please upload workshop photos in 3:4 ratio only.'
        );
      }

      const uploadedUrl = await uploadTrainerSuggestionAsset(file);
      setSuggestionPhotos((prev) => [...prev, uploadedUrl].slice(0, 12));
      setMessage({
        type: 'success',
        text: isArabic ? 'تم رفع صورة الورشة بنجاح.' : 'Workshop photo uploaded successfully.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to upload workshop photo.',
      });
    } finally {
      setUploadingSuggestionPhoto(false);
      event.target.value = '';
    }
  };

  const handleSuggestionRecipePdfUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingSuggestionRecipePdf(true);
      setMessage(null);
      const uploadedUrl = await uploadTrainerSuggestionAsset(file);
      setSuggestionRecipePdf(uploadedUrl);
      setMessage({
        type: 'success',
        text: isArabic ? 'تم رفع ملف الوصفة بنجاح.' : 'Recipe PDF uploaded successfully.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to upload recipe PDF.',
      });
    } finally {
      setUploadingSuggestionRecipePdf(false);
      event.target.value = '';
    }
  };

  const removeSuggestionPhoto = (index: number) => {
    setSuggestionPhotos((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const resetSuggestionForm = () => {
    setSuggestionTitle('');
    setSuggestionTitleAr('');
    setSuggestionBrief('');
    setSuggestionRecipe('');
    setSuggestionRecipePdf('');
    setSuggestionNotes('');
    setSuggestionPhotos([]);
    setEditingSuggestionId(null);
  };

  const startEditSuggestion = (suggestion: TrainerWorkshopSuggestionPublic) => {
    if (suggestion.status !== 'PENDING_REVIEW') return;

    setEditingSuggestionId(suggestion.id);
    setSuggestionTitle(suggestion.title || '');
    setSuggestionTitleAr(suggestion.titleAr || '');
    setSuggestionBrief(suggestion.brief || '');
    setSuggestionRecipe(suggestion.recipe || '');
    setSuggestionRecipePdf(suggestion.recipePdf || '');
    setSuggestionNotes(suggestion.notes || '');
    setSuggestionPhotos(Array.isArray(suggestion.photos) ? suggestion.photos.slice(0, 12) : []);
    setMessage(null);
  };

  const createSuggestedWorkshop = async (event: FormEvent) => {
    event.preventDefault();
    if (!suggestionTitle.trim()) {
      setMessage({
        type: 'error',
        text: isArabic ? 'يرجى إدخال اسم الورشة المقترحة.' : 'Please enter a workshop title.',
      });
      return;
    }

    try {
      setSavingSuggestion(true);
      setMessage(null);

      const response = await fetch(
        editingSuggestionId
          ? `/api/account/trainer/suggestions/${editingSuggestionId}`
          : '/api/account/trainer/suggestions',
        {
          method: editingSuggestionId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: suggestionTitle,
            titleAr: suggestionTitleAr,
            brief: suggestionBrief,
            recipe: suggestionRecipe,
            recipePdf: suggestionRecipePdf || null,
            notes: suggestionNotes,
            photos: suggestionPhotos,
          }),
        }
      );

      const payload = (await response.json().catch(() => ({}))) as {
        suggestion?: TrainerWorkshopSuggestionPublic;
        error?: string;
      };

      if (!response.ok || !payload.suggestion) {
        throw new Error(payload.error || 'Failed to save suggested workshop.');
      }

      if (editingSuggestionId) {
        setSuggestedWorkshops((prev) =>
          prev.map((item) => (item.id === payload.suggestion!.id ? payload.suggestion! : item))
        );
      } else {
        setSuggestedWorkshops((prev) => [payload.suggestion!, ...prev]);
      }

      resetSuggestionForm();
      setMessage({
        type: 'success',
        text: editingSuggestionId
          ? isArabic
            ? 'تم تحديث الورشة المقترحة بنجاح.'
            : 'Suggested workshop updated successfully.'
          : isArabic
            ? 'تم إضافة الورشة المقترحة بنجاح. بانتظار مراجعة الإدارة.'
            : 'Suggested workshop submitted and waiting for admin review.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save suggested workshop.',
      });
    } finally {
      setSavingSuggestion(false);
    }
  };

  return (
    <div className="space-y-6 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
      <div>
        <h2 className="text-2xl font-bold text-[color:var(--text)]">
          {isArabic ? 'لوحة المدرب' : 'Trainer Dashboard'}
        </h2>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          {isArabic
            ? 'عرض الورش الجارية والسابقة، إرسال محتوى الورش، متابعة الاقتراحات، ومراجعة الدخل.'
            : 'Track ongoing and previous workshops, submit workshop content, manage suggestions, and monitor earnings.'}
        </p>
      </div>

      {message ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-300'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300'
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-[color:var(--noon-teal)]/35 bg-[color:var(--noon-teal-soft)]/60 p-4 dark:border-[color:var(--noon-teal)]/45 dark:bg-[color:var(--noon-teal)]/15">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--noon-teal-strong)] dark:text-[color:var(--noon-teal)]">
            {isArabic ? 'الورش القادمة' : 'Upcoming Workshops'}
          </p>
          <p className="mt-2 text-2xl font-bold text-[color:var(--noon-teal-strong)] dark:text-[color:var(--noon-teal)]">
            {summary.totalUpcomingWorkshops}
          </p>
        </div>
        <div className="rounded-lg border border-[color:var(--noon-yellow)]/40 bg-[color:var(--noon-yellow-soft)]/70 p-4 dark:border-[color:var(--noon-yellow)]/45 dark:bg-[color:var(--noon-yellow)]/15">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--noon-yellow-strong)] dark:text-[color:var(--noon-yellow)]">
            {isArabic ? 'ورش مغلقة مالياً' : 'Settled Workshops'}
          </p>
          <p className="mt-2 text-2xl font-bold text-[color:var(--noon-yellow-strong)] dark:text-[color:var(--noon-yellow)]">
            {summary.totalClosedWorkshops}
          </p>
        </div>
        <div className="rounded-lg border border-[color:var(--noon-coral)]/35 bg-[color:var(--noon-coral-soft)]/70 p-4 dark:border-[color:var(--noon-coral)]/45 dark:bg-[color:var(--noon-coral)]/15">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--noon-coral-strong)] dark:text-[color:var(--noon-coral)]">
            {isArabic ? 'إجمالي دخل المدرب' : 'Total Trainer Earnings'}
          </p>
          <p className="mt-2 text-2xl font-bold text-[color:var(--noon-coral-strong)] dark:text-[color:var(--noon-coral)]">
            {formatMoney(summary.totalTrainerEarnings, summary.currency)}
          </p>
        </div>
        <div className="rounded-lg border border-[color:var(--noon-purple)]/35 bg-[color:var(--noon-purple-soft)]/70 p-4 dark:border-[color:var(--noon-purple)]/45 dark:bg-[color:var(--noon-purple)]/15">
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--noon-purple-strong)] dark:text-[color:var(--noon-purple)]">
            {isArabic ? 'الدخل الشهري المتوسط' : 'Avg/Workshop'}
          </p>
          <p className="mt-2 text-2xl font-bold text-[color:var(--noon-purple-strong)] dark:text-[color:var(--noon-purple)]">
            {formatMoney(summary.averageEarningPerWorkshop, summary.currency)}
          </p>
        </div>
      </div>

      <section className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h3 className="text-lg font-semibold text-[color:var(--text)]">{isArabic ? 'الوضع المالي' : 'Finance'}</h3>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
            <h4 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              {isArabic ? 'الدخل الشهري' : 'Monthly Earnings'}
            </h4>
            {dashboard.monthlyEarnings.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {isArabic ? 'لا توجد تسويات مغلقة بعد.' : 'No closed settlements yet.'}
              </p>
            ) : (
              <div className="space-y-2">
                {dashboard.monthlyEarnings.map((row) => (
                  <div
                    key={`${row.monthStart}-${row.currency}`}
                    className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900/60"
                  >
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">{row.monthLabel}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {row.workshopsCount} {isArabic ? 'ورشة' : 'workshops'} • {row.participantsCount}{' '}
                        {isArabic ? 'مشارك' : 'participants'}
                      </p>
                    </div>
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(row.totalPayout, row.currency)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
            <h4 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              {isArabic ? 'الدخل حسب كل دورة' : 'Earnings Per Workshop'}
            </h4>
            {dashboard.earningsByWorkshop.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {isArabic ? 'لا توجد بيانات دخل حتى الآن.' : 'No workshop earning data yet.'}
              </p>
            ) : (
              <div className="space-y-2">
                {dashboard.earningsByWorkshop.map((item) => (
                  <div key={item.classId} className="rounded-md bg-zinc-50 px-3 py-2 dark:bg-zinc-900/60">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/${locale}/classes/${item.classSlug}`}
                          className="text-sm font-medium text-zinc-900 hover:text-[color:var(--primary)] dark:text-white"
                        >
                          {locale === 'ar' && item.classTitleAr ? item.classTitleAr : item.classTitle}
                        </Link>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formatDateTime(item.settledAt, locale)} • {item.participantsCount}{' '}
                          {isArabic ? 'مشارك' : 'participants'}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(item.trainerPayoutAmount, item.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h3 className="text-lg font-semibold text-[color:var(--text)]">
          {isArabic ? 'الورش الجارية (إرسال المحتوى)' : 'Ongoing Workshops (Submission)'}
        </h3>

        {ongoingWorkshops.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isArabic ? 'لا توجد ورش قادمة حالياً.' : 'No upcoming workshops right now.'}
          </p>
        ) : (
          <div className="space-y-4">
            {ongoingWorkshops.map((workshop) => {
              const draft = submissionDrafts[workshop.sessionId] || workshopToDraft(workshop);
              const isDraftReadyToSubmit = Boolean(
                draft.recipePdf.trim()
                && draft.groceryList.trim()
                && draft.workshopBrief.trim()
                && draft.photosText
                  .split('\n')
                  .map((item) => item.trim())
                  .filter((item) => item.length > 0)
                  .length > 0
                && parseIngredients(draft.ingredientsText).length > 0
              );

              return (
                <div key={workshop.sessionId} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/${locale}/classes/${workshop.classSlug}`}
                        className="text-base font-semibold text-zinc-900 hover:text-[color:var(--primary)] dark:text-white"
                      >
                        {locale === 'ar' && workshop.classTitleAr ? workshop.classTitleAr : workshop.classTitle}
                      </Link>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {formatDateTime(workshop.startDateTime, locale)}
                      </p>
                    </div>
                    <div className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {isArabic ? 'الحجوزات' : 'Booked'}: {workshop.seatsBooked} / {workshop.seatsTotal}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm sm:col-span-2">
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {isArabic ? 'رابط ملف الوصفة' : 'Recipe PDF URL'}
                      </span>
                      <input
                        type="url"
                        value={draft.recipePdf}
                        onChange={(e) => onDraftChange(workshop.sessionId, { recipePdf: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {isArabic ? 'قائمة المشتريات' : 'Grocery List'}
                      </span>
                      <textarea
                        rows={4}
                        value={draft.groceryList}
                        onChange={(e) => onDraftChange(workshop.sessionId, { groceryList: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {isArabic ? 'نبذة الورشة' : 'Workshop Brief'}
                      </span>
                      <textarea
                        rows={4}
                        value={draft.workshopBrief}
                        onChange={(e) => onDraftChange(workshop.sessionId, { workshopBrief: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {isArabic ? 'صور الورشة (رابط لكل سطر)' : 'Workshop Photos (one URL per line)'}
                      </span>
                      <textarea
                        rows={4}
                        value={draft.photosText}
                        onChange={(e) => onDraftChange(workshop.sessionId, { photosText: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      />
                    </label>
                    <label className="text-sm">
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {isArabic
                          ? 'المكونات المميزة (الاسم | المصدر | الصورة)'
                          : 'Highlighted Ingredients (name | source | photo)'}
                      </span>
                      <textarea
                        rows={4}
                        value={draft.ingredientsText}
                        onChange={(e) => onDraftChange(workshop.sessionId, { ingredientsText: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void saveWorkshopSubmission(workshop.sessionId)}
                      disabled={submittingSessionId === workshop.sessionId}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submittingSessionId === workshop.sessionId
                        ? isArabic
                          ? 'جارٍ الحفظ...'
                          : 'Saving...'
                        : isDraftReadyToSubmit
                          ? (isArabic ? 'إرسال الورشة' : 'Submit Workshop')
                          : (isArabic ? 'حفظ كمسودة' : 'Save Draft')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div>
          <h3 className="text-lg font-semibold text-[color:var(--text)]">
            {isArabic ? 'الورش السابقة' : 'Previous Workshops'}
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {isArabic
              ? 'عرض احترافي للورش السابقة مع بيانات التقييم والمحتوى النهائي.'
              : 'Professional overview of past workshops with feedback and final submission details.'}
          </p>
        </div>

        {previousWorkshops.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isArabic ? 'لا توجد ورش سابقة.' : 'No previous workshops yet.'}
          </p>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {previousWorkshops.map((workshop) => {
              const title = locale === 'ar' && workshop.classTitleAr ? workshop.classTitleAr : workshop.classTitle;
              const avgRating = formatRating(workshop.averageRating);
              const hasAdminNote = Boolean(workshop.adminNotes.text || workshop.adminNotes.photo);
              const feedbackPreview = workshop.feedback.slice(0, 3);

              return (
                <article
                  key={workshop.sessionId}
                  className="rounded-2xl border border-zinc-200 bg-white/85 p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/70"
                >
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="relative w-20 flex-shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 aspect-[3/4] dark:border-zinc-700 dark:bg-zinc-800">
                        {workshop.classImage ? (
                          <Image
                            src={workshop.classImage}
                            alt={title}
                            fill
                            sizes="112px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-500">
                            <FiFileText className="size-6" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <Link
                          href={`/${locale}/classes/${workshop.classSlug}`}
                          className="line-clamp-2 text-base font-semibold text-zinc-900 hover:text-[color:var(--primary)] dark:text-white"
                        >
                          {title}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="inline-flex items-center gap-1">
                            <FiCalendar className="size-3.5" />
                            {formatDateTime(workshop.startDateTime, locale)}
                          </span>
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            {formatCategoryLabel(workshop.classCategory)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                        <FiUsers className="size-3.5 text-teal-500" />
                        {workshop.participantsCount ?? 0}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                        <FiStar className="size-3.5 text-amber-500" />
                        {avgRating} ({workshop.feedbackCount ?? 0})
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-900/60">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        {isArabic ? 'تسليم المدرب' : 'Trainer Submission'}
                      </p>
                      {workshop.submission.recipePdf ? (
                        <a
                          href={workshop.submission.recipePdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--noon-teal-strong)] hover:underline dark:text-[color:var(--noon-teal)]"
                        >
                          <FiCheckCircle className="size-3.5" />
                          {isArabic ? 'ملف الوصفة المرفق' : 'Recipe PDF attached'}
                        </a>
                      ) : (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {isArabic ? 'لا يوجد ملف وصفة مرفق' : 'No recipe PDF attached'}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
                        {isArabic ? 'الصور:' : 'Photos:'} {workshop.submission.trainerPhotos.length} •{' '}
                        {isArabic ? 'المكونات:' : 'Ingredients:'} {workshop.submission.highlightedIngredients.length}
                      </p>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-900/60">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        {isArabic ? 'الوصفة النهائية' : 'Final Recipe'}
                      </p>
                      <p className="line-clamp-2 text-sm font-medium text-zinc-800 dark:text-zinc-100">
                        {workshop.finalRecipe.title || (isArabic ? 'غير متوفر' : 'Not available')}
                      </p>
                      {workshop.finalRecipe.pdf ? (
                        <a
                          href={workshop.finalRecipe.pdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--primary)] hover:underline"
                        >
                          <FiFileText className="size-3.5" />
                          {isArabic ? 'فتح ملف الوصفة النهائية' : 'Open final recipe file'}
                        </a>
                      ) : null}
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300">
                      <p className="mb-1 font-semibold text-zinc-700 dark:text-zinc-200">
                        {isArabic ? 'الوصفة مرئية للعملاء' : 'Visible To Customers'}
                      </p>
                      <p>
                        {workshop.finalRecipe.visibleToCustomers
                          ? isArabic
                            ? 'نعم'
                            : 'Yes'
                          : isArabic
                            ? 'لا'
                            : 'No'}
                      </p>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300">
                      <p className="mb-1 font-semibold text-zinc-700 dark:text-zinc-200">
                        {isArabic ? 'تاريخ نشر الوصفة النهائية' : 'Final Recipe Published At'}
                      </p>
                      <p>{formatDateTime(workshop.finalRecipe.publishedAt, locale)}</p>
                    </div>
                  </div>

                  {hasAdminNote ? (
                    <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/70 p-3 dark:border-blue-900/40 dark:bg-blue-900/20">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                        {isArabic ? 'ملاحظات الإدارة' : 'Admin Notes'}
                      </p>
                      <p className="text-sm text-blue-900 dark:text-blue-100">{workshop.adminNotes.text || '-'}</p>
                      {workshop.adminNotes.photo ? (
                        <a
                          href={workshop.adminNotes.photo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex text-xs font-semibold text-blue-700 hover:underline dark:text-blue-300"
                        >
                          {isArabic ? 'عرض صورة الملاحظة' : 'View note image'}
                        </a>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                    <p className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      <FiMessageSquare className="size-4 text-coral" />
                      {isArabic ? 'آراء العملاء' : 'Customer Feedback'}
                    </p>

                    {feedbackPreview.length === 0 ? (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {isArabic ? 'لا توجد تقييمات مرئية حتى الآن.' : 'No visible feedback yet.'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {feedbackPreview.map((feedback) => (
                          <div
                            key={feedback.id}
                            className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900/60"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-zinc-800 dark:text-zinc-100">{feedback.customerName}</span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                <FiStar className="size-3" />
                                {feedback.rating}/5
                              </span>
                            </div>
                            <p className="mt-1 text-zinc-600 dark:text-zinc-300">{feedback.comment || '-'}</p>
                          </div>
                        ))}
                        {workshop.feedback.length > feedbackPreview.length ? (
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {isArabic
                              ? `+${workshop.feedback.length - feedbackPreview.length} تعليقات إضافية`
                              : `+${workshop.feedback.length - feedbackPreview.length} more feedback entries`}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div>
          <h3 className="text-lg font-semibold text-[color:var(--text)]">
            {isArabic ? 'الورش المقترحة' : 'Suggested Workshops'}
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {editingSuggestionId
              ? isArabic
                ? 'أنت الآن تعدّل اقتراحًا بحالة بانتظار المراجعة.'
                : 'You are editing a pending-review suggestion.'
              : isArabic
                ? 'أنشئ اقتراح ورشة بشكل احترافي مع رفع الصور وملف وصفة PDF.'
                : 'Create a professional workshop suggestion with image uploads and a recipe PDF file.'}
          </p>
        </div>

        <form
          onSubmit={createSuggestedWorkshop}
          className="space-y-4 rounded-2xl border border-zinc-200 bg-[linear-gradient(135deg,rgba(20,184,166,0.08),rgba(251,113,133,0.08))] p-4 dark:border-zinc-700 dark:bg-[linear-gradient(135deg,rgba(20,184,166,0.12),rgba(251,113,133,0.12))]"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">{isArabic ? 'اسم الورشة (EN)' : 'Title (EN)'}</span>
              <input
                type="text"
                value={suggestionTitle}
                onChange={(e) => setSuggestionTitle(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </label>
            <label className="text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">{isArabic ? 'اسم الورشة (AR)' : 'Title (AR)'}</span>
              <input
                type="text"
                value={suggestionTitleAr}
                onChange={(e) => setSuggestionTitleAr(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </label>
          </div>

          <label className="text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">{isArabic ? 'نبذة' : 'Brief'}</span>
            <textarea
              rows={3}
              value={suggestionBrief}
              onChange={(e) => setSuggestionBrief(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </label>

          <label className="text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">{isArabic ? 'الوصفة المقترحة (نص)' : 'Suggested Recipe (Text)'}</span>
            <textarea
              rows={4}
              value={suggestionRecipe}
              onChange={(e) => setSuggestionRecipe(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </label>

          <label className="text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">{isArabic ? 'ملاحظات المدرب' : 'Trainer Notes'}</span>
            <textarea
              rows={3}
              value={suggestionNotes}
              onChange={(e) => setSuggestionNotes(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </label>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-teal-200/70 bg-white/80 p-3 dark:border-teal-800/50 dark:bg-zinc-900/70">
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {isArabic ? 'صور الورشة المقترحة' : 'Suggested Workshop Photos'}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {isArabic ? 'PNG/JPG/WEBP حتى 8MB بنسبة 3:4' : 'PNG/JPG/WEBP up to 8MB in 3:4 ratio'}
              </p>
              <label className="mt-3 inline-flex cursor-pointer items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700">
                {uploadingSuggestionPhoto ? (isArabic ? 'جارٍ الرفع...' : 'Uploading...') : isArabic ? 'رفع صورة' : 'Upload Photo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => void handleSuggestionPhotoUpload(event)}
                  disabled={uploadingSuggestionPhoto}
                />
              </label>

              {suggestionPhotos.length > 0 ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {suggestionPhotos.map((url, index) => (
                    <div key={`${url}-${index}`} className="relative overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                      <img
                        src={url}
                        alt={`Suggestion upload ${index + 1}`}
                        className="aspect-[3/4] w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeSuggestionPhoto(index)}
                        className="absolute right-1 top-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white"
                      >
                        {isArabic ? 'حذف' : 'Remove'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-coral/40 bg-white/80 p-3 dark:border-coral/40 dark:bg-zinc-900/70">
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {isArabic ? 'ملف الوصفة (PDF)' : 'Recipe File (PDF)'}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {isArabic ? 'ملف PDF حتى 20MB' : 'PDF file up to 20MB'}
              </p>
              <label className="mt-3 inline-flex cursor-pointer items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700">
                {uploadingSuggestionRecipePdf ? (isArabic ? 'جارٍ الرفع...' : 'Uploading...') : isArabic ? 'رفع PDF' : 'Upload PDF'}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(event) => void handleSuggestionRecipePdfUpload(event)}
                  disabled={uploadingSuggestionRecipePdf}
                />
              </label>

              <label className="mt-3 block text-xs">
                <span className="text-zinc-600 dark:text-zinc-400">{isArabic ? 'رابط الملف' : 'File URL'}</span>
                <input
                  type="url"
                  value={suggestionRecipePdf}
                  onChange={(e) => setSuggestionRecipePdf(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/25 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </label>

              {suggestionRecipePdf ? (
                <a
                  href={suggestionRecipePdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex text-xs font-semibold text-coral hover:underline"
                >
                  {isArabic ? 'فتح ملف الوصفة' : 'Open recipe PDF'}
                </a>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            {editingSuggestionId ? (
              <button
                type="button"
                onClick={resetSuggestionForm}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {isArabic ? 'إلغاء التعديل' : 'Cancel Edit'}
              </button>
            ) : null}
            <button
              type="submit"
              disabled={savingSuggestion}
              className="rounded-lg bg-[color:var(--noon-teal)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[color:var(--noon-teal-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingSuggestion
                ? isArabic
                  ? 'جارٍ الإرسال...'
                  : 'Submitting...'
                : editingSuggestionId
                  ? isArabic
                    ? 'حفظ التعديلات'
                    : 'Save Changes'
                  : isArabic
                    ? 'إرسال الاقتراح'
                    : 'Submit Suggestion'}
            </button>
          </div>
        </form>

        {suggestedWorkshops.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isArabic ? 'لا توجد ورش مقترحة بعد.' : 'No suggested workshops yet.'}
          </p>
        ) : (
          <div className="space-y-3">
            {suggestedWorkshops.map((item) => (
              <div key={item.id} className="rounded-xl border border-zinc-200 bg-white/80 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900/70">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-zinc-900 dark:text-white">
                    {locale === 'ar' && item.titleAr ? item.titleAr : item.title}
                  </p>
                  {(() => {
                    const statusMeta = getSuggestionStatusMeta(item.status, isArabic, Boolean(item.liveClassId));
                    return (
                      <span
                        className={`inline-flex flex-col items-start rounded-xl border px-2.5 py-1.5 ${statusMeta.className}`}
                      >
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold leading-tight">
                          <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClassName}`} />
                          {statusMeta.label}
                        </span>
                        <span className="text-[10px] font-medium opacity-80">{statusMeta.secondaryLabel}</span>
                      </span>
                    );
                  })()}
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{formatDateTime(item.createdAt, locale)}</p>
                {item.brief ? <p className="mt-2 text-zinc-600 dark:text-zinc-300">{item.brief}</p> : null}
                {item.recipePdf ? (
                  <a
                    href={item.recipePdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex text-xs font-semibold text-[color:var(--noon-teal-strong)] hover:underline dark:text-[color:var(--noon-teal)]"
                  >
                    {isArabic ? 'ملف الوصفة PDF' : 'Recipe PDF'}
                  </a>
                ) : null}
                {item.photos.length > 0 ? (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {item.photos.slice(0, 6).map((photo, index) => (
                      <a
                        key={`${item.id}-photo-${index}`}
                        href={photo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-700"
                      >
                        <img
                          src={photo}
                          alt={`Suggested workshop ${item.id} ${index + 1}`}
                          className="aspect-[3/4] w-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                ) : null}
                {item.adminNotes ? (
                  <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">
                    {isArabic ? 'ملاحظات الإدارة:' : 'Admin Notes:'} {item.adminNotes}
                  </p>
                ) : null}
                {item.status === 'PENDING_REVIEW' ? (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => startEditSuggestion(item)}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-900/25 dark:text-amber-300 dark:hover:bg-amber-900/35"
                    >
                      {isArabic ? 'تعديل الاقتراح' : 'Edit Suggestion'}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
