"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewUserPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const router = useRouter();
  const { locale } = use(params);
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "user" as "admin" | "trainer" | "user",
    dob: "",
    preferredLanguage: "en" as "en" | "ar",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const t = {
    title: locale === "ar" ? "إضافة مستخدم جديد" : "Add New User",
    subtitle: locale === "ar" ? "إنشاء حساب مستخدم جديد" : "Create a new user account",
    personalInfo: locale === "ar" ? "المعلومات الشخصية" : "Personal Information",
    fullName: locale === "ar" ? "الاسم الكامل" : "Full Name",
    email: locale === "ar" ? "البريد الإلكتروني" : "Email",
    phone: locale === "ar" ? "رقم الهاتف" : "Phone Number",
    dob: locale === "ar" ? "تاريخ الميلاد" : "Date of Birth",
    accountSettings: locale === "ar" ? "إعدادات الحساب" : "Account Settings",
    password: locale === "ar" ? "كلمة المرور" : "Password",
    confirmPassword: locale === "ar" ? "تأكيد كلمة المرور" : "Confirm Password",
    role: locale === "ar" ? "الدور" : "Role",
    language: locale === "ar" ? "اللغة المفضلة" : "Preferred Language",
    admin: locale === "ar" ? "مدير" : "Admin",
    trainer: locale === "ar" ? "مدرب" : "Trainer",
    user: locale === "ar" ? "مستخدم" : "User",
    english: locale === "ar" ? "الإنجليزية" : "English",
    arabic: locale === "ar" ? "العربية" : "Arabic",
    cancel: locale === "ar" ? "إلغاء" : "Cancel",
    createUser: locale === "ar" ? "إنشاء المستخدم" : "Create User",
    creating: locale === "ar" ? "جارٍ الإنشاء..." : "Creating...",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.fullName || !formData.email || !formData.password || !formData.phone) {
      setError(locale === "ar" ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill all required fields");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(locale === "ar" ? "كلمات المرور غير متطابقة" : "Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError(locale === "ar" ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phoneNumber: formData.phone,
          password: formData.password,
          role: formData.role,
          dob: formData.dob,
          preferredLanguage: formData.preferredLanguage,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create user");
      }

      router.push(`/${locale}/admin/users`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {t.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {t.subtitle}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

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
                {t.password} <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
                placeholder={locale === "ar" ? "أدخل كلمة المرور" : "Enter password"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t.confirmPassword} <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
                placeholder={locale === "ar" ? "أعد إدخال كلمة المرور" : "Confirm password"}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t.role} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as "admin" | "trainer" | "user" })}
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white transition-all duration-200"
              >
                <option value="user">{t.user}</option>
                <option value="trainer">{t.trainer}</option>
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

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
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
            {loading ? t.creating : t.createUser}
          </button>
        </div>
      </form>
    </div>
  );
}
