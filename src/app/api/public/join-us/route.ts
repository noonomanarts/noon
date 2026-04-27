import { NextRequest, NextResponse } from "next/server";
import { createJoinUsApplication, getJoinUsFormsConfig } from "@/lib/db/joinUs";
import { notifyRole } from "@/lib/notificationService";
import { isValidEmail, isValidPhone } from "@/lib/forms/eventBooking";

function parseSafeString(value: unknown, maxLength = 3000): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function parseSafeArray(value: unknown, maxItems = 20): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((s) => s.trim().slice(0, 500))
    .filter(Boolean)
    .slice(0, maxItems);
}

function parseOptionalBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const formType = parseSafeString(body.formType, 50) || "trainer";

    // Check if form type is enabled
    const config = await getJoinUsFormsConfig();
    const formConfig = config[formType];
    if (!formConfig || !formConfig.enabled) {
      return NextResponse.json(
        { error: "This form is not currently accepting applications" },
        { status: 400 },
      );
    }

    // Parse fields
    const fullName = parseSafeString(body.fullName, 255);
    const email = parseSafeString(body.email, 255).toLowerCase();
    const phone = parseSafeString(body.phone, 50);
    const dateOfBirth = parseSafeString(body.dateOfBirth, 10);
    const nationality = parseSafeString(body.nationality, 100);
    const address = parseSafeString(body.address, 500);
    const instagramUrl = parseSafeString(body.instagramUrl, 500);
    const certifications = parseSafeString(body.certifications, 2000);
    const employmentStatus = parseSafeString(body.employmentStatus, 100);
    const employerDetails = parseSafeString(body.employerDetails, 500);
    const hasPriorTraining = parseOptionalBoolean(body.hasPriorTraining);
    const priorTrainingDetails = parseSafeString(body.priorTrainingDetails, 2000);
    const motivation = parseSafeString(body.motivation, 3000);
    const personalityDescription = parseSafeString(body.personalityDescription, 3000);
    const workshopCategory = parseSafeString(body.workshopCategory, 100);
    const otherSkillsDetail = parseSafeString(body.otherSkillsDetail, 1000);
    const hasRestaurantExperience = parseOptionalBoolean(body.hasRestaurantExperience);
    const restaurantDetails = parseSafeString(body.restaurantDetails, 2000);
    const kitchenInterests = parseSafeString(body.kitchenInterests, 2000);
    const culinaryDishes = parseSafeArray(body.culinaryDishes);
    const artsSpecialization = parseSafeString(body.artsSpecialization, 500);
    const artsWorkshopIdeas = parseSafeArray(body.artsWorkshopIdeas);

    // Validation
    if (!fullName || !email || !phone) {
      return NextResponse.json(
        { error: "Full name, email, and phone are required" },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { error: "Invalid phone format" },
        { status: 400 },
      );
    }

    if (!workshopCategory) {
      return NextResponse.json(
        { error: "Workshop category is required" },
        { status: 400 },
      );
    }

    if (formType === "trainer") {
      const missingBaseFields =
        !dateOfBirth ||
        !nationality ||
        !address ||
        !instagramUrl ||
        !certifications ||
        !employmentStatus ||
        hasPriorTraining === null ||
        !motivation ||
        !personalityDescription ||
        !otherSkillsDetail;

      if (missingBaseFields) {
        return NextResponse.json(
          { error: "Please fill in all required fields" },
          { status: 400 },
        );
      }

      if ((employmentStatus === "employed" || employmentStatus === "self-employed") && !employerDetails) {
        return NextResponse.json(
          { error: "Employer details are required" },
          { status: 400 },
        );
      }

      if (hasPriorTraining && !priorTrainingDetails) {
        return NextResponse.json(
          { error: "Training experience details are required" },
          { status: 400 },
        );
      }

      if (workshopCategory === "culinary") {
        if (hasRestaurantExperience === null || !kitchenInterests || culinaryDishes.length === 0) {
          return NextResponse.json(
            { error: "Please fill in all culinary details" },
            { status: 400 },
          );
        }

        if (hasRestaurantExperience && !restaurantDetails) {
          return NextResponse.json(
            { error: "Restaurant experience details are required" },
            { status: 400 },
          );
        }
      }

      if (workshopCategory === "arts" && (!artsSpecialization || artsWorkshopIdeas.length === 0)) {
        return NextResponse.json(
          { error: "Please fill in all arts and crafts details" },
          { status: 400 },
        );
      }
    }

    const application = await createJoinUsApplication({
      formType: formType as "trainer" | "social_media",
      fullName,
      phone,
      email,
      dateOfBirth: dateOfBirth || null,
      nationality: nationality || null,
      address: address || null,
      instagramUrl: instagramUrl || null,
      photoUrl: null,
      certifications: certifications || null,
      employmentStatus: employmentStatus || null,
      employerDetails: employerDetails || null,
      hasPriorTraining: hasPriorTraining ?? false,
      priorTrainingDetails: priorTrainingDetails || null,
      motivation: motivation || null,
      personalityDescription: personalityDescription || null,
      workshopCategory: workshopCategory || null,
      otherSkillsDetail: otherSkillsDetail || null,
      hasRestaurantExperience: hasRestaurantExperience ?? false,
      restaurantDetails: restaurantDetails || null,
      recipeFileUrl: null,
      kitchenInterests: kitchenInterests || null,
      culinaryDishes,
      artsSpecialization: artsSpecialization || null,
      artsWorkshopIdeas,
      extraData: {},
    });

    await notifyRole("ADMIN", {
      type: "join_us_application_new",
      title: "New Join Us Application",
      message: `${fullName} submitted a ${formType} application`,
      data: {
        applicationId: application.id,
        fullName,
        email,
        formType,
        workshopCategory,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully",
      id: application.id,
    });
  } catch (error) {
    console.error("Error creating join-us application:", error);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 },
    );
  }
}
