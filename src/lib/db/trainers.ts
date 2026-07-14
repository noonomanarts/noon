/**
 * Database queries for trainers
 */
import { ensureClassFinanceSchema } from "./classFinance";
import { query } from "./pool";
import { ensureRecipeManagementSchema } from "./recipeManagement";
import type { TrainerPublic } from "./types";

export type TrainerShareTierPublic = {
  minParticipants: number;
  maxParticipants: number | null;
  percent: number;
};

export type TrainerFeaturedMediaType = "IMAGE" | "VIDEO" | "YOUTUBE";

export type TrainerManualUpcomingCoursePublic = {
  id: string;
  title: string;
  titleAr: string | null;
  dateTime: string | null;
  price: number | null;
  currency: string;
  mediaType: TrainerFeaturedMediaType;
  mediaUrl: string | null;
  imageUrl: string | null;
  bookingUrl: string | null;
  description: string | null;
};

export type TrainerHighlightedIngredient = {
  name: string;
  source: string;
  photo: string;
};

export type TrainerSessionSubmissionInput = {
  recipeSubmitted?: boolean;
  recipePdf?: string | null;
  groceryList?: string | null;
  workshopBrief?: string | null;
  trainerPhotos?: string[];
  highlightedIngredients?: TrainerHighlightedIngredient[];
};

export type TrainerWorkshopSuggestionStatus =
  | "PENDING_REVIEW"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "PUBLISHED";

