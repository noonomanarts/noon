/**
 * Database queries for classes
 */
import { query } from "./pool";
import { generateUUID } from "./uuid";
import type { ClassCategory as ClassCategoryType, ClassSubCategory, ClassStatus, ClassPublic } from "./types";
import { ClassCategory } from "./types";
import { ensureClassFinanceSchema } from "./classFinance";

let classMinimumAgeSchemaReady: Promise<void> | null = null;

async function ensureClassMinimumAgeSchema(): Promise<void> {
  if (classMinimumAgeSchemaReady) {
    return classMinimumAgeSchemaReady;
  }

  classMinimumAgeSchemaReady = (async () => {
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS minimum_age INTEGER DEFAULT NULL`);
    await query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS show_minimum_age BOOLEAN NOT NULL DEFAULT FALSE`);
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
}

/**
 * Find many classes with filters (simplified for site pages)
 */
export async function findManyClasses(options: {
  category?: ClassCategoryType;
  status?: ClassStatus;
  trainerId?: string;
  limit?: number;
}): Promise<ClassWithTrainer[]> {
  await ensureClassFinanceSchema();
  await ensureClassMinimumAgeSchema();
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (options.category) {
    conditions.push(`c.category = $${paramIndex++}`);
    values.push(options.category);
  }
  if (options.status) {
    conditions.push(`c.status = $${paramIndex++}`);
    values.push(options.status);
  }
  if (options.trainerId) {
    conditions.push(`c.trainer_id = $${paramIndex++}`);
    values.push(options.trainerId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  let sql = `
    SELECT c.*,
           u.id as u_trainer_id, u.full_name as trainer_full_name, u.profile_image as trainer_profile_image, u.email as trainer_email
    FROM classes c
    LEFT JOIN users u ON c.trainer_id = u.id
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
    image: row.image,
    images: row.images || [],
    trainerId: row.trainer_id,
    price: parseFloat(row.price || 0),
    currency: row.currency,
    seatsTotal: row.seats_total,
    seatsAvailable: row.seats_available,
    durationMinutes: row.duration_minutes,
    status: row.status,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    trainerSharePercent: parseFloat(row.trainer_share_percent || 0),
    noonSharePercent: parseFloat(row.noon_share_percent || 0),
    expenseSharePercent: parseFloat(row.expense_share_percent || 0),
    startDateTime: row.start_date_time || null,
    endDateTime: row.end_date_time || null,
    seatsBooked: row.seats_booked ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    trainer: row.u_trainer_id ? {
      id: row.u_trainer_id,
      fullName: row.trainer_full_name,
      profileImage: row.trainer_profile_image,
      email: row.trainer_email,
    } : null,
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
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (options.where?.category) {
    conditions.push(`c.category = $${paramIndex++}`);
    values.push(options.where.category);
  }
  if (options.where?.status) {
    conditions.push(`c.status = $${paramIndex++}`);
    values.push(options.where.status);
  }
  if (options.where?.trainerId) {
    conditions.push(`c.trainer_id = $${paramIndex++}`);
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
           u.id as u_trainer_id, u.full_name as trainer_full_name, u.profile_image as trainer_profile_image, u.email as trainer_email
    FROM classes c
    LEFT JOIN users u ON c.trainer_id = u.id
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
    image: row.image,
    images: row.images || [],
    trainerId: row.trainer_id,
    price: parseFloat(row.price || 0),
    currency: row.currency,
    seatsTotal: row.seats_total,
    seatsAvailable: row.seats_available,
    durationMinutes: row.duration_minutes,
    status: row.status,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    trainerSharePercent: parseFloat(row.trainer_share_percent || 0),
    noonSharePercent: parseFloat(row.noon_share_percent || 0),
    expenseSharePercent: parseFloat(row.expense_share_percent || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    startDateTime: row.start_date_time || null,
    endDateTime: row.end_date_time || null,
    seatsBooked: row.seats_booked ?? 0,
    closedAt: row.closed_at,
    closedByUserId: row.closed_by_user_id,
    trainer: row.u_trainer_id ? {
      id: row.u_trainer_id,
      fullName: row.trainer_full_name,
      profileImage: row.trainer_profile_image,
      email: row.trainer_email,
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
            u.profile_image as trainer_profile_image, u.email as trainer_email
     FROM classes c
     LEFT JOIN users u ON c.trainer_id = u.id
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
    image: row.image,
    images: row.images || [],
    trainerId: row.trainer_id,
    price: parseFloat(row.price || 0),
    currency: row.currency,
    seatsTotal: row.seats_total,
    seatsAvailable: row.seats_available,
    durationMinutes: row.duration_minutes,
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
    showMinimumAge: Boolean(row.show_minimum_age),
    startDateTime: row.start_date_time || null,
    endDateTime: row.end_date_time || null,
    seatsBooked: row.seats_booked ?? 0,
  };

  if (include?.trainer) {
    classData.trainer = row.u_trainer_id ? {
      id: row.u_trainer_id,
      fullName: row.trainer_full_name,
      profileImage: row.trainer_profile_image,
      email: row.trainer_email,
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
  trainerId: string | null;
  price: number;
  seatsTotal: number;
  durationMinutes: number;
  image?: string;
  images?: string[];
  status?: ClassStatus;
  currency?: string;
  metaTitle?: string;
  metaDescription?: string;
  trainerSharePercent?: number;
  noonSharePercent?: number;
  expenseSharePercent?: number;
  startDateTime?: Date | string | null;
  endDateTime?: Date | string | null;
}): Promise<Record<string, unknown>> {
  await ensureClassFinanceSchema();
  await ensureClassMinimumAgeSchema();
  const id = generateUUID();
  const now = new Date();

  const result = await query(
    `INSERT INTO classes (
      id, slug, title, title_ar, description, description_ar, category, sub_category,
      trainer_id, price, currency, seats_total, seats_available, duration_minutes,
      image, images, status, meta_title, meta_description,
      trainer_share_percent, noon_share_percent, expense_share_percent,
      start_date_time, end_date_time,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
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
      data.trainerId,
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
      data.trainerSharePercent ?? 0,
      data.noonSharePercent ?? 0,
      data.expenseSharePercent ?? 0,
      data.startDateTime ? new Date(data.startDateTime as string) : null,
      data.endDateTime ? new Date(data.endDateTime as string) : null,
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
    trainerId: row.trainer_id,
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
    showMinimumAge: Boolean(row.show_minimum_age),
    startDateTime: row.start_date_time || null,
    endDateTime: row.end_date_time || null,
    seatsBooked: row.seats_booked ?? 0,
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
    trainerId: string;
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
    publishedAt: Date | null;
    trainerSharePercent: number;
    noonSharePercent: number;
    expenseSharePercent: number;
    closedAt: Date | null;
    closedByUserId: string | null;
    minimumAge: number | null;
    showMinimumAge: boolean;
    startDateTime: Date | string | null;
    endDateTime: Date | string | null;
    seatsBooked: number;
  }>
): Promise<Record<string, unknown> | null> {
  await ensureClassFinanceSchema();
  await ensureClassMinimumAgeSchema();
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
    trainerId: 'trainer_id',
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
    publishedAt: 'published_at',
    trainerSharePercent: 'trainer_share_percent',
    noonSharePercent: 'noon_share_percent',
    expenseSharePercent: 'expense_share_percent',
    closedAt: 'closed_at',
    closedByUserId: 'closed_by_user_id',
    minimumAge: 'minimum_age',
    showMinimumAge: 'show_minimum_age',
    startDateTime: 'start_date_time',
    endDateTime: 'end_date_time',
    seatsBooked: 'seats_booked',
  };

  for (const [key, dbField] of Object.entries(fieldMap)) {
    if ((data as Record<string, unknown>)[key] !== undefined) {
      updates.push(`${dbField} = $${paramIndex++}`);
      values.push((data as Record<string, unknown>)[key]);
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
    trainerId: row.trainer_id,
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
    showMinimumAge: Boolean(row.show_minimum_age),
    startDateTime: row.start_date_time || null,
    endDateTime: row.end_date_time || null,
    seatsBooked: row.seats_booked ?? 0,
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
  image: string | null;
  images: string[];
  trainerId: string | null;
  price: number;
  currency: string;
  seatsTotal: number;
  seatsBooked: number;
  durationMinutes: number;
  status: string;
  minimumAge: number | null;
  showMinimumAge: boolean;
  startDateTime: Date | null;
  endDateTime: Date | null;
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
    image: row.image,
    images: row.images || [],
    trainerId: row.trainer_id,
    price: parseFloat(row.price || 0),
    currency: row.currency,
    seatsTotal: row.seats_total,
    seatsBooked: row.seats_booked ?? 0,
    durationMinutes: row.duration_minutes,
    status: row.status,
    minimumAge: row.minimum_age != null ? Number(row.minimum_age) : null,
    showMinimumAge: Boolean(row.show_minimum_age),
    startDateTime: row.start_date_time || null,
    endDateTime: row.end_date_time || null,
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

/**
 * Get bookings by user ID
 */
export async function getBookingsByUserId(userId: string) {
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
        WHEN c.final_recipe_visible_to_customers = true THEN c.final_recipe_title
        ELSE NULL
      END AS customer_recipe_title
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
        WHEN c.final_recipe_visible_to_customers = true THEN c.final_recipe_title
        ELSE NULL
      END AS customer_recipe_title,
      CASE
        WHEN c.final_recipe_visible_to_customers = true THEN c.final_recipe_brief
        ELSE NULL
      END AS customer_recipe_brief
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

// Re-export ClassCategory for convenience
export { ClassCategory };
