'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCheckCircle, FiFileText, FiSave, FiSearch } from 'react-icons/fi';
import type { Locale } from '@/lib/locale';

type RecipeSession = {
  id: string;
  class_id: string;
  start_date_time: string;
  end_date_time: string | null;
  recipe_submitted: boolean;
  recipe_pdf: string | null;
  grocery_list: string | null;
  workshop_brief: string | null;
  updated_at: string;
  class_title: string;
  class_title_ar: string | null;
  class_slug: string;
  class_image: string | null;
  trainer_name: string | null;
  trainer_image: string | null;
};

export default function AdminRecipesPageClient({ locale }: { locale: Locale }) {
  const isArabic = locale === 'ar';
  const [sessions, setSessions] = useState<RecipeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'submitted' | 'missing'>('all');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [recipeSubmitted, setRecipeSubmitted] = useState(false);
  const [recipePdf, setRecipePdf] = useState('');
  const [groceryList, setGroceryList] = useState('');
  const [workshopBrief, setWorkshopBrief] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const t = {
    title: isArabic ? 'إدارة الوصفات' : 'Recipes Management',
    subtitle: isArabic
      ? 'إدارة وصفات الجلسات وتحديث ملف الوصفة وقائمة المشتريات والوصف النهائي.'
      : 'Manage session recipes, update recipe PDF link, grocery list, and workshop brief.',
    search: isArabic ? 'ابحث باسم الدورة أو المدرب...' : 'Search by class or trainer...',
    statusAll: isArabic ? 'الكل' : 'All',
    statusSubmitted: isArabic ? 'مكتمل' : 'Submitted',
    statusMissing: isArabic ? 'غير مكتمل' : 'Missing',
    submitted: isArabic ? 'مكتمل' : 'Submitted',
    missing: isArabic ? 'غير مكتمل' : 'Missing',
    recipePdf: isArabic ? 'رابط ملف الوصفة (PDF)' : 'Recipe PDF URL',
    groceryList: isArabic ? 'قائمة المشتريات' : 'Grocery List',
    workshopBrief: isArabic ? 'ملخص الورشة' : 'Workshop Brief',
    save: isArabic ? 'حفظ التحديثات' : 'Save Updates',
    saving: isArabic ? 'جارٍ الحفظ...' : 'Saving...',
    noData: isArabic ? 'لا توجد جلسات مطابقة.' : 'No matching sessions found.',
    selectSession: isArabic ? 'اختر جلسة لإدارة الوصفة' : 'Select a session to manage recipe',
    updated: isArabic ? 'تم تحديث بيانات الوصفة بنجاح.' : 'Recipe details updated successfully.',
  };

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ status });
      if (search.trim()) params.set('search', search.trim());

      const response = await fetch(`/api/admin/recipes?${params.toString()}`);
      const payload = (await response.json().catch(() => ({}))) as { sessions?: RecipeSession[]; error?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load recipes');
      }

      const list = Array.isArray(payload.sessions) ? payload.sessions : [];
      setSessions(list);

      if (list.length > 0) {
        const exists = list.some((item) => item.id === selectedSessionId);
        const nextId = exists ? selectedSessionId : list[0].id;
        setSelectedSessionId(nextId);
      } else {
        setSelectedSessionId('');
      }
    } catch (requestError) {
      setSessions([]);
      setSelectedSessionId('');
      setError(requestError instanceof Error ? requestError.message : 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  }, [search, selectedSessionId, status]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const selectedSession = useMemo(
    () => sessions.find((item) => item.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions]
  );

  useEffect(() => {
    if (!selectedSession) {
      setRecipeSubmitted(false);
      setRecipePdf('');
      setGroceryList('');
      setWorkshopBrief('');
      return;
    }

    setRecipeSubmitted(selectedSession.recipe_submitted);
    setRecipePdf(selectedSession.recipe_pdf ?? '');
    setGroceryList(selectedSession.grocery_list ?? '');
    setWorkshopBrief(selectedSession.workshop_brief ?? '');
  }, [selectedSession]);

  const handleSave = async () => {
    if (!selectedSession) return;

    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(`/api/admin/recipes/${selectedSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeSubmitted,
          recipePdf: recipePdf.trim() || null,
          groceryList: groceryList.trim() || null,
          workshopBrief: workshopBrief.trim() || null,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save recipe details');
      }

      setSessions((prev) =>
        prev.map((session) =>
          session.id === selectedSession.id
            ? {
                ...session,
                recipe_submitted: recipeSubmitted,
                recipe_pdf: recipePdf.trim() || null,
                grocery_list: groceryList.trim() || null,
                workshop_brief: workshopBrief.trim() || null,
                updated_at: new Date().toISOString(),
              }
            : session
        )
      );
      setInfo(t.updated);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to save recipe details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{t.title}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t.subtitle}</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {info ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          {info}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="space-y-3">
            <label className="relative block">
              <FiSearch className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.search}
                className="w-full rounded-xl border border-zinc-300 bg-white py-2 ps-9 pe-3 text-sm text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>

            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'all', label: t.statusAll },
                { key: 'submitted', label: t.statusSubmitted },
                { key: 'missing', label: t.statusMissing },
              ] as const).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setStatus(option.key)}
                  className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${
                    status === option.key
                      ? 'bg-[color:var(--noon-teal)] text-white'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {loading ? (
              <p className="px-2 py-6 text-sm text-zinc-500 dark:text-zinc-400">...</p>
            ) : sessions.length === 0 ? (
              <p className="px-2 py-6 text-sm text-zinc-500 dark:text-zinc-400">{t.noData}</p>
            ) : (
              sessions.map((session) => {
                const active = session.id === selectedSessionId;
                const className = isArabic && session.class_title_ar ? session.class_title_ar : session.class_title;
                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      active
                        ? 'border-[color:var(--noon-teal)] bg-[color:var(--noon-teal-soft)]/40'
                        : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/70'
                    }`}
                  >
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{className}</p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(session.start_date_time).toLocaleString(isArabic ? 'ar' : 'en')}
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        session.recipe_submitted
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                      }`}
                    >
                      {session.recipe_submitted ? t.submitted : t.missing}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          {!selectedSession ? (
            <div className="flex min-h-[300px] items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
              {t.selectSession}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                <div className="flex items-center gap-3">
                  <span className="relative size-14 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                    {selectedSession.class_image ? (
                      <Image src={selectedSession.class_image} alt={selectedSession.class_title} fill sizes="56px" className="object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-zinc-500">
                        <FiFileText className="size-5" />
                      </span>
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {isArabic && selectedSession.class_title_ar ? selectedSession.class_title_ar : selectedSession.class_title}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {selectedSession.trainer_name || '-'}
                    </p>
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600">
                  <input
                    type="checkbox"
                    checked={recipeSubmitted}
                    onChange={(event) => setRecipeSubmitted(event.target.checked)}
                    className="size-4 rounded border-zinc-300 text-[color:var(--noon-teal)] focus:ring-[color:var(--noon-teal)]"
                  />
                  <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.submitted}</span>
                </label>
              </div>

              <label className="space-y-1 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.recipePdf}</span>
                <input
                  value={recipePdf}
                  onChange={(event) => setRecipePdf(event.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.groceryList}</span>
                <textarea
                  value={groceryList}
                  onChange={(event) => setGroceryList(event.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.workshopBrief}</span>
                <textarea
                  value={workshopBrief}
                  onChange={(event) => setWorkshopBrief(event.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--noon-teal)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? <FiCheckCircle className="size-4" /> : <FiSave className="size-4" />}
                  {saving ? t.saving : t.save}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