export type TrainerWorkshopSuggestionPublic = {
  id: string;
  trainerId: string;
  title: string;
  titleAr: string | null;
  brief: string | null;
  recipe: string | null;
  recipePdf: string | null;
  notes: string | null;
  photos: string[];
  adminNotes: string | null;
  status: TrainerWorkshopSuggestionStatus;
  liveClassId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TrainerWorkshopSuggestionAdminPublic = TrainerWorkshopSuggestionPublic & {
  trainerName: string;
  trainerEmail: string | null;
  trainerPhoneNumber: string | null;
};

export type TrainerWorkshopFeedbackPublic = {
  id: string;
  classId: string;
  customerName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

export type TrainerDashboardWorkshopPublic = {
  classId: string;
  classSlug: string;
  classTitle: string;
  classTitleAr: string | null;
  classImage: string | null;
  classCategory: string;
  classPrice: number;
  currency: string;
  startDateTime: string;
  endDateTime: string | null;
  seatsTotal: number;
  seatsBooked: number;
  seatsAvailable: number;
  bookingsCount?: number;
  participantsCount?: number;
  feedbackCount?: number;
  averageRating?: number | null;
  submission: {
    recipeSubmitted: boolean;
    recipePdf: string | null;
    groceryList: string | null;
    workshopBrief: string | null;
    trainerPhotos: string[];
    highlightedIngredients: TrainerHighlightedIngredient[];
  };
  finalRecipe: {
    title: string | null;
    pdf: string | null;
    brief: string | null;
    visibleToCustomers: boolean;
    publishedAt: string | null;
  };
  adminNotes: {
    text: string | null;
    photo: string | null;
  };
  feedback: TrainerWorkshopFeedbackPublic[];
};

export type TrainerWorkshopEarningPublic = {
  classId: string;
  classSlug: string;
  classTitle: string;
  classTitleAr: string | null;
  classImage: string | null;
  settledAt: string | null;
  currency: string;
  participantsCount: number;
  grossRevenue: number;
  trainerPayoutAmount: number;
};

export type TrainerMonthlyEarningPublic = {
  monthStart: string;
  monthLabel: string;
  currency: string;
  workshopsCount: number;
  participantsCount: number;
  totalPayout: number;
  totalRevenue: number;
};

export type TrainerDashboardSummaryPublic = {
  totalUpcomingWorkshops: number;
  totalPreviousWorkshops: number;
  totalSuggestedWorkshops: number;
  totalClosedWorkshops: number;
  totalParticipants: number;
  totalRevenue: number;
  totalTrainerEarnings: number;
  averageEarningPerWorkshop: number;
  currency: string;
};

export type TrainerDashboardData = {
  ongoingWorkshops: TrainerDashboardWorkshopPublic[];
  previousWorkshops: TrainerDashboardWorkshopPublic[];
  suggestedWorkshops: TrainerWorkshopSuggestionPublic[];
  earningsByWorkshop: TrainerWorkshopEarningPublic[];
  monthlyEarnings: TrainerMonthlyEarningPublic[];
  summary: TrainerDashboardSummaryPublic;
};

let trainerProfilesFinanceSchemaReady: Promise<void> | null = null;

function toMoney(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Number(parsed.toFixed(3));
}

function toPercent(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Number(parsed.toFixed(2));
}

function sanitizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function sanitizeStringArray(value: unknown, maxLength: number, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => (typeof item === "string" ? item.trim().slice(0, maxLength) : ""))
    .filter((item) => item.length > 0)
    .slice(0, maxItems);
}

function sanitizeHighlightedIngredients(value: unknown): TrainerHighlightedIngredient[] {
  if (!Array.isArray(value)) return [];

  const ingredients: TrainerHighlightedIngredient[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const row = item as Record<string, unknown>;
    const name = sanitizeText(row.name, 120) ?? "";
    const source = sanitizeText(row.source, 240) ?? "";
    const photo = sanitizeText(row.photo, 500) ?? "";

    if (!name && !source && !photo) continue;

    ingredients.push({ name, source, photo });
    if (ingredients.length >= 100) break;
  }

  return ingredients;
}

function sanitizeFeaturedMediaType(value: unknown): TrainerFeaturedMediaType {
  if (value === "YOUTUBE") return "YOUTUBE";
  if (value === "VIDEO") return "VIDEO";
  return "IMAGE";
}

function sanitizeTrainerWorkshopSuggestionStatus(value: unknown): TrainerWorkshopSuggestionStatus {
  if (value === "IN_REVIEW") return "IN_REVIEW";
  if (value === "APPROVED") return "APPROVED";
  if (value === "REJECTED") return "REJECTED";
  if (value === "PUBLISHED") return "PUBLISHED";
  return "PENDING_REVIEW";
}

function mapTrainerWorkshopSuggestionRow(row: Record<string, unknown>): TrainerWorkshopSuggestionPublic {
  return {
    id: String(row.id),
    trainerId: String(row.trainer_id),
    title: String(row.title),
    titleAr: sanitizeText(row.title_ar, 255),
    brief: sanitizeText(row.brief, 4000),
    recipe: sanitizeText(row.recipe, 12000),
    recipePdf: sanitizeText(row.recipe_pdf, 500),
    notes: sanitizeText(row.notes, 4000),
    photos: sanitizeStringArray(row.photos, 500, 40),
    adminNotes: sanitizeText(row.admin_notes, 4000),
    status: sanitizeTrainerWorkshopSuggestionStatus(row.status),
    liveClassId: row.live_class_id ? String(row.live_class_id) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapTrainerWorkshopSuggestionAdminRow(row: Record<string, unknown>): TrainerWorkshopSuggestionAdminPublic {
  const base = mapTrainerWorkshopSuggestionRow(row);

  return {
    ...base,
    trainerName: String(row.trainer_name || ""),
    trainerEmail: sanitizeText(row.trainer_email, 255),
    trainerPhoneNumber: sanitizeText(row.trainer_phone_number, 50),
  };
}

function createStableItemId(input: string, index: number): string {
  const sanitized = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return sanitized ? `${sanitized}-${index + 1}` : `item-${index + 1}`;
}

function sanitizeManualUpcomingCourses(value: unknown): TrainerManualUpcomingCoursePublic[] {
  if (!Array.isArray(value)) return [];

  const normalized = value
    .map((item, index): TrainerManualUpcomingCoursePublic | null => {
      if (!item || typeof item !== "object") return null;

      const row = item as Record<string, unknown>;
      const title = sanitizeText(row.title, 160);
      if (!title) return null;

      const dateTimeValue = sanitizeText(row.dateTime, 40);
      const dateTime = dateTimeValue && !Number.isNaN(Date.parse(dateTimeValue)) ? new Date(dateTimeValue).toISOString() : null;
      const priceNumber = Number(row.price);
      const price = Number.isFinite(priceNumber) ? Math.max(0, Number(priceNumber.toFixed(3))) : null;

      const idCandidate = sanitizeText(row.id, 120);

      return {
        id: idCandidate || createStableItemId(title, index),
        title,
        titleAr: sanitizeText(row.titleAr, 160),
        dateTime,
        price,
        currency: sanitizeText(row.currency, 10) || "OMR",
        mediaType: sanitizeFeaturedMediaType(row.mediaType),
        mediaUrl: sanitizeText(row.mediaUrl, 500) ?? sanitizeText(row.imageUrl, 500),
        imageUrl: sanitizeText(row.imageUrl, 500) ?? sanitizeText(row.mediaUrl, 500),
        bookingUrl: sanitizeText(row.bookingUrl, 500),
        description: sanitizeText(row.description, 600),
      };
    })
    .filter((item): item is TrainerManualUpcomingCoursePublic => Boolean(item));

  return normalized.sort((left, right) => {
    if (left.dateTime && right.dateTime) {
      return new Date(left.dateTime).getTime() - new Date(right.dateTime).getTime();
    }
    if (left.dateTime) return -1;
    if (right.dateTime) return 1;
    return left.title.localeCompare(right.title);
  });
}

async function ensureTrainerProfilesFinanceSchema(): Promise<void> {
  if (trainerProfilesFinanceSchemaReady) return trainerProfilesFinanceSchemaReady;

  trainerProfilesFinanceSchemaReady = (async () => {
    await query(`ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS display_name_en VARCHAR(255)`);
    await query(`ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS display_name_ar VARCHAR(255)`);
    await query(`ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS display_order INTEGER`);
    await query(`ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS bio_en TEXT`);
    await query(`ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS bio_ar TEXT`);
    await query(`ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS share_tiers JSONB NOT NULL DEFAULT '[]'::jsonb`);
    await query(`ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS featured_media_type VARCHAR(20) NOT NULL DEFAULT 'IMAGE'`);
    await query(`ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS featured_media_url VARCHAR(500)`);
    await query(`ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS manual_upcoming_courses JSONB NOT NULL DEFAULT '[]'::jsonb`);
    await query(`ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS featured_previous_class_ids UUID[] NOT NULL DEFAULT '{}'::uuid[]`);

    await query(`
      CREATE TABLE IF NOT EXISTS trainer_workshop_suggestions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        title_ar VARCHAR(255),
        brief TEXT,
        recipe TEXT,
        recipe_pdf VARCHAR(500),
        notes TEXT,
        photos TEXT[] NOT NULL DEFAULT '{}',
        admin_notes TEXT,
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW',
        live_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    await query(`
      ALTER TABLE trainer_workshop_suggestions
      ADD CONSTRAINT trainer_workshop_suggestions_status_check
      CHECK (status IN ('PENDING_REVIEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED'))
    `).catch(() => undefined);
    await query(`ALTER TABLE trainer_workshop_suggestions ADD COLUMN IF NOT EXISTS recipe_pdf VARCHAR(500)`);

    await query(`CREATE INDEX IF NOT EXISTS idx_trainer_workshop_suggestions_trainer_id ON trainer_workshop_suggestions(trainer_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_trainer_workshop_suggestions_status ON trainer_workshop_suggestions(status)`);
  })().catch((error) => {
    trainerProfilesFinanceSchemaReady = null;
    throw error;
  });

  return trainerProfilesFinanceSchemaReady;
}

function sanitizeShareTiers(value: unknown): TrainerShareTierPublic[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const tier = item as Record<string, unknown>;
      const minParticipants = Math.max(0, Math.trunc(Number(tier.minParticipants ?? 0) || 0));
      const rawMax = tier.maxParticipants;
      const maxParticipants =
        rawMax === null || rawMax === undefined || rawMax === ""
          ? null
          : Math.max(minParticipants, Math.trunc(Number(rawMax) || 0));
      const percent = Math.min(100, Math.max(0, Number(tier.percent ?? 0) || 0));

      return {
        minParticipants,
        maxParticipants,
        percent: Number(percent.toFixed(2)),
      };
    })
    .filter((item): item is TrainerShareTierPublic => Boolean(item))
    .sort((left, right) => left.minParticipants - right.minParticipants);
}

function hasOwnField<T extends object>(target: T, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(target, key);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeFeaturedPreviousClassIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!UUID_PATTERN.test(trimmed)) continue;
    const lower = trimmed.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    result.push(lower);
    if (result.length >= 50) break;
  }
  return result;
}

/**
 * Find trainers (users with TRAINER role)
 */
export async function findTrainers(options?: {
  activeOnly?: boolean;
}): Promise<TrainerPublic[]> {
  await ensureTrainerProfilesFinanceSchema();
  const conditions = [`u.role = 'TRAINER'`];

  if (options?.activeOnly !== false) {
    conditions.push(`u.status = 'ACTIVE'`);
  }

  const result = await query(
    `SELECT u.id, u.full_name, u.email, u.phone_number, u.profile_image,
            u.date_of_birth, u.gender, u.status, u.created_at,
            tp.display_name_en, tp.display_name_ar, tp.display_order
     FROM users u
     LEFT JOIN trainer_profiles tp ON tp.user_id = u.id
     WHERE ${conditions.join(" AND ")}
     ORDER BY COALESCE(tp.display_order, 2147483647) ASC,
              COALESCE(NULLIF(tp.display_name_en, ''), NULLIF(tp.display_name_ar, ''), u.full_name) ASC`
  );

  return result.rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    displayNameEn: sanitizeText(row.display_name_en, 255),
    displayNameAr: sanitizeText(row.display_name_ar, 255),
    displayOrder: row.display_order == null ? null : Number(row.display_order),
    email: row.email,
    phoneNumber: row.phone_number,
    profileImage: row.profile_image,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    status: row.status,
    createdAt: row.created_at,
  }));
}

/**
 * Find trainer by ID
 */
export async function findTrainerById(id: string): Promise<TrainerPublic | null> {
  const result = await query(
    `SELECT u.id, u.full_name, u.email, u.phone_number, u.profile_image,
            u.date_of_birth, u.gender, u.status, u.created_at
     FROM users u
     WHERE u.id = $1 AND u.role = 'TRAINER'`,
    [id]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phoneNumber: row.phone_number,
    profileImage: row.profile_image,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    status: row.status,
    createdAt: row.created_at,
  };
}

// Return type for trainer profiles
export interface TrainerProfilePublic {
  id: string;
  userId: string;
  displayNameEn: string | null;
  displayNameAr: string | null;
  displayOrder: number | null;
  bio: string | null;
  bioEn: string | null;
  bioAr: string | null;
  expertise: string[];
  experience: number | null;
  socialLinks: Record<string, string> | null;
  shareTiers: TrainerShareTierPublic[];
  featuredMediaType: TrainerFeaturedMediaType;
  featuredMediaUrl: string | null;
  manualUpcomingCourses: TrainerManualUpcomingCoursePublic[];
  featuredPreviousClassIds: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Find trainer profiles
 */
export async function findTrainerProfiles(userIds: string[]): Promise<TrainerProfilePublic[]> {
  await ensureTrainerProfilesFinanceSchema();
  if (userIds.length === 0) return [];

  const result = await query(`SELECT * FROM trainer_profiles WHERE user_id = ANY($1) AND is_active = true`, [userIds]);

  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    displayNameEn: sanitizeText(row.display_name_en, 255),
    displayNameAr: sanitizeText(row.display_name_ar, 255),
    displayOrder: row.display_order == null ? null : Number(row.display_order),
    bio: row.bio,
    bioEn: sanitizeText(row.bio_en, 5000),
    bioAr: sanitizeText(row.bio_ar, 5000),
    expertise: row.expertise || [],
    experience: row.experience,
    socialLinks: row.social_links,
    shareTiers: sanitizeShareTiers(row.share_tiers),
    featuredMediaType: sanitizeFeaturedMediaType(row.featured_media_type),
    featuredMediaUrl: sanitizeText(row.featured_media_url, 500),
    manualUpcomingCourses: sanitizeManualUpcomingCourses(row.manual_upcoming_courses),
    featuredPreviousClassIds: sanitizeFeaturedPreviousClassIds(row.featured_previous_class_ids),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

// Return type for trainer classes
export interface TrainerClassPublic {
  id: string;
  slug: string;
  title: string;
  titleAr: string | null;
  description: string;
  descriptionAr: string | null;
  category: string;
  subCategory: string | null;
  image: string | null;
  price: number;
  currency: string;
  durationMinutes: number;
  seatsTotal: number;
  seatsBooked: number;
  startDateTime: Date | null;
  status: string;
  createdAt: Date;
  publishedAt: Date | null;
}

/**
 * Get trainer classes
 */
export async function findTrainerClasses(
  trainerId: string,
  options?: { publishedOnly?: boolean; limit?: number }
): Promise<TrainerClassPublic[]> {
  const conditions = [`(c.trainer_id = $1 OR c.co_trainer_id = $1)`];
  const values: unknown[] = [trainerId];
  let paramIndex = 2;

  if (options?.publishedOnly !== false) {
    conditions.push(`c.status = 'PUBLISHED'`);
  }

  let sql = `
    SELECT c.*
    FROM classes c
    WHERE ${conditions.join(" AND ")}
    ORDER BY c.published_at DESC NULLS LAST
  `;

  if (options?.limit) {
    sql += ` LIMIT $${paramIndex++}`;
    values.push(options.limit);
  }

  const result = await query(sql, values);

  return result.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    titleAr: row.title_ar,
    description: row.description,
    descriptionAr: row.description_ar,
    category: row.category,
    subCategory: row.sub_category,
    image: row.image,
    price: parseFloat(row.price),
    currency: row.currency,
    durationMinutes: row.duration_minutes,
    seatsTotal: Number(row.seats_total || 0),
    seatsBooked: Number(row.seats_booked || 0),
    startDateTime: row.start_date_time ? new Date(row.start_date_time) : null,
    status: row.status,
    createdAt: row.created_at,
    publishedAt: row.published_at,
  }));
}

/**
 * Verify user is a trainer
 */
export async function verifyTrainer(id: string): Promise<boolean> {
  const result = await query(`SELECT id FROM users WHERE id = $1 AND role = 'TRAINER'`, [id]);
  return result.rows.length > 0;
}

/**
 * Create or update trainer profile
 */
export async function upsertTrainerProfile(data: {
  userId: string;
  displayNameEn?: string | null;
  displayNameAr?: string | null;
  displayOrder?: number | null;
  bio?: string | null;
  bioEn?: string | null;
  bioAr?: string | null;
  expertise?: string[];
  experience?: number | null;
  socialLinks?: Record<string, string> | null;
  shareTiers?: TrainerShareTierPublic[];
  featuredMediaType?: TrainerFeaturedMediaType;
  featuredMediaUrl?: string | null;
  manualUpcomingCourses?: TrainerManualUpcomingCoursePublic[];
  featuredPreviousClassIds?: string[];
  isActive?: boolean;
}): Promise<TrainerProfilePublic> {
  await ensureTrainerProfilesFinanceSchema();

  await query(
    `INSERT INTO trainer_profiles (user_id, share_tiers, featured_media_type, manual_upcoming_courses)
     VALUES ($1, '[]'::jsonb, 'IMAGE', '[]'::jsonb)
     ON CONFLICT (user_id) DO NOTHING`,
    [data.userId]
  );

  const updates: string[] = [];
  const values: unknown[] = [data.userId];
  let paramIndex = 2;

  if (hasOwnField(data, "displayNameEn")) {
    updates.push(`display_name_en = $${paramIndex++}`);
    values.push(sanitizeText(data.displayNameEn, 255));
  }

  if (hasOwnField(data, "displayNameAr")) {
    updates.push(`display_name_ar = $${paramIndex++}`);
    values.push(sanitizeText(data.displayNameAr, 255));
  }

  if (hasOwnField(data, "displayOrder")) {
    const parsedDisplayOrder =
      typeof data.displayOrder === "number" && Number.isFinite(data.displayOrder)
        ? Math.max(0, Math.min(9999, Math.trunc(data.displayOrder)))
        : null;
    updates.push(`display_order = $${paramIndex++}`);
    values.push(parsedDisplayOrder);
  }

  if (hasOwnField(data, "bio")) {
    updates.push(`bio = $${paramIndex++}`);
    values.push(sanitizeText(data.bio, 5000));
  }

  if (hasOwnField(data, "bioEn")) {
    updates.push(`bio_en = $${paramIndex++}`);
    values.push(sanitizeText(data.bioEn, 5000));
  }

  if (hasOwnField(data, "bioAr")) {
    updates.push(`bio_ar = $${paramIndex++}`);
    values.push(sanitizeText(data.bioAr, 5000));
  }

  if (hasOwnField(data, "expertise")) {
    const expertise = Array.isArray(data.expertise)
      ? data.expertise
          .map((item) => (typeof item === "string" ? item.trim().slice(0, 120) : ""))
          .filter((item) => item.length > 0)
      : [];
    updates.push(`expertise = $${paramIndex++}`);
    values.push(expertise);
  }

  if (hasOwnField(data, "experience")) {
    const parsedExperience =
      typeof data.experience === "number" && Number.isFinite(data.experience)
        ? Math.max(0, Math.min(60, Math.floor(data.experience)))
        : null;
    updates.push(`experience = $${paramIndex++}`);
    values.push(parsedExperience);
  }

  if (hasOwnField(data, "socialLinks")) {
    updates.push(`social_links = $${paramIndex++}`);
    values.push(data.socialLinks ? JSON.stringify(data.socialLinks) : null);
  }

  if (hasOwnField(data, "shareTiers")) {
    updates.push(`share_tiers = $${paramIndex++}::jsonb`);
    values.push(JSON.stringify(sanitizeShareTiers(data.shareTiers ?? [])));
  }

  if (hasOwnField(data, "featuredMediaType")) {
    updates.push(`featured_media_type = $${paramIndex++}`);
    values.push(sanitizeFeaturedMediaType(data.featuredMediaType));
  }

  if (hasOwnField(data, "featuredMediaUrl")) {
    updates.push(`featured_media_url = $${paramIndex++}`);
    values.push(sanitizeText(data.featuredMediaUrl, 500));
  }

  if (hasOwnField(data, "manualUpcomingCourses")) {
    updates.push(`manual_upcoming_courses = $${paramIndex++}::jsonb`);
    values.push(JSON.stringify(sanitizeManualUpcomingCourses(data.manualUpcomingCourses ?? [])));
  }

  if (hasOwnField(data, "featuredPreviousClassIds")) {
    updates.push(`featured_previous_class_ids = $${paramIndex++}::uuid[]`);
    values.push(sanitizeFeaturedPreviousClassIds(data.featuredPreviousClassIds ?? []));
  }

  if (hasOwnField(data, "isActive")) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(Boolean(data.isActive));
  }

  if (updates.length > 0) {
    updates.push(`updated_at = NOW()`);

    await query(
      `UPDATE trainer_profiles
       SET ${updates.join(", ")}
       WHERE user_id = $1`,
      values
    );
  }

  const profile = await getTrainerProfile(data.userId);
  if (!profile) {
    throw new Error("Failed to upsert trainer profile");
  }

  return profile;
}

/**
 * Get trainer profile
 */
export async function getTrainerProfile(userId: string): Promise<TrainerProfilePublic | null> {
  await ensureTrainerProfilesFinanceSchema();
  const result = await query(`SELECT * FROM trainer_profiles WHERE user_id = $1`, [userId]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    displayNameEn: sanitizeText(row.display_name_en, 255),
    displayNameAr: sanitizeText(row.display_name_ar, 255),
    displayOrder: row.display_order == null ? null : Number(row.display_order),
    bio: row.bio,
    bioEn: sanitizeText(row.bio_en, 5000),
    bioAr: sanitizeText(row.bio_ar, 5000),
    expertise: row.expertise || [],
    experience: row.experience,
    socialLinks: row.social_links,
    shareTiers: sanitizeShareTiers(row.share_tiers),
    featuredMediaType: sanitizeFeaturedMediaType(row.featured_media_type),
    featuredMediaUrl: sanitizeText(row.featured_media_url, 500),
    manualUpcomingCourses: sanitizeManualUpcomingCourses(row.manual_upcoming_courses),
    featuredPreviousClassIds: sanitizeFeaturedPreviousClassIds(row.featured_previous_class_ids),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listTrainerWorkshopSuggestions(
  trainerId: string,
  options?: { limit?: number }
): Promise<TrainerWorkshopSuggestionPublic[]> {
  await ensureTrainerProfilesFinanceSchema();

  const limit = Number.isFinite(options?.limit) ? Math.max(1, Math.min(500, Number(options?.limit))) : 200;

  const result = await query(
    `SELECT
      id,
      trainer_id,
      title,
      title_ar,
      brief,
      recipe,
      recipe_pdf,
      notes,
      photos,
      admin_notes,
      status,
      live_class_id,
      created_at,
      updated_at
     FROM trainer_workshop_suggestions
     WHERE trainer_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [trainerId, limit]
  );

  return result.rows.map((row) => mapTrainerWorkshopSuggestionRow(row));
}

export async function createTrainerWorkshopSuggestion(args: {
  trainerId: string;
  title: string;
  titleAr?: string | null;
  brief?: string | null;
  recipe?: string | null;
  recipePdf?: string | null;
  notes?: string | null;
  photos?: string[];
}): Promise<TrainerWorkshopSuggestionPublic> {
  await ensureTrainerProfilesFinanceSchema();

  const title = sanitizeText(args.title, 255);
  if (!title) {
    throw new Error("Title is required");
  }

  const result = await query(
    `INSERT INTO trainer_workshop_suggestions (
      trainer_id,
      title,
      title_ar,
      brief,
      recipe,
      recipe_pdf,
      notes,
      photos,
      status,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::text[], 'PENDING_REVIEW', NOW(), NOW())
    RETURNING
      id,
      trainer_id,
      title,
      title_ar,
      brief,
      recipe,
      recipe_pdf,
      notes,
      photos,
      admin_notes,
      status,
      live_class_id,
      created_at,
      updated_at`,
    [
      args.trainerId,
      title,
      sanitizeText(args.titleAr, 255),
      sanitizeText(args.brief, 4000),
      sanitizeText(args.recipe, 12000),
      sanitizeText(args.recipePdf, 500),
      sanitizeText(args.notes, 4000),
      sanitizeStringArray(args.photos, 500, 40),
    ]
  );

  const row = result.rows[0];

  return mapTrainerWorkshopSuggestionRow(row);
}

export async function updateTrainerWorkshopSuggestionByTrainer(args: {
  trainerId: string;
  suggestionId: string;
  title?: string;
  titleAr?: string | null;
  brief?: string | null;
  recipe?: string | null;
  recipePdf?: string | null;
  notes?: string | null;
  photos?: string[];
}): Promise<TrainerWorkshopSuggestionPublic | null> {
  await ensureTrainerProfilesFinanceSchema();

  const updates: string[] = [];
  const values: unknown[] = [args.suggestionId, args.trainerId];
  let paramIndex = 3;

  if (hasOwnField(args, "title")) {
    const title = sanitizeText(args.title, 255);
    if (!title) {
      throw new Error("Title is required");
    }
    updates.push(`title = $${paramIndex++}`);
    values.push(title);
  }

  if (hasOwnField(args, "titleAr")) {
    updates.push(`title_ar = $${paramIndex++}`);
    values.push(sanitizeText(args.titleAr, 255));
  }

  if (hasOwnField(args, "brief")) {
    updates.push(`brief = $${paramIndex++}`);
    values.push(sanitizeText(args.brief, 4000));
  }

  if (hasOwnField(args, "recipe")) {
    updates.push(`recipe = $${paramIndex++}`);
    values.push(sanitizeText(args.recipe, 12000));
  }

  if (hasOwnField(args, "recipePdf")) {
    updates.push(`recipe_pdf = $${paramIndex++}`);
    values.push(sanitizeText(args.recipePdf, 500));
  }

  if (hasOwnField(args, "notes")) {
    updates.push(`notes = $${paramIndex++}`);
    values.push(sanitizeText(args.notes, 4000));
  }

  if (hasOwnField(args, "photos")) {
    updates.push(`photos = $${paramIndex++}::text[]`);
    values.push(sanitizeStringArray(args.photos, 500, 40));
  }

  if (updates.length === 0) {
    const existing = await query(
      `SELECT
        id,
        trainer_id,
        title,
        title_ar,
        brief,
        recipe,
        recipe_pdf,
        notes,
        photos,
        admin_notes,
        status,
        live_class_id,
        created_at,
        updated_at
      FROM trainer_workshop_suggestions
      WHERE id = $1
        AND trainer_id = $2`,
      [args.suggestionId, args.trainerId]
    );

    const row = existing.rows[0];
    return row ? mapTrainerWorkshopSuggestionRow(row) : null;
  }

  updates.push(`updated_at = NOW()`);

  const result = await query(
    `UPDATE trainer_workshop_suggestions
     SET ${updates.join(", ")}
     WHERE id = $1
       AND trainer_id = $2
       AND status = 'PENDING_REVIEW'
     RETURNING
       id,
       trainer_id,
       title,
       title_ar,
       brief,
       recipe,
       recipe_pdf,
       notes,
       photos,
       admin_notes,
       status,
       live_class_id,
       created_at,
       updated_at`,
    values
  );

  const row = result.rows[0];
  return row ? mapTrainerWorkshopSuggestionRow(row) : null;
}

export async function listAllTrainerWorkshopSuggestions(options?: {
  status?: TrainerWorkshopSuggestionStatus | "ALL";
  limit?: number;
}): Promise<TrainerWorkshopSuggestionAdminPublic[]> {
  await ensureTrainerProfilesFinanceSchema();

  const limit = Number.isFinite(options?.limit) ? Math.max(1, Math.min(500, Number(options?.limit))) : 300;
  const status = options?.status && options.status !== "ALL" ? sanitizeTrainerWorkshopSuggestionStatus(options.status) : null;

  const values: unknown[] = [];
  const conditions: string[] = [];
  let paramIndex = 1;

  if (status) {
    conditions.push(`s.status = $${paramIndex++}`);
    values.push(status);
  }

  values.push(limit);

  const result = await query(
    `SELECT
      s.id,
      s.trainer_id,
      s.title,
      s.title_ar,
      s.brief,
      s.recipe,
      s.recipe_pdf,
      s.notes,
      s.photos,
      s.admin_notes,
      s.status,
      s.live_class_id,
      s.created_at,
      s.updated_at,
      u.full_name AS trainer_name,
      u.email AS trainer_email,
      u.phone_number AS trainer_phone_number
     FROM trainer_workshop_suggestions s
     INNER JOIN users u ON u.id = s.trainer_id
     ${conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""}
     ORDER BY s.created_at DESC
     LIMIT $${paramIndex}`,
    values
  );

  return result.rows.map((row) => mapTrainerWorkshopSuggestionAdminRow(row));
}

export async function countTrainerWorkshopSuggestionsPendingReview(): Promise<number> {
  await ensureTrainerProfilesFinanceSchema();

  const result = await query(
    `SELECT COUNT(*)::int AS count
     FROM trainer_workshop_suggestions
     WHERE status = 'PENDING_REVIEW'`
  );

  return Number(result.rows[0]?.count || 0);
}

export async function updateTrainerWorkshopSuggestionByAdmin(args: {
  suggestionId: string;
  status?: TrainerWorkshopSuggestionStatus;
  adminNotes?: string | null;
  liveClassId?: string | null;
}): Promise<TrainerWorkshopSuggestionAdminPublic | null> {
  await ensureTrainerProfilesFinanceSchema();

  const updates: string[] = [];
  const values: unknown[] = [args.suggestionId];
  let paramIndex = 2;
  const normalizedStatus = hasOwnField(args, "status")
    ? sanitizeTrainerWorkshopSuggestionStatus(args.status)
    : undefined;
  const normalizedLiveClassId = hasOwnField(args, "liveClassId")
    ? sanitizeText(args.liveClassId, 120)
    : undefined;

  if (normalizedStatus === "PUBLISHED" && !normalizedLiveClassId) {
    const existing = await query(
      `SELECT live_class_id
       FROM trainer_workshop_suggestions
       WHERE id = $1
       LIMIT 1`,
      [args.suggestionId]
    );
    const existingLiveClassId = existing.rows[0]?.live_class_id
      ? String(existing.rows[0].live_class_id)
      : null;
    if (!existingLiveClassId) {
      throw new Error("Published status requires a linked live class.");
    }
  }

  if (hasOwnField(args, "status")) {
    updates.push(`status = $${paramIndex++}`);
    values.push(normalizedStatus);
  }

  if (hasOwnField(args, "adminNotes")) {
    updates.push(`admin_notes = $${paramIndex++}`);
    values.push(sanitizeText(args.adminNotes, 4000));
  }

  if (hasOwnField(args, "liveClassId")) {
    updates.push(`live_class_id = $${paramIndex++}`);
    values.push(normalizedLiveClassId);
  }

  if (updates.length === 0) {
    const existing = await query(
      `SELECT
        s.id,
        s.trainer_id,
        s.title,
        s.title_ar,
        s.brief,
        s.recipe,
        s.recipe_pdf,
        s.notes,
        s.photos,
        s.admin_notes,
        s.status,
        s.live_class_id,
        s.created_at,
        s.updated_at,
        u.full_name AS trainer_name,
        u.email AS trainer_email,
        u.phone_number AS trainer_phone_number
       FROM trainer_workshop_suggestions s
       INNER JOIN users u ON u.id = s.trainer_id
       WHERE s.id = $1`,
      [args.suggestionId]
    );

    const row = existing.rows[0];
    return row ? mapTrainerWorkshopSuggestionAdminRow(row) : null;
  }

  updates.push(`updated_at = NOW()`);

  const result = await query(
    `WITH updated AS (
      UPDATE trainer_workshop_suggestions
      SET ${updates.join(", ")}
      WHERE id = $1
      RETURNING *
    )
    SELECT
      updated.id,
      updated.trainer_id,
      updated.title,
      updated.title_ar,
      updated.brief,
      updated.recipe,
      updated.recipe_pdf,
      updated.notes,
      updated.photos,
      updated.admin_notes,
      updated.status,
      updated.live_class_id,
      updated.created_at,
      updated.updated_at,
      u.full_name AS trainer_name,
      u.email AS trainer_email,
      u.phone_number AS trainer_phone_number
    FROM updated
    INNER JOIN users u ON u.id = updated.trainer_id`,
    values
  );

  const row = result.rows[0];
  return row ? mapTrainerWorkshopSuggestionAdminRow(row) : null;
}

export async function updateTrainerWorkshopSubmission(args: {
  trainerId: string;
  classId: string;
  submission: TrainerSessionSubmissionInput;
}): Promise<TrainerDashboardWorkshopPublic | null> {
  await ensureTrainerProfilesFinanceSchema();
  await ensureRecipeManagementSchema();

  const trainerPhotos = sanitizeStringArray(args.submission.trainerPhotos, 500, 30);
  const recipePdf = sanitizeText(args.submission.recipePdf, 500);
  const groceryList = sanitizeText(args.submission.groceryList, 12000);
  const workshopBrief = sanitizeText(args.submission.workshopBrief, 12000);
  const highlightedIngredients = sanitizeHighlightedIngredients(args.submission.highlightedIngredients);

  const recipeSubmitted =
    typeof args.submission.recipeSubmitted === "boolean"
      ? args.submission.recipeSubmitted
      : Boolean(recipePdf || groceryList || workshopBrief || trainerPhotos.length > 0 || highlightedIngredients.length > 0);

  const result = await query(
    `UPDATE classes c
     SET recipe_submitted = $3,
         recipe_pdf = $4,
         grocery_list = $5,
         workshop_brief = $6,
         trainer_photos = $7::text[],
         photos = $7::text[],
         highlighted_ingredients = $8::jsonb,
         updated_at = NOW()
     WHERE c.id = $1
       AND (c.trainer_id = $2 OR c.co_trainer_id = $2)
     RETURNING
       c.id AS class_id,
       c.slug AS class_slug,
       c.title AS class_title,
       c.title_ar AS class_title_ar,
       c.image AS class_image,
       c.category AS class_category,
       c.price AS class_price,
       c.currency,
       c.start_date_time,
       c.end_date_time,
       c.seats_total AS seats_total_effective,
       COALESCE(c.seats_booked, 0) AS seats_booked,
       c.recipe_submitted,
       c.recipe_pdf,
       c.grocery_list,
       c.workshop_brief,
       c.trainer_photos,
       c.highlighted_ingredients,
       c.final_recipe_title,
       c.final_recipe_pdf,
       c.final_recipe_brief,
       c.final_recipe_visible_to_customers,
       c.final_recipe_published_at,
       c.admin_workshop_notes,
       c.admin_workshop_notes_photo`,
    [
      args.classId,
      args.trainerId,
      recipeSubmitted,
      recipePdf,
      groceryList,
      workshopBrief,
      trainerPhotos,
      JSON.stringify(highlightedIngredients),
    ]
  );

  const row = result.rows[0];
  if (!row) return null;

  const seatsTotal = Math.max(0, Number(row.seats_total_effective || 0));
  const seatsBooked = Math.max(0, Number(row.seats_booked || 0));

  return {
    classId: String(row.class_id),
    classSlug: String(row.class_slug),
    classTitle: String(row.class_title),
    classTitleAr: sanitizeText(row.class_title_ar, 255),
    classImage: sanitizeText(row.class_image, 500),
    classCategory: String(row.class_category),
    classPrice: toMoney(row.class_price),
    currency: sanitizeText(row.currency, 10) || "OMR",
    startDateTime: new Date(String(row.start_date_time)).toISOString(),
    endDateTime: row.end_date_time ? new Date(String(row.end_date_time)).toISOString() : null,
    seatsTotal,
    seatsBooked,
    seatsAvailable: Math.max(0, seatsTotal - seatsBooked),
    bookingsCount: 0,
    participantsCount: 0,
    feedbackCount: 0,
    averageRating: null,
    submission: {
      recipeSubmitted: Boolean(row.recipe_submitted),
      recipePdf: sanitizeText(row.recipe_pdf, 500),
      groceryList: sanitizeText(row.grocery_list, 12000),
      workshopBrief: sanitizeText(row.workshop_brief, 12000),
      trainerPhotos: sanitizeStringArray(row.trainer_photos, 500, 30),
      highlightedIngredients: sanitizeHighlightedIngredients(row.highlighted_ingredients),
    },
    finalRecipe: {
      title: sanitizeText(row.final_recipe_title, 255),
      pdf: sanitizeText(row.final_recipe_pdf, 500),
      brief: sanitizeText(row.final_recipe_brief, 12000),
      visibleToCustomers: Boolean(row.final_recipe_visible_to_customers),
      publishedAt: row.final_recipe_published_at ? new Date(String(row.final_recipe_published_at)).toISOString() : null,
    },
    adminNotes: {
      text: sanitizeText(row.admin_workshop_notes, 12000),
      photo: sanitizeText(row.admin_workshop_notes_photo, 500),
    },
    feedback: [],
  };
}

function mapDashboardWorkshopRow(row: Record<string, unknown>): TrainerDashboardWorkshopPublic {
  const seatsTotal = Math.max(0, Number(row.seats_total_effective || 0));
  const seatsBooked = Math.max(0, Number(row.seats_booked || 0));

  return {
    classId: String(row.class_id),
    classSlug: String(row.class_slug),
    classTitle: String(row.class_title),
    classTitleAr: sanitizeText(row.class_title_ar, 255),
    classImage: sanitizeText(row.class_image, 500),
    classCategory: String(row.class_category),
    classPrice: toMoney(row.class_price),
    currency: sanitizeText(row.currency, 10) || "OMR",
    startDateTime: new Date(String(row.start_date_time)).toISOString(),
    endDateTime: row.end_date_time ? new Date(String(row.end_date_time)).toISOString() : null,
    seatsTotal,
    seatsBooked,
    seatsAvailable: Math.max(0, seatsTotal - seatsBooked),
    bookingsCount: Number(row.bookings_count || 0),
    participantsCount: Number(row.participants_count || 0),
    feedbackCount: Number(row.feedback_count || 0),
    averageRating: row.average_rating === null || row.average_rating === undefined ? null : Number(row.average_rating),
    submission: {
      recipeSubmitted: Boolean(row.recipe_submitted),
      recipePdf: sanitizeText(row.recipe_pdf, 500),
      groceryList: sanitizeText(row.grocery_list, 12000),
      workshopBrief: sanitizeText(row.workshop_brief, 12000),
      trainerPhotos: sanitizeStringArray(row.trainer_photos, 500, 30),
      highlightedIngredients: sanitizeHighlightedIngredients(row.highlighted_ingredients),
    },
    finalRecipe: {
      title: sanitizeText(row.final_recipe_title, 255),
      pdf: sanitizeText(row.final_recipe_pdf, 500),
      brief: sanitizeText(row.final_recipe_brief, 12000),
      visibleToCustomers: Boolean(row.final_recipe_visible_to_customers),
      publishedAt: row.final_recipe_published_at ? new Date(String(row.final_recipe_published_at)).toISOString() : null,
    },
    adminNotes: {
      text: sanitizeText(row.admin_workshop_notes, 12000),
      photo: sanitizeText(row.admin_workshop_notes_photo, 500),
    },
    feedback: [],
  };
}

export async function getTrainerDashboardData(trainerId: string): Promise<TrainerDashboardData> {
  await ensureTrainerProfilesFinanceSchema();
  await ensureRecipeManagementSchema();
  await ensureClassFinanceSchema();

  const [ongoingResult, previousResult, suggestions, earningsResult, monthlyResult] = await Promise.all([
    query(
      `SELECT
        c.id AS class_id,
        c.slug AS class_slug,
        c.title AS class_title,
        c.title_ar AS class_title_ar,
        c.image AS class_image,
        c.category AS class_category,
        c.price AS class_price,
        c.currency,
        c.start_date_time,
        c.end_date_time,
        c.seats_total AS seats_total_effective,
        COALESCE(c.seats_booked, 0) AS seats_booked,
        c.recipe_submitted,
        c.recipe_pdf,
        c.grocery_list,
        c.workshop_brief,
        c.trainer_photos,
        c.highlighted_ingredients,
        c.final_recipe_title,
        c.final_recipe_pdf,
        c.final_recipe_brief,
        c.final_recipe_visible_to_customers,
        c.final_recipe_published_at,
        c.admin_workshop_notes,
        c.admin_workshop_notes_photo,
        COALESCE(booking_stats.bookings_count, 0) AS bookings_count,
        COALESCE(booking_stats.participants_count, 0) AS participants_count,
        COALESCE(review_stats.feedback_count, 0) AS feedback_count,
        review_stats.average_rating
      FROM classes c
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS bookings_count,
          COALESCE(SUM(b.number_of_participants), 0)::int AS participants_count
        FROM bookings b
        WHERE b.class_id = c.id
          AND b.status <> 'CANCELLED'
      ) AS booking_stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS feedback_count,
          ROUND(AVG(r.rating)::numeric, 2)::float8 AS average_rating
        FROM reviews r
        WHERE r.class_id = c.id
          AND r.is_visible = true
      ) AS review_stats ON TRUE
      WHERE (c.trainer_id = $1 OR c.co_trainer_id = $1)
        AND c.status = 'PUBLISHED'
        AND c.start_date_time >= NOW()
      ORDER BY c.start_date_time ASC
      LIMIT 300`,
      [trainerId]
    ),
    query(
      `SELECT
        c.id AS class_id,
        c.slug AS class_slug,
        c.title AS class_title,
        c.title_ar AS class_title_ar,
        c.image AS class_image,
        c.category AS class_category,
        c.price AS class_price,
        c.currency,
        c.start_date_time,
        c.end_date_time,
        c.seats_total AS seats_total_effective,
        COALESCE(c.seats_booked, 0) AS seats_booked,
        c.recipe_submitted,
        c.recipe_pdf,
        c.grocery_list,
        c.workshop_brief,
        c.trainer_photos,
        c.highlighted_ingredients,
        c.final_recipe_title,
        c.final_recipe_pdf,
        c.final_recipe_brief,
        c.final_recipe_visible_to_customers,
        c.final_recipe_published_at,
        c.admin_workshop_notes,
        c.admin_workshop_notes_photo,
        COALESCE(booking_stats.bookings_count, 0) AS bookings_count,
        COALESCE(booking_stats.participants_count, 0) AS participants_count,
        COALESCE(review_stats.feedback_count, 0) AS feedback_count,
        review_stats.average_rating
      FROM classes c
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS bookings_count,
          COALESCE(SUM(b.number_of_participants), 0)::int AS participants_count
        FROM bookings b
        WHERE b.class_id = c.id
          AND b.status <> 'CANCELLED'
      ) AS booking_stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS feedback_count,
          ROUND(AVG(r.rating)::numeric, 2)::float8 AS average_rating
        FROM reviews r
        WHERE r.class_id = c.id
          AND r.is_visible = true
      ) AS review_stats ON TRUE
      WHERE (c.trainer_id = $1 OR c.co_trainer_id = $1)
        AND c.start_date_time < NOW()
      ORDER BY c.start_date_time DESC
      LIMIT 300`,
      [trainerId]
    ),
    listTrainerWorkshopSuggestions(trainerId, { limit: 300 }),
    query(
      `SELECT
        cs.class_id,
        c.slug AS class_slug,
        c.title AS class_title,
        c.title_ar AS class_title_ar,
        c.image AS class_image,
        cs.settled_at,
        cs.currency,
        cs.participants_count,
        cs.gross_revenue,
        CASE WHEN c.trainer_id = $1 THEN cs.trainer_payout_amount ELSE COALESCE(cs.co_trainer_fee_amount, 0) END AS trainer_payout_amount
      FROM class_settlements cs
      INNER JOIN classes c ON c.id = cs.class_id
      WHERE (c.trainer_id = $1 OR c.co_trainer_id = $1)
        AND cs.status = 'CLOSED'
      ORDER BY cs.settled_at DESC NULLS LAST, cs.created_at DESC
      LIMIT 500`,
      [trainerId]
    ),
    query(
      `SELECT
        DATE_TRUNC('month', cs.settled_at) AS month_start,
        cs.currency,
        COUNT(*)::int AS workshops_count,
        COALESCE(SUM(cs.participants_count), 0)::int AS participants_count,
        COALESCE(SUM(cs.gross_revenue), 0)::numeric AS total_revenue,
        COALESCE(SUM(CASE WHEN c.trainer_id = $1 THEN cs.trainer_payout_amount ELSE COALESCE(cs.co_trainer_fee_amount, 0) END), 0)::numeric AS total_payout
      FROM class_settlements cs
      INNER JOIN classes c ON c.id = cs.class_id
      WHERE (c.trainer_id = $1 OR c.co_trainer_id = $1)
        AND cs.status = 'CLOSED'
        AND cs.settled_at IS NOT NULL
      GROUP BY DATE_TRUNC('month', cs.settled_at), cs.currency
      ORDER BY DATE_TRUNC('month', cs.settled_at) DESC
      LIMIT 36`,
      [trainerId]
    ),
  ]);

  const ongoingWorkshops = ongoingResult.rows.map((row) => mapDashboardWorkshopRow(row));
  const previousWorkshops = previousResult.rows.map((row) => mapDashboardWorkshopRow(row));

  const previousClassIds = previousWorkshops.map((item) => item.classId);
  const feedbackByClass = new Map<string, TrainerWorkshopFeedbackPublic[]>();

  if (previousClassIds.length > 0) {
    const feedbackResult = await query(
      `SELECT
         r.id,
         r.class_id,
         r.rating,
         r.comment,
         r.created_at,
         COALESCE(u.full_name, 'Customer') AS customer_name
       FROM reviews r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.class_id = ANY($1::uuid[])
         AND r.is_visible = true
       ORDER BY r.created_at DESC
       LIMIT 1500`,
      [previousClassIds]
    );

    for (const row of feedbackResult.rows) {
      const classId = String(row.class_id);
      const item: TrainerWorkshopFeedbackPublic = {
        id: String(row.id),
        classId,
        customerName: String(row.customer_name || "Customer"),
        rating: toPercent(row.rating),
        comment: sanitizeText(row.comment, 2000),
        createdAt: new Date(String(row.created_at)).toISOString(),
      };

      const existing = feedbackByClass.get(classId) ?? [];
      existing.push(item);
      feedbackByClass.set(classId, existing);
    }
  }

  for (const workshop of previousWorkshops) {
    workshop.feedback = feedbackByClass.get(workshop.classId) ?? [];
  }

  const earningsByWorkshop: TrainerWorkshopEarningPublic[] = earningsResult.rows.map((row) => ({
    classId: String(row.class_id),
    classSlug: String(row.class_slug),
    classTitle: String(row.class_title),
    classTitleAr: sanitizeText(row.class_title_ar, 255),
    classImage: sanitizeText(row.class_image, 500),
    settledAt: row.settled_at ? new Date(String(row.settled_at)).toISOString() : null,
    currency: sanitizeText(row.currency, 10) || "OMR",
    participantsCount: Number(row.participants_count || 0),
    grossRevenue: toMoney(row.gross_revenue),
    trainerPayoutAmount: toMoney(row.trainer_payout_amount),
  }));

  const monthlyEarnings: TrainerMonthlyEarningPublic[] = monthlyResult.rows.map((row) => {
    const month = new Date(String(row.month_start));
    return {
      monthStart: month.toISOString(),
      monthLabel: month.toLocaleDateString("en-OM", { year: "numeric", month: "long", timeZone: "Asia/Muscat" }),
      currency: sanitizeText(row.currency, 10) || "OMR",
      workshopsCount: Number(row.workshops_count || 0),
      participantsCount: Number(row.participants_count || 0),
      totalPayout: toMoney(row.total_payout),
      totalRevenue: toMoney(row.total_revenue),
    };
  });

  const defaultCurrency =
    earningsByWorkshop[0]?.currency ||
    monthlyEarnings[0]?.currency ||
    ongoingWorkshops[0]?.currency ||
    previousWorkshops[0]?.currency ||
    "OMR";

  const totalRevenue = toMoney(earningsByWorkshop.reduce((sum, item) => sum + item.grossRevenue, 0));
  const totalTrainerEarnings = toMoney(earningsByWorkshop.reduce((sum, item) => sum + item.trainerPayoutAmount, 0));
  const totalParticipants = earningsByWorkshop.reduce((sum, item) => sum + item.participantsCount, 0);
  const totalClosedWorkshops = earningsByWorkshop.length;
  const averageEarningPerWorkshop =
    totalClosedWorkshops > 0 ? toMoney(totalTrainerEarnings / totalClosedWorkshops) : 0;

  return {
    ongoingWorkshops,
    previousWorkshops,
    suggestedWorkshops: suggestions,
    earningsByWorkshop,
    monthlyEarnings,
    summary: {
      totalUpcomingWorkshops: ongoingWorkshops.length,
      totalPreviousWorkshops: previousWorkshops.length,
      totalSuggestedWorkshops: suggestions.length,
      totalClosedWorkshops,
      totalParticipants,
      totalRevenue,
      totalTrainerEarnings,
      averageEarningPerWorkshop,
      currency: defaultCurrency,
    },
  };
}
