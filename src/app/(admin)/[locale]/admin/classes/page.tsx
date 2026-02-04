'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  GiCookingPot, 
  GiPalette,
} from 'react-icons/gi';
import { 
  IoCalendar,
  IoCheckmarkCircle,
  IoEye,
  IoAdd,
  IoTrash,
  IoPencil,
  IoCheckmark,
  IoWarning,
} from 'react-icons/io5';
import { 
  MdSearch,
  MdFilterList,
} from 'react-icons/md';
import { 
  BiSolidBookAlt,
} from 'react-icons/bi';
import { HiSparkles } from 'react-icons/hi';

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
  trainer: Trainer;
  _count: {
    sessions: number;
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
  const params = useParams();
  const locale = params.locale as string;
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
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean; classId: string; title: string}>({
    isOpen: false,
    classId: '',
    title: ''
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    filterClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, categoryFilter, statusFilter, classes]);

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
        c.trainer.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
    setDeleteModal({ isOpen: true, classId, title });
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
        alert('Failed to delete class');
      }
    } catch (error) {
      console.error('Failed to delete class:', error);
      alert('Failed to delete class');
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
        alert('Failed to update status');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status');
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
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage cooking and arts & crafts classes
          </p>
        </div>
        <Link
          href={`/${locale}/admin/classes/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal to-teal/80 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:from-teal/90 hover:to-teal/70"
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
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-teal/20 border-t-teal"></div>
              <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Loading classes...</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Class
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Trainer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Sessions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Bookings
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredClasses.length === 0 ? (
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
                  filteredClasses.map((classItem) => (
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
                          <div>
                            <div className="font-semibold text-zinc-900 dark:text-white">{classItem.title}</div>
                            <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">{classItem.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
                          {classItem.category.replace('_', ' ')}
                        </div>
                        <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
                          {classItem.subCategory.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-700 dark:text-zinc-300">
                        {classItem.trainer.fullName}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                          {classItem.price} {classItem.currency}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          <IoCalendar className="h-3 w-3" />
                          {classItem._count.sessions}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                          <HiSparkles className="h-3 w-3" />
                          {classItem._count.bookings}
                        </span>
                      </td>
                      <td className="px-4 py-4">
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
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/${locale}/admin/classes/${classItem.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                            title="View Details"
                          >
                            <IoEye className="h-4 w-4" />
                            View
                          </Link>
                          <Link
                            href={`/${locale}/admin/classes/${classItem.id}/edit`}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                            title="Edit Class"
                          >
                            <IoPencil className="h-4 w-4" />
                            Edit
                          </Link>
                          <Link
                            href={`/${locale}/admin/classes/${classItem.id}/sessions`}
                            className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30"
                            title="Manage Sessions"
                          >
                            <IoCalendar className="h-4 w-4" />
                            Sessions
                          </Link>
                          <button
                            onClick={() => handleDelete(classItem.id, classItem.title)}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                            title="Delete Class"
                          >
                            <IoTrash className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Results Summary */}
      {!isLoading && filteredClasses.length > 0 && (
        <div className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Showing {filteredClasses.length} of {classes.length} classes
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
