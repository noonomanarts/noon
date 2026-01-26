import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';

export default async function AdminClassesPage() {
  const classes = await prisma.class.findMany({
    include: {
      trainer: {
        select: {
          fullName: true,
        },
      },
      _count: {
        select: {
          sessions: true,
          bookings: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const stats = {
    total: classes.length,
    published: classes.filter((c) => c.status === 'PUBLISHED').length,
    draft: classes.filter((c) => c.status === 'DRAFT').length,
    cooking: classes.filter((c) => c.category === 'COOKING').length,
    artsCrafts: classes.filter((c) => c.category === 'ARTS_CRAFTS').length,
  };

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
          href="/admin/classes/new"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-md dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Class
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
          <div className="absolute right-2 top-2 opacity-5 transition-opacity group-hover:opacity-10">
            <svg className="h-16 w-16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
            </svg>
          </div>
          <div className="relative">
            <div className="text-3xl font-bold text-zinc-900 dark:text-white">{stats.total}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Total Classes</div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-5 shadow-sm transition-all hover:shadow-md dark:border-green-900/30 dark:from-green-950/30 dark:to-emerald-950/30">
          <div className="absolute right-2 top-2 opacity-10">
            <svg className="h-16 w-16 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </div>
          <div className="relative">
            <div className="text-3xl font-bold text-green-700 dark:text-green-400">{stats.published}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-green-600 dark:text-green-500">Published</div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-xl border border-yellow-100 bg-gradient-to-br from-yellow-50 to-amber-50 p-5 shadow-sm transition-all hover:shadow-md dark:border-yellow-900/30 dark:from-yellow-950/30 dark:to-amber-950/30">
          <div className="absolute right-2 top-2 opacity-10">
            <svg className="h-16 w-16 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61z" />
            </svg>
          </div>
          <div className="relative">
            <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">{stats.draft}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-yellow-600 dark:text-yellow-500">Draft</div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-xl border border-orange-100 bg-gradient-to-br from-orange-50 to-red-50 p-5 shadow-sm transition-all hover:shadow-md dark:border-orange-900/30 dark:from-orange-950/30 dark:to-red-950/30">
          <div className="absolute right-2 top-2 opacity-10">
            <svg className="h-16 w-16 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.5 6.9c1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-.53.12-1.03.3-1.48.54l1.47 1.47c.41-.17.91-.27 1.51-.27zM5.33 4.06L4.06 5.33 7.5 8.77c0 2.08 1.56 3.21 3.91 3.91l3.51 3.51c-.34.48-1.05.91-2.42.91-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c.96-.18 1.82-.55 2.45-1.12l2.22 2.22 1.27-1.27L5.33 4.06z" />
            </svg>
          </div>
          <div className="relative">
            <div className="text-3xl font-bold text-orange-700 dark:text-orange-400">{stats.cooking}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-orange-600 dark:text-orange-500">Cooking</div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50 p-5 shadow-sm transition-all hover:shadow-md dark:border-purple-900/30 dark:from-purple-950/30 dark:to-pink-950/30">
          <div className="absolute right-2 top-2 opacity-10">
            <svg className="h-16 w-16 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
            </svg>
          </div>
          <div className="relative">
            <div className="text-3xl font-bold text-purple-700 dark:text-purple-400">{stats.artsCrafts}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-purple-600 dark:text-purple-500">Arts & Crafts</div>
          </div>
        </div>
      </div>

      {/* Classes List */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {classes.map((classItem) => (
                <tr key={classItem.id} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-4">
                    <div className="font-medium text-zinc-900 dark:text-white">{classItem.title}</div>
                    <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
                      {classItem.slug}
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
                  <td className="px-4 py-4 text-sm font-semibold text-zinc-900 dark:text-white">
                    {classItem.price} {classItem.currency}
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      {classItem._count.sessions}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                      {classItem._count.bookings}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        classItem.status === 'PUBLISHED'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : classItem.status === 'DRAFT'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {classItem.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-3">
                      <Link
                        href={`/admin/classes/${classItem.id}`}
                        className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/classes/${classItem.id}/edit`}
                        className="text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/admin/classes/${classItem.id}/sessions`}
                        className="text-sm font-medium text-purple-600 transition-colors hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                      >
                        Sessions
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {classes.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="inline-flex flex-col items-center">
                      <div className="rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
                        <svg className="h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-white">No classes found</p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">Create your first class to get started.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
