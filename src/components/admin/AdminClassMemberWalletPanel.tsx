'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getPaymentMethodLabel } from '@/lib/paymentMethod';
import type { Gender } from '@/lib/db/types';

type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  preferredLanguage: 'ENGLISH' | 'ARABIC';
  dateOfBirth: string | null;
  gender: Gender | null;
};

type ActionKind = 'TOPUP' | 'DEDUCT' | 'ENROLL_AND_DEDUCT';
type EnrollmentPaymentMethod = 'WALLET' | 'CASH' | 'ONLINE' | 'BANK_TRANSFER';
type ParticipantLanguage = 'en' | 'ar';
type Participant = {
  fullName: string;
  dateOfBirth: string;
  preferredLanguage: ParticipantLanguage;
  gender: Gender | '';
};
type ParticipantWithPartner = Participant & {
  partner: Participant | null;
};

function emptyParticipant(): ParticipantWithPartner {
  return {
    fullName: '',
    dateOfBirth: '',
    preferredLanguage: 'en',
    gender: '',
    partner: null,
  };
}

function emptyPartner(): Participant {
  return {
    fullName: '',
    dateOfBirth: '',
    preferredLanguage: 'en',
    gender: '',
  };
}

function participantMatchesAudience(audienceGender: string | null | undefined, gender: Gender | '') {
  if (!gender) return false;
  if (!audienceGender || audienceGender === 'MIXED') return true;
  if (audienceGender === 'MALE_ONLY') return gender === 'MALE';
  if (audienceGender === 'FEMALE_ONLY') return gender === 'FEMALE';
  return true;
}

