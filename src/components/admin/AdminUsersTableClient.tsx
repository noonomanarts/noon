'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FiSearch } from 'react-icons/fi';

export type AdminUserRow = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  role: string;
  profileImage: string | null;
};

function normalizeDigits(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

export default function AdminUsersTableClient({
  locale,
  users,
  roleLabels,
}: {
  locale: string;
  users: AdminUserRow[];
  roleLabels: Record<string, string>;
}) {
  const isArabic = locale === 'ar';
  const [search, setSearch] = useState('');

  const t = {
    searchPlaceholder: isArabic ? 'ابحث بالاسم أو رقم الهاتف...' : 'Search by name or phone number...',
    name: isArabic ? 'الاسم' : 'Name',
    email: isArabic ? 'البريد الإلكتروني' : 'Email',
    phone: isArabic ? 'الهاتف' : 'Phone',
    role: isArabic ? 'الدور' : 'Role',
    status: isArabic ? 'الحالة' : 'Status',
    actions: isArabic ? 'الإجراءات' : 'Actions',
    edit: isArabic ? 'تعديل' : 'Edit',
    active: isArabic ? 'نشط' : 'Active',
    noResults: isArabic ? 'لا توجد نتائج مطابقة للبحث.' : 'No users match your search.',
    resultsCount: isArabic ? 'نتيجة' : 'results',
  };

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;

    const termDigits = normalizeDigits(term);

    return users.filter((user) => {
      const nameMatch = user.fullName?.toLowerCase().includes(term);
      const phoneMatch =
        termDigits.length > 0 && user.phoneNumber
          ? normalizeDigits(user.phoneNumber).includes(termDigits)
          : false;
      return nameMatch || phoneMatch;
    });
  }, [search, users]);

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <FiSearch className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pe-3 ps-9 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
        />
        {search.trim() ? (
          <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
            {filteredUsers.length} {t.resultsCount}
          </span>
        ) : null}
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.name}</th>
                <th className="hidden px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 sm:table-cell">{t.email}</th>
                <th className="hidden px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 md:table-cell">{t.phone}</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.role}</th>
                <th className="hidden px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 sm:table-cell">{t.status}</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-sm text-zinc-400">
                    {t.noResults}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="relative size-8 shrink-0 overflow-hidden rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-white dark:text-zinc-900">
                          {user.profileImage ? (
                            <span
                              className="absolute inset-0"
                              style={{ backgroundImage: `url(${user.profileImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center">{user.fullName?.charAt(0) || 'U'}</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{user.fullName}</div>
                          <div className="truncate text-xs text-zinc-500 dark:text-zinc-400 sm:hidden">{user.email}</div>
                          <div className="truncate text-xs text-zinc-500 dark:text-zinc-400 md:hidden" dir="ltr">
                            {user.phoneNumber || ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-3 py-3 text-xs text-zinc-600 dark:text-zinc-400 sm:table-cell">{user.email}</td>
                    <td className="hidden px-3 py-3 text-xs text-zinc-600 dark:text-zinc-400 md:table-cell" dir="ltr">
                      {user.phoneNumber || '—'}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          user.role === 'ADMIN'
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                            : user.role === 'TRAINER'
                              ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                              : user.role === 'EMPLOYEE'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                : user.role === 'SOCIAL_MEDIA_ADMIN'
                                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                                  : user.role === 'WORKER'
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                                    : user.role === 'PHOTOGRAPHER'
                                      ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        }`}
                      >
                        {roleLabels[user.role] ?? user.role}
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 sm:table-cell">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                        {t.active}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link
                        href={`/${locale}/admin/users/${user.id}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        {t.edit}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
