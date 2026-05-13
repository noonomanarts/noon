'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  GiCookingPot, 
  GiPalette,
} from 'react-icons/gi';
import { 
  IoCheckmarkCircle,
  IoEye,
  IoAdd,
  IoTrash,
  IoPencil,
  IoCheckmark,
  IoWarning,
  IoCopy,
  IoChevronBack,
  IoChevronForward,
} from 'react-icons/io5';
import { 
  MdSearch,
  MdFilterList,
} from 'react-icons/md';
import { 
  BiSolidBookAlt,
} from 'react-icons/bi';
import { FiMoreVertical } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
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
  sessions?: Array<{
    startDateTime?: string | null;
    endDateTime?: string | null;
  }>;
  _count: {
    bookings: number;
  };
}

interface Stats {
  total: number;
  published: number;
  draft: number;
  cooking: number;
  artsCrafts: number;
}

export default function AdminClassesPage() {
  const ITEMS_PER_PAGE = 10;
  const ACTIONS_MENU_WIDTH = 176;
  const ACTIONS_MENU_HEIGHT = 188;
  const ACTIONS_MENU_GAP = 8;
  const VIEWPORT_PADDING = 12;
  const params = useParams();
  const locale = params.locale as string;
  const { toast } = useAppFeedback();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<ClassItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    published: 0,
    draft: 0,
    cooking: 0,
    artsCrafts: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [openActionsMenuId, setOpenActionsMenuId] = useState<string | null>(null);
  const [actionsMenuPosition, setActionsMenuPosition] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean; classId: string; title: string}>({
    isOpen: false,
    classId: '',
    title: ''
  });
  const totalPages = Math.max(1, Math.ceil(filteredClasses.length / ITEMS_PER_PAGE));
  const paginatedClasses = filteredClasses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  function formatCategoryLabel(value: string) {
    return value.replaceAll('_', ' ');
  }

  function formatClassDateTime(classItem: ClassItem) {
    const startValue = classItem.startDateTime || classItem.sessions?.[0]?.startDateTime || null;
    const endValue = classItem.endDateTime || classItem.sessions?.[0]?.endDateTime || null;

    if (!startValue) {
      return {
        date: locale === 'ar' ? 'غير محدد' : 'Not scheduled',
        time: locale === 'ar' ? 'لا يوجد وقت' : 'No time set',
      };
    }

    const startDate = new Date(startValue);
    if (Number.isNaN(startDate.getTime())) {
      return {
        date: locale === 'ar' ? 'تاريخ غير صالح' : 'Invalid date',
        time: locale === 'ar' ? 'تحقق من البيانات' : 'Check data',
      };
    }

    const endDate = endValue ? new Date(endValue) : null;
    const dateFormatter = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-OM' : 'en-OM', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Muscat',
    });
    const timeFormatter = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-OM' : 'en-OM', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Asia/Muscat',
    });

    const date = dateFormatter.format(startDate);
    const time = endDate && !Number.isNaN(endDate.getTime())
      ? `${timeFormatter.format(startDate)} - ${timeFormatter.format(endDate)}`
      : timeFormatter.format(startDate);

    return { date, time };
  }

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    filterClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, categoryFilter, statusFilter, classes]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest('.class-actions-menu')) {
        setOpenActionsMenuId(null);
        setActionsMenuPosition(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenActionsMenuId(null);
        setActionsMenuPosition(null);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!openActionsMenuId) return;

    function handleViewportChange() {
      setOpenActionsMenuId(null);
      setActionsMenuPosition(null);
    }

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [openActionsMenuId]);

  async function fetchClasses() {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/classes?limit=1000');
      const result = await response.json();
      const data = result.classes || [];
      setClasses(data);
      
      // Calculate stats
      const newStats = {
        total: data.length,
        published: data.filter((c: ClassItem) => c.status === 'PUBLISHED').length,
        draft: data.filter((c: ClassItem) => c.status === 'DRAFT').length,
        cooking: data.filter((c: ClassItem) => c.category === 'COOKING').length,
        artsCrafts: data.filter((c: ClassItem) => c.category === 'ARTS_CRAFTS').length,
      };
      setStats(newStats);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function filterClasses() {
    let filtered = [...classes];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(c => 
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.trainer?.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.slug.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter(c => c.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    setFilteredClasses(filtered);
  }

  async function handleDelete(classId: string, title: string) {
    setOpenActionsMenuId(null);
    setActionsMenuPosition(null);
    setDeleteModal({ isOpen: true, classId, title });
  }

  function toggleActionsMenu(classId: string, trigger: HTMLButtonElement) {
    if (openActionsMenuId === classId) {
      setOpenActionsMenuId(null);
      setActionsMenuPosition(null);
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING;
    const spaceAbove = rect.top - VIEWPORT_PADDING;
    const placement: 'top' | 'bottom' =
      spaceBelow < ACTIONS_MENU_HEIGHT && spaceAbove > spaceBelow ? 'top' : 'bottom';
    const left = Math.min(
      Math.max(VIEWPORT_PADDING, rect.right - ACTIONS_MENU_WIDTH),
      window.innerWidth - ACTIONS_MENU_WIDTH - VIEWPORT_PADDING,
    );
    const rawTop = placement === 'top'
      ? rect.top - ACTIONS_MENU_HEIGHT - ACTIONS_MENU_GAP
      : rect.bottom + ACTIONS_MENU_GAP;
    const top = Math.min(
      Math.max(VIEWPORT_PADDING, rawTop),
      window.innerHeight - ACTIONS_MENU_HEIGHT - VIEWPORT_PADDING,
    );

    setOpenActionsMenuId(classId);
    setActionsMenuPosition({
      top,
      left,
      placement,
    });
  }

  async function confirmDelete() {
    const { classId } = deleteModal;
    setDeleteModal({ isOpen: false, classId: '', title: '' });

    try {
      const response = await fetch(`/api/admin/classes/${classId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchClasses();
      } else {
        toast({ title: 'Delete failed', message: 'Failed to delete class', tone: 'error' });
      }
    } catch (error) {
      console.error('Failed to delete class:', error);
      toast({ title: 'Delete failed', message: 'Failed to delete class', tone: 'error' });
    }
  }

  async function toggleStatus(classId: string, currentStatus: string) {
    const newStatus = currentStatus === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    
    try {
      const response = await fetch(`/api/admin/classes/${classId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchClasses();
      } else {
        toast({ title: 'Status update failed', message: 'Failed to update status', tone: 'error' });
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      toast({ title: 'Status update failed', message: 'Failed to update status', tone: 'error' });
    }
  }

  async function duplicateClass(classId: string) {
    try {
      const response = await fetch(`/api/admin/classes/${classId}/duplicate`, {
        method: 'POST',
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to duplicate class');
      }

      await fetchClasses();
    } catch (error) {
      console.error('Failed to duplicate class:', error);
      toast({
        title: 'Duplicate failed',
        message: error instanceof Error ? error.message : 'Failed to duplicate class',
        tone: 'error',
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            Classes Management
          </h1>
        </div>
        <Link
          href={`/${locale}/admin/classes/new`}
          className="inline-flex items-center gap-2 rounded-lg border border-teal-900 bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-teal-900/20 transition-all hover:bg-teal-800 hover:shadow-lg hover:shadow-teal-900/30 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        >
          <IoAdd className="h-5 w-5" />
          Add New Class
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Classes */}
        <div className="group relative overflow-hidden rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50 to-cyan-50 p-5 shadow-sm transition-all hover:shadow-md dark:border-teal-900/30 dark:from-teal-950/30 dark:to-cyan-950/30">
          <div className="absolute -right-4 -top-4 opacity-10">
            <BiSolidBookAlt className="h-24 w-24 text-teal" />
          </div>
          <div className="relative">
            <div className="text-3xl font-bold text-teal dark:text-teal-light">{stats.total}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-teal-700 dark:text-teal-400">Total Classes</div>
          </div>
        </div>

        {/* Published */}
        <div className="group relative overflow-hidden rounded-xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-5 shadow-sm transition-all hover:shadow-md dark:border-green-900/30 dark:from-green-950/30 dark:to-emerald-950/30">
          <div className="absolute -right-4 -top-4 opacity-10">
            <IoCheckmarkCircle className="h-24 w-24 text-green-600" />
          </div>
          <div className="relative">
            <div className="text-3xl font-bold text-green-700 dark:text-green-400">{stats.published}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-green-600 dark:text-green-500">Published</div>
          </div>
        </div>

        {/* Draft */}
        <div className="group relative overflow-hidden rounded-xl border border-yellow-100 bg-gradient-to-br from-yellow-50 to-amber-50 p-5 shadow-sm transition-all hover:shadow-md dark:border-yellow-900/30 dark:from-yellow-950/30 dark:to-amber-950/30">
          <div className="absolute -right-4 -top-4 opacity-10">
            <IoPencil className="h-24 w-24 text-yellow" />
          </div>
          <div className="relative">
            <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">{stats.draft}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-yellow-600 dark:text-yellow-500">Draft</div>
          </div>
        </div>

        {/* Cooking Classes */}
        <div className="group relative overflow-hidden rounded-xl border border-coral/20 bg-gradient-to-br from-coral/5 to-orange-50 p-5 shadow-sm transition-all hover:shadow-md dark:border-coral-900/30 dark:from-coral-950/30 dark:to-orange-950/30">
          <div className="absolute -right-4 -top-4 opacity-10">
            <GiCookingPot className="h-24 w-24 text-coral" />
          </div>
          <div className="relative">
            <div className="text-3xl font-bold text-coral dark:text-coral-light">{stats.cooking}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-coral-700 dark:text-coral-400">Cooking</div>
          </div>
        </div>

        {/* Arts & Crafts */}
        <div className="group relative overflow-hidden rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50 p-5 shadow-sm transition-all hover:shadow-md dark:border-purple-900/30 dark:from-purple-950/30 dark:to-pink-950/30">
          <div className="absolute -right-4 -top-4 opacity-10">
            <GiPalette className="h-24 w-24 text-purple" />
          </div>
          <div className="relative">
            <div className="text-3xl font-bold text-purple dark:text-purple-light">{stats.artsCrafts}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-purple-600 dark:text-purple-500">Arts & Crafts</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <MdSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by class name, trainer, or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm transition-colors focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <MdFilterList className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium transition-colors focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="ALL">All Categories</option>
              <option value="COOKING">Cooking</option>
              <option value="ARTS_CRAFTS">Arts & Crafts</option>
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium transition-colors focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          >
            <option value="ALL">All Status</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          {/* Clear Filters */}
          {(searchQuery || categoryFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="text-sm font-medium text-coral transition-colors hover:text-coral-dark"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Classes Table */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/95 shadow-[0_22px_70px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.03] backdrop-blur-sm dark:border-zinc-700/80 dark:bg-zinc-900/95 dark:ring-white/[0.03]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal/40 to-transparent" />
        <div className="pointer-events-none absolute inset-x-6 top-0 h-16 bg-gradient-to-b from-zinc-100/70 to-transparent dark:from-white/[0.03]" />
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-teal/20 border-t-teal"></div>
              <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Loading classes...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="lg:hidden">
              {paginatedClasses.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <div className="inline-flex flex-col items-center">
                    <div className="rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
                      <BiSolidBookAlt className="h-8 w-8 text-zinc-400" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-white">
                      {searchQuery || categoryFilter !== 'ALL' || statusFilter !== 'ALL'
                        ? 'No classes match your filters'
                        : 'No classes found'}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                      {searchQuery || categoryFilter !== 'ALL' || statusFilter !== 'ALL'
                        ? 'Try adjusting your search or filters'
                        : 'Create your first class to get started'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-3 sm:p-4">
                  {paginatedClasses.map((classItem) => {
                    const scheduledAt = formatClassDateTime(classItem);

                    return (
                      <article
                        key={`mobile-${classItem.id}`}
                        className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] dark:border-zinc-700/80 dark:bg-zinc-900/90"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`rounded-lg p-2.5 ${
                            classItem.category === 'COOKING'
                              ? 'bg-coral/10 text-coral'
                              : 'bg-purple/10 text-purple'
                          }`}>
                            {classItem.category === 'COOKING' ? (
                              <GiCookingPot className="h-5 w-5" />
                            ) : (
                              <GiPalette className="h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-base font-semibold text-zinc-900 dark:text-white">{classItem.title}</div>
                            <div className="mt-1 flex flex-wrap gap-2">
                              <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                {formatCategoryLabel(classItem.category)}
                              </span>
                              <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                {formatCategoryLabel(classItem.subCategory)}
                              </span>
                            </div>
                          </div>
                          <div className="class-actions-menu relative">
                            <button
                              type="button"
                              onClick={(event) => toggleActionsMenu(classItem.id, event.currentTarget)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-white"
                              aria-label="Open actions menu"
                              aria-expanded={openActionsMenuId === classItem.id}
                            >
                              <FiMoreVertical className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-lg bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/70">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Trainer</div>
                            <div className="mt-1 truncate text-sm font-medium text-zinc-900 dark:text-white">{classItem.trainer?.fullName || '—'}</div>
                          </div>
                          <div className="rounded-lg bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/70">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Price</div>
                            <div className="mt-1 whitespace-nowrap text-sm font-semibold text-zinc-900 dark:text-white">{classItem.price} {classItem.currency}</div>
                          </div>
                          <div className="rounded-lg bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/70">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Date</div>
                            <div className="mt-1 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-white">{scheduledAt.date}</div>
                            <div className="mt-0.5 whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">{scheduledAt.time}</div>
                          </div>
                          <div className="rounded-lg bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/70">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Status</div>
                            <div className="mt-1 flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                                classItem.status === 'PUBLISHED'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : classItem.status === 'DRAFT'
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-300'
                              }`}>
                                {classItem.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-3 py-2.5 dark:border-zinc-700/80 dark:bg-zinc-800/60">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Bookings</div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                            <HiSparkles className="h-3 w-3" />
                            {classItem._count.bookings}
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1180px]">
              <thead className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/50">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Class
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Category
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Trainer
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Date
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Price
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Bookings
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Status
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {paginatedClasses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="inline-flex flex-col items-center">
                        <div className="rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
                          <BiSolidBookAlt className="h-8 w-8 text-zinc-400" />
                        </div>
                        <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-white">
                          {searchQuery || categoryFilter !== 'ALL' || statusFilter !== 'ALL' 
                            ? 'No classes match your filters' 
                            : 'No classes found'}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                          {searchQuery || categoryFilter !== 'ALL' || statusFilter !== 'ALL'
                            ? 'Try adjusting your search or filters'
                            : 'Create your first class to get started'}
                        </p>
                        {!(searchQuery || categoryFilter !== 'ALL' || statusFilter !== 'ALL') && (
                          <Link
                            href={`/${locale}/admin/classes/new`}
                            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-dark"
                          >
                            <IoAdd className="h-4 w-4" />
                            Create First Class
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedClasses.map((classItem) => {
                    const scheduledAt = formatClassDateTime(classItem);

                    return (
                    <tr key={classItem.id} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`rounded-lg p-2 ${
                            classItem.category === 'COOKING' 
                              ? 'bg-coral/10 text-coral' 
                              : 'bg-purple/10 text-purple'
                          }`}>
                            {classItem.category === 'COOKING' ? (
                              <GiCookingPot className="h-5 w-5" />
                            ) : (
                              <GiPalette className="h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="max-w-[240px] truncate whitespace-nowrap font-semibold text-zinc-900 dark:text-white">{classItem.title}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-200">
                          {formatCategoryLabel(classItem.category)}
                        </div>
                        <div className="mt-0.5 whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-500">
                          {formatCategoryLabel(classItem.subCategory)}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-700 dark:text-zinc-300">
                        <div className="max-w-[160px] truncate whitespace-nowrap">{classItem.trainer?.fullName || '—'}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-200">
                          {scheduledAt.date}
                        </div>
                        <div className="mt-0.5 whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-500">
                          {scheduledAt.time}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="whitespace-nowrap text-sm font-semibold text-zinc-900 dark:text-white">
                          {classItem.price} {classItem.currency}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                          <HiSparkles className="h-3 w-3" />
                          {classItem._count.bookings}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleStatus(classItem.id, classItem.status)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all hover:shadow-sm ${
                            classItem.status === 'PUBLISHED'
                              ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                              : classItem.status === 'DRAFT'
                                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50'
                                : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                          }`}
                        >
                          {classItem.status === 'PUBLISHED' && <IoCheckmark className="h-3 w-3" />}
                          {classItem.status === 'DRAFT' && <IoPencil className="h-3 w-3" />}
                          {classItem.status}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="class-actions-menu relative flex justify-end">
                          <button
                            type="button"
                            onClick={(event) => toggleActionsMenu(classItem.id, event.currentTarget)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-white"
                            aria-label="Open actions menu"
                            aria-expanded={openActionsMenuId === classItem.id}
                          >
                            <FiMoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>

      {openActionsMenuId && actionsMenuPosition ? (
        <div
          className="class-actions-menu fixed z-[160] w-44 overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.16)] ring-1 ring-black/5 backdrop-blur-sm dark:border-zinc-700/80 dark:bg-zinc-900"
          style={{ top: actionsMenuPosition.top, left: actionsMenuPosition.left }}
        >
          <div className="py-2">
            <Link
              href={`/${locale}/admin/classes/${openActionsMenuId}`}
              onClick={() => {
                setOpenActionsMenuId(null);
                setActionsMenuPosition(null);
              }}
              className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
            >
              <IoEye className="h-4 w-4" />
              View
            </Link>
            <Link
              href={`/${locale}/admin/classes/${openActionsMenuId}/edit`}
              onClick={() => {
                setOpenActionsMenuId(null);
                setActionsMenuPosition(null);
              }}
              className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            >
              <IoPencil className="h-4 w-4" />
              Edit
            </Link>
            <button
              type="button"
              onClick={() => {
                const classId = openActionsMenuId;
                setOpenActionsMenuId(null);
                setActionsMenuPosition(null);
                void duplicateClass(classId);
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-amber-700 transition hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
            >
              <IoCopy className="h-4 w-4" />
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => {
                const classItem = classes.find((item) => item.id === openActionsMenuId);
                if (!classItem) return;
                void handleDelete(classItem.id, classItem.title);
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-red-700 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <IoTrash className="h-4 w-4" />
              Delete
            </button>
          </div>
          <div
            className={`pointer-events-none absolute right-4 h-3 w-3 rotate-45 border-zinc-200/80 bg-white dark:border-zinc-700/80 dark:bg-zinc-900 ${
              actionsMenuPosition.placement === 'top'
                ? '-bottom-[7px] border-b border-r'
                : '-top-[7px] border-l border-t'
            }`}
          />
        </div>
      ) : null}

      {/* Results Summary */}
      {!isLoading && filteredClasses.length > 0 && (
        <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredClasses.length)} of {filteredClasses.length} classes
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            >
              <IoChevronBack className="h-4 w-4" />
              Prev
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, index) => index + 1)
                .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                .map((page, index, pages) => {
                  const previousPage = pages[index - 1];
                  const showGap = previousPage && page - previousPage > 1;

                  return (
                    <div key={page} className="flex items-center gap-1">
                      {showGap ? <span className="px-1 text-sm text-zinc-400">...</span> : null}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-semibold transition ${
                          page === currentPage
                            ? 'bg-teal text-white shadow-sm'
                            : 'border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  );
                })}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            >
              Next
              <IoChevronForward className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md animate-in fade-in zoom-in rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
            {/* Header */}
            <div className="border-b border-zinc-200 p-6 dark:border-zinc-800">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <IoWarning className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                    Delete Class
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    This action cannot be undone
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-zinc-900 dark:text-white">
                  &quot;{deleteModal.title}&quot;
                </span>
                ?
              </p>
              <div className="mt-4 rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/30 dark:bg-yellow-900/10">
                <div className="flex gap-3">
                  <IoWarning className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-500" />
                  <div className="text-xs text-yellow-800 dark:text-yellow-200">
                    <p className="font-semibold">Important:</p>
                    <p className="mt-1">
                      If this class has existing bookings or sessions, it will be archived instead of deleted to preserve historical data.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-zinc-200 p-6 dark:border-zinc-800">
              <button
                onClick={() => setDeleteModal({ isOpen: false, classId: '', title: '' })}
                className="flex-1 rounded-lg border-2 border-zinc-200 px-4 py-2.5 font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 rounded-lg bg-gradient-to-r from-red-600 to-red-700 px-4 py-2.5 font-semibold text-white shadow-md transition-all hover:from-red-700 hover:to-red-800 hover:shadow-lg"
              >
                Delete Class
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