function calculateAgeFromDateString(dateOfBirth: string, today: Date): number {
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export default function AdminClassMemberWalletPanel({
  classId,
  classTitle,
  classPrice,
  currency,
  seatsAvailable,
  classSubCategory,
  audienceGender,
  minimumAge,
  maximumAge,
  locale,
  onChangedAction,
}: {
  classId: string;
  classTitle: string;
  classPrice: number;
  currency: string;
  seatsAvailable: number;
  classSubCategory?: string | null;
  audienceGender?: 'MALE_ONLY' | 'FEMALE_ONLY' | 'MIXED' | null;
  minimumAge?: number | null;
  maximumAge?: number | null;
  locale: string;
  onChangedAction?: () => Promise<void> | void;
}) {
  const isArabic = locale === 'ar';
  const isMomKid = classSubCategory === 'MOM_AND_KID';

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [action, setAction] = useState<ActionKind>('ENROLL_AND_DEDUCT');
  const [paymentMethod, setPaymentMethod] = useState<EnrollmentPaymentMethod>('WALLET');
  const [amount, setAmount] = useState(String(classPrice || 0));
  const [description, setDescription] = useState('');
  const [participantCount, setParticipantCount] = useState(1);
  const [participants, setParticipants] = useState<ParticipantWithPartner[]>([emptyParticipant()]);
  const [specialRequests, setSpecialRequests] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  const payableParticipants = participants.slice(0, participantCount);

  const freePartners = payableParticipants
    .map((participant) => participant.partner)
    .filter((partner): partner is Participant => Boolean(partner));

  const calculateAge = useCallback((dateOfBirth: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return calculateAgeFromDateString(dateOfBirth, today);
  }, []);

  const needsFreePartner = useCallback((dateOfBirth: string) => {
    if (!isMomKid || !dateOfBirth) return false;
    const dob = new Date(`${dateOfBirth}T00:00:00`);
    if (Number.isNaN(dob.getTime())) return false;
    const age = calculateAge(dateOfBirth);
    return age >= 5 && age <= 9;
  }, [calculateAge, isMomKid]);

  useEffect(() => {
    if (!selectedUser) return;
    setParticipants((current) => {
      const next = [...current];
      const first = next[0] ?? emptyParticipant();
      next[0] = {
        ...first,
        fullName: first.fullName || selectedUser.fullName || '',
        dateOfBirth: first.dateOfBirth || (selectedUser.dateOfBirth ? String(selectedUser.dateOfBirth).slice(0, 10) : ''),
        gender: first.gender || selectedUser.gender || '',
        preferredLanguage: selectedUser.preferredLanguage === 'ARABIC' ? 'ar' : 'en',
        partner: needsFreePartner(first.dateOfBirth || (selectedUser.dateOfBirth ? String(selectedUser.dateOfBirth).slice(0, 10) : ''))
          ? (first.partner ?? emptyPartner())
          : null,
      };
      return next;
    });
  }, [needsFreePartner, selectedUser]);

  useEffect(() => {
    setParticipants((current) => {
      const next = Array.from({ length: participantCount }, (_, index) => {
        const item = current[index] ?? emptyParticipant();
        return needsFreePartner(item.dateOfBirth)
          ? { ...item, partner: item.partner ?? emptyPartner() }
          : { ...item, partner: null };
      });
      return next;
    });
  }, [needsFreePartner, participantCount]);

  useEffect(() => {
    if (action !== 'ENROLL_AND_DEDUCT') return;
    setAmount(String(Number((classPrice * participantCount).toFixed(3))));
  }, [action, classPrice, participantCount]);

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
            gender: Gender | null;
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
    paymentMethod: isArabic ? 'طريقة الدفع' : 'Payment option',
    topup: isArabic ? 'شحن محفظة العميل' : 'Top-up customer wallet',
    deduct: isArabic ? 'خصم من المحفظة' : 'Deduct from wallet',
    enrollDeduct: isArabic ? 'تسجيل بالكلاس + خصم' : 'Enroll in class + deduct',
    amount: isArabic ? 'المبلغ' : 'Amount',
    description: isArabic ? 'الوصف' : 'Description',
    participantName: isArabic ? 'اسم المشارك' : 'Participant name',
    participantDob: isArabic ? 'تاريخ الميلاد' : 'Date of birth',
    participantGender: isArabic ? 'الجنس' : 'Gender',
    participantLang: isArabic ? 'لغة المشارك' : 'Participant language',
    participantsCount: isArabic ? 'عدد المشاركين' : 'Number of Participants',
    participants: isArabic ? 'بيانات المشاركين' : 'Participants Details',
    participant: isArabic ? 'مشارك' : 'Participant',
    partnerDetails: isArabic ? 'بيانات الشريك مع الطفل' : 'Adult companion details',
    momKidPolicy: isArabic
      ? 'الأطفال من 5 إلى 9 سنوات يحتاجون مرافقاً بعمر 10+ مع تسجيل بياناته. الأطفال أقل من 5 سنوات غير مقبولين.'
      : 'Children aged 5-9 need a 10+ companion and both records must be entered. Children under 5 are not accepted.',
    notes: isArabic ? 'ملاحظات' : 'Notes',
    save: isArabic ? 'تنفيذ العملية' : 'Run Operation',
    saving: isArabic ? 'جاري التنفيذ...' : 'Processing...',
    success: isArabic ? 'تم تنفيذ العملية بنجاح.' : 'Operation completed successfully.',
    noUsers: isArabic ? 'لا يوجد عملاء متاحون حالياً.' : 'No customers are available at the moment.',
    chooseUser: isArabic ? 'يجب اختيار عميل أولاً.' : 'Please select a customer first.',
    chooseParticipant: isArabic ? 'أكمل بيانات جميع المشاركين قبل التسجيل.' : 'Complete all participant details before enrollment.',
    genderRequired: isArabic ? 'حدد الجنس لكل مشارك قبل التسجيل.' : 'Select a gender for each participant before enrollment.',
    audienceMismatch: isArabic ? 'أحد المشاركين لا يطابق فئة الجنس المسموح بها لهذه الدورة.' : 'A participant does not match this class gender eligibility.',
    invalidDob: isArabic ? 'تاريخ الميلاد غير صالح.' : 'Invalid date of birth.',
    seatsError: isArabic ? 'عدد المشاركين أكبر من المقاعد المتاحة.' : 'Participants exceed available seats.',
    ageTooYoung: isArabic
      ? `عمر أحد المشاركين أقل من الحد الأدنى المطلوب (${minimumAge ?? 0} سنة).`
      : `A participant is below the minimum age requirement (${minimumAge ?? 0} years).`,
    ageTooOld: isArabic
      ? `عمر أحد المشاركين أكبر من الحد الأقصى المسموح (${maximumAge ?? 0} سنة).`
      : `A participant is above the maximum age limit (${maximumAge ?? 0} years).`,
    momKidUnderFive: isArabic
      ? 'لا نقبل الأطفال أقل من 5 سنوات في هذه الورشة.'
      : 'Children under 5 are not accepted in this workshop.',
    momKidPartnerRequired: isArabic
      ? 'الأطفال بعمر 5-9 سنوات يحتاجون مرافقاً بعمر 10+ مع تسجيل الاسمين.'
      : 'Children aged 5-9 must be registered with a 10+ companion and both names must be provided.',
  };

  const updateParticipant = (index: number, key: keyof Participant, value: string) => {
    setParticipants((current) => current.map((participant, participantIndex) => {
      if (participantIndex !== index) return participant;
      const next = { ...participant, [key]: value };
      return key === 'dateOfBirth' && !needsFreePartner(String(value))
        ? { ...next, partner: null }
        : next;
    }));
  };

  const updatePartner = (index: number, key: keyof Participant, value: string) => {
    setParticipants((current) => current.map((participant, participantIndex) => {
      if (participantIndex !== index) return participant;
      return {
        ...participant,
        partner: {
          ...(participant.partner ?? emptyPartner()),
          [key]: value,
        },
      };
    }));
  };

  const validateEnrollment = () => {
    if (participantCount < 1) {
      setError(t.chooseParticipant);
      return false;
    }

    if (participantCount > seatsAvailable) {
      setError(t.seatsError);
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const participant of payableParticipants) {
      if (!participant.fullName.trim() || !participant.dateOfBirth.trim()) {
        setError(t.chooseParticipant);
        return false;
      }

      if (!participant.gender) {
        setError(t.genderRequired);
        return false;
      }

      if (!participantMatchesAudience(audienceGender, participant.gender)) {
        setError(t.audienceMismatch);
        return false;
      }

      const dob = new Date(`${participant.dateOfBirth}T00:00:00`);
      if (Number.isNaN(dob.getTime()) || dob.getTime() > today.getTime()) {
        setError(t.invalidDob);
        return false;
      }

      const age = calculateAge(participant.dateOfBirth);
      if (minimumAge != null && minimumAge > 0 && age < minimumAge) {
        setError(t.ageTooYoung);
        return false;
      }

      if (maximumAge != null && maximumAge > 0 && age > maximumAge) {
        setError(t.ageTooOld);
        return false;
      }

      if (isMomKid) {
        if (age < 5) {
          setError(t.momKidUnderFive);
          return false;
        }

        if (age >= 5 && age <= 9) {
          const partner = participant.partner;
          if (!partner || !partner.fullName.trim() || !partner.dateOfBirth.trim()) {
            setError(t.momKidPartnerRequired);
            return false;
          }

          if (!partner.gender) {
            setError(t.genderRequired);
            return false;
          }

          if (!participantMatchesAudience(audienceGender, partner.gender)) {
            setError(t.audienceMismatch);
            return false;
          }

          const partnerDob = new Date(`${partner.dateOfBirth}T00:00:00`);
          if (Number.isNaN(partnerDob.getTime()) || partnerDob.getTime() > today.getTime()) {
            setError(t.invalidDob);
            return false;
          }

          if (calculateAge(partner.dateOfBirth) < 10) {
            setError(t.momKidPartnerRequired);
            return false;
          }
        }
      }
    }

    return true;
  };

  const runOperation = async () => {
    setError(null);
    setSuccess(null);

    if (!selectedUserId) {
      setError(t.chooseUser);
      return;
    }

    if (action === 'ENROLL_AND_DEDUCT' && !validateEnrollment()) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/admin/classes/${classId}/member-wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          paymentMethod,
          userId: selectedUserId,
          amount: Number(amount),
          description,
          numberOfParticipants: participantCount,
          participants: payableParticipants.map(({ fullName, dateOfBirth, preferredLanguage, gender }) => ({
            fullName,
            dateOfBirth,
            preferredLanguage,
            gender,
          })),
          freePartners,
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
        setParticipantCount(1);
        setParticipants([emptyParticipant()]);
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
                setPaymentMethod('WALLET');
                setParticipantCount(1);
              }
            }}
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="ENROLL_AND_DEDUCT">{t.enrollDeduct}</option>
            <option value="TOPUP">{t.topup}</option>
            <option value="DEDUCT">{t.deduct}</option>
          </select>
        </label>

        {action === 'ENROLL_AND_DEDUCT' ? (
          <label className="space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">{t.paymentMethod}</span>
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value as EnrollmentPaymentMethod)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="WALLET">{getPaymentMethodLabel('WALLET', locale)}</option>
              <option value="CASH">{getPaymentMethodLabel('CASH', locale)}</option>
              <option value="ONLINE">{getPaymentMethodLabel('ONLINE', locale)}</option>
              <option value="BANK_TRANSFER">{getPaymentMethodLabel('BANK_TRANSFER', locale)}</option>
            </select>
          </label>
        ) : null}

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
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">{t.participantsCount}</span>
              <select
                value={participantCount}
                onChange={(event) => setParticipantCount(Number(event.target.value))}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                {Array.from({ length: Math.max(1, Math.min(10, seatsAvailable)) }, (_, index) => index + 1).map((count) => (
                  <option key={count} value={count}>{count}</option>
                ))}
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

          {isMomKid ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-300">
              {t.momKidPolicy}
            </p>
          ) : null}

          <div className="space-y-4">
            {participants.slice(0, participantCount).map((participant, index) => (
              <div key={`participant-${index}`} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {t.participant} {index + 1}
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.participantName}</span>
                    <input
                      value={participant.fullName}
                      onChange={(event) => updateParticipant(index, 'fullName', event.target.value)}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.participantDob}</span>
                    <input
                      type="date"
                      value={participant.dateOfBirth}
                      onChange={(event) => updateParticipant(index, 'dateOfBirth', event.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.participantGender}</span>
                    <select
                      value={participant.gender}
                      onChange={(event) => updateParticipant(index, 'gender', event.target.value)}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    >
                      <option value="">{isArabic ? 'اختر الجنس' : 'Select gender'}</option>
                      <option value="MALE">{isArabic ? 'ذكر' : 'Male'}</option>
                      <option value="FEMALE">{isArabic ? 'أنثى' : 'Female'}</option>
                    </select>
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{t.participantLang}</span>
                    <select
                      value={participant.preferredLanguage}
                      onChange={(event) => updateParticipant(index, 'preferredLanguage', event.target.value === 'ar' ? 'ar' : 'en')}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    >
                      <option value="en">English</option>
                      <option value="ar">العربية</option>
                    </select>
                  </label>
                </div>

                {isMomKid && needsFreePartner(participant.dateOfBirth) ? (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-900/20">
                    <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.partnerDetails}</p>
                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="space-y-1 text-sm">
                        <span className="text-zinc-600 dark:text-zinc-300">{t.participantName}</span>
                        <input
                          value={participant.partner?.fullName ?? ''}
                          onChange={(event) => updatePartner(index, 'fullName', event.target.value)}
                          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>

                      <label className="space-y-1 text-sm">
                        <span className="text-zinc-600 dark:text-zinc-300">{t.participantDob}</span>
                        <input
                          type="date"
                          value={participant.partner?.dateOfBirth ?? ''}
                          onChange={(event) => updatePartner(index, 'dateOfBirth', event.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>

                      <label className="space-y-1 text-sm">
                        <span className="text-zinc-600 dark:text-zinc-300">{t.participantGender}</span>
                        <select
                          value={participant.partner?.gender ?? ''}
                          onChange={(event) => updatePartner(index, 'gender', event.target.value)}
                          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        >
                          <option value="">{isArabic ? 'اختر الجنس' : 'Select gender'}</option>
                          <option value="MALE">{isArabic ? 'ذكر' : 'Male'}</option>
                          <option value="FEMALE">{isArabic ? 'أنثى' : 'Female'}</option>
                        </select>
                      </label>

                      <label className="space-y-1 text-sm">
                        <span className="text-zinc-600 dark:text-zinc-300">{t.participantLang}</span>
                        <select
                          value={participant.partner?.preferredLanguage ?? 'en'}
                          onChange={(event) => updatePartner(index, 'preferredLanguage', event.target.value === 'ar' ? 'ar' : 'en')}
                          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        >
                          <option value="en">English</option>
                          <option value="ar">العربية</option>
                        </select>
                      </label>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
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
