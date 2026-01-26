'use client';

import { useState } from 'react';
import { isLocale, type Locale } from '@/lib/locale';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

type Step = 1 | 2 | 3 | 4;

interface BookingData {
  // Step 1
  selectedDate?: string;
  selectedTime?: string;
  
  // Step 2
  packageType?: 'STANDARD' | 'PREMIUM';
  gifts?: Array<{
    id: string;
    name: string;
    price: number;
    scope: 'ALL_PARTICIPANTS' | 'WINNING_TEAM';
  }>;
  
  // Step 3
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  companyOrGroupName?: string;
  numberOfParticipants?: number;
  specialRequests?: string;
}

const giftOptions = [
  {
    id: '1',
    name: 'Premium Gift Box',
    nameAr: 'صندوق هدايا فاخر',
    price: 150,
    image: '/images/gift-1.jpg',
  },
  {
    id: '2',
    name: 'Branded Apron Set',
    nameAr: 'طقم مريول مميز',
    price: 200,
    image: '/images/gift-2.jpg',
  },
  {
    id: '3',
    name: 'Culinary Tools Kit',
    nameAr: 'طقم أدوات الطهي',
    price: 300,
    image: '/images/gift-3.jpg',
  },
];

export default function CookingCompetitionBookingPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (isLocale(params.locale as string) ? params.locale : 'en') as Locale;
  
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [bookingData, setBookingData] = useState<BookingData>({});
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const t = {
    title: locale === 'ar' ? 'حجز مسابقة الطبخ' : 'Book Cooking Competition',
    step: locale === 'ar' ? 'الخطوة' : 'Step',
    next: locale === 'ar' ? 'التالي' : 'Next',
    back: locale === 'ar' ? 'رجوع' : 'Back',
    submit: locale === 'ar' ? 'إرسال الطلب' : 'Submit Request',
    
    // Step 1
    step1Title: locale === 'ar' ? 'اختر التاريخ والوقت' : 'Select Date & Time',
    selectDate: locale === 'ar' ? 'اختر التاريخ' : 'Select Date',
    selectTime: locale === 'ar' ? 'اختر الوقت' : 'Select Time',
    briefTitle: locale === 'ar' ? 'عن المسابقة' : 'About the Competition',
    briefText: locale === 'ar' 
      ? 'نرحب بكم مع قهوة عربية وحلويات، نقوم بسحب الفرق، صندوق مفاجآت، الطبخ والتنافس، التصويت، وإعلان الفريق الفائز!'
      : 'Welcome with Arabic coffee & sweets, team draw, mystery box challenge, cook & compete, voting, and winner announcement!',
    
    // Step 2
    step2Title: locale === 'ar' ? 'اختر الباقة' : 'Choose Your Package',
    standardPackage: locale === 'ar' ? 'الباقة العادية' : 'Standard Competition',
    premiumPackage: locale === 'ar' ? 'الباقة المميزة' : 'Premium Competition',
    participants: locale === 'ar' ? 'المشاركون' : 'Participants',
    groups: locale === 'ar' ? 'المجموعات' : 'Groups',
    dishes: locale === 'ar' ? 'الأطباق لكل مجموعة' : 'Dishes per Group',
    duration: locale === 'ar' ? 'المدة' : 'Duration',
    hours: locale === 'ar' ? 'ساعات' : 'hours',
    gifts: locale === 'ar' ? 'الهدايا' : 'Gifts',
    notIncluded: locale === 'ar' ? 'غير مشملة' : 'Not Included',
    included: locale === 'ar' ? 'مشملة' : 'Included',
    availableAsAddon: locale === 'ar' ? '(متاحة كإضافة)' : '(Available as add-on)',
    includes: locale === 'ar' ? 'يشمل' : 'Includes',
    giftAddons: locale === 'ar' ? 'إضافات الهدايا' : 'Gift Add-ons',
    forAllParticipants: locale === 'ar' ? 'لجميع المشاركين' : 'For All Participants',
    forWinningTeam: locale === 'ar' ? 'للفريق الفائز فقط' : 'For Winning Team Only',
    addToBooking: locale === 'ar' ? 'أضف للحجز' : 'Add to Booking',
    selected: locale === 'ar' ? 'محدد' : 'Selected',
    
    // Step 3
    step3Title: locale === 'ar' ? 'معلومات الحجز' : 'Booking Information',
    fullName: locale === 'ar' ? 'الاسم الكامل' : 'Full Name',
    email: locale === 'ar' ? 'البريد الإلكتروني' : 'Email',
    phoneNumber: locale === 'ar' ? 'رقم الهاتف' : 'Phone Number',
    companyName: locale === 'ar' ? 'اسم الشركة/المجموعة' : 'Company/Group Name',
    numberOfParticipants: locale === 'ar' ? 'عدد المشاركين' : 'Number of Participants',
    specialRequests: locale === 'ar' ? 'طلبات خاصة/ملاحظات' : 'Special Requests/Notes',
    
    // Step 4
    confirmationTitle: locale === 'ar' ? 'شكراً لطلبك!' : 'Thank You for Your Request!',
    confirmationMessage: locale === 'ar'
      ? 'سيقوم فريقنا بمراجعة التفاصيل والاتصال بك قريباً لتأكيد الحجز وإتمام الدفع. ستصلك رسالة تأكيد عبر البريد الإلكتروني وWhatsApp.'
      : 'Our team will review the details and contact you shortly to confirm the booking and complete payment. You will receive a confirmation email and WhatsApp message.',
    backToHome: locale === 'ar' ? 'العودة للرئيسية' : 'Back to Home',
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/public/event-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'COOKING_COMPETITION',
          ...bookingData,
        }),
      });

      if (response.ok) {
        setShowConfirmation(true);
        setCurrentStep(4);
      } else {
        alert('Error submitting booking. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error submitting booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleGift = (gift: typeof giftOptions[0], scope: 'ALL_PARTICIPANTS' | 'WINNING_TEAM') => {
    const currentGifts = bookingData.gifts || [];
    const existingIndex = currentGifts.findIndex(
      g => g.id === gift.id && g.scope === scope
    );

    if (existingIndex >= 0) {
      setBookingData({
        ...bookingData,
        gifts: currentGifts.filter((_, i) => i !== existingIndex),
      });
    } else {
      setBookingData({
        ...bookingData,
        gifts: [
          ...currentGifts,
          {
            id: gift.id,
            name: locale === 'ar' ? gift.nameAr : gift.name,
            price: gift.price,
            scope,
          },
        ],
      });
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="noon-text mb-2 text-3xl font-bold">{t.title}</h1>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  currentStep >= step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step}
              </div>
              {step < 3 && <div className="h-0.5 w-12 bg-gray-300" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="rounded-lg border bg-white p-8 shadow-sm">
        {/* Step 1: Date & Time Selection */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="noon-text text-2xl font-bold">{t.step1Title}</h2>
            
            {/* Brief */}
            <div className="rounded-lg bg-blue-50 p-4">
              <h3 className="noon-text mb-2 font-semibold">{t.briefTitle}</h3>
              <p className="noon-text-muted text-sm">{t.briefText}</p>
            </div>

            {/* Date Selection */}
            <div>
              <label className="noon-text mb-2 block font-semibold">
                {t.selectDate}
              </label>
              <input
                type="date"
                className="w-full rounded-lg border px-4 py-2"
                value={bookingData.selectedDate || ''}
                onChange={(e) =>
                  setBookingData({ ...bookingData, selectedDate: e.target.value })
                }
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Time Selection */}
            <div>
              <label className="noon-text mb-2 block font-semibold">
                {t.selectTime}
              </label>
              <select
                className="w-full rounded-lg border px-4 py-2"
                value={bookingData.selectedTime || ''}
                onChange={(e) =>
                  setBookingData({ ...bookingData, selectedTime: e.target.value })
                }
              >
                <option value="">Select time...</option>
                <option value="09:00">09:00 AM</option>
                <option value="10:00">10:00 AM</option>
                <option value="14:00">02:00 PM</option>
                <option value="16:00">04:00 PM</option>
                <option value="18:00">06:00 PM</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Package Selection */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="noon-text text-2xl font-bold">{t.step2Title}</h2>

            {/* Package Options */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Standard Package */}
              <div
                onClick={() =>
                  setBookingData({ ...bookingData, packageType: 'STANDARD' })
                }
                className={`cursor-pointer rounded-lg border-2 p-6 transition ${
                  bookingData.packageType === 'STANDARD'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <h3 className="noon-text mb-4 text-xl font-bold">
                  {t.standardPackage}
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>{t.participants}:</strong> 8-40
                  </div>
                  <div>
                    <strong>{t.groups}:</strong> 2-8
                  </div>
                  <div>
                    <strong>{t.dishes}:</strong> 1-2
                  </div>
                  <div>
                    <strong>{t.duration}:</strong> 3 {t.hours}
                  </div>
                  <div>
                    <strong>{t.gifts}:</strong> {t.notIncluded} {t.availableAsAddon}
                  </div>
                </div>
              </div>

              {/* Premium Package */}
              <div
                onClick={() =>
                  setBookingData({ ...bookingData, packageType: 'PREMIUM' })
                }
                className={`cursor-pointer rounded-lg border-2 p-6 transition ${
                  bookingData.packageType === 'PREMIUM'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <h3 className="noon-text mb-4 text-xl font-bold">
                  {t.premiumPackage}
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>{t.participants}:</strong> 8-40
                  </div>
                  <div>
                    <strong>{t.groups}:</strong> 2-8
                  </div>
                  <div>
                    <strong>{t.dishes}:</strong> 2-3
                  </div>
                  <div>
                    <strong>{t.duration}:</strong> 3 {t.hours}
                  </div>
                  <div>
                    <strong>{t.gifts}:</strong> {t.included} (Fabric Aprons)
                  </div>
                </div>
              </div>
            </div>

            {/* Gift Add-ons */}
            <div>
              <h3 className="noon-text mb-4 text-xl font-semibold">{t.giftAddons}</h3>
              <div className="space-y-4">
                {giftOptions.map((gift) => (
                  <div key={gift.id} className="rounded-lg border p-4">
                    <div className="flex items-start gap-4">
                      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {/* Placeholder for gift image */}
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                          🎁
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="noon-text font-semibold">
                          {locale === 'ar' ? gift.nameAr : gift.name}
                        </h4>
                        <p className="noon-text-muted text-sm">
                          {gift.price} SAR
                        </p>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => toggleGift(gift, 'ALL_PARTICIPANTS')}
                            className={`rounded px-3 py-1 text-xs ${
                              bookingData.gifts?.some(
                                g => g.id === gift.id && g.scope === 'ALL_PARTICIPANTS'
                              )
                                ? 'bg-blue-600 text-white'
                                : 'border border-blue-600 text-blue-600'
                            }`}
                          >
                            {t.forAllParticipants}
                          </button>
                          <button
                            onClick={() => toggleGift(gift, 'WINNING_TEAM')}
                            className={`rounded px-3 py-1 text-xs ${
                              bookingData.gifts?.some(
                                g => g.id === gift.id && g.scope === 'WINNING_TEAM'
                              )
                                ? 'bg-green-600 text-white'
                                : 'border border-green-600 text-green-600'
                            }`}
                          >
                            {t.forWinningTeam}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Booking Form */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="noon-text text-2xl font-bold">{t.step3Title}</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="noon-text mb-2 block font-semibold">
                  {t.fullName} *
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border px-4 py-2"
                  value={bookingData.fullName || ''}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, fullName: e.target.value })
                  }
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
                  value={bookingData.email || ''}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, email: e.target.value })
                  }
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
                  value={bookingData.phoneNumber || ''}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, phoneNumber: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="noon-text mb-2 block font-semibold">
                  {t.companyName}
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border px-4 py-2"
                  value={bookingData.companyOrGroupName || ''}
                  onChange={(e) =>
                    setBookingData({
                      ...bookingData,
                      companyOrGroupName: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="noon-text mb-2 block font-semibold">
                  {t.numberOfParticipants} *
                </label>
                <input
                  type="number"
                  min="8"
                  max="40"
                  className="w-full rounded-lg border px-4 py-2"
                  value={bookingData.numberOfParticipants || ''}
                  onChange={(e) =>
                    setBookingData({
                      ...bookingData,
                      numberOfParticipants: parseInt(e.target.value),
                    })
                  }
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
                value={bookingData.specialRequests || ''}
                onChange={(e) =>
                  setBookingData({
                    ...bookingData,
                    specialRequests: e.target.value,
                  })
                }
              />
            </div>

            {/* Summary */}
            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="noon-text mb-2 font-semibold">Booking Summary</h3>
              <div className="space-y-1 text-sm">
                <div>Date: {bookingData.selectedDate}</div>
                <div>Time: {bookingData.selectedTime}</div>
                <div>Package: {bookingData.packageType}</div>
                {bookingData.gifts && bookingData.gifts.length > 0 && (
                  <div>
                    Gifts: {bookingData.gifts.map(g => g.name).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 4 && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <span className="text-4xl">✓</span>
            </div>
            <h2 className="noon-text mb-4 text-2xl font-bold">
              {t.confirmationTitle}
            </h2>
            <p className="noon-text-muted mx-auto mb-8 max-w-2xl">
              {t.confirmationMessage}
            </p>
            <button
              onClick={() => router.push(`/${locale}`)}
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              {t.backToHome}
            </button>
          </div>
        )}

        {/* Navigation Buttons */}
        {currentStep < 4 && (
          <div className="mt-8 flex justify-between">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className="rounded-lg border px-6 py-2 font-semibold disabled:opacity-50"
            >
              {t.back}
            </button>
            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                disabled={
                  (currentStep === 1 &&
                    (!bookingData.selectedDate || !bookingData.selectedTime)) ||
                  (currentStep === 2 && !bookingData.packageType)
                }
                className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {t.next}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={
                  loading ||
                  !bookingData.fullName ||
                  !bookingData.email ||
                  !bookingData.phoneNumber ||
                  !bookingData.numberOfParticipants
                }
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
