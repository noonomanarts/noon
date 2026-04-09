"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  dateOfBirth?: string | null;
  preferredLanguage: "ENGLISH" | "ARABIC";
  role: "ADMIN" | "TRAINER" | "CUSTOMER" | "EMPLOYEE" | "SOCIAL_MEDIA_ADMIN" | "WORKER" | "PHOTOGRAPHER";
  profileImage?: string;
}

interface WorkerPermissions {
  can_restock: boolean;
  can_print_labels: boolean;
  can_record_sales: boolean;
  can_manage_orders: boolean;
  can_print_bills: boolean;
}

type FormRole = "admin" | "trainer" | "user" | "employee" | "social_media_admin" | "worker" | "photographer";

function mapRoleToForm(role: User["role"]): FormRole {
  if (role === "CUSTOMER") return "user";
  if (role === "TRAINER") return "trainer";
  if (role === "EMPLOYEE") return "employee";
  if (role === "SOCIAL_MEDIA_ADMIN") return "social_media_admin";
  if (role === "WORKER") return "worker";
  if (role === "PHOTOGRAPHER") return "photographer";
  return "admin";
}

function mapLanguageToForm(lang: User["preferredLanguage"]): "en" | "ar" {
  return lang === "ARABIC" ? "ar" : "en";
}

