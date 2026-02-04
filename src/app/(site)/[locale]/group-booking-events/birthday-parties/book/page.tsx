'use client';

import { useState } from 'react';
import { isLocale, type Locale } from '@/lib/locale';
import { useParams, useRouter } from 'next/navigation';
import { MdCake, MdGroup, MdSchedule, MdEmail, MdPhone, MdPerson } from 'react-icons/md';
import { IoCalendar, IoCheckmarkCircle, IoClose } from 'react-icons/io5';
import { GiPartyPopper, GiCupcake } from 'react-icons/gi';
import { HiSparkles } from 'react-icons/hi2';

export default function BirthdayPartyBookingPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (isLocale(params.locale as string) ? params.locale : 'en') as Locale;
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    selectedDate: '',
    selectedTime: '',
    numberOfParticipants: 10,
    childAge: 10,
    fullName: '',
    email: '',
    phoneNumber: '',
    specialRequests: '',
    gifts: [] as Array<{ id: string; name: string; price: number }>,
  });

  const t = {
    title: locale === 'ar' ? 'حجز حفلة عيد ميلاد' : 'Book Birthday Party',
    step: locale === 'ar' ? 'الخطوة' : 'Step',
    next: locale === 'ar' ? 'التالي' : 'Next',
    back: locale === 'ar' ? 'رجوع' : 'Back',
    submit: locale === 'ar' ? 'إرسال الطلب' : 'Submit Request',
    
    selectDateTime: locale === 'ar' ? 'اختر التاريخ والوقت' : 'Select Date & Time',
    selectDate: locale === 'ar' ? 'التاريخ' : 'Date',
    selectTime: locale === 'ar' ? 'الوقت' : 'Time',
    
    partyDetails: locale === 'ar' ? 'تفاصيل الحفلة' : 'Party Details',
    participants: locale === 'ar' ? 'عدد المشاركين' : 'Number of Participants',
    maxParticipants: locale === 'ar' ? 'الحد الأقصى 16' : 'Maximum 16',
    childAge: locale === 'ar' ? 'عمر الطفل' : "Child's Age",
    minimumAge: locale === 'ar' ? 'الحد الأدنى 10 سنوات' : 'Minimum 10 years',
    duration: locale === 'ar' ? 'المدة: ساعتان' : 'Duration: 2 hours',
    girlsOnly: locale === 'ar' ? 'للبنات فقط' : 'Girls Only',
    
    packageIncludes: locale === 'ar' ? 'تشمل الباقة' : 'Package Includes',
    includes1: locale === 'ar' ? 'قهوة عربية وحلويات' : 'Arabic coffee & sweets',
    includes2: locale === 'ar' ? 'المعدات والمكونات' : 'Equipment & ingredients',
    includes3: locale === 'ar' ? 'إرشاد من فريق نون' : 'Guided by Noon team',
    
    notIncluded: locale === 'ar' ? 'غير مشملة' : 'Not Included',
    notIncluded1: locale === 'ar' ? 'زينة وهدايا عيد الميلاد' : 'Birthday decoration & gifts',
    notIncluded2: locale === 'ar' ? 'كعكة عيد الميلاد' : 'Birthday cake',
    
    bookingInfo: locale === 'ar' ? 'معلومات الحجز' : 'Booking Information',
    fullName: locale === 'ar' ? 'اسم ولي الأمر' : "Parent's Name",
    email: locale === 'ar' ? 'البريد الإلكتروني' : 'Email',
    phoneNumber: locale === 'ar' ? 'رقم الهاتف' : 'Phone Number',
    specialRequests: locale === 'ar' ? 'طلبات خاصة' : 'Special Requests',
    
    confirmationTitle: locale === 'ar' ? 'شكراً لطلبك!' : 'Thank You!',
    confirmationMessage: locale === 'ar'
      ? 'تم استلام طلب حجز حفلة عيد الميلاد. سيتواصل معك فريقنا قريباً.'
      : 'Your birthday party booking request has been received. Our team will contact you shortly.',
    backToHome: locale === 'ar' ? 'العودة للرئيسية' : 'Back to Home',
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/public/event-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'BIRTHDAY_PARTY',
          ...formData,
        }),
      });

      if (response.ok) {
        setStep(4);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="noon-bg min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-coral to-coral-light px-6 py-2 text-white">
            <GiPartyPopper className="text-2xl" />
            <span className="font-semibold">Birthday Party Booking</span>
          </div>
          <h1 className="noon-text text-3xl font-bold md:text-4xl">
            {t.title}
          </h1>
          <p className="noon-text-muted mx-auto mt-4 max-w-2xl">
            Create unforgettable memories with a fun cooking party for girls aged 10+
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-12 flex justify-center gap-4">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
                  step > s
                    ? 'bg-gradient-to-br from-coral to-coral-light text-white shadow-lg'
                    : step === s
                    ? 'border-2 border-coral bg-coral/10 text-coral'
                    : 'border-2 border-gray-200 bg-white text-gray-400'
                }`}
              >
                {step > s ? (
                  <IoCheckmarkCircle className="text-2xl" />
                ) : (
                  <span className="font-bold">{s}</span>
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  step >= s ? 'text-coral' : 'text-gray-400'
                }`}
              >
                {s === 1 && 'Date & Time'}
                {s === 2 && 'Details'}
                {s === 3 && 'Review'}
                {s === 4 && 'Confirm'}
              </span>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border-2 border-coral/20 bg-white p-8 shadow-xl">
        {step === 1 && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="noon-text mb-2 text-2xl font-bold">{t.selectDateTime}</h2>
              <p className="noon-text-muted">Select your preferred date, time, and party size</p>
            </div>

            {/* Package Information */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border-2 border-yellow/20 bg-gradient-to-br from-yellow/5 to-yellow-light/5 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow/20">
                    <GiCupcake className="text-2xl text-yellow" />
                  </div>
                  <h3 className="text-lg font-bold">Package Details</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <MdGroup className="text-xl text-yellow" />
                    <div>
                      <span className="text-sm text-gray-600">Participants:</span>
                      <p className="font-semibold">Max 16 girls</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MdSchedule className="text-xl text-yellow" />
                    <div>
                      <span className="text-sm text-gray-600">Duration:</span>
                      <p className="font-semibold">2 hours</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MdCake className="text-xl text-yellow" />
                    <div>
                      <span className="text-sm text-gray-600">Age:</span>
                      <p className="font-semibold">Girls 10+ years</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border-2 border-teal/20 bg-gradient-to-br from-teal/5 to-teal-light/5 p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <IoCheckmarkCircle className="text-xl text-teal" />
                    <h3 className="font-bold text-teal">{t.packageIncludes}</h3>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <IoCheckmarkCircle className="mt-0.5 text-teal" />
                      <span>{t.includes1}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <IoCheckmarkCircle className="mt-0.5 text-teal" />
                      <span>{t.includes2}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <IoCheckmarkCircle className="mt-0.5 text-teal" />
                      <span>{t.includes3}</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-2xl border-2 border-coral/20 bg-gradient-to-br from-coral/5 to-coral-light/5 p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <IoClose className="text-xl text-coral" />
                    <h3 className="font-bold text-coral">{t.notIncluded}</h3>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <IoClose className="mt-0.5 text-coral" />
                      <span>{t.notIncluded1}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <IoClose className="mt-0.5 text-coral" />
                      <span>{t.notIncluded2}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Date & Time Selection */}
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="noon-text mb-3 flex items-center gap-2 font-semibold">
                  <IoCalendar className="text-xl text-coral" />
                  {t.selectDate}
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 transition-all focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/20"
                  value={formData.selectedDate}
                  onChange={(e) => setFormData({ ...formData, selectedDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="noon-text mb-3 flex items-center gap-2 font-semibold">
                  <MdSchedule className="text-xl text-coral" />
                  {t.selectTime}
                </label>
                <select
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 transition-all focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/20"
                  value={formData.selectedTime}
                  onChange={(e) => setFormData({ ...formData, selectedTime: e.target.value })}
                >
                  <option value="">Select time...</option>
                  <option value="14:00">02:00 PM</option>
                  <option value="16:00">04:00 PM</option>
                  <option value="18:00">06:00 PM</option>
                </select>
              </div>
            </div>

            {/* Party Details */}
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="noon-text mb-3 flex items-center gap-2 font-semibold">
                  <MdGroup className="text-xl text-purple" />
                  {t.participants}
                </label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 transition-all focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/20"
                  value={formData.numberOfParticipants}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      numberOfParticipants: parseInt(e.target.value),
                    })
                  }
                  placeholder="e.g., 12"
                />
                <p className="mt-2 text-xs text-gray-500">{t.maxParticipants}</p>
              </div>

              <div>
                <label className="noon-text mb-3 flex items-center gap-2 font-semibold">
                  <MdCake className="text-xl text-purple" />
                  {t.childAge}
                </label>
                <input
                  type="number"
                  min="10"
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 transition-all focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/20"
                  value={formData.childAge}
                  onChange={(e) =>
                    setFormData({ ...formData, childAge: parseInt(e.target.value) })
                  }
                  placeholder="e.g., 12"
                />
                <p className="mt-2 text-xs text-gray-500">{t.minimumAge}</p>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="noon-text mb-2 text-2xl font-bold">{t.bookingInfo}</h2>
              <p className="noon-text-muted">Parent/Guardian contact information</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="noon-text mb-3 flex items-center gap-2 font-semibold">
                  <MdPerson className="text-xl text-coral" />
                  {t.fullName} *
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 transition-all focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/20"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Parent/Guardian full name"
                  required
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="noon-text mb-3 flex items-center gap-2 font-semibold">
                    <MdEmail className="text-xl text-yellow" />
                    {t.email} *
                  </label>
                  <input
                    type="email"
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 transition-all focus:border-yellow focus:outline-none focus:ring-2 focus:ring-yellow/20"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="noon-text mb-3 flex items-center gap-2 font-semibold">
                    <MdPhone className="text-xl text-yellow" />
                    {t.phoneNumber} *
                  </label>
                  <input
                    type="tel"
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 transition-all focus:border-yellow focus:outline-none focus:ring-2 focus:ring-yellow/20"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="+968 XXXX XXXX"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="noon-text mb-3 flex items-center gap-2 font-semibold">
                  <HiSparkles className="text-xl text-purple" />
                  {t.specialRequests}
                </label>
                <textarea
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 transition-all focus:border-purple focus:outline-none focus:ring-2 focus:ring-purple/20"
                  rows={4}
                  value={formData.specialRequests}
                  onChange={(e) =>
                    setFormData({ ...formData, specialRequests: e.target.value })
                  }
                  placeholder="Dietary restrictions, theme preferences, special requests..."
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="noon-text mb-2 text-2xl font-bold">Review & Submit</h2>
              <p className="noon-text-muted">Please review your booking details before submitting</p>
            </div>

            <div className="rounded-2xl border-2 border-purple/20 bg-gradient-to-br from-purple/5 to-purple-dark/5 p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple/20">
                  <GiPartyPopper className="text-2xl text-purple" />
                </div>
                <h3 className="text-xl font-bold">Booking Summary</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4 rounded-xl bg-white/50 p-4">
                  <IoCalendar className="mt-1 text-xl text-coral" />
                  <div className="flex-1">
                    <span className="text-sm text-gray-600">Date & Time</span>
                    <p className="font-semibold">{formData.selectedDate} at {formData.selectedTime}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-xl bg-white/50 p-4">
                  <MdGroup className="mt-1 text-xl text-yellow" />
                  <div className="flex-1">
                    <span className="text-sm text-gray-600">Party Details</span>
                    <p className="font-semibold">{formData.numberOfParticipants} participants • Age: {formData.childAge}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-xl bg-white/50 p-4">
                  <MdPerson className="mt-1 text-xl text-teal" />
                  <div className="flex-1">
                    <span className="text-sm text-gray-600">Parent/Guardian</span>
                    <p className="font-semibold">{formData.fullName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-xl bg-white/50 p-4">
                  <MdEmail className="mt-1 text-xl text-purple" />
                  <div className="flex-1">
                    <span className="text-sm text-gray-600">Contact Information</span>
                    <p className="font-semibold">{formData.email}</p>
                    <p className="font-semibold">{formData.phoneNumber}</p>
                  </div>
                </div>

                {formData.specialRequests && (
                  <div className="flex items-start gap-4 rounded-xl bg-white/50 p-4">
                    <HiSparkles className="mt-1 text-xl text-coral" />
                    <div className="flex-1">
                      <span className="text-sm text-gray-600">Special Requests</span>
                      <p className="font-semibold">{formData.specialRequests}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border-2 border-yellow/20 bg-yellow/5 p-6">
              <div className="flex items-start gap-3">
                <HiSparkles className="mt-1 text-xl text-yellow" />
                <div className="text-sm">
                  <p className="font-semibold text-yellow-dark">Note:</p>
                  <p className="text-gray-600">Our team will review your request and contact you within 24 hours to confirm availability and finalize the details.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-coral to-coral-light shadow-lg">
              <IoCheckmarkCircle className="text-6xl text-white" />
            </div>
            <h2 className="noon-text mb-4 text-3xl font-bold">{t.confirmationTitle}</h2>
            <p className="noon-text-muted mx-auto mb-8 max-w-2xl text-lg">
              {t.confirmationMessage}
            </p>
            <div className="mx-auto flex max-w-md flex-col gap-4">
              <button
                onClick={() => router.push(`/${locale}`)}
                className="rounded-xl bg-gradient-to-r from-coral to-coral-light px-8 py-4 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              >
                {t.backToHome}
              </button>
              <button
                onClick={() => router.push(`/${locale}/group-booking-events`)}
                className="rounded-xl border-2 border-coral px-8 py-4 font-semibold text-coral transition-all hover:bg-coral/5"
              >
                View All Events
              </button>
            </div>
          </div>
        )}

        {step < 4 && (
          <div className="mt-12 flex justify-between gap-4">
            <button
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
              className="rounded-xl border-2 border-coral px-8 py-3 font-semibold text-coral transition-all hover:bg-coral/5 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              {t.back}
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && (!formData.selectedDate || !formData.selectedTime)) ||
                  (step === 2 && (!formData.fullName || !formData.email || !formData.phoneNumber))
                }
                className="rounded-xl bg-gradient-to-r from-coral to-coral-light px-8 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100"
              >
                {t.next}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.fullName || !formData.email || !formData.phoneNumber}
                className="rounded-xl bg-gradient-to-r from-purple to-purple-dark px-8 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    Processing...
                  </span>
                ) : (
                  t.submit
                )}
              </button>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
