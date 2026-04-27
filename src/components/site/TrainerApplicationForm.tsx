"use client";

import { useState, useTransition } from "react";
import { MdCheckCircle } from "react-icons/md";
import Link from "next/link";
import { isValidEmail, isValidPhone } from "@/lib/forms/eventBooking";
import type { Locale } from "@/lib/locale";

type WorkshopCategory = "culinary" | "arts" | "";

export default function TrainerApplicationForm({ locale }: { locale: Locale }) {
  const isArabic = locale === "ar";
  const [isPending, startTransition] = useTransition();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Personal info
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationality, setNationality] = useState("");
  const [address, setAddress] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");

  // Qualifications
  const [certifications, setCertifications] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [employerDetails, setEmployerDetails] = useState("");

  // Training experience
  const [hasPriorTraining, setHasPriorTraining] = useState<boolean | null>(null);
  const [priorTrainingDetails, setPriorTrainingDetails] = useState("");
  const [motivation, setMotivation] = useState("");
  const [personalityDescription, setPersonalityDescription] = useState("");

  // Workshop category
  const [workshopCategory, setWorkshopCategory] = useState<WorkshopCategory>("");
  const [otherSkillsDetail, setOtherSkillsDetail] = useState("");

  // Culinary fields
  const [hasRestaurantExperience, setHasRestaurantExperience] = useState<boolean | null>(null);
  const [restaurantDetails, setRestaurantDetails] = useState("");
  const [kitchenInterests, setKitchenInterests] = useState("");
  const [culinaryDishes, setCulinaryDishes] = useState<string[]>([]);
  const [culinaryDishInput, setCulinaryDishInput] = useState("");

  // Arts fields
  const [artsSpecialization, setArtsSpecialization] = useState("");
  const [artsWorkshopIdeas, setArtsWorkshopIdeas] = useState<string[]>([]);
  const [artsIdeaInput, setArtsIdeaInput] = useState("");

  const t = {
    title: isArabic ? "نموذج تقديم طلب مدرب/مدربة" : "Trainer Application Form",
    // Sections
    personalInfo: isArabic ? "المعلومات الشخصية" : "Personal Information",
    qualifications: isArabic ? "المؤهلات" : "Qualifications",
    trainingExperience: isArabic ? "الخبرة التدريبية" : "Training Experience",
    workshopCategorySection: isArabic ? "فئة ورشة العمل" : "Workshop Category",
    culinarySection: isArabic ? "تفاصيل الطبخ" : "Culinary Details",
    artsSection: isArabic ? "تفاصيل الفنون والأشغال" : "Arts & Crafts Details",
    // Fields
    fullName: isArabic ? "الاسم الكامل" : "Full Name",
    phone: isArabic ? "رقم الهاتف" : "Phone Number",
    email: isArabic ? "البريد الإلكتروني" : "Email",
    dateOfBirth: isArabic ? "تاريخ الميلاد" : "Date of Birth",
    nationality: isArabic ? "الجنسية" : "Nationality",
    address: isArabic ? "العنوان" : "Address",
    instagramUrl: isArabic ? "رابط الانستقرام" : "Instagram URL",
    certifications: isArabic ? "الشهادات والمؤهلات" : "Certifications & Qualifications",
    certificationsHint: isArabic ? "اذكر شهاداتك ومؤهلاتك ذات الصلة" : "List your relevant certifications",
    employmentStatus: isArabic ? "الحالة الوظيفية" : "Employment Status",
    employed: isArabic ? "موظف/موظفة" : "Employed",
    selfEmployed: isArabic ? "عمل حر" : "Self-employed",
    unemployed: isArabic ? "غير موظف/موظفة" : "Unemployed",
    student: isArabic ? "طالب/طالبة" : "Student",
    employerDetails: isArabic ? "تفاصيل جهة العمل" : "Employer Details",
    hasPriorTraining: isArabic ? "هل لديك خبرة تدريبية سابقة؟" : "Do you have prior training experience?",
    yes: isArabic ? "نعم" : "Yes",
    no: isArabic ? "لا" : "No",
    priorTrainingDetails: isArabic ? "تفاصيل الخبرة التدريبية" : "Training Experience Details",
    priorTrainingHint: isArabic ? "اذكر تفاصيل خبرتك التدريبية السابقة" : "Describe your prior training experience",
    motivation: isArabic ? "ما الذي يحفزك للانضمام إلى نون؟" : "What motivates you to join Noon?",
    personalityDescription: isArabic ? "صف شخصيتك بثلاث كلمات" : "Describe your personality in three words",
    workshopCategoryLabel: isArabic ? "في أي مجال ترغب بتقديم ورش العمل؟" : "Which workshop area would you like to teach?",
    culinary: isArabic ? "طبخ" : "Culinary",
    arts: isArabic ? "فنون وأشغال يدوية" : "Arts & Crafts",
    otherSkills: isArabic ? "مهارات أخرى ترغب بمشاركتها" : "Other skills you'd like to share",
    hasRestaurantExperience: isArabic ? "هل عملت في مطعم أو مطبخ تجاري؟" : "Have you worked in a restaurant or commercial kitchen?",
    restaurantDetails: isArabic ? "تفاصيل الخبرة في المطاعم" : "Restaurant Experience Details",
    kitchenInterests: isArabic ? "ما هي اهتماماتك في المطبخ؟" : "What are your kitchen interests?",
    kitchenInterestsHint: isArabic ? "مثال: المطبخ العماني، الحلويات، المخبوزات" : "e.g. Omani cuisine, desserts, baking",
    culinaryDishesLabel: isArabic ? "ما الأطباق التي يمكنك تعليمها؟" : "What dishes can you teach?",
    addDish: isArabic ? "أضف طبق" : "Add dish",
    artsSpecialization: isArabic ? "ما هو تخصصك الفني؟" : "What is your art specialization?",
    artsWorkshopIdeasLabel: isArabic ? "أفكار لورش العمل الفنية" : "Workshop ideas",
    addIdea: isArabic ? "أضف فكرة" : "Add idea",
    remove: isArabic ? "حذف" : "Remove",
    submit: isArabic ? "إرسال الطلب" : "Submit Application",
    submitting: isArabic ? "جاري الإرسال..." : "Submitting...",
    successTitle: isArabic ? "تم إرسال طلبك بنجاح!" : "Application Submitted!",
    successMessage: isArabic
      ? "شكراً لاهتمامك بالانضمام إلى فريق نون. سيراجع فريقنا طلبك ويتواصل معك قريباً."
      : "Thank you for your interest in joining the Noon team. Our team will review your application and contact you soon.",
    backToJoinUs: isArabic ? "العودة" : "Back",
    required: isArabic ? "مطلوب" : "Required",
    requiredError: isArabic ? "يرجى تعبئة جميع الحقول المطلوبة" : "Please fill in all required fields",
    culinaryDishesRequired: isArabic ? "يرجى إضافة طبق واحد على الأقل" : "Please add at least one dish",
    artsIdeasRequired: isArabic ? "يرجى إضافة فكرة ورشة واحدة على الأقل" : "Please add at least one workshop idea",
  };

  function addCulinaryDish() {
    const trimmed = culinaryDishInput.trim();
    if (trimmed && !culinaryDishes.includes(trimmed)) {
      setCulinaryDishes([...culinaryDishes, trimmed]);
      setCulinaryDishInput("");
    }
  }

  function addArtsIdea() {
    const trimmed = artsIdeaInput.trim();
    if (trimmed && !artsWorkshopIdeas.includes(trimmed)) {
      setArtsWorkshopIdeas([...artsWorkshopIdeas, trimmed]);
      setArtsIdeaInput("");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const baseFields = [
      fullName,
      phone,
      email,
      dateOfBirth,
      nationality,
      address,
      instagramUrl,
      certifications,
      employmentStatus,
      motivation,
      personalityDescription,
      workshopCategory,
      otherSkillsDetail,
    ];

    if (baseFields.some((value) => !value.trim()) || hasPriorTraining === null) {
      setError(t.requiredError);
      return;
    }
    if (!isValidEmail(email.trim())) {
      setError(isArabic ? "صيغة البريد الإلكتروني غير صحيحة" : "Invalid email format");
      return;
    }
    if (!isValidPhone(phone.trim())) {
      setError(isArabic ? "صيغة رقم الهاتف غير صحيحة" : "Invalid phone format");
      return;
    }
    if ((employmentStatus === "employed" || employmentStatus === "self-employed") && !employerDetails.trim()) {
      setError(t.requiredError);
      return;
    }
    if (hasPriorTraining && !priorTrainingDetails.trim()) {
      setError(t.requiredError);
      return;
    }
    if (workshopCategory === "culinary") {
      if (hasRestaurantExperience === null || !kitchenInterests.trim() || culinaryDishes.length === 0) {
        setError(culinaryDishes.length === 0 ? t.culinaryDishesRequired : t.requiredError);
        return;
      }
      if (hasRestaurantExperience && !restaurantDetails.trim()) {
        setError(t.requiredError);
        return;
      }
    }
    if (workshopCategory === "arts" && (!artsSpecialization.trim() || artsWorkshopIdeas.length === 0)) {
      setError(artsWorkshopIdeas.length === 0 ? t.artsIdeasRequired : t.requiredError);
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/public/join-us", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formType: "trainer",
            fullName: fullName.trim(),
            phone: phone.trim(),
            email: email.trim(),
            dateOfBirth: dateOfBirth || null,
            nationality: nationality.trim() || null,
            address: address.trim() || null,
            instagramUrl: instagramUrl.trim() || null,
            certifications: certifications.trim() || null,
            employmentStatus: employmentStatus || null,
            employerDetails: employerDetails.trim() || null,
            hasPriorTraining,
            priorTrainingDetails: priorTrainingDetails.trim() || null,
            motivation: motivation.trim() || null,
            personalityDescription: personalityDescription.trim() || null,
            workshopCategory,
            otherSkillsDetail: otherSkillsDetail.trim() || null,
            hasRestaurantExperience,
            restaurantDetails: restaurantDetails.trim() || null,
            kitchenInterests: kitchenInterests.trim() || null,
            culinaryDishes,
            artsSpecialization: artsSpecialization.trim() || null,
            artsWorkshopIdeas,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || (isArabic ? "حدث خطأ" : "An error occurred"));
          return;
        }

        setIsSubmitted(true);
      } catch {
        setError(isArabic ? "حدث خطأ في الاتصال" : "A connection error occurred");
      }
    });
  }

  if (isSubmitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <MdCheckCircle className="mx-auto mb-4 size-16 text-emerald-500" />
        <h2 className="text-2xl font-bold text-zinc-900">{t.successTitle}</h2>
        <p className="mt-3 text-sm text-zinc-600">{t.successMessage}</p>
        <Link
          href={`/${locale}/join-us`}
          className="mt-6 inline-flex items-center rounded-xl bg-[color:var(--noon-teal)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)]"
        >
          {t.backToJoinUs}
        </Link>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20";
  const labelClass = "block text-sm font-medium text-zinc-700";
  const sectionClass = "space-y-4 rounded-2xl border border-zinc-200 bg-white p-5";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold text-zinc-900">{t.title}</h1>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <fieldset className={sectionClass}>
          <legend className="text-base font-semibold text-zinc-900">{t.personalInfo}</legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <span className={labelClass}>{t.fullName} *</span>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
            </label>
            <label className="space-y-1">
              <span className={labelClass}>{t.phone} *</span>
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} dir="ltr" />
            </label>
            <label className="space-y-1">
              <span className={labelClass}>{t.email} *</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} dir="ltr" />
            </label>
            <label className="space-y-1">
              <span className={labelClass}>{t.dateOfBirth} *</span>
              <input type="date" required value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={inputClass} dir="ltr" />
            </label>
            <label className="space-y-1">
              <span className={labelClass}>{t.nationality} *</span>
              <input type="text" required value={nationality} onChange={(e) => setNationality(e.target.value)} className={inputClass} />
            </label>
            <label className="space-y-1">
              <span className={labelClass}>{t.address} *</span>
              <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
            </label>
          </div>
          <label className="block space-y-1">
            <span className={labelClass}>{t.instagramUrl} *</span>
            <input type="url" required value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} className={inputClass} dir="ltr" placeholder="https://instagram.com/..." />
          </label>
        </fieldset>

        {/* Qualifications */}
        <fieldset className={sectionClass}>
          <legend className="text-base font-semibold text-zinc-900">{t.qualifications}</legend>

          <label className="block space-y-1">
            <span className={labelClass}>{t.certifications} *</span>
            <textarea rows={3} required value={certifications} onChange={(e) => setCertifications(e.target.value)} className={inputClass} placeholder={t.certificationsHint} />
          </label>

          <label className="block space-y-1">
            <span className={labelClass}>{t.employmentStatus} *</span>
            <select required value={employmentStatus} onChange={(e) => setEmploymentStatus(e.target.value)} className={inputClass}>
              <option value="">—</option>
              <option value="employed">{t.employed}</option>
              <option value="self-employed">{t.selfEmployed}</option>
              <option value="unemployed">{t.unemployed}</option>
              <option value="student">{t.student}</option>
            </select>
          </label>

          {(employmentStatus === "employed" || employmentStatus === "self-employed") && (
            <label className="block space-y-1">
              <span className={labelClass}>{t.employerDetails} *</span>
              <input type="text" required value={employerDetails} onChange={(e) => setEmployerDetails(e.target.value)} className={inputClass} />
            </label>
          )}
        </fieldset>

        {/* Training Experience */}
        <fieldset className={sectionClass}>
          <legend className="text-base font-semibold text-zinc-900">{t.trainingExperience}</legend>

          <div className="space-y-1">
            <span className={labelClass}>{t.hasPriorTraining} *</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="priorTraining" required checked={hasPriorTraining === true} onChange={() => setHasPriorTraining(true)} />
                {t.yes}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="priorTraining" required checked={hasPriorTraining === false} onChange={() => setHasPriorTraining(false)} />
                {t.no}
              </label>
            </div>
          </div>

          {hasPriorTraining && (
            <label className="block space-y-1">
              <span className={labelClass}>{t.priorTrainingDetails} *</span>
              <textarea rows={3} required value={priorTrainingDetails} onChange={(e) => setPriorTrainingDetails(e.target.value)} className={inputClass} placeholder={t.priorTrainingHint} />
            </label>
          )}

          <label className="block space-y-1">
            <span className={labelClass}>{t.motivation} *</span>
            <textarea rows={3} required value={motivation} onChange={(e) => setMotivation(e.target.value)} className={inputClass} />
          </label>

          <label className="block space-y-1">
            <span className={labelClass}>{t.personalityDescription} *</span>
            <input type="text" required value={personalityDescription} onChange={(e) => setPersonalityDescription(e.target.value)} className={inputClass} />
          </label>
        </fieldset>

        {/* Workshop Category */}
        <fieldset className={sectionClass}>
          <legend className="text-base font-semibold text-zinc-900">{t.workshopCategorySection}</legend>

          <div className="space-y-1">
            <span className={labelClass}>{t.workshopCategoryLabel} *</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="workshopCategory" value="culinary" required checked={workshopCategory === "culinary"} onChange={() => setWorkshopCategory("culinary")} />
                {t.culinary}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="workshopCategory" value="arts" required checked={workshopCategory === "arts"} onChange={() => setWorkshopCategory("arts")} />
                {t.arts}
              </label>
            </div>
          </div>

          <label className="block space-y-1">
            <span className={labelClass}>{t.otherSkills} *</span>
            <input type="text" required value={otherSkillsDetail} onChange={(e) => setOtherSkillsDetail(e.target.value)} className={inputClass} />
          </label>
        </fieldset>

        {/* Culinary-specific */}
        {workshopCategory === "culinary" && (
          <fieldset className={sectionClass}>
            <legend className="text-base font-semibold text-zinc-900">{t.culinarySection}</legend>

            <div className="space-y-1">
              <span className={labelClass}>{t.hasRestaurantExperience} *</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="restaurantExp" required checked={hasRestaurantExperience === true} onChange={() => setHasRestaurantExperience(true)} />
                  {t.yes}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="restaurantExp" required checked={hasRestaurantExperience === false} onChange={() => setHasRestaurantExperience(false)} />
                  {t.no}
                </label>
              </div>
            </div>

            {hasRestaurantExperience && (
              <label className="block space-y-1">
                <span className={labelClass}>{t.restaurantDetails} *</span>
                <textarea rows={3} required value={restaurantDetails} onChange={(e) => setRestaurantDetails(e.target.value)} className={inputClass} />
              </label>
            )}

            <label className="block space-y-1">
              <span className={labelClass}>{t.kitchenInterests} *</span>
              <input type="text" required value={kitchenInterests} onChange={(e) => setKitchenInterests(e.target.value)} className={inputClass} placeholder={t.kitchenInterestsHint} />
            </label>

            <div className="space-y-2">
              <span className={labelClass}>{t.culinaryDishesLabel} *</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={culinaryDishInput}
                  onChange={(e) => setCulinaryDishInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCulinaryDish(); } }}
                  className={inputClass}
                />
                <button type="button" onClick={addCulinaryDish} className="shrink-0 rounded-xl bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200">
                  {t.addDish}
                </button>
              </div>
              {culinaryDishes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {culinaryDishes.map((dish, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-sm text-amber-800">
                      {dish}
                      <button type="button" onClick={() => setCulinaryDishes(culinaryDishes.filter((_, j) => j !== i))} className="text-amber-500 hover:text-amber-700">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </fieldset>
        )}

        {/* Arts-specific */}
        {workshopCategory === "arts" && (
          <fieldset className={sectionClass}>
            <legend className="text-base font-semibold text-zinc-900">{t.artsSection}</legend>

            <label className="block space-y-1">
              <span className={labelClass}>{t.artsSpecialization} *</span>
              <input type="text" required value={artsSpecialization} onChange={(e) => setArtsSpecialization(e.target.value)} className={inputClass} />
            </label>

            <div className="space-y-2">
              <span className={labelClass}>{t.artsWorkshopIdeasLabel} *</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={artsIdeaInput}
                  onChange={(e) => setArtsIdeaInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addArtsIdea(); } }}
                  className={inputClass}
                />
                <button type="button" onClick={addArtsIdea} className="shrink-0 rounded-xl bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200">
                  {t.addIdea}
                </button>
              </div>
              {artsWorkshopIdeas.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {artsWorkshopIdeas.map((idea, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1 text-sm text-violet-800">
                      {idea}
                      <button type="button" onClick={() => setArtsWorkshopIdeas(artsWorkshopIdeas.filter((_, j) => j !== i))} className="text-violet-500 hover:text-violet-700">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </fieldset>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-[color:var(--noon-teal)] px-6 py-3 text-base font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)] disabled:opacity-50"
        >
          {isPending ? t.submitting : t.submit}
        </button>
      </form>
    </div>
  );
}
