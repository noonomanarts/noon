'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  FiAtSign,
  FiCheckCircle,
  FiExternalLink,
  FiFile,
  FiFilm,
  FiImage,
  FiLink,
  FiMapPin,
  FiMessageSquare,
  FiMic,
  FiSend,
  FiUser,
  FiXCircle,
} from 'react-icons/fi';
import type { Locale } from '@/lib/locale';
import type { UserRole } from '@/lib/db/types';

type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
};

type MessageType =
  | 'text'
  | 'image'
  | 'file'
  | 'video'
  | 'voice'
  | 'location'
  | 'contactVcard'
  | 'linkPreview';

type SendResult = {
  userId: string;
  name: string;
  success: boolean;
  error?: string;
  status?: number;
};

type ExistsResult = {
  userId: string;
  name: string;
  phone: string | null;
  numberExists: boolean | null;
  chatId: string | null;
};

export default function AdminWhatsAppPageClient({
  locale,
  users,
}: {
  locale: Locale;
  users: AdminUser[];
}) {
  const isArabic = locale === 'ar';

  const [roleFilter, setRoleFilter] = useState<
    'ALL' | 'CUSTOMER' | 'TRAINER' | 'ADMIN' | 'EMPLOYEE' | 'SOCIAL_MEDIA_ADMIN'
  >('CUSTOMER');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const [messageType, setMessageType] = useState<MessageType>('text');
  const [text, setText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [filename, setFilename] = useState('');
  const [mimetype, setMimetype] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationTitle, setLocationTitle] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const [simulateTyping, setSimulateTyping] = useState(false);
  const [delayBetweenMs, setDelayBetweenMs] = useState(800);

  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [results, setResults] = useState<SendResult[]>([]);
  const [existsMap, setExistsMap] = useState<Record<string, ExistsResult>>({});

  const t = {
    title: isArabic ? 'إرسال رسائل واتساب' : 'WhatsApp Broadcast',
    manageSessions: isArabic ? 'إدارة السشنات' : 'Manage Sessions',
    manageTemplates: isArabic ? 'قوالب الرسائل' : 'Message Templates',
    recipients: isArabic ? 'المستلمون' : 'Recipients',
    search: isArabic ? 'بحث بالاسم أو الهاتف...' : 'Search name or phone...',
    all: isArabic ? 'الكل' : 'All',
    customers: isArabic ? 'العملاء' : 'Customers',
    trainers: isArabic ? 'المدربون' : 'Trainers',
    admins: isArabic ? 'الإداريون' : 'Admins',
    employees: isArabic ? 'الموظفون' : 'Employees',
    socialMediaAdmins: isArabic ? 'مدراء السوشيال ميديا' : 'Social Media Admins',
    selectAll: isArabic ? 'تحديد الكل' : 'Select All',
    clearAll: isArabic ? 'إلغاء الكل' : 'Clear',
    checkRecipients: isArabic ? 'تحقق من المستلمين' : 'Check recipients',
    checking: isArabic ? 'جارٍ التحقق...' : 'Checking...',
    composer: isArabic ? 'كتابة الرسالة' : 'Compose Message',
    tabText: isArabic ? 'نص' : 'Text',
    tabImage: isArabic ? 'صورة' : 'Image',
    tabFile: isArabic ? 'ملف' : 'File',
    tabVideo: isArabic ? 'فيديو' : 'Video',
    tabVoice: isArabic ? 'صوت' : 'Voice',
    tabLocation: isArabic ? 'موقع' : 'Location',
    tabContact: isArabic ? 'جهة اتصال' : 'Contact',
    tabLink: isArabic ? 'معاينة رابط' : 'Link Preview',
    textLabel: isArabic ? 'نص الرسالة' : 'Message Text',
    mediaUrlLabel: isArabic ? 'رابط الوسائط (http/https)' : 'Media URL (http/https)',
    captionLabel: isArabic ? 'تعليق (اختياري)' : 'Caption (optional)',
    filenameLabel: isArabic ? 'اسم الملف (اختياري)' : 'Filename (optional)',
    mimetypeLabel: isArabic ? 'نوع MIME (اختياري)' : 'Mime type (optional)',
    latitudeLabel: isArabic ? 'خط العرض' : 'Latitude',
    longitudeLabel: isArabic ? 'خط الطول' : 'Longitude',
    titleLabel: isArabic ? 'عنوان الموقع' : 'Location title',
    contactNameLabel: isArabic ? 'اسم جهة الاتصال' : 'Contact name',
    contactPhoneLabel: isArabic ? 'رقم جهة الاتصال' : 'Contact phone',
    linkUrlLabel: isArabic ? 'رابط الويب' : 'Web URL',
    humanLikeLabel: isArabic ? 'محاكاة الكتابة وعلامة القراءة' : 'Simulate typing & seen',
    delayLabel: isArabic ? 'تأخير بين الرسائل (مللي ثانية)' : 'Delay between sends (ms)',
    send: isArabic ? 'إرسال عبر واتساب' : 'Send via WhatsApp',
    sending: isArabic ? 'جارٍ الإرسال...' : 'Sending...',
    sentSummary: isArabic ? 'ملخص الإرسال' : 'Sending Summary',
    noUsers: isArabic ? 'لا يوجد مستخدمون مطابقون.' : 'No matching users found.',
    selectAtLeastOne: isArabic ? 'اختر مستلماً واحداً على الأقل.' : 'Select at least one recipient.',
    invalidMessage: isArabic ? 'بيانات الرسالة غير مكتملة.' : 'Message payload is incomplete.',
    existsOk: isArabic ? 'مسجل على واتساب' : 'Registered on WhatsApp',
    existsNo: isArabic ? 'غير مسجل' : 'Not registered',
    existsUnknown: isArabic ? 'غير معروف' : 'Unknown',
  };

  const filteredUsers = useMemo(() => {
    const byRole = roleFilter === 'ALL' ? users : users.filter((user) => user.role === roleFilter);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return byRole;
    return byRole.filter(
      (user) =>
        user.fullName.toLowerCase().includes(q) ||
        user.phoneNumber.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q)
    );
  }, [roleFilter, users, searchQuery]);

  const messageTabs: Array<{ key: MessageType; label: string; icon: React.ReactNode }> = [
    { key: 'text', label: t.tabText, icon: <FiMessageSquare className="size-4" /> },
    { key: 'image', label: t.tabImage, icon: <FiImage className="size-4" /> },
    { key: 'file', label: t.tabFile, icon: <FiFile className="size-4" /> },
    { key: 'video', label: t.tabVideo, icon: <FiFilm className="size-4" /> },
    { key: 'voice', label: t.tabVoice, icon: <FiMic className="size-4" /> },
    { key: 'location', label: t.tabLocation, icon: <FiMapPin className="size-4" /> },
    { key: 'contactVcard', label: t.tabContact, icon: <FiUser className="size-4" /> },
    { key: 'linkPreview', label: t.tabLink, icon: <FiLink className="size-4" /> },
  ];

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const buildPayload = (): Record<string, unknown> | null => {
    switch (messageType) {
      case 'text':
        return text.trim().length > 0 ? { type: 'text', text } : null;
      case 'image':
      case 'file':
      case 'video':
        if (!mediaUrl.trim()) return null;
        return {
          type: messageType,
          url: mediaUrl.trim(),
          caption: caption.trim() || undefined,
          filename: filename.trim() || undefined,
          mimetype: mimetype.trim() || undefined,
        };
      case 'voice':
        if (!mediaUrl.trim()) return null;
        return { type: 'voice', url: mediaUrl.trim(), mimetype: mimetype.trim() || undefined };
      case 'location': {
        const lat = Number(latitude);
        const lng = Number(longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { type: 'location', latitude: lat, longitude: lng, title: locationTitle.trim() || undefined };
      }
      case 'contactVcard':
        if (!contactName.trim() || !contactPhone.trim()) return null;
        return {
          type: 'contactVcard',
          contacts: [{ name: contactName.trim(), phone: contactPhone.trim() }],
        };
      case 'linkPreview':
        if (!linkUrl.trim()) return null;
        return { type: 'linkPreview', url: linkUrl.trim(), caption: caption.trim() || undefined };
      default:
        return null;
    }
  };

  const checkRecipients = async () => {
    setError(null);
    if (selectedUserIds.length === 0) {
      setError(t.selectAtLeastOne);
      return;
    }
    setChecking(true);
    try {
      const response = await fetch('/api/admin/whatsapp/check-exists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedUserIds }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        results?: ExistsResult[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || 'check failed');
      const map: Record<string, ExistsResult> = {};
      (payload.results ?? []).forEach((row) => {
        map[row.userId] = row;
      });
      setExistsMap(map);
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : 'Check failed');
    } finally {
      setChecking(false);
    }
  };

  const sendMessage = async () => {
    setError(null);
    setInfo(null);
    setResults([]);

    if (selectedUserIds.length === 0) {
      setError(t.selectAtLeastOne);
      return;
    }
    const message = buildPayload();
    if (!message) {
      setError(t.invalidMessage);
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/admin/whatsapp/send-rich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUserIds,
          message,
          simulateTyping,
          delayBetweenMs,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        summary?: { total: number; sent: number; failed: number };
        results?: SendResult[];
      };
      if (!response.ok) throw new Error(payload.error || 'Failed to send WhatsApp message');

      setInfo(
        `${t.sentSummary}: ${payload.summary?.sent ?? 0}/${payload.summary?.total ?? selectedUserIds.length}`
      );
      setResults(Array.isArray(payload.results) ? payload.results : []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to send WhatsApp message');
    } finally {
      setSending(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100';

  const renderComposerBody = () => {
    switch (messageType) {
      case 'text':
        return (
          <label className="block space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">{t.textLabel}</span>
            <textarea rows={8} value={text} onChange={(event) => setText(event.target.value)} className={inputClass} />
          </label>
        );
      case 'image':
      case 'file':
      case 'video':
      case 'voice':
        return (
          <div className="space-y-3 text-sm">
            <label className="block space-y-1">
              <span className="text-zinc-600 dark:text-zinc-300">{t.mediaUrlLabel}</span>
              <input
                type="url"
                placeholder="https://..."
                value={mediaUrl}
                onChange={(event) => setMediaUrl(event.target.value)}
                className={inputClass}
              />
            </label>
            {messageType !== 'voice' && (
              <label className="block space-y-1">
                <span className="text-zinc-600 dark:text-zinc-300">{t.captionLabel}</span>
                <input value={caption} onChange={(event) => setCaption(event.target.value)} className={inputClass} />
              </label>
            )}
            {messageType !== 'voice' && (
              <label className="block space-y-1">
                <span className="text-zinc-600 dark:text-zinc-300">{t.filenameLabel}</span>
                <input value={filename} onChange={(event) => setFilename(event.target.value)} className={inputClass} />
              </label>
            )}
            <label className="block space-y-1">
              <span className="text-zinc-600 dark:text-zinc-300">{t.mimetypeLabel}</span>
              <input
                value={mimetype}
                onChange={(event) => setMimetype(event.target.value)}
                placeholder={
                  messageType === 'image'
                    ? 'image/jpeg'
                    : messageType === 'video'
                      ? 'video/mp4'
                      : messageType === 'voice'
                        ? 'audio/ogg; codecs=opus'
                        : 'application/pdf'
                }
                className={inputClass}
              />
            </label>
          </div>
        );
      case 'location':
        return (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-zinc-600 dark:text-zinc-300">{t.latitudeLabel}</span>
                <input
                  value={latitude}
                  onChange={(event) => setLatitude(event.target.value)}
                  placeholder="23.5859"
                  className={inputClass}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-zinc-600 dark:text-zinc-300">{t.longitudeLabel}</span>
                <input
                  value={longitude}
                  onChange={(event) => setLongitude(event.target.value)}
                  placeholder="58.4059"
                  className={inputClass}
                />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-zinc-600 dark:text-zinc-300">{t.titleLabel}</span>
              <input
                value={locationTitle}
                onChange={(event) => setLocationTitle(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>
        );
      case 'contactVcard':
        return (
          <div className="space-y-3 text-sm">
            <label className="block space-y-1">
              <span className="text-zinc-600 dark:text-zinc-300">{t.contactNameLabel}</span>
              <input
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-zinc-600 dark:text-zinc-300">{t.contactPhoneLabel}</span>
              <input
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                placeholder="+96890000000"
                className={inputClass}
              />
            </label>
          </div>
        );
      case 'linkPreview':
        return (
          <div className="space-y-3 text-sm">
            <label className="block space-y-1">
              <span className="text-zinc-600 dark:text-zinc-300">{t.linkUrlLabel}</span>
              <input
                type="url"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                placeholder="https://noon.example.com/..."
                className={inputClass}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-zinc-600 dark:text-zinc-300">{t.captionLabel}</span>
              <textarea
                rows={3}
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>
        );
      default:
        return null;
    }
  };

  const existsBadge = (userId: string) => {
    const row = existsMap[userId];
    if (!row) return null;
    if (row.numberExists === true) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          <FiCheckCircle className="size-3" />
          {t.existsOk}
        </span>
      );
    }
    if (row.numberExists === false) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
          <FiXCircle className="size-3" />
          {t.existsNo}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
        {t.existsUnknown}
      </span>
    );
  };

  return (
    <div className="space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{t.title}</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/admin/whatsapp/sessions`}
            className="inline-flex items-center gap-1 rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <FiExternalLink className="size-4" />
            {t.manageSessions}
          </Link>
          <Link
            href={`/${locale}/admin/whatsapp/templates`}
            className="inline-flex items-center gap-1 rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <FiAtSign className="size-4" />
            {t.manageTemplates}
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      ) : null}
      {info ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          {info}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.recipients}</h2>
            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="ALL">{t.all}</option>
                <option value="CUSTOMER">{t.customers}</option>
                <option value="TRAINER">{t.trainers}</option>
                <option value="EMPLOYEE">{t.employees}</option>
                <option value="SOCIAL_MEDIA_ADMIN">{t.socialMediaAdmins}</option>
                <option value="ADMIN">{t.admins}</option>
              </select>
              <button
                type="button"
                onClick={() => setSelectedUserIds(filteredUsers.map((user) => user.id))}
                className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {t.selectAll}
              </button>
              <button
                type="button"
                onClick={() => setSelectedUserIds([])}
                className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {t.clearAll}
              </button>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t.search}
              className="min-w-[180px] flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
            <button
              type="button"
              onClick={() => void checkRecipients()}
              disabled={checking || selectedUserIds.length === 0}
              className="inline-flex items-center gap-1 rounded-xl border border-[color:var(--noon-teal)] px-3 py-2 text-xs font-semibold text-[color:var(--noon-teal-strong)] hover:bg-[color:var(--noon-teal-soft)]/40 disabled:opacity-50"
            >
              {checking ? t.checking : t.checkRecipients}
            </button>
          </div>

          {filteredUsers.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.noUsers}</p>
          ) : (
            <div className="max-h-[420px] space-y-2 overflow-y-auto">
              {filteredUsers.map((user) => {
                const checked = selectedUserIds.includes(user.id);
                return (
                  <label
                    key={user.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition ${
                      checked
                        ? 'border-[color:var(--noon-teal)] bg-[color:var(--noon-teal-soft)]/35'
                        : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleUser(user.id)}
                      className="mt-1 size-4 rounded border-zinc-300 text-[color:var(--noon-teal)] focus:ring-[color:var(--noon-teal)]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {user.fullName}
                        </p>
                        {existsBadge(user.id)}
                      </div>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {user.phoneNumber || '-'} • {user.email}
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">{user.role}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.composer}</h2>

          <div className="mb-4 flex flex-wrap gap-1.5">
            {messageTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setMessageType(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  messageType === tab.key
                    ? 'bg-[color:var(--noon-teal)] text-white'
                    : 'border border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {renderComposerBody()}

            <div className="flex flex-wrap items-center gap-4 border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={simulateTyping}
                  onChange={(event) => setSimulateTyping(event.target.checked)}
                  className="size-4 rounded border-zinc-300 text-[color:var(--noon-teal)] focus:ring-[color:var(--noon-teal)]"
                />
                <span className="text-zinc-700 dark:text-zinc-300">{t.humanLikeLabel}</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <span className="text-zinc-700 dark:text-zinc-300">{t.delayLabel}</span>
                <input
                  type="number"
                  min={0}
                  max={5000}
                  step={100}
                  value={delayBetweenMs}
                  onChange={(event) =>
                    setDelayBetweenMs(Math.max(0, Math.min(5000, Number(event.target.value) || 0)))
                  }
                  className="w-20 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={sending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--noon-teal)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiMessageSquare className="size-4" />
              {sending ? t.sending : t.send}
              <FiSend className="size-4" />
            </button>
          </div>
        </section>
      </div>

      {results.length > 0 ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.sentSummary}</h3>
          <div className="space-y-1.5">
            {results.map((item) => (
              <p
                key={`${item.userId}-${item.name}`}
                className={`flex items-center gap-2 text-sm ${
                  item.success ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                }`}
              >
                {item.success ? <FiCheckCircle className="size-4" /> : <FiXCircle className="size-4" />}
                <span className="font-medium">{item.name}:</span>
                <span>{item.success ? 'OK' : item.error || 'Failed'}</span>
                {!item.success && item.status ? (
                  <span className="ml-1 text-xs text-zinc-500">(HTTP {item.status})</span>
                ) : null}
              </p>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
