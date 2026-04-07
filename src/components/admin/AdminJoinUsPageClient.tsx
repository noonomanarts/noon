"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FiSearch, FiUser, FiMail, FiPhone, FiCalendar } from "react-icons/fi";
import type { Locale } from "@/lib/locale";

type ApplicationItem = {
  id: string;
  formType: string;
  status: string;
  fullName: string;
  email: string;
  phone: string | null;
  nationality: string | null;
  workshopCategory: string | null;
  createdAt: string;
  dateOfBirth: string | null;
  address: string | null;
  instagramUrl: string | null;
  certifications: string | null;
  employmentStatus: string | null;
  employerDetails: string | null;
  hasPriorTraining: boolean;
  priorTrainingDetails: string | null;
  motivation: string | null;
  personalityDescription: string | null;
  otherSkillsDetail: string | null;
  hasRestaurantExperience: boolean;
  restaurantDetails: string | null;
  kitchenInterests: string | null;
  culinaryDishes: string[];
  artsSpecialization: string | null;
  artsWorkshopIdeas: string[];
};

const statusColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  REVIEWED: "bg-amber-100 text-amber-800",
  ACCEPTED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
};

export default function AdminJoinUsPageClient({
  locale,
  applications,
  total,
  initialFilters,
}: {
  locale: Locale;
  applications: ApplicationItem[];
  total: number;
  initialFilters: { formType?: string; status?: string; search?: string };
}) {
  const isArabic = locale === "ar";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string>(applications[0]?.id || "");
  const [filterType, setFilterType] = useState(initialFilters.formType || "");
  const [filterStatus, setFilterStatus] = useState(initialFilters.status || "");
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || "");

  const selectedApp = useMemo(
    () => applications.find((a) => a.id === selectedId) ?? null,
    [applications, selectedId],
  );

  const t = {
    title: isArabic ? "طلبات الانضمام" : "Join Us Applications",
    total: isArabic ? "إجمالي" : "Total",
    name: isArabic ? "الاسم" : "Name",
    type: isArabic ? "النوع" : "Type",
    status: isArabic ? "الحالة" : "Status",
    category: isArabic ? "الفئة" : "Category",
    date: isArabic ? "التاريخ" : "Date",
    search: isArabic ? "بحث..." : "Search...",
    allTypes: isArabic ? "كل الأنواع" : "All Types",
    allStatuses: isArabic ? "كل الحالات" : "All Statuses",
    trainer: isArabic ? "مدرب/مدربة" : "Trainer",
    socialMedia: isArabic ? "سوشل ميديا" : "Social Media",
    details: isArabic ? "التفاصيل" : "Details",
    selectApp: isArabic ? "اختر طلباً من القائمة لعرض التفاصيل" : "Select an application to view details",
    empty: isArabic ? "لا توجد طلبات" : "No applications yet",
    personal: isArabic ? "المعلومات الشخصية" : "Personal Info",
    qualifications: isArabic ? "المؤهلات" : "Qualifications",
    training: isArabic ? "الخبرة التدريبية" : "Training Experience",
    workshopDetails: isArabic ? "تفاصيل الورشة" : "Workshop Details",
    updateStatus: isArabic ? "تحديث الحالة" : "Update Status",
    phone: isArabic ? "الهاتف" : "Phone",
    email: isArabic ? "البريد" : "Email",
    nationality: isArabic ? "الجنسية" : "Nationality",
    dob: isArabic ? "تاريخ الميلاد" : "Date of Birth",
    address: isArabic ? "العنوان" : "Address",
    instagram: isArabic ? "انستقرام" : "Instagram",
    certifications: isArabic ? "الشهادات" : "Certifications",
    employment: isArabic ? "الحالة الوظيفية" : "Employment",
    employer: isArabic ? "جهة العمل" : "Employer",
    priorTraining: isArabic ? "خبرة تدريبية" : "Prior Training",
    motivation: isArabic ? "الدافع" : "Motivation",
    personality: isArabic ? "الشخصية" : "Personality",
    otherSkills: isArabic ? "مهارات أخرى" : "Other Skills",
    restaurant: isArabic ? "خبرة مطاعم" : "Restaurant Exp.",
    kitchenInterests: isArabic ? "اهتمامات المطبخ" : "Kitchen Interests",
    dishes: isArabic ? "أطباق" : "Dishes",
    artsSpec: isArabic ? "التخصص الفني" : "Art Specialization",
    workshopIdeas: isArabic ? "أفكار الورش" : "Workshop Ideas",
    yes: isArabic ? "نعم" : "Yes",
    no: isArabic ? "لا" : "No",
    culinary: isArabic ? "طبخ" : "Culinary",
    arts: isArabic ? "فنون" : "Arts",
  };

  function applyFilters() {
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    if (filterStatus) params.set("status", filterStatus);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    const qs = params.toString();
    startTransition(() => {
      router.push(`/${locale}/admin/join-us-applications${qs ? `?${qs}` : ""}`);
    });
  }

  async function handleStatusChange(appId: string, newStatus: string) {
    try {
      const res = await fetch("/api/admin/join-us/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: appId, status: newStatus }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      // silently fail
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(isArabic ? "ar-OM-u-nu-latn" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const categoryLabel = (c: string | null) => {
    if (c === "culinary") return t.culinary;
    if (c === "arts") return t.arts;
    return c || "—";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{t.title}</h1>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{t.total}: {total}</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative">
          <FiSearch className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") applyFilters(); }}
            placeholder={t.search}
            className="h-10 rounded-xl border border-zinc-300 bg-white ps-9 pe-3 text-sm text-zinc-900 focus:border-[color:var(--noon-teal)] focus:outline-none focus:ring-2 focus:ring-[color:var(--noon-teal)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); }}
          className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        >
          <option value="">{t.allTypes}</option>
          <option value="trainer">{t.trainer}</option>
          <option value="social_media">{t.socialMedia}</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); }}
          className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        >
          <option value="">{t.allStatuses}</option>
          <option value="NEW">NEW</option>
          <option value="REVIEWED">REVIEWED</option>
          <option value="ACCEPTED">ACCEPTED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
        <button
          type="button"
          onClick={applyFilters}
          disabled={isPending}
          className="h-10 rounded-xl bg-[color:var(--noon-teal)] px-4 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)] disabled:opacity-50"
        >
          {isArabic ? "بحث" : "Filter"}
        </button>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200/70 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800/70 dark:bg-zinc-900 dark:text-zinc-400">
          {t.empty}
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          {/* List */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white dark:border-zinc-800/70 dark:bg-zinc-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t.name}</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t.category}</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t.status}</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t.date}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {applications.map((app) => {
                    const active = app.id === selectedId;
                    return (
                      <tr
                        key={app.id}
                        onClick={() => setSelectedId(app.id)}
                        className={`cursor-pointer transition-colors ${active ? "bg-[color:var(--noon-teal-soft)]/40" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"}`}
                      >
                        <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{app.fullName}</td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{categoryLabel(app.workshopCategory)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${statusColors[app.status] || "bg-zinc-100 text-zinc-700"}`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{formatDate(app.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail panel */}
          <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 dark:border-zinc-800/70 dark:bg-zinc-900">
            {!selectedApp ? (
              <p className="py-10 text-sm text-zinc-500 dark:text-zinc-400">{t.selectApp}</p>
            ) : (
              <div className="space-y-5 text-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{t.details}</h2>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[selectedApp.status] || ""}`}>
                    {selectedApp.status}
                  </span>
                </div>

                {/* Status update */}
                <div className="flex items-center gap-2">
                  <span className="text-zinc-600 dark:text-zinc-300">{t.updateStatus}:</span>
                  {["NEW", "REVIEWED", "ACCEPTED", "REJECTED"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleStatusChange(selectedApp.id, s)}
                      disabled={selectedApp.status === s}
                      className={`rounded-lg px-2 py-1 text-xs font-semibold transition ${s === selectedApp.status ? "opacity-40 cursor-default" : "hover:opacity-80 cursor-pointer"} ${statusColors[s]}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Personal info */}
                <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{t.personal}</h3>
                  <p className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300"><FiUser className="size-4" />{selectedApp.fullName}</p>
                  <p className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300"><FiMail className="size-4" />{selectedApp.email}</p>
                  <p className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300"><FiPhone className="size-4" />{selectedApp.phone || "—"}</p>
                  {selectedApp.dateOfBirth && <p className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300"><FiCalendar className="size-4" />{selectedApp.dateOfBirth}</p>}
                  {selectedApp.nationality && <p><span className="font-medium">{t.nationality}:</span> {selectedApp.nationality}</p>}
                  {selectedApp.address && <p><span className="font-medium">{t.address}:</span> {selectedApp.address}</p>}
                  {selectedApp.instagramUrl && (
                    <p><span className="font-medium">{t.instagram}:</span>{" "}
                      <a href={selectedApp.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-[color:var(--noon-teal)] underline">{selectedApp.instagramUrl}</a>
                    </p>
                  )}
                </div>

                {/* Qualifications */}
                {(selectedApp.certifications || selectedApp.employmentStatus) && (
                  <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{t.qualifications}</h3>
                    {selectedApp.certifications && <p><span className="font-medium">{t.certifications}:</span> {selectedApp.certifications}</p>}
                    {selectedApp.employmentStatus && <p><span className="font-medium">{t.employment}:</span> {selectedApp.employmentStatus}</p>}
                    {selectedApp.employerDetails && <p><span className="font-medium">{t.employer}:</span> {selectedApp.employerDetails}</p>}
                  </div>
                )}

                {/* Training */}
                <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{t.training}</h3>
                  <p><span className="font-medium">{t.priorTraining}:</span> {selectedApp.hasPriorTraining ? t.yes : t.no}</p>
                  {selectedApp.priorTrainingDetails && <p className="whitespace-pre-line">{selectedApp.priorTrainingDetails}</p>}
                  {selectedApp.motivation && <p><span className="font-medium">{t.motivation}:</span> {selectedApp.motivation}</p>}
                  {selectedApp.personalityDescription && <p><span className="font-medium">{t.personality}:</span> {selectedApp.personalityDescription}</p>}
                </div>

                {/* Workshop details */}
                <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{t.workshopDetails}</h3>
                  <p><span className="font-medium">{t.category}:</span> {categoryLabel(selectedApp.workshopCategory)}</p>
                  {selectedApp.otherSkillsDetail && <p><span className="font-medium">{t.otherSkills}:</span> {selectedApp.otherSkillsDetail}</p>}

                  {selectedApp.workshopCategory === "culinary" && (
                    <>
                      <p><span className="font-medium">{t.restaurant}:</span> {selectedApp.hasRestaurantExperience ? t.yes : t.no}</p>
                      {selectedApp.restaurantDetails && <p className="whitespace-pre-line">{selectedApp.restaurantDetails}</p>}
                      {selectedApp.kitchenInterests && <p><span className="font-medium">{t.kitchenInterests}:</span> {selectedApp.kitchenInterests}</p>}
                      {selectedApp.culinaryDishes.length > 0 && (
                        <div>
                          <span className="font-medium">{t.dishes}:</span>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {selectedApp.culinaryDishes.map((d, i) => (
                              <span key={i} className="rounded-lg bg-amber-50 px-2 py-0.5 text-xs text-amber-800">{d}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {selectedApp.workshopCategory === "arts" && (
                    <>
                      {selectedApp.artsSpecialization && <p><span className="font-medium">{t.artsSpec}:</span> {selectedApp.artsSpecialization}</p>}
                      {selectedApp.artsWorkshopIdeas.length > 0 && (
                        <div>
                          <span className="font-medium">{t.workshopIdeas}:</span>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {selectedApp.artsWorkshopIdeas.map((idea, i) => (
                              <span key={i} className="rounded-lg bg-violet-50 px-2 py-0.5 text-xs text-violet-800">{idea}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
