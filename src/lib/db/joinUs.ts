import { query } from "./pool";
import { generateUUID } from "./uuid";

export type JoinUsFormType = "trainer" | "social_media";
export type JoinUsStatus = "NEW" | "REVIEWED" | "ACCEPTED" | "REJECTED";

export interface JoinUsApplication {
  id: string;
  formType: JoinUsFormType;
  status: JoinUsStatus;
  fullName: string;
  phone: string | null;
  email: string;
  dateOfBirth: string | null;
  nationality: string | null;
  address: string | null;
  instagramUrl: string | null;
  photoUrl: string | null;
  certifications: string | null;
  employmentStatus: string | null;
  employerDetails: string | null;
  hasPriorTraining: boolean;
  priorTrainingDetails: string | null;
  motivation: string | null;
  personalityDescription: string | null;
  workshopCategory: string | null;
  otherSkillsDetail: string | null;
  hasRestaurantExperience: boolean;
  restaurantDetails: string | null;
  recipeFileUrl: string | null;
  kitchenInterests: string | null;
  culinaryDishes: string[];
  artsSpecialization: string | null;
  artsWorkshopIdeas: string[];
  extraData: Record<string, unknown>;
  confirmationEmailSent: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapRow(row: Record<string, unknown>): JoinUsApplication {
  return {
    id: row.id as string,
    formType: row.form_type as JoinUsFormType,
    status: row.status as JoinUsStatus,
    fullName: row.full_name as string,
    phone: (row.phone as string) || null,
    email: row.email as string,
    dateOfBirth: row.date_of_birth ? String(row.date_of_birth).slice(0, 10) : null,
    nationality: (row.nationality as string) || null,
    address: (row.address as string) || null,
    instagramUrl: (row.instagram_url as string) || null,
    photoUrl: (row.photo_url as string) || null,
    certifications: (row.certifications as string) || null,
    employmentStatus: (row.employment_status as string) || null,
    employerDetails: (row.employer_details as string) || null,
    hasPriorTraining: Boolean(row.has_prior_training),
    priorTrainingDetails: (row.prior_training_details as string) || null,
    motivation: (row.motivation as string) || null,
    personalityDescription: (row.personality_description as string) || null,
    workshopCategory: (row.workshop_category as string) || null,
    otherSkillsDetail: (row.other_skills_detail as string) || null,
    hasRestaurantExperience: Boolean(row.has_restaurant_experience),
    restaurantDetails: (row.restaurant_details as string) || null,
    recipeFileUrl: (row.recipe_file_url as string) || null,
    kitchenInterests: (row.kitchen_interests as string) || null,
    culinaryDishes: (row.culinary_dishes as string[]) || [],
    artsSpecialization: (row.arts_specialization as string) || null,
    artsWorkshopIdeas: (row.arts_workshop_ideas as string[]) || [],
    extraData: (row.extra_data as Record<string, unknown>) || {},
    confirmationEmailSent: Boolean(row.confirmation_email_sent),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

export async function createJoinUsApplication(
  data: Omit<JoinUsApplication, "id" | "status" | "confirmationEmailSent" | "createdAt" | "updatedAt">,
): Promise<JoinUsApplication> {
  const id = generateUUID();
  const now = new Date();

  const result = await query(
    `INSERT INTO join_us_applications (
      id, form_type, status, full_name, phone, email, date_of_birth,
      nationality, address, instagram_url, photo_url,
      certifications, employment_status, employer_details,
      has_prior_training, prior_training_details, motivation, personality_description,
      workshop_category, other_skills_detail,
      has_restaurant_experience, restaurant_details, recipe_file_url, kitchen_interests, culinary_dishes,
      arts_specialization, arts_workshop_ideas,
      extra_data, created_at, updated_at
    ) VALUES (
      $1, $2, 'NEW', $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12, $13,
      $14, $15, $16, $17,
      $18, $19,
      $20, $21, $22, $23, $24,
      $25, $26,
      $27, $28, $28
    ) RETURNING *`,
    [
      id,
      data.formType,
      data.fullName,
      data.phone,
      data.email,
      data.dateOfBirth,
      data.nationality,
      data.address,
      data.instagramUrl,
      data.photoUrl,
      data.certifications,
      data.employmentStatus,
      data.employerDetails,
      data.hasPriorTraining,
      data.priorTrainingDetails,
      data.motivation,
      data.personalityDescription,
      data.workshopCategory,
      data.otherSkillsDetail,
      data.hasRestaurantExperience,
      data.restaurantDetails,
      data.recipeFileUrl,
      data.kitchenInterests,
      data.culinaryDishes,
      data.artsSpecialization,
      data.artsWorkshopIdeas,
      data.extraData ? JSON.stringify(data.extraData) : "{}",
      now,
    ],
  );

  return mapRow(result.rows[0]);
}

export async function findJoinUsApplications(options: {
  formType?: JoinUsFormType;
  status?: JoinUsStatus;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ applications: JoinUsApplication[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (options.formType) {
    conditions.push(`form_type = $${paramIndex++}`);
    params.push(options.formType);
  }

  if (options.status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(options.status);
  }

  if (options.search?.trim()) {
    conditions.push(`(
      full_name ILIKE $${paramIndex} OR
      email ILIKE $${paramIndex} OR
      phone ILIKE $${paramIndex} OR
      nationality ILIKE $${paramIndex} OR
      motivation ILIKE $${paramIndex} OR
      personality_description ILIKE $${paramIndex} OR
      workshop_category ILIKE $${paramIndex} OR
      arts_specialization ILIKE $${paramIndex} OR
      kitchen_interests ILIKE $${paramIndex}
    )`);
    params.push(`%${options.search.trim()}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  const countResult = await query(
    `SELECT COUNT(*) as total FROM join_us_applications ${whereClause}`,
    params,
  );
  const total = Number(countResult.rows[0].total);

  const dataResult = await query(
    `SELECT * FROM join_us_applications ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset],
  );

  return {
    applications: dataResult.rows.map(mapRow),
    total,
  };
}

export async function findJoinUsApplicationById(id: string): Promise<JoinUsApplication | null> {
  const result = await query("SELECT * FROM join_us_applications WHERE id = $1", [id]);
  return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
}

export async function updateJoinUsApplicationStatus(
  id: string,
  status: JoinUsStatus,
): Promise<JoinUsApplication | null> {
  const result = await query(
    "UPDATE join_us_applications SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [status, id],
  );
  return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
}

export async function getJoinUsFormsConfig(): Promise<Record<string, { enabled: boolean }>> {
  try {
    const result = await query("SELECT value FROM admin_settings WHERE key = 'join_us_forms'");
    if (result.rows.length === 0) {
      return { trainer: { enabled: true }, social_media: { enabled: false } };
    }
    return result.rows[0].value as Record<string, { enabled: boolean }>;
  } catch (error) {
    console.error("Error fetching join_us_forms config:", error);
    return { trainer: { enabled: true }, social_media: { enabled: false } };
  }
}

export async function updateJoinUsFormsConfig(
  config: Record<string, { enabled: boolean }>,
): Promise<void> {
  await query(
    "INSERT INTO admin_settings (key, value) VALUES ('join_us_forms', $1::jsonb) ON CONFLICT (key) DO UPDATE SET value = $1::jsonb, updated_at = NOW()",
    [JSON.stringify(config)],
  );
}
