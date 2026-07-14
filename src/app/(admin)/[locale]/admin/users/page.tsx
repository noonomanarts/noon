import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isLocale, type Locale } from "@/lib/locale";
import { getUserById, getAllUsers } from "@/lib/db/users";
import AdminUsersTableClient from "@/components/admin/AdminUsersTableClient";

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

  const roleLabels: Record<string, string> = {
    ADMIN: t.admin,
    TRAINER: t.trainer,
    CUSTOMER: t.user,
    EMPLOYEE: t.employee,
    SOCIAL_MEDIA_ADMIN: t.socialMediaAdmin,
    WORKER: t.worker,
    PHOTOGRAPHER: t.photographer,
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

      {/* Users Table with search (by name or phone number) */}
      <AdminUsersTableClient
        locale={locale}
        roleLabels={roleLabels}
        users={users.map((user) => ({
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber ?? null,
          role: user.role,
          profileImage: user.profileImage ?? null,
        }))}
      />
    </div>
  );
}
