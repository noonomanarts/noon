/**
 * Database queries for trainers
 */
import { query } from "./pool";
import type { TrainerPublic } from "./types";

/**
 * Find trainers (users with TRAINER role)
 */
export async function findTrainers(options?: {
  activeOnly?: boolean;
}): Promise<TrainerPublic[]> {
  const conditions = [`u.role = 'TRAINER'`];
  
  if (options?.activeOnly !== false) {
    conditions.push(`u.status = 'ACTIVE'`);
  }

  const result = await query(
    `SELECT u.id, u.full_name, u.email, u.phone_number, u.profile_image,
            u.date_of_birth, u.gender, u.created_at
     FROM users u
     WHERE ${conditions.join(' AND ')}
     ORDER BY u.full_name ASC`
  );

  return result.rows.map(row => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phoneNumber: row.phone_number,
    profileImage: row.profile_image,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
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
  bio: string | null;
  expertise: string[];
  experience: number | null;
  socialLinks: Record<string, string> | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Find trainer profiles
 */
export async function findTrainerProfiles(userIds: string[]): Promise<TrainerProfilePublic[]> {
  if (userIds.length === 0) return [];

  const result = await query(
    `SELECT * FROM trainer_profiles WHERE user_id = ANY($1) AND is_active = true`,
    [userIds]
  );

  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    bio: row.bio,
    expertise: row.expertise || [],
    experience: row.experience,
    socialLinks: row.social_links,
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
  const conditions = [`c.trainer_id = $1`];
  const values: unknown[] = [trainerId];
  let paramIndex = 2;

  if (options?.publishedOnly !== false) {
    conditions.push(`c.status = 'PUBLISHED'`);
  }

  let sql = `
    SELECT c.*
    FROM classes c
    WHERE ${conditions.join(' AND ')}
    ORDER BY c.published_at DESC NULLS LAST
  `;

  if (options?.limit) {
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
    price: parseFloat(row.price),
    currency: row.currency,
    durationMinutes: row.duration_minutes,
    status: row.status,
    createdAt: row.created_at,
    publishedAt: row.published_at,
  }));
}

/**
 * Verify user is a trainer
 */
export async function verifyTrainer(id: string): Promise<boolean> {
  const result = await query(
    `SELECT id FROM users WHERE id = $1 AND role = 'TRAINER'`,
    [id]
  );
  return result.rows.length > 0;
}

/**
 * Create or update trainer profile
 */
export async function upsertTrainerProfile(data: {
  userId: string;
  bio?: string;
  expertise?: string[];
  experience?: number;
  socialLinks?: Record<string, string>;
  isActive?: boolean;
}): Promise<TrainerProfilePublic> {
  const result = await query(
    `INSERT INTO trainer_profiles (user_id, bio, expertise, experience, social_links, is_active)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) 
     DO UPDATE SET
       bio = COALESCE($2, trainer_profiles.bio),
       expertise = COALESCE($3, trainer_profiles.expertise),
       experience = COALESCE($4, trainer_profiles.experience),
       social_links = COALESCE($5, trainer_profiles.social_links),
       is_active = COALESCE($6, trainer_profiles.is_active),
       updated_at = NOW()
     RETURNING *`,
    [
      data.userId,
      data.bio ?? null,
      data.expertise ?? null,
      data.experience ?? null,
      data.socialLinks ? JSON.stringify(data.socialLinks) : null,
      data.isActive ?? true,
    ]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    bio: row.bio,
    expertise: row.expertise || [],
    experience: row.experience,
    socialLinks: row.social_links,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get trainer profile
 */
export async function getTrainerProfile(userId: string): Promise<TrainerProfilePublic | null> {
  const result = await query(
    `SELECT * FROM trainer_profiles WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    bio: row.bio,
    expertise: row.expertise || [],
    experience: row.experience,
    socialLinks: row.social_links,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
