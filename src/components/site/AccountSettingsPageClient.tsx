'use client';

import Image from 'next/image';
import { useMemo, useRef, useState } from 'react';
import { FiLock, FiSave, FiShield, FiUser } from 'react-icons/fi';
import type { Locale } from '@/lib/locale';
import PasswordInput from '@/components/site/PasswordInput';
import type { Gender } from '@/lib/db/types';

type AccountSettingsUser = {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  profileImage: string | null;
  gender: Gender | null;
  preferredLanguage: 'ENGLISH' | 'ARABIC';
};

type TabId = 'profile' | 'security';

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
    gender: initialUser.gender ?? '',
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
    tabSecurity: isArabic ? 'الأمان' : 'Security',
    fullName: isArabic ? 'الاسم الكامل' : 'Full Name',
    email: isArabic ? 'البريد الإلكتروني' : 'Email',
    phoneNumber: isArabic ? 'رقم الهاتف' : 'Phone Number',
    profileImage: isArabic ? 'الصورة الشخصية' : 'Profile Photo',
    gender: isArabic ? 'الجنس' : 'Gender',
    male: isArabic ? 'ذكر' : 'Male',
    female: isArabic ? 'أنثى' : 'Female',
    other: isArabic ? 'آخر' : 'Other',
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
          gender: form.gender || null,
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
        gender: payload.user?.gender ?? previous.gender,
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
          gender: form.gender || null,
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
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[color:var(--text)]">{t.title}</h2>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">{t.subtitle}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeTab === 'profile'
                ? 'bg-[color:var(--noon-teal)]/15 text-[color:var(--noon-teal-strong)]'
                : 'bg-[color:var(--muted)] text-[color:var(--text-muted)] hover:bg-[color:var(--border)]'
            }`}
          >
            <FiUser className="size-4" />
            {t.tabProfile}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeTab === 'security'
                ? 'bg-[color:var(--noon-teal)]/15 text-[color:var(--noon-teal-strong)]'
                : 'bg-[color:var(--muted)] text-[color:var(--text-muted)] hover:bg-[color:var(--border)]'
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

      {activeTab === 'profile' && (
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[140px_1fr]">
            <div className="flex flex-col items-center gap-3">
              <span className="keep-profile-round relative size-24 overflow-hidden rounded-full border border-[color:var(--border)] bg-[color:var(--muted)]">
                {form.profileImage ? (
                  <Image src={form.profileImage} alt={form.fullName} fill sizes="96px" className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-[color:var(--text-muted)]">
                    {avatarFallback}
                  </span>
                )}
              </span>
              <p className="text-xs text-[color:var(--text-subtle)]">{initialUser.email}</p>

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
                  className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs font-semibold text-[color:var(--text)] transition hover:bg-[color:var(--muted)] disabled:cursor-not-allowed disabled:opacity-60"
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

                <p className="text-center text-[11px] text-[color:var(--text-subtle)]">{t.uploadHint}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="text-[color:var(--text-muted)]">{t.fullName}</span>
                <input
                  value={form.fullName}
                  onChange={(event) => setForm((previous) => ({ ...previous, fullName: event.target.value }))}
                  className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2.5 text-[color:var(--text)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--focus)]"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-[color:var(--text-muted)]">{t.email}</span>
                <input
                  value={initialUser.email}
                  readOnly
                  className="w-full cursor-not-allowed rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-2.5 text-[color:var(--text-muted)]"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-[color:var(--text-muted)]">{t.phoneNumber}</span>
                <input
                  value={form.phoneNumber}
                  onChange={(event) => setForm((previous) => ({ ...previous, phoneNumber: event.target.value }))}
                  className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2.5 text-[color:var(--text)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--focus)]"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[color:var(--text-muted)]">{t.gender}</span>
                <select
                  value={form.gender}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      gender: event.target.value as Gender | '',
                    }))
                  }
                  className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2.5 text-[color:var(--text)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--focus)]"
                >
                  <option value="">{t.gender}</option>
                  <option value="MALE">{t.male}</option>
                  <option value="FEMALE">{t.female}</option>
                  <option value="OTHER">{t.other}</option>
                </select>
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="text-[color:var(--text-muted)]">{t.preferredLanguage}</span>
                <select
                  value={form.preferredLanguage}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      preferredLanguage: event.target.value as 'ENGLISH' | 'ARABIC',
                    }))
                  }
                  className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2.5 text-[color:var(--text)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--focus)]"
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
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <FiLock className="size-5 text-[color:var(--noon-teal)]" />
            <h3 className="text-lg font-semibold text-[color:var(--text)]">{t.securityTitle}</h3>
          </div>
          <p className="mb-6 text-sm text-[color:var(--text-muted)]">{t.securityHint}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-[color:var(--text-muted)]">{t.currentPassword}</span>
              <PasswordInput
                locale={locale}
                value={form.currentPassword}
                onValueChange={(value) => setForm((previous) => ({ ...previous, currentPassword: value }))}
                autoComplete="current-password"
                inputClassName="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2.5 text-[color:var(--text)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--focus)]"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-[color:var(--text-muted)]">{t.newPassword}</span>
              <PasswordInput
                locale={locale}
                value={form.newPassword}
                onValueChange={(value) => setForm((previous) => ({ ...previous, newPassword: value }))}
                autoComplete="new-password"
                inputClassName="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2.5 text-[color:var(--text)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--focus)]"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-[color:var(--text-muted)]">{t.confirmPassword}</span>
              <PasswordInput
                locale={locale}
                value={form.confirmPassword}
                onValueChange={(value) => setForm((previous) => ({ ...previous, confirmPassword: value }))}
                autoComplete="new-password"
                inputClassName="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2.5 text-[color:var(--text)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--focus)]"
              />
            </label>

            <div className="sm:col-span-2 flex justify-end">
              <button
                type="button"
                onClick={() => void handleUpdatePassword()}
                disabled={savingSecurity}
                className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--primary)] px-4 py-2.5 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
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
