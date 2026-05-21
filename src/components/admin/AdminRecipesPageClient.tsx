'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiCheckCircle,
  FiClock,
  FiEye,
  FiFileText,
  FiImage,
  FiLayers,
  FiList,
  FiMessageSquare,
  FiPlus,
  FiSave,
  FiSearch,
  FiTrash2,
  FiUsers,
} from 'react-icons/fi';
import type { Locale } from '@/lib/locale';

type HighlightedIngredient = {
  name: string;
  source: string;
  photo: string;
};

type RecipeBooking = {
  id: string;
  booking_number: string;
  customer_name: string;
  number_of_participants: number;
  status: string;
  payment_status: string;
  created_at: string;
};

type RecipeFeedback = {
  id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

type RecipeSessionSummary = {
  id: string;
  class_id: string;
  start_date_time: string;
  end_date_time: string | null;
  recipe_submitted: boolean;
  recipe_pdf: string | null;
  grocery_list: string | null;
  workshop_brief: string | null;
  photos: string[];
  trainer_photos: string[];
  highlighted_ingredients: HighlightedIngredient[];
  final_recipe_title: string | null;
  final_recipe_pdf: string | null;
  final_recipe_brief: string | null;
  final_recipe_title_ar: string | null;
  final_recipe_pdf_ar: string | null;
  final_recipe_brief_ar: string | null;
  final_recipe_visible_to_customers: boolean;
  final_recipe_published_at: string | null;
  admin_workshop_notes: string | null;
  admin_workshop_notes_photo: string | null;
  seats_total_effective: number | null;
  seats_booked: number;
  bookings_count: number;
  participants_count: number;
  feedback_count: number;
  average_rating: number | null;
  updated_at: string;
  class_title: string;
  class_title_ar: string | null;
  class_slug: string;
  class_image: string | null;
  trainer_name: string | null;
  trainer_image: string | null;
};

type RecipeSessionDetail = RecipeSessionSummary & {
  bookings: RecipeBooking[];
  feedback: RecipeFeedback[];
};

type RecipeFormState = {
  recipeSubmitted: boolean;
  trainerRecipePdf: string;
  trainerGroceryList: string;
  trainerWorkshopBrief: string;
  trainerPhotos: string[];
  highlightedIngredients: HighlightedIngredient[];
  finalRecipeTitle: string;
  finalRecipePdf: string;
  finalRecipeBrief: string;
  finalRecipeTitleAr: string;
  finalRecipePdfAr: string;
  finalRecipeBriefAr: string;
  finalRecipeVisibleToCustomers: boolean;
  adminWorkshopNotes: string;
  adminWorkshopNotesPhoto: string;
};

function normalizeIngredients(value: unknown): HighlightedIngredient[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      return {
        name: typeof record.name === 'string' ? record.name : '',
        source: typeof record.source === 'string' ? record.source : '',
        photo: typeof record.photo === 'string' ? record.photo : '',
      } satisfies HighlightedIngredient;
    })
    .filter((item): item is HighlightedIngredient => Boolean(item));
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
}

function createEmptyFormState(): RecipeFormState {
  return {
    recipeSubmitted: false,
    trainerRecipePdf: '',
    trainerGroceryList: '',
    trainerWorkshopBrief: '',
    trainerPhotos: [''],
    highlightedIngredients: [{ name: '', source: '', photo: '' }],
    finalRecipeTitle: '',
    finalRecipePdf: '',
    finalRecipeBrief: '',
    finalRecipeTitleAr: '',
    finalRecipePdfAr: '',
    finalRecipeBriefAr: '',
    finalRecipeVisibleToCustomers: false,
    adminWorkshopNotes: '',
    adminWorkshopNotesPhoto: '',
  };
}

