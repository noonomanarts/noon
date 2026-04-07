'use client';

import { useEffect, useMemo, useState } from 'react';

type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  preferredLanguage: 'ENGLISH' | 'ARABIC';
  dateOfBirth: string | null;
};

type ActionKind = 'TOPUP' | 'DEDUCT' | 'ENROLL_AND_DEDUCT';

export default function AdminClassMemberWalletPanel({
  classId,
  classTitle,
  classPrice,
  currency,
  seatsAvailable,
  locale,
  onChangedAction,
}: {
  classId: string;
  classTitle: string;
  classPrice: number;
  currency: string;
  seatsAvailable: number;
  locale: string;
  onChangedAction?: () => Promise<void> | void;
}) {
  const isArabic = locale === 'ar';

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [action, setAction] = useState<ActionKind>('ENROLL_AND_DEDUCT');
  const [amount, setAmount] = useState(String(classPrice || 0));
  const [description, setDescription] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [participantDateOfBirth, setParticipantDateOfBirth] = useState('');
  const [participantPreferredLanguage, setParticipantPreferredLanguage] = useState<'en' | 'ar'>('en');
  const [specialRequests, setSpecialRequests] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  useEffect(() => {
    if (!selectedUser) return;
    if (!participantName) setParticipantName(selectedUser.fullName || '');
    if (!participantDateOfBirth && selectedUser.dateOfBirth) {
      setParticipantDateOfBirth(String(selectedUser.dateOfBirth).slice(0, 10));
    }
    setParticipantPreferredLanguage(selectedUser.preferredLanguage === 'ARABIC' ? 'ar' : 'en');
  }, [selectedUser, participantDateOfBirth, participantName]);

  useEffect(() => {
    let active = true;
    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const response = await fetch('/api/admin/users?status=ACTIVE&role=CUSTOMER&limit=800', { cache: 'no-store' });
        const payload = (await response.json().catch(() => ({}))) as {
          users?: Array<{
            id: string;
            fullName: string;
            email: string;
            phoneNumber: string;
            preferredLanguage: 'ENGLISH' | 'ARABIC';
            dateOfBirth: string | null;
          }>;
        };

        if (!response.ok) {
          throw new Error('Failed to load users');
        }

        if (active) {
          setUsers(Array.isArray(payload.users) ? payload.users : []);
        }
      } catch {
        if (active) {
          setUsers([]);
        }
      } finally {
        if (active) setLoadingUsers(false);
      }
    };

    void loadUsers();

    return () => {
      active = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return users.slice(0, 100);

    return users
      .filter((user) => {
        return (
          user.fullName.toLowerCase().includes(term)
          || user.email.toLowerCase().includes(term)
          || user.phoneNumber.toLowerCase().includes(term)
        );
      })
      .slice(0, 100);
  }, [query, users]);

  const t = {
    title: isArabic ? 'تسجيل العميل + إدارة المحفظة للكلاس' : 'Class Enrollment + Wallet Operations',
    subtitle: isArabic
      ? 'اختر عميلاً، ثم نفّذ شحن المحفظة، خصم الرصيد، أو تسجيله مباشرة في هذا الكلاس مع الخصم.'
      : 'Select a customer, then top-up wallet, deduct wallet, or enroll directly into this class with payment deduction.',
    userSearch: isArabic ? 'بحث عميل (الاسم/الإيميل/الهاتف)' : 'Search customer (name/email/phone)',
    selectUser: isArabic ? 'اختر العميل' : 'Select customer',
    classSeats: isArabic ? 'المقاعد المتاحة' : 'Available seats',
    classPrice: isArabic ? 'سعر الكلاس' : 'Class price',
    action: isArabic ? 'العملية' : 'Action',
    topup: isArabic ? 'شحن محفظة العميل' : 'Top-up customer wallet',
    deduct: isArabic ? 'خصم من المحفظة' : 'Deduct from wallet',
    enrollDeduct: isArabic ? 'تسجيل بالكلاس + خصم' : 'Enroll in class + deduct',
    amount: isArabic ? 'المبلغ' : 'Amount',
    description: isArabic ? 'الوصف' : 'Description',
    participantName: isArabic ? 'اسم المشارك' : 'Participant name',
    participantDob: isArabic ? 'تاريخ الميلاد' : 'Date of birth',
    participantLang: isArabic ? 'لغة المشارك' : 'Participant language',
    notes: isArabic ? 'ملاحظات' : 'Notes',
    save: isArabic ? 'تنفيذ العملية' : 'Run Operation',
    saving: isArabic ? 'جاري التنفيذ...' : 'Processing...',
    success: isArabic ? 'تم تنفيذ العملية بنجاح.' : 'Operation completed successfully.',
    noUsers: isArabic ? 'لا يوجد عملاء متاحون حالياً.' : 'No customers are available at the moment.',
    chooseUser: isArabic ? 'يجب اختيار عميل أولاً.' : 'Please select a customer first.',
    chooseParticipant: isArabic ? 'اسم المشارك وتاريخ الميلاد مطلوبان للتسجيل.' : 'Participant name and DOB are required for enrollment.',
  };

  const runOperation = async () => {
    setError(null);
    setSuccess(null);

    if (!selectedUserId) {
      setError(t.chooseUser);
      return;
    }

    if (action === 'ENROLL_AND_DEDUCT' && (!participantName.trim() || !participantDateOfBirth.trim())) {
      setError(t.chooseParticipant);
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/admin/classes/${classId}/member-wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userId: selectedUserId,
          amount: Number(amount),
          description,
          participantName,
          participantDateOfBirth,
          participantPreferredLanguage,
          specialRequests,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Operation failed');
      }

      setSuccess(t.success);
      if (action === 'ENROLL_AND_DEDUCT') {
        setSpecialRequests('');
      }
      if (onChangedAction) {
        await onChangedAction();
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t.title}</h2>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950/50">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">{t.classSeats}</p>
          <p className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{seatsAvailable}</p>
        </div>
        <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950/50">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">{t.classPrice}</p>
          <p className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{classPrice.toFixed(3)} {currency}</p>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          {success}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-300">{t.userSearch}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-300">{t.selectUser}</span>
          <select
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="">{loadingUsers ? '...' : t.selectUser}</option>
            {filteredUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName} - {user.phoneNumber || user.email}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!loadingUsers && users.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{t.noUsers}</p>
      ) : null}

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-300">{t.action}</span>
          <select
            value={action}
            onChange={(event) => {
              const next = event.target.value as ActionKind;
              setAction(next);
              if (next === 'ENROLL_AND_DEDUCT') {
                setAmount(String(classPrice || 0));
                setDescription(`Class payment: ${classTitle}`);
              }
            }}
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="ENROLL_AND_DEDUCT">{t.enrollDeduct}</option>
            <option value="TOPUP">{t.topup}</option>
            <option value="DEDUCT">{t.deduct}</option>
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-300">{t.amount} ({currency})</span>
          <input
            type="number"
            min="0"
            step="0.001"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>

        <label className="space-y-1 text-sm md:col-span-1">
          <span className="text-zinc-600 dark:text-zinc-300">{t.description}</span>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
      </div>

      {action === 'ENROLL_AND_DEDUCT' ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">{t.participantName}</span>
            <input
              value={participantName}
              onChange={(event) => setParticipantName(event.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">{t.participantDob}</span>
            <input
              type="date"
              value={participantDateOfBirth}
              onChange={(event) => setParticipantDateOfBirth(event.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">{t.participantLang}</span>
            <select
              value={participantPreferredLanguage}
              onChange={(event) => setParticipantPreferredLanguage(event.target.value === 'ar' ? 'ar' : 'en')}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">{t.notes}</span>
            <input
              value={specialRequests}
              onChange={(event) => setSpecialRequests(event.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
        </div>
      ) : null}

      <div className="mt-5">
        <button
          type="button"
          onClick={() => void runOperation()}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-xl bg-[color:var(--noon-teal)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? t.saving : t.save}
        </button>
      </div>
    </section>
  );
}
