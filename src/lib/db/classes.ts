/**
 * Database queries for classes
 */
import { query } from "./pool";
import { generateUUID } from "./uuid";
import type { ClassAudienceGender, ClassCategory as ClassCategoryType, ClassSubCategory, ClassStatus, ClassVenue, ClassPublic } from "./types";
import { ClassCategory } from "./types";
import { ensureClassFinanceSchema } from "./classFinance";
import { ensureRecipeManagementSchema } from "./recipeManagement";

let classMinimumAgeSchemaReady: Promise<void> | null = null;

async function ensureClassMinimumAgeSchema(): Promise<void> {
  if (classMinimumAgeSchemaReady) {
    return classMinimumAgeSchemaReady;
  }

  classMinimumAgeSchemaReady = (async () => {
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS minimum_age INTEGER DEFAULT NULL`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS maximum_age INTEGER DEFAULT NULL`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS show_minimum_age BOOLEAN NOT NULL DEFAULT FALSE`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS registration_close_at TIMESTAMP WITH TIME ZONE`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS audience_gender VARCHAR(20) NOT NULL DEFAULT 'MIXED'`);
    await query(`ALTER TABLE classes ALTER COLUMN audience_gender SET DEFAULT 'FEMALE_ONLY'`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS schedule_sessions JSONB NOT NULL DEFAULT '[]'::jsonb`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS registration_message TEXT`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS registration_message_ar TEXT`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS co_trainer_id UUID REFERENCES users(id) ON DELETE SET NULL`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS venue VARCHAR(20) NOT NULL DEFAULT 'KITCHEN'`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS renewed_from_class_id UUID REFERENCES classes(id) ON DELETE SET NULL`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}'`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS sub_categories TEXT[] NOT NULL DEFAULT '{}'`);
    await query(`UPDATE classes SET categories = ARRAY[category::text] WHERE COALESCE(array_length(categories, 1), 0) = 0`);
    await query(`UPDATE classes SET sub_categories = ARRAY[sub_category::text] WHERE COALESCE(array_length(sub_categories, 1), 0) = 0`);
  })();

  return classMinimumAgeSchemaReady;
}

// Extended ClassPublic with trainer info
export interface ClassWithTrainer extends ClassPublic {
  trainer: {
    id: string;
    fullName: string;
    profileImage: string | null;
    email: string;
  } | null;
  coTrainer: {
    id: string;
    fullName: string;
    profileImage: string | null;
    email: string;
  } | null;
}

function toCategoriesArray(value: unknown, fallback: string | null): string[] {
  const list = Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
  if (list.length > 0) return list;
  return fallback ? [fallback] : [];
}

/**
 * Find many classes with filters (simplified for site pages)
 */
export async function findManyClasses(options: {
  category?: ClassCategoryType;
  status?: ClassStatus | ClassStatus[];
  trainerId?: string;
  limit?: number;
}): Promise<ClassWithTrainer[]> {
  await ensureClassFinanceSchema();
  await ensureClassMinimumAgeSchema();
  await ensureRecipeManagementSchema();
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (options.category) {
    conditions.push(`(c.category = $${paramIndex} OR $${paramIndex} = ANY(c.categories))`);
    paramIndex += 1;
    values.push(options.category);
  }
  if (options.status) {
    if (Array.isArray(options.status)) {
      conditions.push(`c.status = ANY($${paramIndex++})`);
      values.push(options.status);
    } else {
      conditions.push(`c.status = $${paramIndex++}`);
      values.push(options.status);
    }
  }
  if (options.trainerId) {
    conditions.push(`(c.trainer_id = $${paramIndex} OR c.co_trainer_id = $${paramIndex})`);
    paramIndex += 1;
    values.push(options.trainerId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  let sql = `
    SELECT c.*,
           u.id as u_trainer_id, u.full_name as trainer_full_name, u.profile_image as trainer_profile_image, u.email as trainer_email,
           cu.id as u_co_trainer_id, cu.full_name as co_trainer_full_name, cu.profile_image as co_trainer_profile_image, cu.email as co_trainer_email
    FROM classes c
    LEFT JOIN users u ON c.trainer_id = u.id
    LEFT JOIN users cu ON c.co_trainer_id = cu.id
    ${whereClause}
    ORDER BY c.created_at DESC
  `;

  if (options.limit) {
    sql += ` LIMIT $${paramIndex++}`;
    values.push(options.limit);
  }

  const result = await query(sql, values);

  return result.rows.map(row => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    titleAr: row.title_ar,
    description: row.description,
    descriptionAr: row.description_ar,
    category: row.category,
    subCategory: row.sub_category,
    categories: toCategoriesArray(row.categories, row.category) as ClassCategoryType[],
    subCategories: toCategoriesArray(row.sub_categories, row.sub_category) as ClassSubCategory[],
    audienceGender: row.audience_gender || 'MIXED',
    image: row.image,
    images: row.images || [],
    trainerId: row.trainer_id,
    coTrainerId: row.co_trainer_id ?? null,
    venue: (row.venue === 'OUTSIDE' ? 'OUTSIDE' : 'KITCHEN') as ClassVenue,
    price: parseFloat(row.price || 0),
    currency: row.currency,
    seatsTotal: row.seats_total,
    seatsAvailable: row.seats_available,
    durationMinutes: row.duration_minutes,
    status: row.status,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    finalRecipeTitle: row.final_recipe_title,
    finalRecipePdf: row.final_recipe_pdf,
    finalRecipeBrief: row.final_recipe_brief,
    finalRecipeTitleAr: row.final_recipe_title_ar,
    finalRecipePdfAr: row.final_recipe_pdf_ar,
    finalRecipeBriefAr: row.final_recipe_brief_ar,
    finalRecipeVisibleToCustomers: Boolean(row.final_recipe_visible_to_customers),
    finalRecipePublishedAt: row.final_recipe_published_at,
    trainerSharePercent: parseFloat(row.trainer_share_percent || 0),
    noonSharePercent: parseFloat(row.noon_share_percent || 0),
    expenseSharePercent: parseFloat(row.expense_share_percent || 0),
    minimumAge: row.minimum_age != null ? Number(row.minimum_age) : null,
    maximumAge: row.maximum_age != null ? Number(row.maximum_age) : null,
    showMinimumAge: Boolean(row.show_minimum_age),
    startDateTime: row.start_date_time || null,
    endDateTime: row.end_date_time || null,
    registrationCloseAt: row.registration_close_at || null,
    scheduleSessions: Array.isArray(row.schedule_sessions) ? row.schedule_sessions : [],
    seatsBooked: row.seats_booked ?? 0,
    registrationMessage: row.registration_message ?? null,
    registrationMessageAr: row.registration_message_ar ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    trainer: row.u_trainer_id ? {
      id: row.u_trainer_id,
      fullName: row.trainer_full_name,
      profileImage: row.trainer_profile_image,
      email: row.trainer_email,
    } : null,
    coTrainer: row.u_co_trainer_id ? {
      id: row.u_co_trainer_id,
      fullName: row.co_trainer_full_name,
      profileImage: row.co_trainer_profile_image,
      email: row.co_trainer_email,
    } : null,
  }));
}

export type MarketingClassOverviewItem = {
  id: string;
  slug: string;
  title: string;
  titleAr: string | null;
  category: string;
  status: string;
  image: string | null;
  seatsTotal: number;
  participants: number;
  startDateTime: Date | null;
};

/**
 * Lightweight workshop list for the social media / marketing team:
 * each workshop with its registered participant count and total seats.
 * Ordered by lowest occupancy first so under-filled workshops surface on top.
 */
export async function getMarketingClassesOverview(): Promise<MarketingClassOverviewItem[]> {
  const result = await query(
    `SELECT c.id, c.slug, c.title, c.title_ar, c.category, c.status, c.image,
            c.seats_total,
            c.start_date_time,
            (SELECT COUNT(*)::int FROM bookings b WHERE b.class_id = c.id) AS participants
     FROM classes c
     WHERE c.status IN ('PUBLISHED', 'DRAFT')
     ORDER BY
       CASE WHEN c.seats_total > 0 THEN
         (SELECT COUNT(*)::int FROM bookings b WHERE b.class_id = c.id)::float / c.seats_total
       ELSE 1 END ASC,
       c.start_date_time ASC NULLS LAST`
  );

  return result.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    titleAr: row.title_ar,
    category: row.category,
    status: row.status,
    image: row.image,
    seatsTotal: row.seats_total ?? 0,
    participants: Number(row.participants ?? 0),
    startDateTime: row.start_date_time || null,
  }));
}

/**
 * Find many classes with pagination (for admin)
 */
export async function findManyClassesPaginated(options: {
  where?: {
    category?: ClassCategoryType;
    status?: ClassStatus;
    trainerId?: string;
  };
  include?: {
    trainer?: boolean;
    sessions?: boolean;
    reviews?: boolean;
  };
  orderBy?: { [key: string]: 'asc' | 'desc' };
  skip?: number;
  take?: number;
}): Promise<{ classes: Record<string, unknown>[]; total: number }> {
  await ensureClassFinanceSchema();
  await ensureClassMinimumAgeSchema();
  await ensureRecipeManagementSchema();
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (options.where?.category) {
    conditions.push(`(c.category = $${paramIndex} OR $${paramIndex} = ANY(c.categories))`);
    paramIndex += 1;
    values.push(options.where.category);
  }
  if (options.where?.status) {
    conditions.push(`c.status = $${paramIndex++}`);
    values.push(options.where.status);
  }
  if (options.where?.trainerId) {
    conditions.push(`(c.trainer_id = $${paramIndex} OR c.co_trainer_id = $${paramIndex})`);
    paramIndex += 1;
    values.push(options.where.trainerId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total
  const countResult = await query(
    `SELECT COUNT(*)::int as count FROM classes c ${whereClause}`,
    values
  );
  const total = countResult.rows[0]?.count ?? 0;

  // Build main query
  let sql = `
    SELECT c.*,
           u.id as u_trainer_id, u.full_name as trainer_full_name, u.profile_image as trainer_profile_image, u.email as trainer_email,
           cu.id as u_co_trainer_id, cu.full_name as co_trainer_full_name, cu.profile_image as co_trainer_profile_image, cu.email as co_trainer_email
    FROM classes c
    LEFT JOIN users u ON c.trainer_id = u.id
    LEFT JOIN users cu ON c.co_trainer_id = cu.id
    ${whereClause}
  `;

  // Order by
  const orderBy = options.orderBy || { created_at: 'desc' };
  const orderParts = Object.entries(orderBy).map(([key, dir]) => `c.${key} ${dir.toUpperCase()}`);
  sql += ` ORDER BY ${orderParts.join(', ')}`;

  // Pagination
  if (options.take) {
    sql += ` LIMIT $${paramIndex++}`;
    values.push(options.take);
  }
  if (options.skip) {
    sql += ` OFFSET $${paramIndex++}`;
    values.push(options.skip);
  }

  const result = await query(sql, values);

  // Transform rows to include trainer as nested object
  const classes = result.rows.map(row => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    titleAr: row.title_ar,
    description: row.description,
    descriptionAr: row.description_ar,
    category: row.category,
    subCategory: row.sub_category,
    categories: toCategoriesArray(row.categories, row.category),
    subCategories: toCategoriesArray(row.sub_categories, row.sub_category),
    audienceGender: row.audience_gender || 'FEMALE_ONLY',
    image: row.image,
    images: row.images || [],
    trainerId: row.trainer_id,
    coTrainerId: row.co_trainer_id ?? null,
    venue: row.venue === 'OUTSIDE' ? 'OUTSIDE' : 'KITCHEN',
    price: parseFloat(row.price || 0),
    currency: row.currency,
    seatsTotal: row.seats_total,
    seatsAvailable: row.seats_available,
    durationMinutes: row.duration_minutes,
    status: row.status,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    finalRecipeTitle: row.final_recipe_title,
    finalRecipePdf: row.final_recipe_pdf,
    finalRecipeBrief: row.final_recipe_brief,
    finalRecipeTitleAr: row.final_recipe_title_ar,
    finalRecipePdfAr: row.final_recipe_pdf_ar,
    finalRecipeBriefAr: row.final_recipe_brief_ar,
    finalRecipeVisibleToCustomers: Boolean(row.final_recipe_visible_to_customers),
    finalRecipePublishedAt: row.final_recipe_published_at,
    trainerSharePercent: parseFloat(row.trainer_share_percent || 0),
    noonSharePercent: parseFloat(row.noon_share_percent || 0),
    expenseSharePercent: parseFloat(row.expense_share_percent || 0),
    minimumAge: row.minimum_age != null ? Number(row.minimum_age) : null,
    maximumAge: row.maximum_age != null ? Number(row.maximum_age) : null,
    showMinimumAge: Boolean(row.show_minimum_age),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    startDateTime: row.start_date_time || null,
    endDateTime: row.end_date_time || null,
    registrationCloseAt: row.registration_close_at || null,
    scheduleSessions: Array.isArray(row.schedule_sessions) ? row.schedule_sessions : [],
    seatsBooked: row.seats_booked ?? 0,
    registrationMessage: row.registration_message ?? null,
    registrationMessageAr: row.registration_message_ar ?? null,
    closedAt: row.closed_at,
    closedByUserId: row.closed_by_user_id,
    trainer: row.u_trainer_id ? {
      id: row.u_trainer_id,
      fullName: row.trainer_full_name,
      profileImage: row.trainer_profile_image,
      email: row.trainer_email,
    } : null,
    coTrainer: row.u_co_trainer_id ? {
      id: row.u_co_trainer_id,
      fullName: row.co_trainer_full_name,
      profileImage: row.co_trainer_profile_image,
      email: row.co_trainer_email,
    } : null,
  }));

  return { classes, total };
}

/**
 * Find unique class by slug or ID
 */
export async function findUniqueClass(
  where: { slug?: string; id?: string; status?: ClassStatus },
  include?: { trainer?: boolean; reviews?: boolean }
): Promise<Record<string, unknown> | null> {
  await ensureClassFinanceSchema();
  await ensureClassMinimumAgeSchema();
  await ensureRecipeManagementSchema();
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (where.slug) {
    conditions.push(`c.slug = $${paramIndex++}`);
    values.push(where.slug);
  }
  if (where.id) {
    conditions.push(`c.id = $${paramIndex++}`);
    values.push(where.id);
  }
  if (where.status) {
    conditions.push(`c.status = $${paramIndex++}`);
    values.push(where.status);
  }

  if (conditions.length === 0) return null;

  const result = await query(
    `SELECT c.*,
            u.id as u_trainer_id, u.full_name as trainer_full_name, 
            u.profile_image as trainer_profile_image, u.email as trainer_email,
            cu.id as u_co_trainer_id, cu.full_name as co_trainer_full_name,
            cu.profile_image as co_trainer_profile_image, cu.email as co_trainer_email
     FROM classes c
     LEFT JOIN users u ON c.trainer_id = u.id
     LEFT JOIN users cu ON c.co_trainer_id = cu.id
     WHERE ${conditions.join(' AND ')}`,
    values
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const classData: Record<string, unknown> = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    titleAr: row.title_ar,
    description: row.description,
    descriptionAr: row.description_ar,
    category: row.category,
    subCategory: row.sub_category,
    categories: toCategoriesArray(row.categories, row.category),
    subCategories: toCategoriesArray(row.sub_categories, row.sub_category),
    audienceGender: row.audience_gender || 'FEMALE_ONLY',
    image: row.image,
    images: row.images || [],
    trainerId: row.trainer_id,
    coTrainerId: row.co_trainer_id ?? null,
    venue: row.venue === 'OUTSIDE' ? 'OUTSIDE' : 'KITCHEN',
    price: parseFloat(row.price || 0),
    currency: row.currency,
    seatsTotal: row.seats_total,
    seatsAvailable: row.seats_available,
    durationMinutes: row.duration_minutes,
    status: row.status,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    finalRecipeTitle: row.final_recipe_title,
    finalRecipePdf: row.final_recipe_pdf,
    finalRecipeBrief: row.final_recipe_brief,
    finalRecipeTitleAr: row.final_recipe_title_ar,
    finalRecipePdfAr: row.final_recipe_pdf_ar,
    finalRecipeBriefAr: row.final_recipe_brief_ar,
    finalRecipeVisibleToCustomers: Boolean(row.final_recipe_visible_to_customers),
    finalRecipePublishedAt: row.final_recipe_published_at,
    trainerSharePercent: parseFloat(row.trainer_share_percent || 0),
    noonSharePercent: parseFloat(row.noon_share_percent || 0),
    expenseSharePercent: parseFloat(row.expense_share_percent || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    closedAt: row.closed_at,
    closedByUserId: row.closed_by_user_id,
    minimumAge: row.minimum_age != null ? Number(row.minimum_age) : null,
    maximumAge: row.maximum_age != null ? Number(row.maximum_age) : null,
    showMinimumAge: Boolean(row.show_minimum_age),
    startDateTime: row.start_date_time || null,
    endDateTime: row.end_date_time || null,
    registrationCloseAt: row.registration_close_at || null,
    scheduleSessions: Array.isArray(row.schedule_sessions) ? row.schedule_sessions : [],
    seatsBooked: row.seats_booked ?? 0,
    registrationMessage: row.registration_message ?? null,
    registrationMessageAr: row.registration_message_ar ?? null,
  };

  if (include?.trainer) {
    classData.trainer = row.u_trainer_id ? {
      id: row.u_trainer_id,
      fullName: row.trainer_full_name,
      profileImage: row.trainer_profile_image,
      email: row.trainer_email,
    } : null;
    classData.coTrainer = row.u_co_trainer_id ? {
      id: row.u_co_trainer_id,
      fullName: row.co_trainer_full_name,
      profileImage: row.co_trainer_profile_image,
      email: row.co_trainer_email,
    } : null;
  }

  if (include?.reviews) {
    const reviewsResult = await query(
      `SELECT * FROM reviews WHERE class_id = $1 AND is_visible = true ORDER BY created_at DESC`,
      [row.id]
    );
    classData.reviews = reviewsResult.rows.map(r => ({
      id: r.id,
      classId: r.class_id,
      userId: r.user_id,
      rating: r.rating,
      comment: r.comment,
      isVerified: r.is_verified,
      isVisible: r.is_visible,
      createdAt: r.created_at,
    }));
  }

  return classData;
}

/**
 * Create a new class
 */
export async function createClass(data: {
  slug: string;
  title: string;
  titleAr?: string;
  description: string;
  descriptionAr?: string;
  category: ClassCategory;
  subCategory: ClassSubCategory;
  categories?: ClassCategoryType[];
  subCategories?: ClassSubCategory[];
  trainerId: string | null;
  coTrainerId?: string | null;
  venue?: ClassVenue;
  renewedFromClassId?: string | null;
  price: number;
  seatsTotal: number;
  durationMinutes: number;
  image?: string;
  images?: string[];
  status?: ClassStatus;
  currency?: string;
  metaTitle?: string;
  metaDescription?: string;
  finalRecipeTitle?: string;
  finalRecipePdf?: string;
  finalRecipeBrief?: string;
  finalRecipeTitleAr?: string;
  finalRecipePdfAr?: string;
  finalRecipeBriefAr?: string;
  finalRecipeVisibleToCustomers?: boolean;
  trainerSharePercent?: number;
  noonSharePercent?: number;
  expenseSharePercent?: number;
  minimumAge?: number | null;
  maximumAge?: number | null;
  showMinimumAge?: boolean;
  startDateTime?: Date | string | null;
  endDateTime?: Date | string | null;
  registrationCloseAt?: Date | string | null;
  audienceGender?: ClassAudienceGender;
  scheduleSessions?: Array<{ startDateTime: string; endDateTime: string }>;
  registrationMessage?: string | null;
  registrationMessageAr?: string | null;
}): Promise<Record<string, unknown>> {
  await ensureClassFinanceSchema();
  await ensureClassMinimumAgeSchema();
  await ensureRecipeManagementSchema();
  const id = generateUUID();
  const now = new Date();

  const result = await query(
    `INSERT INTO classes (
      id, slug, title, title_ar, description, description_ar, category, sub_category,
      categories, sub_categories,
      audience_gender,
      trainer_id, co_trainer_id, venue, renewed_from_class_id, price, currency, seats_total, seats_available, duration_minutes,
      image, images, status, meta_title, meta_description,
      final_recipe_title, final_recipe_pdf, final_recipe_brief,
      final_recipe_title_ar, final_recipe_pdf_ar, final_recipe_brief_ar,
      final_recipe_visible_to_customers, final_recipe_published_at,
      trainer_share_percent, noon_share_percent, expense_share_percent,
      minimum_age, maximum_age, show_minimum_age,
      start_date_time, end_date_time, registration_close_at, schedule_sessions,
      registration_message, registration_message_ar,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43::jsonb, $44, $45, $46, $47)
      RETURNING *`,
    [
      id,
      data.slug,
      data.title,
      data.titleAr || null,
      data.description,
      data.descriptionAr || null,
      data.category,
      data.subCategory,
      data.categories && data.categories.length > 0 ? data.categories : [data.category],
      data.subCategories && data.subCategories.length > 0 ? data.subCategories : [data.subCategory],
      data.audienceGender || 'FEMALE_ONLY',
      data.trainerId,
      data.coTrainerId ?? null,
      data.venue === 'OUTSIDE' ? 'OUTSIDE' : 'KITCHEN',
      data.renewedFromClassId ?? null,
      data.price,
      data.currency || 'OMR',
      data.seatsTotal,
      data.seatsTotal, // seats_available starts equal to seats_total
      data.durationMinutes,
      data.image || null,
      data.images || [],
      data.status || 'DRAFT',
      data.metaTitle || null,
      data.metaDescription || null,
      data.finalRecipeTitle || null,
      data.finalRecipePdf || null,
      data.finalRecipeBrief || null,
      data.finalRecipeTitleAr || null,
      data.finalRecipePdfAr || null,
      data.finalRecipeBriefAr || null,
      data.finalRecipeVisibleToCustomers ?? false,
      data.finalRecipeVisibleToCustomers ? now : null,
      data.trainerSharePercent ?? 0,
      data.noonSharePercent ?? 0,
      data.expenseSharePercent ?? 0,
      data.minimumAge ?? null,
      data.maximumAge ?? null,
      data.showMinimumAge ?? false,
      data.startDateTime ? new Date(data.startDateTime as string) : null,
      data.endDateTime ? new Date(data.endDateTime as string) : null,
      data.registrationCloseAt ? new Date(data.registrationCloseAt as string) : null,
      JSON.stringify(data.scheduleSessions ?? []),
      data.registrationMessage ?? null,
      data.registrationMessageAr ?? null,
      now,
      now,
    ]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    titleAr: row.title_ar,
    description: row.description,
    descriptionAr: row.description_ar,
    category: row.category,
    subCategory: row.sub_category,
    categories: toCategoriesArray(row.categories, row.category),
    subCategories: toCategoriesArray(row.sub_categories, row.sub_category),
    audienceGender: row.audience_gender || 'FEMALE_ONLY',
    trainerId: row.trainer_id,
    coTrainerId: row.co_trainer_id ?? null,
    venue: row.venue === 'OUTSIDE' ? 'OUTSIDE' : 'KITCHEN',
    price: parseFloat(row.price),
    currency: row.currency,
    seatsTotal: row.seats_total,
    seatsAvailable: row.seats_available,
    durationMinutes: row.duration_minutes,
    image: row.image,
    images: row.images,
    status: row.status,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    finalRecipeTitle: row.final_recipe_title,
    finalRecipePdf: row.final_recipe_pdf,
    finalRecipeBrief: row.final_recipe_brief,
    finalRecipeTitleAr: row.final_recipe_title_ar,
    finalRecipePdfAr: row.final_recipe_pdf_ar,
    finalRecipeBriefAr: row.final_recipe_brief_ar,
    finalRecipeVisibleToCustomers: Boolean(row.final_recipe_visible_to_customers),
    finalRecipePublishedAt: row.final_recipe_published_at,
    trainerSharePercent: parseFloat(row.trainer_share_percent || 0),
    noonSharePercent: parseFloat(row.noon_share_percent || 0),
    expenseSharePercent: parseFloat(row.expense_share_percent || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    closedAt: row.closed_at,
    closedByUserId: row.closed_by_user_id,
    minimumAge: row.minimum_age != null ? Number(row.minimum_age) : null,
    maximumAge: row.maximum_age != null ? Number(row.maximum_age) : null,
    showMinimumAge: Boolean(row.show_minimum_age),
    startDateTime: row.start_date_time || null,
    endDateTime: row.end_date_time || null,
    registrationCloseAt: row.registration_close_at || null,
    scheduleSessions: Array.isArray(row.schedule_sessions) ? row.schedule_sessions : [],
    seatsBooked: row.seats_booked ?? 0,
    registrationMessage: row.registration_message ?? null,
    registrationMessageAr: row.registration_message_ar ?? null,
  };
}

/**
 * Update a class
 */
export async function updateClass(
  id: string,
  data: Partial<{
    title: string;
    titleAr: string;
    description: string;
    descriptionAr: string;
    category: ClassCategory;
    subCategory: ClassSubCategory;
    categories: ClassCategoryType[];
    subCategories: ClassSubCategory[];
    trainerId: string;
    coTrainerId: string | null;
    venue: ClassVenue;
    price: number;
    seatsTotal: number;
    seatsAvailable: number;
    durationMinutes: number;
    image: string;
    images: string[];
    status: ClassStatus;
    currency: string;
    metaTitle: string;
    metaDescription: string;
    finalRecipeTitle: string | null;
    finalRecipePdf: string | null;
    finalRecipeBrief: string | null;
    finalRecipeTitleAr: string | null;
    finalRecipePdfAr: string | null;
    finalRecipeBriefAr: string | null;
    finalRecipeVisibleToCustomers: boolean;
    finalRecipePublishedAt: Date | null;
    publishedAt: Date | null;
    trainerSharePercent: number;
    noonSharePercent: number;
    expenseSharePercent: number;
    closedAt: Date | null;
    closedByUserId: string | null;
    minimumAge: number | null;
    maximumAge: number | null;
    showMinimumAge: boolean;
    startDateTime: Date | string | null;
    endDateTime: Date | string | null;
    registrationCloseAt: Date | string | null;
    audienceGender: ClassAudienceGender;
    seatsBooked: number;
    scheduleSessions: Array<{ startDateTime: string; endDateTime: string }>;
    registrationMessage: string | null;
    registrationMessageAr: string | null;
  }>
): Promise<Record<string, unknown> | null> {
  await ensureClassFinanceSchema();
  await ensureClassMinimumAgeSchema();
  await ensureRecipeManagementSchema();
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const fieldMap: Record<string, string> = {
    title: 'title',
    titleAr: 'title_ar',
    description: 'description',
    descriptionAr: 'description_ar',
    category: 'category',
    subCategory: 'sub_category',
    categories: 'categories',
    subCategories: 'sub_categories',
    audienceGender: 'audience_gender',
    trainerId: 'trainer_id',
    coTrainerId: 'co_trainer_id',
    venue: 'venue',
    price: 'price',
    seatsTotal: 'seats_total',
    seatsAvailable: 'seats_available',
    durationMinutes: 'duration_minutes',
    image: 'image',
    images: 'images',
    status: 'status',
    currency: 'currency',
    metaTitle: 'meta_title',
    metaDescription: 'meta_description',
    finalRecipeTitle: 'final_recipe_title',
    finalRecipePdf: 'final_recipe_pdf',
    finalRecipeBrief: 'final_recipe_brief',
    finalRecipeTitleAr: 'final_recipe_title_ar',
    finalRecipePdfAr: 'final_recipe_pdf_ar',
    finalRecipeBriefAr: 'final_recipe_brief_ar',
    finalRecipeVisibleToCustomers: 'final_recipe_visible_to_customers',
    finalRecipePublishedAt: 'final_recipe_published_at',
    publishedAt: 'published_at',
    trainerSharePercent: 'trainer_share_percent',
    noonSharePercent: 'noon_share_percent',
    expenseSharePercent: 'expense_share_percent',
    closedAt: 'closed_at',
    closedByUserId: 'closed_by_user_id',
    minimumAge: 'minimum_age',
    maximumAge: 'maximum_age',
    showMinimumAge: 'show_minimum_age',
    startDateTime: 'start_date_time',
    endDateTime: 'end_date_time',
    registrationCloseAt: 'registration_close_at',
    scheduleSessions: 'schedule_sessions',
    seatsBooked: 'seats_booked',
    registrationMessage: 'registration_message',
    registrationMessageAr: 'registration_message_ar',
  };

  for (const [key, dbField] of Object.entries(fieldMap)) {
    if ((data as Record<string, unknown>)[key] !== undefined) {
      updates.push(`${dbField} = $${paramIndex++}${key === 'scheduleSessions' ? '::jsonb' : ''}`);
      const value = (data as Record<string, unknown>)[key];
      values.push(key === 'scheduleSessions' ? JSON.stringify(value ?? []) : value);
    }
  }

  if (updates.length === 0) {
    return await findUniqueClass({ id });
  }

  updates.push(`updated_at = $${paramIndex++}`);
  values.push(new Date());
  values.push(id);

  const result = await query(
    `UPDATE classes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    titleAr: row.title_ar,
    description: row.description,
    descriptionAr: row.description_ar,
    category: row.category,
    subCategory: row.sub_category,
    categories: toCategoriesArray(row.categories, row.category),
    subCategories: toCategoriesArray(row.sub_categories, row.sub_category),
    audienceGender: row.audience_gender || 'MIXED',
    trainerId: row.trainer_id,
    coTrainerId: row.co_trainer_id ?? null,
    venue: row.venue === 'OUTSIDE' ? 'OUTSIDE' : 'KITCHEN',
    price: parseFloat(row.price),
    currency: row.currency,
    seatsTotal: row.seats_total,
    seatsAvailable: row.seats_available,
    durationMinutes: row.duration_minutes,
    image: row.image,
    images: row.images,
    status: row.status,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    trainerSharePercent: parseFloat(row.trainer_share_percent || 0),
    noonSharePercent: parseFloat(row.noon_share_percent || 0),
    expenseSharePercent: parseFloat(row.expense_share_percent || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    closedAt: row.closed_at,
    closedByUserId: row.closed_by_user_id,
    minimumAge: row.minimum_age != null ? Number(row.minimum_age) : null,
    maximumAge: row.maximum_age != null ? Number(row.maximum_age) : null,
    showMinimumAge: Boolean(row.show_minimum_age),
    startDateTime: row.start_date_time || null,
    endDateTime: row.end_date_time || null,
    registrationCloseAt: row.registration_close_at || null,
    scheduleSessions: Array.isArray(row.schedule_sessions) ? row.schedule_sessions : [],
    seatsBooked: row.seats_booked ?? 0,
    registrationMessage: row.registration_message ?? null,
    registrationMessageAr: row.registration_message_ar ?? null,
  };
}

/**
 * Delete a class
 */
export async function deleteClass(id: string): Promise<boolean> {
  const result = await query(`DELETE FROM classes WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Count bookings for a class
 */
export async function countClassBookings(classId: string): Promise<number> {
  const result = await query(
    `SELECT COUNT(*)::int as count FROM bookings WHERE class_id = $1`,
    [classId]
  );
  return result.rows[0]?.count ?? 0;
}

export type UserScheduleConflict = {
  classId: string;
  slug: string;
  title: string;
  titleAr: string | null;
  startDateTime: Date;
  endDateTime: Date | null;
};

/**
 * Find an active booking of the user for another workshop whose time range
 * overlaps with the target class. Used to warn about double bookings.
 */
export async function findUserScheduleConflict(
  userId: string,
  classId: string
): Promise<UserScheduleConflict | null> {
  const result = await query(
    `SELECT existing.id, existing.slug, existing.title, existing.title_ar,
            existing.start_date_time, existing.end_date_time
     FROM bookings b
     INNER JOIN classes existing ON existing.id = b.class_id
     INNER JOIN classes target ON target.id = $2
     WHERE b.user_id = $1
       AND b.class_id <> $2
       AND b.status IN ('PENDING', 'CONFIRMED')
       AND b.payment_status IN ('PENDING', 'PAID')
       AND existing.start_date_time IS NOT NULL
       AND target.start_date_time IS NOT NULL
       AND existing.start_date_time
           < COALESCE(target.end_date_time, target.start_date_time + make_interval(mins => GREATEST(COALESCE(target.duration_minutes, 60), 30)))
       AND COALESCE(existing.end_date_time, existing.start_date_time + make_interval(mins => GREATEST(COALESCE(existing.duration_minutes, 60), 30)))
           > target.start_date_time
     ORDER BY existing.start_date_time ASC
     LIMIT 1`,
    [userId, classId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    classId: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    titleAr: row.title_ar ? String(row.title_ar) : null,
    startDateTime: new Date(row.start_date_time),
    endDateTime: row.end_date_time ? new Date(row.end_date_time) : null,
  };
}

/**
 * Find class by slug (simplified for site pages)
 */
export async function findClassBySlug(slug: string): Promise<{
  id: string;
  slug: string;
  title: string;
  titleAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  category: string;
  subCategory: string | null;
  categories: string[];
  subCategories: string[];
  audienceGender: ClassAudienceGender;
  image: string | null;
  images: string[];
  trainerId: string | null;
  coTrainerId: string | null;
  venue: ClassVenue;
  price: number;
  currency: string;
  seatsTotal: number;
  seatsBooked: number;
  registrationMessage: string | null;
  registrationMessageAr: string | null;
  durationMinutes: number;
  status: string;
  minimumAge: number | null;
  maximumAge: number | null;
  showMinimumAge: boolean;
  startDateTime: Date | null;
  endDateTime: Date | null;
  registrationCloseAt: Date | null;
  scheduleSessions: Array<{ startDateTime: string; endDateTime: string }>;
} | null> {
  await ensureClassMinimumAgeSchema();
  const result = await query(
    `SELECT * FROM classes WHERE slug = $1`,
    [slug]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    titleAr: row.title_ar,
    description: row.description,
    descriptionAr: row.description_ar,
    category: row.category,
    subCategory: row.sub_category,
    categories: toCategoriesArray(row.categories, row.category),
    subCategories: toCategoriesArray(row.sub_categories, row.sub_category),
    audienceGender: row.audience_gender || 'MIXED',
    image: row.image,
    images: row.images || [],
    trainerId: row.trainer_id,
    coTrainerId: row.co_trainer_id ?? null,
    venue: (row.venue === 'OUTSIDE' ? 'OUTSIDE' : 'KITCHEN') as ClassVenue,
    price: parseFloat(row.price || 0),
    currency: row.currency,
    seatsTotal: row.seats_total,
    seatsBooked: row.seats_booked ?? 0,
    registrationMessage: row.registration_message ?? null,
    registrationMessageAr: row.registration_message_ar ?? null,
    durationMinutes: row.duration_minutes,
    status: row.status,
    minimumAge: row.minimum_age != null ? Number(row.minimum_age) : null,
    maximumAge: row.maximum_age != null ? Number(row.maximum_age) : null,
    showMinimumAge: Boolean(row.show_minimum_age),
    startDateTime: row.start_date_time || null,
    endDateTime: row.end_date_time || null,
    registrationCloseAt: row.registration_close_at || null,
    scheduleSessions: Array.isArray(row.schedule_sessions) ? row.schedule_sessions : [],
  };
}

/**
 * Find reviews for a class
 */
export async function findClassReviews(classId: string): Promise<{
  id: string;
  rating: number | null;
  comment: string | null;
  createdAt: Date;
  user?: { fullName: string } | null;
}[]> {
  const result = await query(
    `SELECT r.*, u.full_name as user_full_name
     FROM reviews r
     LEFT JOIN users u ON r.user_id = u.id
     WHERE r.class_id = $1 AND r.is_visible = true
     ORDER BY r.created_at DESC`,
    [classId]
  );

  return result.rows.map(row => ({
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
    user: row.user_full_name ? { fullName: row.user_full_name } : null,
  }));
}

export async function getClassReviewSummary(classId: string): Promise<{
  averageRating: number | null;
  reviewsCount: number;
}> {
  const result = await query(
    `SELECT
       COUNT(*)::int AS reviews_count,
       ROUND(AVG(rating)::numeric, 2)::float8 AS average_rating
     FROM reviews
     WHERE class_id = $1
       AND is_visible = true`,
    [classId]
  );

  const row = result.rows[0];
  return {
    averageRating: row?.average_rating == null ? null : Number(row.average_rating),
    reviewsCount: Number(row?.reviews_count ?? 0),
  };
}

export async function getClassReviewForUser(classId: string, userId: string): Promise<{
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  is_verified: boolean;
  created_at: Date;
  user_full_name: string | null;
} | null> {
  const result = await query(
    `SELECT
       r.id,
       r.user_id,
       r.rating,
       r.comment,
       r.is_verified,
       r.created_at,
       u.full_name AS user_full_name
     FROM reviews r
     LEFT JOIN users u ON u.id = r.user_id
     WHERE r.class_id = $1
       AND r.user_id = $2
     LIMIT 1`,
    [classId, userId]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    user_id: row.user_id,
    rating: Number(row.rating ?? 0),
    comment: row.comment ?? null,
    is_verified: Boolean(row.is_verified),
    created_at: row.created_at,
    user_full_name: row.user_full_name ?? null,
  };
}

export async function hasUserBookedClass(userId: string, classId: string): Promise<boolean> {
  const result = await query(
    `SELECT 1
     FROM bookings
     WHERE user_id = $1
       AND class_id = $2
       AND status = 'CONFIRMED'
       AND payment_status = 'PAID'
     LIMIT 1`,
    [userId, classId]
  );

  return result.rows.length > 0;
}

export async function createOrUpdateClassReview(input: {
  classId: string;
  userId: string;
  rating: number;
  comment?: string | null;
}): Promise<{
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  is_verified: boolean;
  created_at: Date;
  user_full_name: string | null;
  summary: {
    averageRating: number | null;
    reviewsCount: number;
  };
}> {
  const normalizedRating = Math.trunc(Number(input.rating));
  if (!Number.isFinite(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    throw new Error('Rating must be between 1 and 5.');
  }

  const classResult = await query(
    `SELECT id FROM classes WHERE id = $1 LIMIT 1`,
    [input.classId]
  );

  if (classResult.rows.length === 0) {
    throw new Error('Class not found.');
  }

  const canReview = await hasUserBookedClass(input.userId, input.classId);
  if (!canReview) {
    throw new Error('Only customers with a confirmed paid booking can review this workshop.');
  }

  const comment = typeof input.comment === 'string' ? input.comment.trim() : '';

  const existingReviewResult = await query(
    `SELECT id
     FROM reviews
     WHERE user_id = $1
       AND class_id = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [input.userId, input.classId]
  );

  const result = existingReviewResult.rows[0]
    ? await query(
      `UPDATE reviews
       SET rating = $2,
         comment = $3,
         is_verified = true,
         is_visible = true,
         updated_at = NOW()
       WHERE id = $1
       RETURNING id, user_id, rating, comment, is_verified, created_at`,
      [existingReviewResult.rows[0].id, normalizedRating, comment || null]
      )
    : await query(
        `INSERT INTO reviews (
           user_id, class_id, rating, comment, is_verified, is_visible, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, true, true, NOW(), NOW())
         RETURNING id, user_id, rating, comment, is_verified, created_at`,
        [input.userId, input.classId, normalizedRating, comment || null]
      );

  const row = result.rows[0];
  const userResult = await query(
    `SELECT full_name FROM users WHERE id = $1 LIMIT 1`,
    [input.userId]
  );
  const summary = await getClassReviewSummary(input.classId);

  return {
    id: row.id,
    user_id: row.user_id,
    rating: Number(row.rating ?? 0),
    comment: row.comment ?? null,
    is_verified: Boolean(row.is_verified),
    created_at: row.created_at,
    user_full_name: userResult.rows[0]?.full_name ?? null,
    summary,
  };
}

/**
 * Get bookings by user ID
 */
export async function getBookingsByUserId(userId: string) {
  await ensureRecipeManagementSchema();
  const result = await query(
    `SELECT
      b.*,
      c.title,
      c.title_ar,
      c.start_date_time,
      c.end_date_time,
      CASE
        WHEN c.final_recipe_visible_to_customers = true THEN COALESCE(c.final_recipe_pdf, c.recipe_pdf)
        ELSE NULL
      END AS customer_recipe_pdf,
      CASE
        WHEN c.final_recipe_visible_to_customers = true THEN COALESCE(c.final_recipe_pdf_ar, c.final_recipe_pdf, c.recipe_pdf)
        ELSE NULL
      END AS customer_recipe_pdf_ar,
      CASE
        WHEN c.final_recipe_visible_to_customers = true THEN c.final_recipe_title
        ELSE NULL
      END AS customer_recipe_title,
      CASE
        WHEN c.final_recipe_visible_to_customers = true THEN COALESCE(c.final_recipe_title_ar, c.final_recipe_title)
        ELSE NULL
      END AS customer_recipe_title_ar,
      CASE
        WHEN c.final_recipe_visible_to_customers = true THEN c.final_recipe_brief
        ELSE NULL
      END AS customer_recipe_brief,
      CASE
        WHEN c.final_recipe_visible_to_customers = true THEN COALESCE(c.final_recipe_brief_ar, c.final_recipe_brief)
        ELSE NULL
      END AS customer_recipe_brief_ar
     FROM bookings b
     LEFT JOIN classes c ON b.class_id = c.id
     WHERE b.user_id = $1
     ORDER BY b.created_at DESC`,
    [userId]
  );

  return result.rows.map((row) => ({
    ...row,
    total_amount: row.total_amount !== null && row.total_amount !== undefined ? Number(row.total_amount) : null,
  }));
}

export async function getBookingByIdForUser(userId: string, bookingId: string) {
  await ensureRecipeManagementSchema();
  const result = await query(
    `SELECT
      b.*,
      c.title,
      c.title_ar,
      c.slug,
      c.start_date_time,
      c.end_date_time,
      CASE
        WHEN c.final_recipe_visible_to_customers = true THEN COALESCE(c.final_recipe_pdf, c.recipe_pdf)
        ELSE NULL
      END AS customer_recipe_pdf,
      CASE
        WHEN c.final_recipe_visible_to_customers = true THEN COALESCE(c.final_recipe_pdf_ar, c.final_recipe_pdf, c.recipe_pdf)
        ELSE NULL
      END AS customer_recipe_pdf_ar,
      CASE
        WHEN c.final_recipe_visible_to_customers = true THEN c.final_recipe_title
        ELSE NULL
      END AS customer_recipe_title,
      CASE
        WHEN c.final_recipe_visible_to_customers = true THEN COALESCE(c.final_recipe_title_ar, c.final_recipe_title)
        ELSE NULL
      END AS customer_recipe_title_ar,
      CASE
        WHEN c.final_recipe_visible_to_customers = true THEN c.final_recipe_brief
        ELSE NULL
      END AS customer_recipe_brief,
      CASE
        WHEN c.final_recipe_visible_to_customers = true THEN COALESCE(c.final_recipe_brief_ar, c.final_recipe_brief)
        ELSE NULL
      END AS customer_recipe_brief_ar
     FROM bookings b
     LEFT JOIN classes c ON b.class_id = c.id
     WHERE b.user_id = $1 AND b.id = $2
     LIMIT 1`,
    [userId, bookingId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    ...row,
    total_amount: row.total_amount !== null && row.total_amount !== undefined ? Number(row.total_amount) : null,
  };
}

export async function getVisibleRecipesByUserId(userId: string) {
  await ensureRecipeManagementSchema();

  const result = await query(
    `SELECT DISTINCT ON (b.class_id)
      c.id AS class_id,
      c.slug,
      c.title,
      c.title_ar,
      c.image,
      c.start_date_time,
      c.final_recipe_title,
      c.final_recipe_pdf,
      c.final_recipe_brief,
      c.final_recipe_title_ar,
      c.final_recipe_pdf_ar,
      c.final_recipe_brief_ar,
      c.final_recipe_published_at,
      b.id AS booking_id,
      b.booking_number,
      b.created_at AS booking_created_at
     FROM bookings b
     INNER JOIN classes c ON c.id = b.class_id
     WHERE b.user_id = $1
       AND b.status <> 'CANCELLED'
       AND c.final_recipe_visible_to_customers = true
       AND (
         c.final_recipe_pdf IS NOT NULL
         OR c.final_recipe_brief IS NOT NULL
         OR c.final_recipe_pdf_ar IS NOT NULL
         OR c.final_recipe_brief_ar IS NOT NULL
       )
     ORDER BY b.class_id, c.start_date_time DESC NULLS LAST, b.created_at DESC`,
    [userId]
  );

  return result.rows.map((row) => ({
    classId: row.class_id as string,
    bookingId: row.booking_id as string,
    bookingNumber: row.booking_number as string,
    slug: row.slug as string,
    classTitle: row.title as string,
    classTitleAr: (row.title_ar as string | null) ?? null,
    classImage: (row.image as string | null) ?? null,
    startDateTime: (row.start_date_time as string | Date | null) ?? null,
    finalRecipeTitle: (row.final_recipe_title as string | null) ?? null,
    finalRecipePdf: (row.final_recipe_pdf as string | null) ?? null,
    finalRecipeBrief: (row.final_recipe_brief as string | null) ?? null,
    finalRecipeTitleAr: (row.final_recipe_title_ar as string | null) ?? null,
    finalRecipePdfAr: (row.final_recipe_pdf_ar as string | null) ?? null,
    finalRecipeBriefAr: (row.final_recipe_brief_ar as string | null) ?? null,
    finalRecipePublishedAt: (row.final_recipe_published_at as string | Date | null) ?? null,
    bookingCreatedAt: row.booking_created_at as string | Date,
  }));
}

// Re-export ClassCategory for convenience
export { ClassCategory };
