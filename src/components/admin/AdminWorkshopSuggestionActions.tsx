'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { FiCheck, FiEye, FiEyeOff, FiTrash2 } from 'react-icons/fi';
import { useAppFeedback } from '@/components/ui/AppFeedbackProvider';
import type { Locale } from '@/lib/locale';

type Status = 'PENDING' | 'PUBLISHED' | 'HIDDEN';

export default function AdminWorkshopSuggestionActions({
  id,
  status,
  locale,
}: {
  id: string;
  status: Status;
  locale: Locale;
}) {
  const router = useRouter();
  const isArabic = locale === 'ar';
  const { confirm } = useAppFeedback();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const t = {
    publish: isArabic ? 'عرض' : 'Publish',
    hide: isArabic ? 'إخفاء' : 'Hide',
    delete: isArabic ? 'حذف' : 'Delete',
    confirmDelete: isArabic ? 'حذف هذا الاقتراح نهائياً؟' : 'Delete this suggestion permanently?',
  };

  async function setStatus(next: Status) {
    setError(null);
    const res = await fetch(`/api/admin/workshop-suggestions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed.');
      return;
    }
    startTransition(() => router.refresh());
  }

  async function remove() {
    const confirmed = await confirm({
      title: t.delete,
      message: t.confirmDelete,
      confirmLabel: t.delete,
      cancelLabel: isArabic ? 'إلغاء' : 'Cancel',
      tone: 'danger',
    });
    if (!confirmed) return;
    setError(null);
    const res = await fetch(`/api/admin/workshop-suggestions/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      setError('Failed.');
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== 'PUBLISHED' && (
        <button
          type="button"
          disabled={pending}
          onClick={() => void setStatus('PUBLISHED')}
          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {status === 'PENDING' ? <FiCheck className="size-3.5" /> : <FiEye className="size-3.5" />}
          {t.publish}
        </button>
      )}
      {status === 'PUBLISHED' && (
        <button
          type="button"
          disabled={pending}
          onClick={() => void setStatus('HIDDEN')}
          className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          <FiEyeOff className="size-3.5" />
          {t.hide}
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => void remove()}
        className="inline-flex items-center gap-1 rounded-md border border-rose-300 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/20"
      >
        <FiTrash2 className="size-3.5" />
        {t.delete}
      </button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}
