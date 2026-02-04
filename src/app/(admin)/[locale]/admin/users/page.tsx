import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isLocale, type Locale } from "@/lib/locale";
import { getUserById, getAllUsers } from "@/lib/db/users";
import type { UserRole } from "@/lib/db/types";

type DisplayRole = "admin" | "trainer" | "user";

function mapRoleToDisplay(role: UserRole): DisplayRole {
  return role === "CUSTOMER" ? "user" : role === "ADMIN" ? "admin" : "trainer";
}

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  // Auth check
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("noon_session")?.value;

  if (!sessionId) {
    redirect(`/${locale}/login`);
  }

  const currentUser = await getUserById(sessionId);
  if (!currentUser || currentUser.role !== "ADMIN") {
    redirect(`/${locale}/account`);
  }

  const users = await getAllUsers();

  const t = {
    title: locale === "ar" ? "إدارة المستخدمين" : "User Management",
    addUser: locale === "ar" ? "إضافة مستخدم جديد" : "Add New User",
    search: locale === "ar" ? "بحث..." : "Search...",
    name: locale === "ar" ? "الاسم" : "Name",
    email: locale === "ar" ? "البريد الإلكتروني" : "Email",
    role: locale === "ar" ? "الدور" : "Role",
    status: locale === "ar" ? "الحالة" : "Status",
    actions: locale === "ar" ? "الإجراءات" : "Actions",
    edit: locale === "ar" ? "تعديل" : "Edit",
    delete: locale === "ar" ? "حذف" : "Delete",
    admin: locale === "ar" ? "مدير" : "Admin",
    trainer: locale === "ar" ? "مدرب" : "Trainer",
    user: locale === "ar" ? "مستخدم" : "User",
    active: locale === "ar" ? "نشط" : "Active",
    totalUsers: locale === "ar" ? "إجمالي المستخدمين" : "Total Users",
    admins: locale === "ar" ? "المدراء" : "Admins",
    trainers: locale === "ar" ? "المدربون" : "Trainers",
    customers: locale === "ar" ? "العملاء" : "Customers",
  };

  const roleLabels = {
    admin: t.admin,
    trainer: t.trainer,
    user: t.user,
  };

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    trainers: users.filter((u) => u.role === "TRAINER").length,
    users: users.filter((u) => u.role === "CUSTOMER").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {t.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {locale === "ar" 
              ? "إدارة المستخدمين والصلاحيات"
              : "Manage users and permissions"}
          </p>
        </div>
        <Link
          href={`/${locale}/admin/users/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t.addUser}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {t.totalUsers}
          </div>
          <div className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            {stats.total}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {t.admins}
          </div>
          <div className="mt-2 text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            {stats.admins}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {t.trainers}
          </div>
          <div className="mt-2 text-3xl font-bold text-teal-600 dark:text-teal-400">
            {stats.trainers}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {t.customers}
          </div>
          <div className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.users}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {t.name}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {t.email}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {t.role}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {t.status}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {t.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative size-10 overflow-hidden rounded-full bg-zinc-900 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">
                        {user.profileImage ? (
                          <div className="size-full relative">
                            <span className="absolute inset-0" style={{ backgroundImage: `url(${user.profileImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                          </div>
                        ) : (
                          <div className="flex size-full items-center justify-center">
                            {user.fullName?.charAt(0) || "U"}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {user.fullName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        user.role === "ADMIN"
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                          : user.role === "TRAINER"
                            ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      }`}
                    >
                      {roleLabels[mapRoleToDisplay(user.role)]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                      {t.active}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/${locale}/admin/users/${user.id}`}
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      {t.edit}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
