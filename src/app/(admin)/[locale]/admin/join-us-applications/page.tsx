import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findJoinUsApplications } from "@/lib/db/joinUs";
import { getUserById } from "@/lib/db/users";
import { isLocale, type Locale } from "@/lib/locale";
import AdminJoinUsPageClient from "@/components/admin/AdminJoinUsPageClient";

export default async function AdminJoinUsApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  const cookieStore = await cookies();
  const sessionId = cookieStore.get("noon_session")?.value;

  if (!sessionId) {
    redirect(`/${locale}/login`);
  }

  const currentUser = await getUserById(sessionId);
  if (!currentUser || currentUser.role !== "ADMIN") {
    redirect(`/${locale}/account`);
  }

  const sp = await searchParams;
  const formType = typeof sp.type === "string" ? sp.type : undefined;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const search = typeof sp.search === "string" ? sp.search : undefined;

  const { applications, total } = await findJoinUsApplications({
    formType: formType as "trainer" | "social_media" | undefined,
    status: status as "NEW" | "REVIEWED" | "ACCEPTED" | "REJECTED" | undefined,
    search,
    limit: 100,
  });

  return (
    <AdminJoinUsPageClient
      locale={locale}
      applications={applications.map((app) => ({
        id: app.id,
        formType: app.formType,
        status: app.status,
        fullName: app.fullName,
        email: app.email,
        phone: app.phone,
        nationality: app.nationality,
        workshopCategory: app.workshopCategory,
        createdAt: app.createdAt,
        // Detail fields
        dateOfBirth: app.dateOfBirth,
        address: app.address,
        instagramUrl: app.instagramUrl,
        certifications: app.certifications,
        employmentStatus: app.employmentStatus,
        employerDetails: app.employerDetails,
        hasPriorTraining: app.hasPriorTraining,
        priorTrainingDetails: app.priorTrainingDetails,
        motivation: app.motivation,
        personalityDescription: app.personalityDescription,
        otherSkillsDetail: app.otherSkillsDetail,
        hasRestaurantExperience: app.hasRestaurantExperience,
        restaurantDetails: app.restaurantDetails,
        kitchenInterests: app.kitchenInterests,
        culinaryDishes: app.culinaryDishes,
        artsSpecialization: app.artsSpecialization,
        artsWorkshopIdeas: app.artsWorkshopIdeas,
      }))}
      total={total}
      initialFilters={{ formType, status, search }}
    />
  );
}