function mapDetailToForm(detail: RecipeSessionDetail): RecipeFormState {
  const normalizedPhotos = normalizeStringArray(detail.trainer_photos?.length ? detail.trainer_photos : detail.photos);
  const normalizedIngredients = normalizeIngredients(detail.highlighted_ingredients);

  return {
    recipeSubmitted: detail.recipe_submitted,
    trainerRecipePdf: detail.recipe_pdf ?? '',
    trainerGroceryList: detail.grocery_list ?? '',
    trainerWorkshopBrief: detail.workshop_brief ?? '',
    trainerPhotos: normalizedPhotos.length > 0 ? normalizedPhotos : [''],
    highlightedIngredients: normalizedIngredients.length > 0 ? normalizedIngredients : [{ name: '', source: '', photo: '' }],
    finalRecipeTitle: detail.final_recipe_title ?? '',
    finalRecipePdf: detail.final_recipe_pdf ?? '',
    finalRecipeBrief: detail.final_recipe_brief ?? '',
    finalRecipeTitleAr: detail.final_recipe_title_ar ?? '',
    finalRecipePdfAr: detail.final_recipe_pdf_ar ?? '',
    finalRecipeBriefAr: detail.final_recipe_brief_ar ?? '',
    finalRecipeVisibleToCustomers: detail.final_recipe_visible_to_customers,
    adminWorkshopNotes: detail.admin_workshop_notes ?? '',
    adminWorkshopNotesPhoto: detail.admin_workshop_notes_photo ?? '',
  };
}

function serializeFormState(formState: RecipeFormState) {
  return JSON.stringify({
    ...formState,
    trainerPhotos: formState.trainerPhotos.map((item) => item.trim()),
    highlightedIngredients: formState.highlightedIngredients.map((item) => ({
      name: item.name.trim(),
      source: item.source.trim(),
      photo: item.photo.trim(),
    })),
    trainerRecipePdf: formState.trainerRecipePdf.trim(),
    trainerGroceryList: formState.trainerGroceryList.trim(),
    trainerWorkshopBrief: formState.trainerWorkshopBrief.trim(),
    finalRecipeTitle: formState.finalRecipeTitle.trim(),
    finalRecipePdf: formState.finalRecipePdf.trim(),
    finalRecipeBrief: formState.finalRecipeBrief.trim(),
    finalRecipeTitleAr: formState.finalRecipeTitleAr.trim(),
    finalRecipePdfAr: formState.finalRecipePdfAr.trim(),
    finalRecipeBriefAr: formState.finalRecipeBriefAr.trim(),
    adminWorkshopNotes: formState.adminWorkshopNotes.trim(),
    adminWorkshopNotesPhoto: formState.adminWorkshopNotesPhoto.trim(),
  });
}

