'use client';

import Image from 'next/image';
import { useMemo, useRef, useState } from 'react';
import { FiGlobe, FiLock, FiSave, FiShield, FiUser } from 'react-icons/fi';
import type { Locale } from '@/lib/locale';

type AccountSettingsUser = {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  profileImage: string | null;
  preferredLanguage: 'ENGLISH' | 'ARABIC';
};

type TabId = 'profile' | 'preferences' | 'security';

export default function AccountSettingsPageClient({
  locale,
  initialUser,
}: {
  locale: Locale;
  initialUser: AccountSettingsUser;
}) {
  const isArabic = locale === 'ar';
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    fullName: initialUser.fullName,
    phoneNumber: initialUser.phoneNumber,
    profileImage: initialUser.profileImage ?? '',
    preferredLanguage: initialUser.preferredLanguage,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const t = {
    title: isArabic ? 'إعدادات الحساب' : 'Account Settings',
    subtitle: isArabic
      ? 'إدارة معلوماتك الشخصية، اللغة، وأمان الحساب من مكان واحد.'
      : 'Manage your personal details, language, and account security in one place.',
    tabProfile: isArabic ? 'الملف الشخصي' : 'Profile',
    tabPreferences: isArabic ? 'التفضيلات' : 'Preferences',
    tabSecurity: isArabic ? 'الأمان' : 'Security',
    fullName: isArabic ? 'الاسم الكامل' : 'Full Name',
    email: isArabic ? 'البريد الإلكتروني' : 'Email',
    phoneNumber: isArabic ? 'رقم الهاتف' : 'Phone Number',
    profileImage: isArabic ? 'الصورة الشخصية' : 'Profile Photo',
    uploadPhoto: isArabic ? 'رفع صورة جديدة' : 'Upload New Photo',
    removePhoto: isArabic ? 'إزالة الصورة' : 'Remove Photo',
    uploadHint: isArabic ? 'PNG / JPG حتى 5MB' : 'PNG / JPG up to 5MB',
    uploadingPhoto: isArabic ? 'جارٍ رفع الصورة...' : 'Uploading photo...',
    uploadSuccess: isArabic ? 'تم رفع الصورة بنجاح.' : 'Photo uploaded successfully.',
    preferredLanguage: isArabic ? 'اللغة المفضلة' : 'Preferred Language',
    english: isArabic ? 'الإنجليزية' : 'English',
    arabic: isArabic ? 'العربية' : 'Arabic',
    saveProfile: isArabic ? 'حفظ التغييرات' : 'Save Changes',
    saving: isArabic ? 'جارٍ الحفظ...' : 'Saving...',
    securityTitle: isArabic ? 'تغيير كلمة المرور' : 'Change Password',
    securityHint: isArabic
      ? 'لأمان حسابك، أدخل كلمة المرور الحالية قبل تحديث كلمة المرور.'
      : 'For account security, enter your current password before updating it.',
    currentPassword: isArabic ? 'كلمة المرور الحالية' : 'Current Password',
    newPassword: isArabic ? 'كلمة المرور الجديدة' : 'New Password',
    confirmPassword: isArabic ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password',
    updatePassword: isArabic ? 'تحديث كلمة المرور' : 'Update Password',
    updated: isArabic ? 'تم حفظ الإعدادات بنجاح.' : 'Settings updated successfully.',
    updateFailed: isArabic ? 'تعذر تحديث الإعدادات.' : 'Failed to update settings.',
    passwordMismatch: isArabic ? 'تأكيد كلمة المرور غير مطابق.' : 'Password confirmation does not match.',
    passwordPolicy: isArabic ? 'يجب أن تكون كلمة المرور 8 أحرف على الأقل.' : 'Password must be at least 8 characters.',
  };

  const avatarFallback = useMemo(() => {
    const initial = form.fullName.trim().charAt(0).toUpperCase();
    return initial || 'U';
  }, [form.fullName]);

  const clearMessages = () => {
    setError(null);
    setInfo(null);
  };

  const handleSaveProfile = async () => {
    clearMessages();
    setSavingProfile(true);

    try {
      const response = await fetch('/api/account/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          phoneNumber: form.phoneNumber,
          profileImage: form.profileImage.trim() || null,
          preferredLanguage: form.preferredLanguage,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        user?: AccountSettingsUser;
        error?: string;
      };

      if (!response.ok || !payload.user) {
        throw new Error(payload.error || t.updateFailed);
      }

      setForm((previous) => ({
        ...previous,
        fullName: payload.user?.fullName ?? previous.fullName,
        phoneNumber: payload.user?.phoneNumber ?? previous.phoneNumber,
        profileImage: payload.user?.profileImage ?? '',
        preferredLanguage: payload.user?.preferredLanguage ?? previous.preferredLanguage,
      }));
      setInfo(t.updated);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t.updateFailed);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    clearMessages();
    setUploadingAvatar(true);

    try {
      const uploadData = new FormData();
      uploadData.append('file', file);

      const response = await fetch('/api/account/avatar', {
        method: 'POST',
        body: uploadData,
      });

      const payload = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || t.updateFailed);
      }

      setForm((previous) => ({ ...previous, profileImage: payload.url ?? '' }));
      setInfo(t.uploadSuccess);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t.updateFailed);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdatePassword = async () => {
    clearMessages();

    if (!form.newPassword || form.newPassword.length < 8) {
      setError(t.passwordPolicy);
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setSavingSecurity(true);

    try {
      const response = await fetch('/api/account/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          phoneNumber: form.phoneNumber,
          profileImage: form.profileImage.trim() || null,
          preferredLanguage: form.preferredLanguage,
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || t.updateFailed);
      }

      setForm((previous) => ({
        ...previous,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      setInfo(t.updated);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t.updateFailed);
    } finally {
      setSavingSecurity(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">{t.title}</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{t.subtitle}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeTab === 'profile'
                ? 'bg-[color:var(--noon-teal)]/15 text-[color:var(--noon-teal-strong)]'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <FiUser className="size-4" />
            {t.tabProfile}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeTab === 'preferences'
                ? 'bg-[color:var(--noon-teal)]/15 text-[color:var(--noon-teal-strong)]'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <FiGlobe className="size-4" />
            {t.tabPreferences}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeTab === 'security'
                ? 'bg-[color:var(--noon-teal)]/15 text-[color:var(--noon-teal-strong)]'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <FiShield className="size-4" />
            {t.tabSecurity}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {info ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
          {info}
        </div>
      ) : null}

      {(activeTab === 'profile' || activeTab === 'preferences') && (
        <div className="rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900">
          <div className="grid gap-6 lg:grid-cols-[140px_1fr]">
            <div className="flex flex-col items-center gap-3">
              <span className="relative size-24 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                {form.profileImage ? (
                  <Image src={form.profileImage} alt={form.fullName} fill sizes="96px" className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-zinc-600 dark:text-zinc-200">
                    {avatarFallback}
                  </span>
                )}
              </span>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{initialUser.email}</p>

              <div className="flex w-full flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const selectedFile = event.target.files?.[0];
                    if (selectedFile) {
                      void handleAvatarUpload(selectedFile);
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  {uploadingAvatar ? t.uploadingPhoto : t.uploadPhoto}
                </button>

                {form.profileImage ? (
                  <button
                    type="button"
                    onClick={() => {
                      setForm((previous) => ({ ...previous, profileImage: '' }));
                      clearMessages();
                    }}
                    className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/30"
                  >
                    {t.removePhoto}
                  </button>
                ) : null}

                <p className="text-center text-[11px] text-zinc-500 dark:text-zinc-400">{t.uploadHint}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="text-zinc-600 dark:text-zinc-300">{t.fullName}</span>
                <input
                  value={form.fullName}
                  onChange={(event) => setForm((previous) => ({ ...previous, fullName: event.target.value }))}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-4 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{t.email}</span>
                <input
                  value={initialUser.email}
                  readOnly
                  className="w-full cursor-not-allowed rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2.5 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">{t.phoneNumber}</span>
                <input
                  value={form.phoneNumber}
                  onChange={(event) => setForm((previous) => ({ ...previous, phoneNumber: event.target.value }))}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-4 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="text-zinc-600 dark:text-zinc-300">{t.preferredLanguage}</span>
                <select
                  value={form.preferredLanguage}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      preferredLanguage: event.target.value as 'ENGLISH' | 'ARABIC',
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-4 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  <option value="ENGLISH">{t.english}</option>
                  <option value="ARABIC">{t.arabic}</option>
                </select>
              </label>

              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleSaveProfile()}
                  disabled={savingProfile}
                  className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--noon-teal)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FiSave className="size-4" />
                  {savingProfile ? t.saving : t.saveProfile}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900">
          <div className="mb-4 flex items-center gap-2">
            <FiLock className="size-5 text-[color:var(--noon-teal)]" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{t.securityTitle}</h3>
          </div>
          <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">{t.securityHint}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-zinc-600 dark:text-zinc-300">{t.currentPassword}</span>
              <input
                type="password"
                value={form.currentPassword}
                onChange={(event) => setForm((previous) => ({ ...previous, currentPassword: event.target.value }))}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-4 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.newPassword}</span>
              <input
                type="password"
                value={form.newPassword}
                onChange={(event) => setForm((previous) => ({ ...previous, newPassword: event.target.value }))}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-4 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.confirmPassword}</span>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(event) => setForm((previous) => ({ ...previous, confirmPassword: event.target.value }))}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-4 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>

            <div className="sm:col-span-2 flex justify-end">
              <button
                type="button"
                onClick={() => void handleUpdatePassword()}
                disabled={savingSecurity}
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                <FiLock className="size-4" />
                {savingSecurity ? t.saving : t.updatePassword}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
