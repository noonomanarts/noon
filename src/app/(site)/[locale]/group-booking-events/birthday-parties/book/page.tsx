'use client';

import { useState } from 'react';
import { isLocale, type Locale } from '@/lib/locale';
import { useParams, useRouter } from 'next/navigation';

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
    <div className="mx-auto min-h-screen w-full max-w-4xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="noon-text mb-4 text-3xl font-bold">{t.title}</h1>
        
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  step >= s ? 'bg-pink-600 text-white' : 'bg-gray-200'
                }`}
              >
                {s}
              </div>
              {s < 3 && <div className="h-0.5 w-12 bg-gray-300" />}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-8 shadow-sm">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="noon-text text-2xl font-bold">{t.selectDateTime}</h2>
            
            {/* Package Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-pink-50 p-4">
                <h3 className="noon-text mb-3 font-semibold">{t.packageIncludes}</h3>
                <ul className="space-y-1 text-sm">
                  <li>✓ {t.includes1}</li>
                  <li>✓ {t.includes2}</li>
                  <li>✓ {t.includes3}</li>
                  <li>✓ {t.duration}</li>
                  <li>✓ {t.girlsOnly}</li>
                  <li>✓ {t.minimumAge}</li>
                </ul>
              </div>
              
              <div className="rounded-lg bg-yellow-50 p-4">
                <h3 className="noon-text mb-3 font-semibold">{t.notIncluded}</h3>
                <ul className="space-y-1 text-sm">
                  <li>✗ {t.notIncluded1}</li>
                  <li>✗ {t.notIncluded2}</li>
                </ul>
              </div>
            </div>

            <div>
              <label className="noon-text mb-2 block font-semibold">{t.selectDate}</label>
              <input
                type="date"
                className="w-full rounded-lg border px-4 py-2"
                value={formData.selectedDate}
                onChange={(e) => setFormData({ ...formData, selectedDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="noon-text mb-2 block font-semibold">{t.selectTime}</label>
              <select
                className="w-full rounded-lg border px-4 py-2"
                value={formData.selectedTime}
                onChange={(e) => setFormData({ ...formData, selectedTime: e.target.value })}
              >
                <option value="">Select time...</option>
                <option value="14:00">02:00 PM</option>
                <option value="16:00">04:00 PM</option>
                <option value="18:00">06:00 PM</option>
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="noon-text mb-2 block font-semibold">
                  {t.participants}
                </label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  className="w-full rounded-lg border px-4 py-2"
                  value={formData.numberOfParticipants}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      numberOfParticipants: parseInt(e.target.value),
                    })
                  }
                />
                <p className="mt-1 text-xs text-gray-500">{t.maxParticipants}</p>
              </div>

              <div>
                <label className="noon-text mb-2 block font-semibold">
                  {t.childAge}
                </label>
                <input
                  type="number"
                  min="10"
                  className="w-full rounded-lg border px-4 py-2"
                  value={formData.childAge}
                  onChange={(e) =>
                    setFormData({ ...formData, childAge: parseInt(e.target.value) })
                  }
                />
                <p className="mt-1 text-xs text-gray-500">{t.minimumAge}</p>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="noon-text text-2xl font-bold">{t.bookingInfo}</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="noon-text mb-2 block font-semibold">
                  {t.fullName} *
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border px-4 py-2"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="noon-text mb-2 block font-semibold">
                  {t.email} *
                </label>
                <input
                  type="email"
                  className="w-full rounded-lg border px-4 py-2"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="noon-text mb-2 block font-semibold">
                  {t.phoneNumber} *
                </label>
                <input
                  type="tel"
                  className="w-full rounded-lg border px-4 py-2"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="noon-text mb-2 block font-semibold">
                {t.specialRequests}
              </label>
              <textarea
                className="w-full rounded-lg border px-4 py-2"
                rows={4}
                value={formData.specialRequests}
                onChange={(e) =>
                  setFormData({ ...formData, specialRequests: e.target.value })
                }
                placeholder="Dietary restrictions, themes, special requests..."
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="noon-text text-2xl font-bold">Review & Submit</h2>
            
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="space-y-2 text-sm">
                <div><strong>Date:</strong> {formData.selectedDate}</div>
                <div><strong>Time:</strong> {formData.selectedTime}</div>
                <div><strong>Participants:</strong> {formData.numberOfParticipants}</div>
                <div><strong>Child Age:</strong> {formData.childAge}</div>
                <div><strong>Parent Name:</strong> {formData.fullName}</div>
                <div><strong>Email:</strong> {formData.email}</div>
                <div><strong>Phone:</strong> {formData.phoneNumber}</div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <span className="text-4xl">✓</span>
            </div>
            <h2 className="noon-text mb-4 text-2xl font-bold">{t.confirmationTitle}</h2>
            <p className="noon-text-muted mx-auto mb-8 max-w-2xl">
              {t.confirmationMessage}
            </p>
            <button
              onClick={() => router.push(`/${locale}`)}
              className="rounded-lg bg-pink-600 px-6 py-3 font-semibold text-white hover:bg-pink-700"
            >
              {t.backToHome}
            </button>
          </div>
        )}

        {step < 4 && (
          <div className="mt-8 flex justify-between">
            <button
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
              className="rounded-lg border px-6 py-2 font-semibold disabled:opacity-50"
            >
              {t.back}
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && (!formData.selectedDate || !formData.selectedTime))
                }
                className="rounded-lg bg-pink-600 px-6 py-2 font-semibold text-white hover:bg-pink-700 disabled:opacity-50"
              >
                {t.next}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.fullName || !formData.email || !formData.phoneNumber}
                className="rounded-lg bg-green-600 px-6 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? '...' : t.submit}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
