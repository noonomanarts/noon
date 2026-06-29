'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { GiCookingPot, GiPalette } from 'react-icons/gi';
import {
  FiMoreVertical, FiSearch, FiFilter, FiPlus, FiEye, FiEdit3,
  FiCopy, FiTrash2, FiChevronLeft, FiChevronRight, FiAlertTriangle,
  FiBookOpen, FiX,
} from 'react-icons/fi';
import { useAppFeedback } from '@/components/ui/AppFeedbackProvider';

interface Trainer {
  id: string;
  fullName: string;
  email: string;
}

interface ClassItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  subCategory: string;
  price: number;
  currency: string;
  status: string;
  startDateTime?: string | null;
  endDateTime?: string | null;
  trainer: Trainer | null;
  sessions?: Array<{ startDateTime?: string | null; endDateTime?: string | null }>;
  seatsTotal?: number;
  _count: { bookings: number };
}

interface Stats {
  total: number;
  published: number;
  draft: number;
  cooking: number;
  artsCrafts: number;
}

const ITEMS_PER_PAGE = 10;
const MENU_W = 176;
const MENU_H = 200;
const MENU_GAP = 8;
const VP_PAD = 12;

export default function AdminClassesPage() {
  const params = useParams();
  const locale = params.locale as string;
  const isRTL = locale === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';
  const searchParams = useSearchParams();
  const { toast } = useAppFeedback();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<ClassItem[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, published: 0, draft: 0, cooking: 0, artsCrafts: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [subCategoryFilter] = useState(() => searchParams.get('subCategory') ?? 'ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; classId: string; title: string }>({
    isOpen: false, classId: '', title: '',
  });

  const totalPages = Math.max(1, Math.ceil(filteredClasses.length / ITEMS_PER_PAGE));
  const paginated = filteredClasses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const hasFilters = searchQuery || categoryFilter !== 'ALL' || statusFilter !== 'ALL';

  const t = {
    title: isRTL ? 'الورشات' : 'Workshops',
    addClass: isRTL ? 'إضافة ورشة' : 'Add Workshop',
    total: isRTL ? 'الإجمالي' : 'Total',
    published: isRTL ? 'منشور' : 'Published',
    draft: isRTL ? 'مسودة' : 'Draft',
    cooking: isRTL ? 'طبخ' : 'Cooking',
    arts: isRTL ? 'فنون' : 'Arts',
    searchPlaceholder: isRTL ? 'البحث بالاسم أو المدرب...' : 'Search by name or trainer…',
    allCategories: isRTL ? 'كل الفئات' : 'All Categories',
    artsCrafts: isRTL ? 'فنون وحرف' : 'Arts & Crafts',
    allStatuses: isRTL ? 'كل الحالات' : 'All Statuses',
    archived: isRTL ? 'مؤرشف' : 'Archived',
    clearFilters: isRTL ? 'مسح الفلاتر' : 'Clear Filters',
    workshopCol: isRTL ? 'الورشة' : 'Workshop',
    categoryCol: isRTL ? 'الفئة' : 'Category',
    trainerCol: isRTL ? 'المدرب' : 'Trainer',
    dateCol: isRTL ? 'التاريخ' : 'Date',
    priceCol: isRTL ? 'السعر' : 'Price',
    occupancyCol: isRTL ? 'الإشغال' : 'Occupancy',
    statusCol: isRTL ? 'الحالة' : 'Status',
    actionsCol: isRTL ? 'إجراءات' : 'Actions',
    statusPublished: isRTL ? 'منشور' : 'Published',
    statusDraft: isRTL ? 'مسودة' : 'Draft',
    statusArchived: isRTL ? 'مؤرشف' : 'Archived',
    statusCancelled: isRTL ? 'ملغي' : 'Cancelled',
    loading: isRTL ? 'جاري تحميل الورشات...' : 'Loading workshops…',
    noMatch: isRTL ? 'لا توجد ورشات تطابق الفلاتر' : 'No workshops match your filters',
    noClasses: isRTL ? 'لا توجد ورشات' : 'No workshops found',
    tryAdjust: isRTL ? 'جرب تعديل البحث أو الفلاتر' : 'Try adjusting your search or filters',
    createFirst: isRTL ? 'أنشئ أول ورشة للبدء' : 'Create your first workshop to get started',
    createFirstBtn: isRTL ? 'إنشاء أول ورشة' : 'Create First Workshop',
    view: isRTL ? 'عرض' : 'View',
    edit: isRTL ? 'تعديل' : 'Edit',
    duplicate: isRTL ? 'نسخ' : 'Duplicate',
    delete: isRTL ? 'حذف' : 'Delete',
    of: isRTL ? 'من أصل' : 'of',
    workshopsCount: isRTL ? 'ورشة' : 'workshops',
    showing: isRTL ? 'عرض' : 'Showing',
    prev: isRTL ? 'السابق' : 'Prev',
    next: isRTL ? 'التالي' : 'Next',
    deleteTitle: isRTL ? 'حذف الورشة' : 'Delete Workshop',
    deleteSubtitle: isRTL ? 'لا يمكن التراجع عن هذا الإجراء' : 'This action cannot be undone',
    deleteConfirmText: isRTL ? 'هل أنت متأكد من حذف' : 'Are you sure you want to delete',
    deleteImportant: isRTL ? 'مهم:' : 'Important:',
    deleteWarning: isRTL
      ? 'إذا كانت الورشة تحتوي على حجوزات أو جلسات، سيتم أرشفتها بدلاً من حذفها للحفاظ على البيانات.'
      : 'If this workshop has existing bookings or sessions, it will be archived instead of deleted to preserve historical data.',
    cancel: isRTL ? 'إلغاء' : 'Cancel',
    confirmDelete: isRTL ? 'حذف الورشة' : 'Delete Workshop',
    noTrainer: isRTL ? 'غير محدد' : '—',
    notScheduled: isRTL ? 'غير محدد' : 'Not scheduled',
    noTime: isRTL ? 'لا يوجد وقت' : 'No time set',
  };

  function statusLabel(status: string) {
    if (status === 'PUBLISHED') return t.statusPublished;
    if (status === 'DRAFT') return t.statusDraft;
    if (status === 'ARCHIVED') return t.statusArchived;
    if (status === 'CANCELLED') return t.statusCancelled;
    return status;
  }

  function categoryLabel(value: string) {
    if (isRTL) {
      if (value === 'COOKING') return 'طبخ';
      if (value === 'ARTS_CRAFTS') return 'فنون وحرف';
    }
    return value.replaceAll('_', ' ');
  }

  function formatDateTime(item: ClassItem) {
    const startValue = item.startDateTime ?? item.sessions?.[0]?.startDateTime ?? null;
    const endValue = item.endDateTime ?? item.sessions?.[0]?.endDateTime ?? null;
    if (!startValue) return { date: t.notScheduled, time: t.noTime };
    const start = new Date(startValue);
    if (Number.isNaN(start.getTime())) return { date: isRTL ? 'تاريخ غير صالح' : 'Invalid date', time: '—' };
    const end = endValue ? new Date(endValue) : null;
    const dateFmt = new Intl.DateTimeFormat(isRTL ? 'ar-OM' : 'en-OM', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Muscat' });
    const timeFmt = new Intl.DateTimeFormat(isRTL ? 'ar-OM' : 'en-OM', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Muscat' });
    const date = dateFmt.format(start);
    const time = end && !Number.isNaN(end.getTime())
      ? `${timeFmt.format(start)} - ${timeFmt.format(end)}`
      : timeFmt.format(start);
    return { date, time };
  }

  useEffect(() => { void fetchClasses(); }, []);
  useEffect(() => { filterClasses(); }, [searchQuery, categoryFilter, statusFilter, subCategoryFilter, classes]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setCurrentPage(1); }, [searchQuery, categoryFilter, statusFilter, subCategoryFilter]);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('.class-actions-menu')) {
        setOpenMenuId(null); setMenuPos(null);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpenMenuId(null); setMenuPos(null); }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('mousedown', onPointerDown); document.removeEventListener('keydown', onKeyDown); };
  }, []);

  useEffect(() => {
    if (!openMenuId) return;
    function onViewportChange() { setOpenMenuId(null); setMenuPos(null); }
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    return () => { window.removeEventListener('resize', onViewportChange); window.removeEventListener('scroll', onViewportChange, true); };
  }, [openMenuId]);

  async function fetchClasses() {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/classes?limit=1000');
      const result = await res.json();
      const data: ClassItem[] = result.classes || [];
      setClasses(data);
      setStats({
        total: data.length,
        published: data.filter(c => c.status === 'PUBLISHED').length,
        draft: data.filter(c => c.status === 'DRAFT').length,
        cooking: data.filter(c => c.category === 'COOKING').length,
        artsCrafts: data.filter(c => c.category === 'ARTS_CRAFTS').length,
      });
    } catch { /* silent */ } finally {
      setIsLoading(false);
    }
  }

  function filterClasses() {
    let filtered = [...classes];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(q) ||
        (c.trainer?.fullName ?? '').toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== 'ALL') filtered = filtered.filter(c => c.category === categoryFilter);
    if (statusFilter !== 'ALL') filtered = filtered.filter(c => c.status === statusFilter);
    if (subCategoryFilter !== 'ALL') filtered = filtered.filter(c => c.subCategory === subCategoryFilter);
    setFilteredClasses(filtered);
  }

  function toggleMenu(classId: string, btn: HTMLButtonElement) {
    if (openMenuId === classId) { setOpenMenuId(null); setMenuPos(null); return; }
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - VP_PAD;
    const spaceAbove = rect.top - VP_PAD;
    const placement: 'top' | 'bottom' = spaceBelow < MENU_H && spaceAbove > spaceBelow ? 'top' : 'bottom';
    const left = Math.min(Math.max(VP_PAD, rect.right - MENU_W), window.innerWidth - MENU_W - VP_PAD);
    const rawTop = placement === 'top' ? rect.top - MENU_H - MENU_GAP : rect.bottom + MENU_GAP;
    const top = Math.min(Math.max(VP_PAD, rawTop), window.innerHeight - MENU_H - VP_PAD);
    setOpenMenuId(classId);
    setMenuPos({ top, left, placement });
  }

  async function confirmDelete() {
    const { classId } = deleteModal;
    setDeleteModal({ isOpen: false, classId: '', title: '' });
    try {
      const res = await fetch(`/api/admin/classes/${classId}`, { method: 'DELETE' });
      if (res.ok) { void fetchClasses(); }
      else toast({ title: isRTL ? 'فشل الحذف' : 'Delete failed', message: isRTL ? 'تعذر حذف الورشة' : 'Failed to delete workshop', tone: 'error' });
    } catch {
      toast({ title: isRTL ? 'فشل الحذف' : 'Delete failed', message: isRTL ? 'تعذر حذف الورشة' : 'Failed to delete workshop', tone: 'error' });
    }
  }

  async function toggleStatus(classId: string, current: string) {
    const next = current === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      const res = await fetch(`/api/admin/classes/${classId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) void fetchClasses();
      else toast({ title: isRTL ? 'فشل تحديث الحالة' : 'Status update failed', message: '', tone: 'error' });
    } catch {
      toast({ title: isRTL ? 'فشل تحديث الحالة' : 'Status update failed', message: '', tone: 'error' });
    }
  }

  async function duplicateClass(classId: string) {
    try {
      const res = await fetch(`/api/admin/classes/${classId}/duplicate`, { method: 'POST' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to duplicate');
      void fetchClasses();
    } catch (err) {
      toast({ title: isRTL ? 'فشل النسخ' : 'Duplicate failed', message: err instanceof Error ? err.message : '', tone: 'error' });
    }
  }

  function StatusBadge({ status, clickable, onClick }: { status: string; clickable?: boolean; onClick?: () => void }) {
    const cfg: Record<string, string> = {
      PUBLISHED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      DRAFT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      ARCHIVED: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
      CANCELLED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    };
    const cls = `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg[status] ?? cfg['ARCHIVED']} ${clickable ? 'cursor-pointer transition hover:opacity-80' : ''}`;
    return clickable
      ? <button type="button" className={cls} onClick={onClick}>{statusLabel(status)}</button>
      : <span className={cls}>{statusLabel(status)}</span>;
  }

  const statsCards = [
    { value: stats.total, label: t.total, bg: 'from-[color:var(--noon-teal-soft)] to-cyan-50 border-[color:var(--noon-teal)]/20 dark:from-teal-950/40 dark:to-cyan-950/20 dark:border-teal-800/30', text: 'text-[color:var(--noon-teal-strong)]', sub: 'text-[color:var(--noon-teal)]' },
    { value: stats.published, label: t.published, bg: 'from-emerald-50 to-green-50 border-emerald-100 dark:from-emerald-950/30 dark:to-green-950/20 dark:border-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', sub: 'text-emerald-600 dark:text-emerald-500' },
    { value: stats.draft, label: t.draft, bg: 'from-amber-50 to-yellow-50 border-amber-100 dark:from-amber-950/30 dark:to-yellow-950/20 dark:border-amber-900/30', text: 'text-amber-700 dark:text-amber-400', sub: 'text-amber-600 dark:text-amber-500' },
    { value: stats.cooking, label: t.cooking, bg: 'from-orange-50 to-red-50 border-orange-100 dark:from-orange-950/30 dark:to-red-950/20 dark:border-orange-900/30', text: 'text-[color:var(--noon-coral)] dark:text-orange-400', sub: 'text-orange-600 dark:text-orange-500' },
    { value: stats.artsCrafts, label: t.arts, bg: 'from-purple-50 to-pink-50 border-purple-100 dark:from-purple-950/30 dark:to-pink-950/20 dark:border-purple-900/30', text: 'text-[color:var(--noon-purple)] dark:text-purple-400', sub: 'text-purple-600 dark:text-purple-500' },
  ];

  return (
    <div className="space-y-5" dir={dir}>
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">{t.title}</h1>
        <Link
          href={`/${locale}/admin/classes/new`}
          className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--noon-teal)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 active:scale-[0.98]"
        >
          <FiPlus className="size-4 shrink-0" />
          <span className="hidden sm:inline">{t.addClass}</span>
          <span className="sm:hidden"><FiPlus className="size-4" /></span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {statsCards.map((card) => (
          <div
            key={card.label}
            className={`overflow-hidden rounded-xl border bg-gradient-to-br p-3 shadow-sm sm:p-4 ${card.bg}`}
          >
            <div className={`text-xl font-bold sm:text-2xl ${card.text}`}>{card.value}</div>
            <div className={`mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wide sm:text-xs ${card.sub}`}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <FiSearch className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              dir={dir}
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pe-4 ps-10 text-sm transition focus:border-[color:var(--noon-teal)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500 dark:focus:bg-zinc-800/80"
            />
          </div>

          <div className="flex items-center gap-2">
            <FiFilter className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400" />

            {/* Category */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              dir={dir}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-medium transition focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="ALL">{t.allCategories}</option>
              <option value="COOKING">{isRTL ? 'طبخ' : 'Cooking'}</option>
              <option value="ARTS_CRAFTS">{t.artsCrafts}</option>
            </select>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              dir={dir}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-medium transition focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="ALL">{t.allStatuses}</option>
              <option value="PUBLISHED">{t.statusPublished}</option>
              <option value="DRAFT">{t.statusDraft}</option>
              <option value="ARCHIVED">{t.statusArchived}</option>
            </select>

            {hasFilters && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setCategoryFilter('ALL'); setStatusFilter('ALL'); }}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/40"
              >
                <FiX className="size-3.5" />
                <span className="hidden sm:inline">{t.clearFilters}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content card */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900">
        {isLoading ? (
          <div className="flex h-56 flex-col items-center justify-center gap-4">
            <div className="size-10 animate-spin rounded-full border-4 border-zinc-200 border-t-[color:var(--noon-teal)] dark:border-zinc-700 dark:border-t-[color:var(--noon-teal)]" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.loading}</p>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="rounded-2xl bg-zinc-100 p-5 dark:bg-zinc-800">
              <FiBookOpen className="size-8 text-zinc-400" />
            </div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
              {hasFilters ? t.noMatch : t.noClasses}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {hasFilters ? t.tryAdjust : t.createFirst}
            </p>
            {!hasFilters && (
              <Link
                href={`/${locale}/admin/classes/new`}
                className="mt-1 inline-flex items-center gap-2 rounded-xl bg-[color:var(--noon-teal)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                <FiPlus className="size-4" />
                {t.createFirstBtn}
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 lg:hidden">
              {paginated.map((item) => {
                const dt = formatDateTime(item);
                return (
                  <article key={item.id} className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Category icon */}
                      <div className={`mt-0.5 shrink-0 rounded-xl p-2.5 ${item.category === 'COOKING' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                        {item.category === 'COOKING' ? <GiCookingPot className="size-5" /> : <GiPalette className="size-5" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/${locale}/admin/classes/${item.id}`}
                          className="block truncate font-semibold text-zinc-900 hover:text-[color:var(--noon-teal)] dark:text-white"
                        >
                          {item.title}
                        </Link>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            {categoryLabel(item.category)}
                          </span>
                          <StatusBadge status={item.status} clickable onClick={() => void toggleStatus(item.id, item.status)} />
                        </div>
                      </div>

                      <div className="class-actions-menu shrink-0">
                        <button
                          type="button"
                          onClick={(e) => toggleMenu(item.id, e.currentTarget)}
                          className="flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-white"
                          aria-label="Actions"
                        >
                          <FiMoreVertical className="size-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{t.trainerCol}</div>
                        <div className="mt-1 truncate text-xs font-medium text-zinc-900 dark:text-white">{item.trainer?.fullName || t.noTrainer}</div>
                      </div>
                      <div className="rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{t.priceCol}</div>
                        <div className="mt-1 whitespace-nowrap text-xs font-semibold text-zinc-900 dark:text-white">{item.price} {item.currency}</div>
                      </div>
                      <div className="rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{t.occupancyCol}</div>
                        <div className="mt-1 flex items-center gap-1">
                          <span className="text-xs font-semibold text-zinc-900 dark:text-white">{item._count.bookings}/{item.seatsTotal ?? '—'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-1.5 rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{t.dateCol}:</div>
                      <div className="text-xs font-medium text-zinc-900 dark:text-white">{dt.date}</div>
                      <span className="text-zinc-300 dark:text-zinc-600">·</span>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">{dt.time}</div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[900px]" dir={dir}>
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/60">
                    {[t.workshopCol, t.categoryCol, t.trainerCol, t.dateCol, t.priceCol, t.occupancyCol, t.statusCol, t.actionsCol].map((h, i) => (
                      <th
                        key={h}
                        className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 ${i === 7 ? 'text-end' : 'text-start'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {paginated.map((item) => {
                    const dt = formatDateTime(item);
                    return (
                      <tr key={item.id} className="group transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                        {/* Workshop */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`shrink-0 rounded-lg p-2 ${item.category === 'COOKING' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                              {item.category === 'COOKING' ? <GiCookingPot className="size-4" /> : <GiPalette className="size-4" />}
                            </div>
                            <Link
                              href={`/${locale}/admin/classes/${item.id}`}
                              className="max-w-[220px] truncate text-sm font-semibold text-zinc-900 hover:text-[color:var(--noon-teal)] dark:text-white"
                            >
                              {item.title}
                            </Link>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3.5">
                          <div className="whitespace-nowrap text-sm text-zinc-700 dark:text-zinc-300">{categoryLabel(item.category)}</div>
                          <div className="whitespace-nowrap text-xs text-zinc-400 dark:text-zinc-500">{categoryLabel(item.subCategory)}</div>
                        </td>

                        {/* Trainer */}
                        <td className="px-4 py-3.5">
                          <div className="max-w-[140px] truncate whitespace-nowrap text-sm text-zinc-700 dark:text-zinc-300">
                            {item.trainer?.fullName || t.noTrainer}
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3.5">
                          <div className="whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-100">{dt.date}</div>
                          <div className="whitespace-nowrap text-xs text-zinc-400 dark:text-zinc-500">{dt.time}</div>
                        </td>

                        {/* Price */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-sm font-semibold text-zinc-900 dark:text-white">
                          {item.price} {item.currency}
                        </td>

                        {/* Occupancy */}
                        <td className="px-4 py-3.5">
                          {(() => {
                            const seats = item.seatsTotal ?? 0;
                            const booked = item._count.bookings;
                            const pct = seats > 0 ? Math.round((booked / seats) * 100) : 0;
                            const tone = pct >= 100
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : pct >= 70
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
                            return (
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>
                                {booked}/{seats || '—'} ({pct}%)
                              </span>
                            );
                          })()}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <StatusBadge status={item.status} clickable onClick={() => void toggleStatus(item.id, item.status)} />
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          <div className="class-actions-menu flex justify-end">
                            <button
                              type="button"
                              onClick={(e) => toggleMenu(item.id, e.currentTarget)}
                              className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 opacity-0 transition group-hover:opacity-100 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-white"
                              aria-label="Actions"
                            >
                              <FiMoreVertical className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && filteredClasses.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t.showing}{' '}
            <span className="font-semibold text-zinc-900 dark:text-white">
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredClasses.length)}
            </span>{' '}
            {t.of}{' '}
            <span className="font-semibold text-zinc-900 dark:text-white">{filteredClasses.length}</span>{' '}
            {t.workshopsCount}
          </p>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            >
              {isRTL ? <FiChevronRight className="size-4" /> : <FiChevronLeft className="size-4" />}
              {t.prev}
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((page, idx, arr) => {
                  const prev = arr[idx - 1];
                  return (
                    <div key={page} className="flex items-center gap-1">
                      {prev && page - prev > 1 && <span className="px-1 text-sm text-zinc-400">…</span>}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-3 text-sm font-semibold transition ${page === currentPage ? 'bg-[color:var(--noon-teal)] text-white shadow-sm' : 'border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800'}`}
                      >
                        {page}
                      </button>
                    </div>
                  );
                })}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            >
              {t.next}
              {isRTL ? <FiChevronLeft className="size-4" /> : <FiChevronRight className="size-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Floating actions menu */}
      {openMenuId && menuPos && (
        <div
          className="class-actions-menu fixed z-[200] w-44 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] ring-1 ring-black/5 dark:border-zinc-700/80 dark:bg-zinc-900"
          style={{ top: menuPos.top, left: menuPos.left }}
          dir={dir}
        >
          <nav className="py-1.5">
            <Link
              href={`/${locale}/admin/classes/${openMenuId}`}
              onClick={() => { setOpenMenuId(null); setMenuPos(null); }}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
            >
              <FiEye className="size-4 shrink-0" />
              {t.view}
            </Link>
            <Link
              href={`/${locale}/admin/classes/${openMenuId}/edit`}
              onClick={() => { setOpenMenuId(null); setMenuPos(null); }}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            >
              <FiEdit3 className="size-4 shrink-0" />
              {t.edit}
            </Link>
            <button
              type="button"
              onClick={() => { const id = openMenuId; setOpenMenuId(null); setMenuPos(null); void duplicateClass(id); }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-amber-700 transition hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
            >
              <FiCopy className="size-4 shrink-0" />
              {t.duplicate}
            </button>
            <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
            <button
              type="button"
              onClick={() => {
                const item = classes.find(c => c.id === openMenuId);
                if (!item) return;
                setOpenMenuId(null); setMenuPos(null);
                setDeleteModal({ isOpen: true, classId: item.id, title: item.title });
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
            >
              <FiTrash2 className="size-4 shrink-0" />
              {t.delete}
            </button>
          </nav>
          {/* Arrow */}
          <div
            className={`pointer-events-none absolute end-4 size-3 rotate-45 border-zinc-200/80 bg-white dark:border-zinc-700/80 dark:bg-zinc-900 ${menuPos.placement === 'top' ? '-bottom-[7px] border-b border-e' : '-top-[7px] border-s border-t'}`}
          />
        </div>
      )}

      {/* Delete modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center" dir={dir}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900 sm:rounded-2xl">
            <div className="border-b border-zinc-100 p-5 dark:border-zinc-800">
              <div className="flex items-center gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-900/30">
                  <FiAlertTriangle className="size-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white">{t.deleteTitle}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.deleteSubtitle}</p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {t.deleteConfirmText}{' '}
                <span className="font-semibold text-zinc-900 dark:text-white">&ldquo;{deleteModal.title}&rdquo;</span>?
              </p>
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
                <div className="flex gap-3">
                  <FiAlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="text-xs text-amber-800 dark:text-amber-300">
                    <p className="font-semibold">{t.deleteImportant}</p>
                    <p className="mt-1">{t.deleteWarning}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 border-t border-zinc-100 p-5 dark:border-zinc-800">
              <button
                onClick={() => setDeleteModal({ isOpen: false, classId: '', title: '' })}
                className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => void confirmDelete()}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 active:scale-[0.98]"
              >
                {t.confirmDelete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