export default function AdminRecipesPageClient({ locale }: { locale: Locale }) {
  const isArabic = locale === 'ar';

  const [sessions, setSessions] = useState<RecipeSessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedSessionDetails, setSelectedSessionDetails] = useState<RecipeSessionDetail | null>(null);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'submitted' | 'missing' | 'finalized'>('all');
  const [timeline, setTimeline] = useState<'all' | 'upcoming' | 'past'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'trainer' | 'final' | 'notes'>('overview');

  const [formState, setFormState] = useState<RecipeFormState>(createEmptyFormState());
  const [initialFormSnapshot, setInitialFormSnapshot] = useState(serializeFormState(createEmptyFormState()));

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const t = {
    title: isArabic ? 'إدارة الوصفات (احترافي)' : 'Recipes Management (Professional)',
    subtitle: isArabic
      ? 'إدارة شاملة لوصفات الورش: إرسال المدربة، الوصفة النهائية للعملاء، الملاحظات الداخلية، والتحليلات.'
      : 'Complete workshop recipe operations: trainer submissions, final customer recipe, internal notes, and feedback analytics.',
    search: isArabic ? 'ابحث باسم الورشة، السلاج، أو المدربة...' : 'Search by class title, slug, or trainer...',
    statusAll: isArabic ? 'الكل' : 'All',
    statusSubmitted: isArabic ? 'تم إرسال المدربة' : 'Trainer Submitted',
    statusMissing: isArabic ? 'بانتظار الإرسال' : 'Missing Submission',
    statusFinalized: isArabic ? 'منشور للعملاء' : 'Published to Customers',
    timelineAll: isArabic ? 'كل الأوقات' : 'All Time',
    timelineUpcoming: isArabic ? 'ورش قادمة' : 'Upcoming',
    timelinePast: isArabic ? 'ورش سابقة' : 'Past Workshops',
    noData: isArabic ? 'لا توجد جلسات مطابقة.' : 'No matching sessions found.',
    selectSession: isArabic ? 'اختر جلسة لبدء الإدارة' : 'Select a session to start management',
    save: isArabic ? 'حفظ شامل' : 'Save All Changes',
    saving: isArabic ? 'جارٍ الحفظ...' : 'Saving...',
    updated: isArabic ? 'تم حفظ بيانات الوصفة بنجاح.' : 'Recipe management data saved successfully.',
    unsaved: isArabic ? 'يوجد تغييرات غير محفوظة' : 'You have unsaved changes',
    clean: isArabic ? 'كل التغييرات محفوظة' : 'All changes are saved',
    tabs: {
      overview: isArabic ? 'نظرة عامة' : 'Overview',
      trainer: isArabic ? 'إرسال المدربة' : 'Trainer Submission',
      final: isArabic ? 'الوصفة النهائية' : 'Final Recipe',
      notes: isArabic ? 'ملاحظات وفيدباك' : 'Notes & Feedback',
    },
    metrics: {
      totalSessions: isArabic ? 'إجمالي الجلسات' : 'Total Sessions',
      submitted: isArabic ? 'مرسل من المدربة' : 'Trainer Submitted',
      published: isArabic ? 'منشور للعملاء' : 'Published to Customers',
      participants: isArabic ? 'إجمالي المشاركين' : 'Total Participants',
    },
    workflowMissing: isArabic ? 'بانتظار الإرسال' : 'Submission Missing',
    workflowSubmitted: isArabic ? 'مرسل وجاهز للمراجعة' : 'Submitted for Review',
    workflowFinal: isArabic ? 'منشور للعملاء' : 'Published to Customers',
    workshopStats: {
      seats: isArabic ? 'المقاعد' : 'Seats',
      booked: isArabic ? 'محجوز' : 'Booked',
      participants: isArabic ? 'المشاركون' : 'Participants',
      feedback: isArabic ? 'التقييمات' : 'Feedback',
    },
    trainerSection: {
      submitted: isArabic ? 'تم إرسال ملف الوصفة من المدربة' : 'Trainer submission completed',
      recipePdf: isArabic ? 'رابط ملف الوصفة (PDF)' : 'Trainer Recipe PDF URL',
      groceryList: isArabic ? 'قائمة المشتريات' : 'Grocery List',
      workshopBrief: isArabic ? 'ملخص الورشة' : 'Workshop Brief',
      photos: isArabic ? 'صور الورشة/المكونات' : 'Workshop/Ingredient Photos',
      ingredients: isArabic ? 'المكونات المميزة (ديناميكي)' : 'Highlighted Ingredients (Dynamic)',
      ingredientName: isArabic ? 'اسم المكون' : 'Ingredient Name',
      ingredientSource: isArabic ? 'مصدر الشراء' : 'Where to Buy',
      ingredientPhoto: isArabic ? 'صورة المكون (URL)' : 'Ingredient Photo URL',
      addPhoto: isArabic ? 'إضافة صورة' : 'Add Photo URL',
      addIngredient: isArabic ? 'إضافة مكون' : 'Add Ingredient',
    },
    finalSection: {
      title: isArabic ? 'عنوان الوصفة النهائية' : 'Final Recipe Title',
      pdf: isArabic ? 'ملف الوصفة النهائية (PDF)' : 'Final Recipe PDF URL',
      brief: isArabic ? 'الوصف النهائي للعملاء' : 'Final Customer Brief',
      titleAr: isArabic ? 'عنوان الوصفة النهائية بالعربية' : 'Arabic Final Recipe Title',
      pdfAr: isArabic ? 'ملف الوصفة العربية (PDF)' : 'Arabic Final Recipe PDF URL',
      briefAr: isArabic ? 'الوصف النهائي بالعربية' : 'Arabic Final Customer Brief',
      englishHeading: isArabic ? 'المحتوى الإنجليزي' : 'English content',
      arabicHeading: isArabic ? 'المحتوى العربي' : 'Arabic content',
      visible: isArabic ? 'إظهار الوصفة للعملاء في حساباتهم' : 'Make final recipe visible to customers',
      publishedAt: isArabic ? 'تاريخ النشر' : 'Published At',
    },
    notesSection: {
      adminNotes: isArabic ? 'ملاحظات الأدمن الداخلية' : 'Admin Internal Workshop Notes',
      adminPhoto: isArabic ? 'صورة للملاحظات (URL)' : 'Admin Notes Photo URL',
      bookings: isArabic ? 'تفاصيل الحجوزات' : 'Booking Details',
      feedback: isArabic ? 'ملاحظات العملاء' : 'Customer Feedback',
      noBookings: isArabic ? 'لا توجد حجوزات لهذه الجلسة.' : 'No bookings found for this session.',
      noFeedback: isArabic ? 'لا توجد تقييمات مرئية بعد.' : 'No visible feedback yet.',
    },
    notAvailable: isArabic ? 'غير متاح' : 'Not available',
  };

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ status, timeline });
      if (search.trim()) params.set('search', search.trim());

      const response = await fetch(`/api/admin/recipes?${params.toString()}`, { cache: 'no-store' });
      const payload = (await response.json().catch(() => ({}))) as {
        sessions?: Array<RecipeSessionSummary & { highlighted_ingredients?: unknown; trainer_photos?: unknown; photos?: unknown }>;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load recipes');
      }

      const rawSessions = Array.isArray(payload.sessions) ? payload.sessions : [];
      const normalized = rawSessions.map((session) => ({
        ...session,
        highlighted_ingredients: normalizeIngredients(session.highlighted_ingredients),
        trainer_photos: normalizeStringArray(session.trainer_photos),
        photos: normalizeStringArray(session.photos),
      }));

      setSessions(normalized);
      setSelectedSessionId((previous) => {
        if (normalized.some((item) => item.id === previous)) {
          return previous;
        }
        return normalized[0]?.id ?? '';
      });
    } catch (requestError) {
      setSessions([]);
      setSelectedSessionId('');
      setSelectedSessionDetails(null);
      setError(requestError instanceof Error ? requestError.message : 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  }, [search, status, timeline]);

  const loadSessionDetails = useCallback(async (sessionId: string) => {
    if (!sessionId) {
      setSelectedSessionDetails(null);
      return;
    }

    setDetailLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/recipes/${sessionId}`, { cache: 'no-store' });
      const payload = (await response.json().catch(() => ({}))) as {
        session?: RecipeSessionDetail & { highlighted_ingredients?: unknown; trainer_photos?: unknown; photos?: unknown };
        error?: string;
      };

      if (!response.ok || !payload.session) {
        throw new Error(payload.error || 'Failed to load session details');
      }

      const detail = {
        ...payload.session,
        highlighted_ingredients: normalizeIngredients(payload.session.highlighted_ingredients),
        trainer_photos: normalizeStringArray(payload.session.trainer_photos),
        photos: normalizeStringArray(payload.session.photos),
      };

      setSelectedSessionDetails(detail);
      const mapped = mapDetailToForm(detail);
      setFormState(mapped);
      setInitialFormSnapshot(serializeFormState(mapped));
    } catch (requestError) {
      setSelectedSessionDetails(null);
      const fallback = createEmptyFormState();
      setFormState(fallback);
      setInitialFormSnapshot(serializeFormState(fallback));
      setError(requestError instanceof Error ? requestError.message : 'Failed to load session details');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (!selectedSessionId) {
      setSelectedSessionDetails(null);
      const fallback = createEmptyFormState();
      setFormState(fallback);
      setInitialFormSnapshot(serializeFormState(fallback));
      return;
    }

    void loadSessionDetails(selectedSessionId);
  }, [selectedSessionId, loadSessionDetails]);

  const selectedSession = useMemo(
    () => sessions.find((item) => item.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions]
  );

  const hasUnsavedChanges = useMemo(
    () => serializeFormState(formState) !== initialFormSnapshot,
    [formState, initialFormSnapshot]
  );

  const summaryMetrics = useMemo(() => {
    const totalSessions = sessions.length;
    const trainerSubmitted = sessions.filter((item) => item.recipe_submitted).length;
    const published = sessions.filter((item) => item.final_recipe_visible_to_customers).length;
    const participants = sessions.reduce((sum, item) => sum + (Number(item.participants_count) || 0), 0);

    return {
      totalSessions,
      trainerSubmitted,
      published,
      participants,
    };
  }, [sessions]);

  const handleSave = async () => {
    if (!selectedSessionId) return;

    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const payload = {
        recipeSubmitted: formState.recipeSubmitted,
        trainerRecipePdf: formState.trainerRecipePdf.trim() || null,
        trainerGroceryList: formState.trainerGroceryList.trim() || null,
        trainerWorkshopBrief: formState.trainerWorkshopBrief.trim() || null,
        trainerPhotos: formState.trainerPhotos.map((item) => item.trim()).filter(Boolean),
        highlightedIngredients: formState.highlightedIngredients
          .map((ingredient) => ({
            name: ingredient.name.trim(),
            source: ingredient.source.trim(),
            photo: ingredient.photo.trim(),
          }))
          .filter((ingredient) => ingredient.name || ingredient.source || ingredient.photo),
        finalRecipeTitle: formState.finalRecipeTitle.trim() || null,
        finalRecipePdf: formState.finalRecipePdf.trim() || null,
        finalRecipeBrief: formState.finalRecipeBrief.trim() || null,
        finalRecipeTitleAr: formState.finalRecipeTitleAr.trim() || null,
        finalRecipePdfAr: formState.finalRecipePdfAr.trim() || null,
        finalRecipeBriefAr: formState.finalRecipeBriefAr.trim() || null,
        finalRecipeVisibleToCustomers: formState.finalRecipeVisibleToCustomers,
        adminWorkshopNotes: formState.adminWorkshopNotes.trim() || null,
        adminWorkshopNotesPhoto: formState.adminWorkshopNotesPhoto.trim() || null,
      };

      const response = await fetch(`/api/admin/recipes/${selectedSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responsePayload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(responsePayload.error || 'Failed to save recipe data');
      }

      setInfo(t.updated);

      await Promise.all([loadSessions(), loadSessionDetails(selectedSessionId)]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to save recipe data');
    } finally {
      setSaving(false);
    }
  };

  const workflowChip = (session: RecipeSessionSummary | null) => {
    if (!session) return null;

    if (session.final_recipe_visible_to_customers) {
      return {
        label: t.workflowFinal,
        classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      };
    }

    if (session.recipe_submitted) {
      return {
        label: t.workflowSubmitted,
        classes: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
      };
    }

    return {
      label: t.workflowMissing,
      classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    };
  };

  const selectedWorkflow = workflowChip(selectedSession);

  const updateTrainerPhoto = (index: number, value: string) => {
    setFormState((previous) => {
      const next = [...previous.trainerPhotos];
      next[index] = value;
      return { ...previous, trainerPhotos: next };
    });
  };

  const removeTrainerPhoto = (index: number) => {
    setFormState((previous) => {
      const next = previous.trainerPhotos.filter((_, photoIndex) => photoIndex !== index);
      return { ...previous, trainerPhotos: next.length > 0 ? next : [''] };
    });
  };

  const addTrainerPhoto = () => {
    setFormState((previous) => ({
      ...previous,
      trainerPhotos: [...previous.trainerPhotos, ''],
    }));
  };

  const updateIngredient = (index: number, field: keyof HighlightedIngredient, value: string) => {
    setFormState((previous) => {
      const next = [...previous.highlightedIngredients];
      next[index] = { ...next[index], [field]: value };
      return { ...previous, highlightedIngredients: next };
    });
  };

  const removeIngredient = (index: number) => {
    setFormState((previous) => {
      const next = previous.highlightedIngredients.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...previous,
        highlightedIngredients: next.length > 0 ? next : [{ name: '', source: '', photo: '' }],
      };
    });
  };

  const addIngredient = () => {
    setFormState((previous) => ({
      ...previous,
      highlightedIngredients: [...previous.highlightedIngredients, { name: '', source: '', photo: '' }],
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{t.title}</h1>
      </div>

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">{t.metrics.totalSessions}</p>
          <p className="mt-1 text-xl font-black text-zinc-900 dark:text-zinc-100">{summaryMetrics.totalSessions}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">{t.metrics.submitted}</p>
          <p className="mt-1 text-xl font-black text-sky-700 dark:text-sky-300">{summaryMetrics.trainerSubmitted}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">{t.metrics.published}</p>
          <p className="mt-1 text-xl font-black text-emerald-700 dark:text-emerald-300">{summaryMetrics.published}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">{t.metrics.participants}</p>
          <p className="mt-1 text-xl font-black text-zinc-900 dark:text-zinc-100">{summaryMetrics.participants}</p>
        </div>
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
        <aside className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
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

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: 'all', label: t.statusAll },
                  { key: 'submitted', label: t.statusSubmitted },
                  { key: 'missing', label: t.statusMissing },
                  { key: 'finalized', label: t.statusFinalized },
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

              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'all', label: t.timelineAll },
                  { key: 'upcoming', label: t.timelineUpcoming },
                  { key: 'past', label: t.timelinePast },
                ] as const).map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setTimeline(option.key)}
                    className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${
                      timeline === option.key
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
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
                const workflow = workflowChip(session);

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
                      {new Date(session.start_date_time).toLocaleString(isArabic ? 'ar-OM-u-nu-latn' : 'en-OM', { timeZone: 'Asia/Muscat' })}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${workflow?.classes}`}>{workflow?.label}</span>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        <FiUsers className="mr-1 inline size-3" />
                        {session.participants_count}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          {!selectedSession ? (
            <div className="flex min-h-[360px] items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
              {t.selectSession}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="relative size-14 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                      {selectedSession.class_image ? (
                        <Image
                          src={selectedSession.class_image}
                          alt={selectedSession.class_title}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
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
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{selectedSession.trainer_name || t.notAvailable}</p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(selectedSession.start_date_time).toLocaleString(isArabic ? 'ar-OM-u-nu-latn' : 'en-OM', { timeZone: 'Asia/Muscat' })}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {selectedWorkflow ? (
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${selectedWorkflow.classes}`}>
                        {selectedWorkflow.label}
                      </span>
                    ) : null}
                    <div className="grid grid-cols-2 gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                      <div className="rounded-lg bg-white px-2 py-1 dark:bg-zinc-900/70">
                        {t.workshopStats.participants}: {selectedSession.participants_count}
                      </div>
                      <div className="rounded-lg bg-white px-2 py-1 dark:bg-zinc-900/70">
                        {t.workshopStats.booked}: {selectedSession.seats_booked}/{selectedSession.seats_total_effective ?? '-'}
                      </div>
                      <div className="rounded-lg bg-white px-2 py-1 dark:bg-zinc-900/70">
                        {t.workshopStats.feedback}: {selectedSession.feedback_count}
                      </div>
                      <div className="rounded-lg bg-white px-2 py-1 dark:bg-zinc-900/70">
                        ★ {selectedSession.average_rating ?? '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {([
                  { key: 'overview', label: t.tabs.overview, icon: FiLayers },
                  { key: 'trainer', label: t.tabs.trainer, icon: FiList },
                  { key: 'final', label: t.tabs.final, icon: FiEye },
                  { key: 'notes', label: t.tabs.notes, icon: FiMessageSquare },
                ] as const).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                        isActive
                          ? 'border-[color:var(--noon-teal)] bg-[color:var(--noon-teal)] text-white'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <Icon className="size-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {detailLoading ? (
                <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  ...
                </div>
              ) : null}

              {!detailLoading && selectedSessionDetails ? (
                <>
                  {activeTab === 'overview' ? (
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.workshopStats.seats}</p>
                          <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {selectedSessionDetails.seats_total_effective ?? '-'}
                          </p>
                        </div>
                        <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.workshopStats.booked}</p>
                          <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {selectedSessionDetails.seats_booked}
                          </p>
                        </div>
                        <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.workshopStats.participants}</p>
                          <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {selectedSessionDetails.participants_count}
                          </p>
                        </div>
                        <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.workshopStats.feedback}</p>
                          <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {selectedSessionDetails.feedback_count} ({selectedSessionDetails.average_rating ?? '-'})
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.notesSection.bookings}</p>
                        {selectedSessionDetails.bookings.length === 0 ? (
                          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{t.notesSection.noBookings}</p>
                        ) : (
                          <div className="mt-3 overflow-x-auto">
                            <table className="min-w-full text-left text-xs">
                              <thead className="text-zinc-500 dark:text-zinc-400">
                                <tr>
                                  <th className="py-2 pe-3">#</th>
                                  <th className="py-2 pe-3">Customer</th>
                                  <th className="py-2 pe-3">Participants</th>
                                  <th className="py-2 pe-3">Status</th>
                                  <th className="py-2">Created</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedSessionDetails.bookings.slice(0, 10).map((booking) => (
                                  <tr key={booking.id} className="border-t border-zinc-200 dark:border-zinc-800">
                                    <td className="py-2 pe-3 font-medium text-zinc-700 dark:text-zinc-300">{booking.booking_number}</td>
                                    <td className="py-2 pe-3 text-zinc-600 dark:text-zinc-300">{booking.customer_name}</td>
                                    <td className="py-2 pe-3 text-zinc-600 dark:text-zinc-300">{booking.number_of_participants}</td>
                                    <td className="py-2 pe-3 text-zinc-600 dark:text-zinc-300">{booking.status}</td>
                                    <td className="py-2 text-zinc-500 dark:text-zinc-400">
                                      {new Date(booking.created_at).toLocaleDateString(isArabic ? 'ar-OM-u-nu-latn' : 'en-OM', { timeZone: 'Asia/Muscat' })}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {activeTab === 'trainer' ? (
                    <div className="space-y-4">
                      <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600">
                        <input
                          type="checkbox"
                          checked={formState.recipeSubmitted}
                          onChange={(event) =>
                            setFormState((previous) => ({ ...previous, recipeSubmitted: event.target.checked }))
                          }
                          className="size-4 rounded border-zinc-300 text-[color:var(--noon-teal)] focus:ring-[color:var(--noon-teal)]"
                        />
                        <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.trainerSection.submitted}</span>
                      </label>

                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.trainerSection.recipePdf}</span>
                        <input
                          value={formState.trainerRecipePdf}
                          onChange={(event) =>
                            setFormState((previous) => ({ ...previous, trainerRecipePdf: event.target.value }))
                          }
                          placeholder="https://..."
                          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>

                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.trainerSection.groceryList}</span>
                        <textarea
                          value={formState.trainerGroceryList}
                          onChange={(event) =>
                            setFormState((previous) => ({ ...previous, trainerGroceryList: event.target.value }))
                          }
                          rows={5}
                          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>

                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.trainerSection.workshopBrief}</span>
                        <textarea
                          value={formState.trainerWorkshopBrief}
                          onChange={(event) =>
                            setFormState((previous) => ({ ...previous, trainerWorkshopBrief: event.target.value }))
                          }
                          rows={5}
                          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>

                      <div className="space-y-2 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.trainerSection.photos}</p>
                          <button
                            type="button"
                            onClick={addTrainerPhoto}
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          >
                            <FiPlus className="size-3.5" />
                            {t.trainerSection.addPhoto}
                          </button>
                        </div>
                        {formState.trainerPhotos.map((photo, index) => (
                          <div key={`photo-${index}`} className="flex items-center gap-2">
                            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                              <FiImage className="size-4" />
                            </span>
                            <input
                              value={photo}
                              onChange={(event) => updateTrainerPhoto(index, event.target.value)}
                              placeholder="https://..."
                              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                            <button
                              type="button"
                              onClick={() => removeTrainerPhoto(index)}
                              className="inline-flex size-8 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/20"
                              aria-label="Remove photo"
                            >
                              <FiTrash2 className="size-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.trainerSection.ingredients}</p>
                          <button
                            type="button"
                            onClick={addIngredient}
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          >
                            <FiPlus className="size-3.5" />
                            {t.trainerSection.addIngredient}
                          </button>
                        </div>

                        {formState.highlightedIngredients.map((ingredient, index) => (
                          <div key={`ingredient-${index}`} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                            <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
                              <input
                                value={ingredient.name}
                                onChange={(event) => updateIngredient(index, 'name', event.target.value)}
                                placeholder={t.trainerSection.ingredientName}
                                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                              />
                              <input
                                value={ingredient.source}
                                onChange={(event) => updateIngredient(index, 'source', event.target.value)}
                                placeholder={t.trainerSection.ingredientSource}
                                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                              />
                              <input
                                value={ingredient.photo}
                                onChange={(event) => updateIngredient(index, 'photo', event.target.value)}
                                placeholder={t.trainerSection.ingredientPhoto}
                                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                              />
                              <button
                                type="button"
                                onClick={() => removeIngredient(index)}
                                className="inline-flex h-10 items-center justify-center rounded-lg border border-rose-200 px-3 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/20"
                                aria-label="Remove ingredient"
                              >
                                <FiTrash2 className="size-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {activeTab === 'final' ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-4">
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.finalSection.englishHeading}</p>
                          <label className="space-y-1 text-sm">
                            <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.finalSection.title}</span>
                            <input
                              value={formState.finalRecipeTitle}
                              onChange={(event) =>
                                setFormState((previous) => ({ ...previous, finalRecipeTitle: event.target.value }))
                              }
                              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </label>

                          <label className="space-y-1 text-sm">
                            <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.finalSection.pdf}</span>
                            <input
                              value={formState.finalRecipePdf}
                              onChange={(event) =>
                                setFormState((previous) => ({ ...previous, finalRecipePdf: event.target.value }))
                              }
                              placeholder="https://..."
                              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </label>

                          <label className="space-y-1 text-sm">
                            <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.finalSection.brief}</span>
                            <textarea
                              value={formState.finalRecipeBrief}
                              onChange={(event) =>
                                setFormState((previous) => ({ ...previous, finalRecipeBrief: event.target.value }))
                              }
                              rows={6}
                              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </label>
                        </div>

                        <div className="space-y-4">
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.finalSection.arabicHeading}</p>
                          <label className="space-y-1 text-sm">
                            <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.finalSection.titleAr}</span>
                            <input
                              value={formState.finalRecipeTitleAr}
                              onChange={(event) =>
                                setFormState((previous) => ({ ...previous, finalRecipeTitleAr: event.target.value }))
                              }
                              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </label>

                          <label className="space-y-1 text-sm">
                            <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.finalSection.pdfAr}</span>
                            <input
                              value={formState.finalRecipePdfAr}
                              onChange={(event) =>
                                setFormState((previous) => ({ ...previous, finalRecipePdfAr: event.target.value }))
                              }
                              placeholder="https://..."
                              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </label>

                          <label className="space-y-1 text-sm">
                            <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.finalSection.briefAr}</span>
                            <textarea
                              value={formState.finalRecipeBriefAr}
                              onChange={(event) =>
                                setFormState((previous) => ({ ...previous, finalRecipeBriefAr: event.target.value }))
                              }
                              rows={6}
                              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </label>
                        </div>
                      </div>

                      <label
                        className={`inline-flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
                          formState.finalRecipeVisibleToCustomers
                            ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-900/20'
                            : 'border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950'
                        }`}
                      >
                        <div>
                          <p className="font-medium text-zinc-800 dark:text-zinc-100">{t.finalSection.visible}</p>
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {t.finalSection.publishedAt}:{' '}
                            {selectedSessionDetails.final_recipe_published_at
                              ? new Date(selectedSessionDetails.final_recipe_published_at).toLocaleString(isArabic ? 'ar-OM-u-nu-latn' : 'en-OM', { timeZone: 'Asia/Muscat' })
                              : '-'}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={formState.finalRecipeVisibleToCustomers}
                          onChange={(event) =>
                            setFormState((previous) => ({
                              ...previous,
                              finalRecipeVisibleToCustomers: event.target.checked,
                            }))
                          }
                          className="size-4 rounded border-zinc-300 text-[color:var(--noon-teal)] focus:ring-[color:var(--noon-teal)]"
                        />
                      </label>
                    </div>
                  ) : null}

                  {activeTab === 'notes' ? (
                    <div className="space-y-4">
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.notesSection.adminNotes}</span>
                        <textarea
                          value={formState.adminWorkshopNotes}
                          onChange={(event) =>
                            setFormState((previous) => ({ ...previous, adminWorkshopNotes: event.target.value }))
                          }
                          rows={6}
                          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>

                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.notesSection.adminPhoto}</span>
                        <input
                          value={formState.adminWorkshopNotesPhoto}
                          onChange={(event) =>
                            setFormState((previous) => ({ ...previous, adminWorkshopNotesPhoto: event.target.value }))
                          }
                          placeholder="https://..."
                          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>

                      <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.notesSection.feedback}</p>
                        {selectedSessionDetails.feedback.length === 0 ? (
                          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{t.notesSection.noFeedback}</p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {selectedSessionDetails.feedback.slice(0, 12).map((feedback) => (
                              <div
                                key={feedback.id}
                                className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40"
                              >
                                <div className="flex items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                                  <span className="font-semibold text-zinc-700 dark:text-zinc-200">{feedback.customer_name}</span>
                                  <span>
                                    <FiClock className="mr-1 inline size-3" />
                                    {new Date(feedback.created_at).toLocaleDateString(isArabic ? 'ar-OM-u-nu-latn' : 'en-OM', { timeZone: 'Asia/Muscat' })} • ★ {feedback.rating}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{feedback.comment || '-'}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <div
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                    hasUnsavedChanges
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  }`}
                >
                  {hasUnsavedChanges ? <FiClock className="size-3.5" /> : <FiCheckCircle className="size-3.5" />}
                  {hasUnsavedChanges ? t.unsaved : t.clean}
                </div>

                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving || !selectedSession || !hasUnsavedChanges}
                  className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--noon-teal)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FiSave className="size-4" />
                  {saving ? t.saving : t.save}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
