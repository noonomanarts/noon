import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isLocale, type Locale } from "@/lib/locale";
import { getUserById, getAllUsers } from "@/lib/db/users";
import type { UserRole } from "@/lib/db/types";

type DisplayRole = "admin" | "trainer" | "user" | "employee" | "social_media_admin" | "worker" | "photographer";

function mapRoleToDisplay(role: UserRole): DisplayRole {
  if (role === "CUSTOMER") return "user";
  if (role === "ADMIN") return "admin";
  if (role === "TRAINER") return "trainer";
  if (role === "EMPLOYEE") return "employee";
  if (role === "WORKER") return "worker";
  if (role === "PHOTOGRAPHER") return "photographer";
  return "social_media_admin";
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
    socialMediaAdmin: locale === "ar" ? "مدير السوشيال ميديا" : "Social Media Admin",
    employee: locale === "ar" ? "موظف" : "Employee",
    trainer: locale === "ar" ? "مدرب" : "Trainer",
    user: locale === "ar" ? "مستخدم" : "User",
    worker: locale === "ar" ? "عامل" : "Worker",
    photographer: locale === "ar" ? "مصور" : "Photographer",
    active: locale === "ar" ? "نشط" : "Active",
    totalUsers: locale === "ar" ? "إجمالي المستخدمين" : "Total Users",
    admins: locale === "ar" ? "المدراء" : "Admins",
    trainers: locale === "ar" ? "المدربون" : "Trainers",
    customers: locale === "ar" ? "العملاء" : "Customers",
    employees: locale === "ar" ? "الموظفون" : "Employees",
    socialMediaAdmins: locale === "ar" ? "مدراء السوشيال ميديا" : "Social Media Admins",
    workers: locale === "ar" ? "العمال" : "Workers",
    photographers: locale === "ar" ? "المصورون" : "Photographers",
  };

  const roleLabels = {
    admin: t.admin,
    trainer: t.trainer,
    user: t.user,
    employee: t.employee,
    social_media_admin: t.socialMediaAdmin,
    worker: t.worker,
    photographer: t.photographer,
  };

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    trainers: users.filter((u) => u.role === "TRAINER").length,
    users: users.filter((u) => u.role === "CUSTOMER").length,
    employees: users.filter((u) => u.role === "EMPLOYEE").length,
    socialMediaAdmins: users.filter((u) => u.role === "SOCIAL_MEDIA_ADMIN").length,
    workers: users.filter((u) => u.role === "WORKER").length,
    photographers: users.filter((u) => u.role === "PHOTOGRAPHER").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{t.title}</h1>
        <Link
          href={`/${locale}/admin/users/new`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">{t.addUser}</span>
          <span className="sm:hidden">Add</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 lg:grid-cols-8">
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">{t.totalUsers}</div>
          <div className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">{stats.total}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">{t.admins}</div>
          <div className="mt-1 text-xl font-bold text-indigo-600 dark:text-indigo-400">{stats.admins}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">{t.trainers}</div>
          <div className="mt-1 text-xl font-bold text-teal-600 dark:text-teal-400">{stats.trainers}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">{t.customers}</div>
          <div className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.users}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">{t.employees}</div>
          <div className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">{stats.employees}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">{t.socialMediaAdmins}</div>
          <div className="mt-1 text-xl font-bold text-sky-600 dark:text-sky-400">{stats.socialMediaAdmins}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">{t.workers}</div>
          <div className="mt-1 text-xl font-bold text-rose-600 dark:text-rose-400">{stats.workers}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">{t.photographers}</div>
          <div className="mt-1 text-xl font-bold text-violet-600 dark:text-violet-400">{stats.photographers}</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.name}</th>
                <th className="hidden px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 sm:table-cell">{t.email}</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.role}</th>
                <th className="hidden px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 sm:table-cell">{t.status}</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative size-8 shrink-0 overflow-hidden rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-white dark:text-zinc-900">
                        {user.profileImage ? (
                          <span className="absolute inset-0" style={{ backgroundImage: `url(${user.profileImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                        ) : (
                          <div className="flex size-full items-center justify-center">{user.fullName?.charAt(0) || "U"}</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{user.fullName}</div>
                        <div className="truncate text-xs text-zinc-500 dark:text-zinc-400 sm:hidden">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-3 py-3 text-xs text-zinc-600 dark:text-zinc-400 sm:table-cell">{user.email}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.role === "ADMIN"
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                          : user.role === "TRAINER"
                            ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                            : user.role === "EMPLOYEE"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                              : user.role === "SOCIAL_MEDIA_ADMIN"
                                ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                                : user.role === "WORKER"
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                                  : user.role === "PHOTOGRAPHER"
                                    ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      }`}
                    >
                      {roleLabels[mapRoleToDisplay(user.role)]}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