export default function EditUserPage({
  params,
}: {
  params: Promise<{ locale: string; userId: string }>;
}) {
  const router = useRouter();
  const { locale, userId } = use(params);
  
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: "user" as FormRole,
    dob: "",
    preferredLanguage: "en" as "en" | "ar",
    newPassword: "",
    confirmPassword: "",
  });

  const [workerPermissions, setWorkerPermissions] = useState<WorkerPermissions>({
    can_restock: false,
    can_print_labels: false,
    can_record_sales: false,
    can_manage_orders: false,
    can_print_bills: false,
  });

  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string>("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const t = {
    title: locale === "ar" ? "تعديل المستخدم" : "Edit User",
    subtitle: locale === "ar" ? "تحديث معلومات المستخدم" : "Update user information",
    personalInfo: locale === "ar" ? "المعلومات الشخصية" : "Personal Information",
    profileImage: locale === "ar" ? "صورة الملف الشخصي" : "Profile Image",
    changeImage: locale === "ar" ? "تغيير الصورة" : "Change Image",
    fullName: locale === "ar" ? "الاسم الكامل" : "Full Name",
    email: locale === "ar" ? "البريد الإلكتروني" : "Email",
    phone: locale === "ar" ? "رقم الهاتف" : "Phone Number",
    dob: locale === "ar" ? "تاريخ الميلاد" : "Date of Birth",
    accountSettings: locale === "ar" ? "إعدادات الحساب" : "Account Settings",
    role: locale === "ar" ? "الدور" : "Role",
    language: locale === "ar" ? "اللغة المفضلة" : "Preferred Language",
    admin: locale === "ar" ? "مدير" : "Admin",
    socialMediaAdmin: locale === "ar" ? "مدير السوشيال ميديا" : "Social Media Admin",
    employee: locale === "ar" ? "موظف" : "Employee",
    trainer: locale === "ar" ? "مدرب" : "Trainer",
    user: locale === "ar" ? "مستخدم" : "User",
    worker: locale === "ar" ? "عامل" : "Worker",
    photographer: locale === "ar" ? "مصور" : "Photographer",
    english: locale === "ar" ? "الإنجليزية" : "English",
    arabic: locale === "ar" ? "العربية" : "Arabic",
    changePassword: locale === "ar" ? "تغيير كلمة المرور" : "Change Password",
    newPassword: locale === "ar" ? "كلمة المرور الجديدة" : "New Password",
    confirmPassword: locale === "ar" ? "تأكيد كلمة المرور" : "Confirm Password",
    leaveBlank: locale === "ar" ? "اتركه فارغًا إذا كنت لا تريد التغيير" : "Leave blank if you don't want to change",
    cancel: locale === "ar" ? "إلغاء" : "Cancel",
    deleteUser: locale === "ar" ? "حذف المستخدم" : "Delete User",
    saveChanges: locale === "ar" ? "حفظ التغييرات" : "Save Changes",
    saving: locale === "ar" ? "جارٍ الحفظ..." : "Saving...",
    loading: locale === "ar" ? "جارٍ التحميل..." : "Loading...",
    workerPermissions: locale === "ar" ? "صلاحيات العامل" : "Worker Permissions",
    canRestock: locale === "ar" ? "إضافة مخزون" : "Add Restock",
    canPrintLabels: locale === "ar" ? "طباعة الملصقات" : "Print Labels",
    canRecordSales: locale === "ar" ? "تسجيل المبيعات" : "Record Sales",
    canManageOrders: locale === "ar" ? "إدارة الطلبات" : "Manage Orders",
    canPrintBills: locale === "ar" ? "طباعة الفواتير" : "Print Bills",
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/admin/users/${userId}`);
        if (!response.ok) throw new Error("Failed to fetch user");
        const data = await response.json();
        setUser(data);
        const dobValue = data.dateOfBirth
          ? new Date(data.dateOfBirth).toISOString().slice(0, 10)
          : "";

        setFormData({
          fullName: data.fullName || "",
          email: data.email,
          phone: data.phoneNumber || "",
          role: mapRoleToForm(data.role),
          dob: dobValue,
          preferredLanguage: mapLanguageToForm(data.preferredLanguage),
          newPassword: "",
          confirmPassword: "",
        });
        if (data.profileImage) {
          setPreviewImage(data.profileImage);
        }
        
        // Fetch worker permissions if user is a worker
        if (data.role === "WORKER") {
          const permResponse = await fetch(`/api/admin/users/${userId}/worker-permissions`);
          if (permResponse.ok) {
            const permData = await permResponse.json();
            if (permData) {
              setWorkerPermissions({
                can_restock: permData.can_restock ?? false,
                can_print_labels: permData.can_print_labels ?? false,
                can_record_sales: permData.can_record_sales ?? false,
                can_manage_orders: permData.can_manage_orders ?? false,
                can_print_bills: permData.can_print_bills ?? false,
              });
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoadingData(false);
      }
    };

    fetchUser();
  }, [userId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.fullName || !formData.email || !formData.phone) {
      setError(locale === "ar" ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill all required fields");
      return;
    }

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setError(locale === "ar" ? "كلمات المرور غير متطابقة" : "Passwords do not match");
      return;
    }

    if (formData.newPassword && formData.newPassword.length < 6) {
      setError(locale === "ar" ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("fullName", formData.fullName);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("phoneNumber", formData.phone);
      formDataToSend.append("role", formData.role);
      formDataToSend.append("dob", formData.dob);
      formDataToSend.append("preferredLanguage", formData.preferredLanguage);
      if (formData.newPassword) {
        formDataToSend.append("password", formData.newPassword);
      }
      if (profileImage) {
        formDataToSend.append("profileImage", profileImage);
      }

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        body: formDataToSend,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update user");
      }

      // Save worker permissions if role is worker
      if (formData.role === "worker") {
        const permResponse = await fetch(`/api/admin/users/${userId}/worker-permissions`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(workerPermissions),
        });

        if (!permResponse.ok) {
          const permData = await permResponse.json();
          throw new Error(permData.error || "Failed to update worker permissions");
        }
      }

      router.push(`/${locale}/admin/users`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(locale === "ar" ? "هل أنت متأكد من حذف هذا المستخدم؟" : "Are you sure you want to delete this user?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete user");
      }

      router.push(`/${locale}/admin/users`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-zinc-600 dark:text-zinc-400">{t.loading}</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-600 dark:text-red-400">User not found</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {t.title}
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Profile Image */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {t.profileImage}
          </h2>
          <div className="flex items-center gap-6">
            <div className="relative size-24 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              {previewImage ? (
                <Image
                  src={previewImage}
                  alt="Profile"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-3xl font-bold text-zinc-400">
                  {formData.fullName.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <label className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
                {t.changeImage}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {t.personalInfo}
          </h2>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t.fullName} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
              placeholder={locale === "ar" ? "أدخل الاسم الكامل" : "Enter full name"}
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t.email} <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
                placeholder={locale === "ar" ? "أدخل البريد الإلكتروني" : "Enter email address"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t.phone}
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
                placeholder={locale === "ar" ? "أدخل رقم الهاتف" : "Enter phone number"}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t.dob}
            </label>
            <input
              type="date"
              value={formData.dob}
              onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
              className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
            />
          </div>
        </div>

        {/* Account Settings */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {t.accountSettings}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t.role} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as FormRole })}
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
              >
                <option value="user">{t.user}</option>
                <option value="trainer">{t.trainer}</option>
                <option value="employee">{t.employee}</option>
                <option value="worker">{t.worker}</option>
                <option value="photographer">{t.photographer}</option>
                <option value="social_media_admin">{t.socialMediaAdmin}</option>
                <option value="admin">{t.admin}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t.language}
              </label>
              <select
                value={formData.preferredLanguage}
                onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value as "en" | "ar" })}
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
              >
                <option value="en">{t.english}</option>
                <option value="ar">{t.arabic}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Worker Permissions - Only show when role is worker */}
        {formData.role === "worker" && (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {t.workerPermissions}
            </h2>
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={workerPermissions.can_restock}
                  onChange={(e) =>
                    setWorkerPermissions((prev) => ({
                      ...prev,
                      can_restock: e.target.checked,
                    }))
                  }
                  className="h-5 w-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{t.canRestock}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={workerPermissions.can_print_labels}
                  onChange={(e) =>
                    setWorkerPermissions((prev) => ({
                      ...prev,
                      can_print_labels: e.target.checked,
                    }))
                  }
                  className="h-5 w-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{t.canPrintLabels}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={workerPermissions.can_record_sales}
                  onChange={(e) =>
                    setWorkerPermissions((prev) => ({
                      ...prev,
                      can_record_sales: e.target.checked,
                    }))
                  }
                  className="h-5 w-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{t.canRecordSales}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={workerPermissions.can_manage_orders}
                  onChange={(e) =>
                    setWorkerPermissions((prev) => ({
                      ...prev,
                      can_manage_orders: e.target.checked,
                    }))
                  }
                  className="h-5 w-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{t.canManageOrders}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={workerPermissions.can_print_bills}
                  onChange={(e) =>
                    setWorkerPermissions((prev) => ({
                      ...prev,
                      can_print_bills: e.target.checked,
                    }))
                  }
                  className="h-5 w-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{t.canPrintBills}</span>
              </label>
            </div>
          </div>
        )}

        {/* Change Password */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {t.changePassword}
          </h2>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            {t.leaveBlank}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t.newPassword}
              </label>
              <input
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
                placeholder={locale === "ar" ? "أدخل كلمة المرور الجديدة" : "Enter new password"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t.confirmPassword}
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
                placeholder={locale === "ar" ? "أعد إدخال كلمة المرور" : "Confirm new password"}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-lg border border-red-300 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-400 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20 transition-all duration-200"
          >
            {t.deleteUser}
          </button>
          <div className="flex items-center gap-3">
            <Link
              href={`/${locale}/admin/users`}
              className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-all duration-200"
            >
              {t.cancel}
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              {loading ? t.saving : t.saveChanges}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
