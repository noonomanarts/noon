/**
 * User database operations with raw SQL and secure password hashing
 */
import * as bcrypt from "bcryptjs";
import { query } from "./pool";
import { generateUUID } from "./uuid";
import type { User, UserRole, UserStatus, Gender, PreferredLanguage, UserPublic } from "./types";

let usersWhatsappColumnReady = false;

async function ensureUsersWhatsAppColumn(): Promise<void> {
  if (usersWhatsappColumnReady) return;

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS whatsapp_verified_at TIMESTAMP WITH TIME ZONE
  `);

  usersWhatsappColumnReady = true;
}

export function normalizePhoneDigits(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  if (digits.length === 8) {
    digits = `968${digits}`;
  }
  return digits;
}

// Convert DB row to User object
function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    password: row.password as string,
    role: row.role as UserRole,
    status: row.status as UserStatus,
    full_name: row.full_name as string,
    phone_number: row.phone_number as string,
    date_of_birth: row.date_of_birth ? new Date(row.date_of_birth as string) : null,
    gender: row.gender as Gender | null,
    preferred_language: row.preferred_language as PreferredLanguage,
    profile_image: row.profile_image as string | null,
    whatsapp_verified_at: row.whatsapp_verified_at ? new Date(row.whatsapp_verified_at as string) : null,
    created_at: new Date(row.created_at as string),
    updated_at: new Date(row.updated_at as string),
    last_login_at: row.last_login_at ? new Date(row.last_login_at as string) : null,
  };
}

// Convert DB row to UserPublic object (camelCase for frontend)
function rowToUserPublic(row: Record<string, unknown>): UserPublic {
  return {
    id: row.id as string,
    email: row.email as string,
    role: row.role as UserRole,
    status: row.status as UserStatus,
    fullName: row.full_name as string || '',
    phoneNumber: row.phone_number as string || '',
    dateOfBirth: row.date_of_birth ? new Date(row.date_of_birth as string) : null,
    gender: row.gender as Gender | null,
    preferredLanguage: (row.preferred_language as PreferredLanguage) || 'ENGLISH',
    profileImage: row.profile_image as string | null,
    whatsappVerifiedAt: row.whatsapp_verified_at ? new Date(row.whatsapp_verified_at as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at as string) : null,
  };
}

// Convert User object to UserPublic (camelCase)
function userToUserPublic(user: User): UserPublic {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    fullName: user.full_name || '',
    phoneNumber: user.phone_number || '',
    dateOfBirth: user.date_of_birth,
    gender: user.gender,
    preferredLanguage: user.preferred_language || 'ENGLISH',
    profileImage: user.profile_image,
    whatsappVerifiedAt: user.whatsapp_verified_at,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    lastLoginAt: user.last_login_at,
  };
}

/**
 * Hash a password securely
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a password against a hash
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<UserPublic | null> {
  await ensureUsersWhatsAppColumn();

  const result = await query(
    `SELECT id, email, role, status, full_name, phone_number, date_of_birth, 
            gender, preferred_language, profile_image, whatsapp_verified_at, created_at, updated_at, last_login_at
     FROM users WHERE id = $1`,
    [id]
  );
  
  if (result.rows.length === 0) return null;
  
  return rowToUserPublic(result.rows[0]);
}

/**
 * Get user by email (includes password for auth)
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = email.toLowerCase().trim();
  
  const result = await query(
    `SELECT * FROM users WHERE email = $1`,
    [normalizedEmail]
  );
  
  if (result.rows.length === 0) return null;
  return rowToUser(result.rows[0]);
}

/**
 * Get user by phone number
 */
export async function getUserByPhone(phoneNumber: string): Promise<User | null> {
  const result = await query(
    `SELECT * FROM users WHERE phone_number = $1`,
    [phoneNumber]
  );
  
  if (result.rows.length === 0) return null;
  return rowToUser(result.rows[0]);
}

/**
 * Get user by normalized phone digits (for WhatsApp auth)
 */
export async function getUserByPhoneNormalized(phoneNumber: string): Promise<User | null> {
  const digits = normalizePhoneDigits(phoneNumber);
  if (!digits) return null;

  const result = await query(
    `SELECT *
     FROM users
     WHERE regexp_replace(COALESCE(phone_number, ''), '[^0-9]', '', 'g') = $1
     LIMIT 1`,
    [digits]
  );

  if (result.rows.length === 0) return null;
  return rowToUser(result.rows[0]);
}

/**
 * Create a new user
 */
export async function createUser(data: {
  email: string;
  password: string;
  fullName: string;
  role?: UserRole;
  phoneNumber: string;
  dateOfBirth?: Date | string;
  gender?: Gender;
  preferredLanguage?: PreferredLanguage;
  profileImage?: string;
}): Promise<UserPublic | null> {
  await ensureUsersWhatsAppColumn();

  const normalizedEmail = data.email.toLowerCase().trim();

  // Check if email already exists
  const existingUser = await getUserByEmail(normalizedEmail);
  if (existingUser) {
    return null;
  }

  // Check if phone already exists
  const existingPhone = await getUserByPhoneNormalized(data.phoneNumber);
  if (existingPhone) {
    return null;
  }

  const passwordHash = await hashPassword(data.password);
  const id = generateUUID();
  const now = new Date();

  const result = await query(
    `INSERT INTO users (
      id, email, password, role, status, full_name, phone_number, 
      date_of_birth, gender, preferred_language, profile_image, 
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING id, email, role, status, full_name, phone_number, date_of_birth, 
              gender, preferred_language, profile_image, whatsapp_verified_at, created_at, updated_at, last_login_at`,
    [
      id,
      normalizedEmail,
      passwordHash,
      data.role || 'CUSTOMER',
      'ACTIVE',
      data.fullName.trim(),
      data.phoneNumber.trim(),
      data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      data.gender || null,
      data.preferredLanguage || 'ENGLISH',
      data.profileImage || null,
      now,
      now,
    ]
  );

  if (result.rows.length === 0) return null;
  
  return rowToUserPublic(result.rows[0]);
}

/**
 * Verify login credentials
 */
export async function verifyLogin(
  identifier: string,
  password: string
): Promise<UserPublic | null> {
  const normalizedIdentifier = identifier.toLowerCase().trim();
  
  // Try to find user by email
  const user = await getUserByEmail(normalizedIdentifier);
  
  if (!user || user.status !== 'ACTIVE') {
    return null;
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    return null;
  }

  // Update last login
  await query(
    `UPDATE users SET last_login_at = $1, updated_at = $1 WHERE id = $2`,
    [new Date(), user.id]
  );

  return userToUserPublic(user);
}

/**
 * Update user
 */
export async function updateUser(
  id: string,
  data: Partial<Omit<User, 'id' | 'email' | 'password' | 'created_at'>>
): Promise<UserPublic | null> {
  try {
    await ensureUsersWhatsAppColumn();

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(data.role);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.full_name !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(data.full_name);
    }
    if (data.phone_number !== undefined) {
      updates.push(`phone_number = $${paramIndex++}`);
      values.push(data.phone_number);
    }
    if (data.date_of_birth !== undefined) {
      updates.push(`date_of_birth = $${paramIndex++}`);
      values.push(data.date_of_birth);
    }
    if (data.gender !== undefined) {
      updates.push(`gender = $${paramIndex++}`);
      values.push(data.gender);
    }
    if (data.preferred_language !== undefined) {
      updates.push(`preferred_language = $${paramIndex++}`);
      values.push(data.preferred_language);
    }
    if (data.profile_image !== undefined) {
      updates.push(`profile_image = $${paramIndex++}`);
      values.push(data.profile_image);
    }

    if (updates.length === 0) {
      return await getUserById(id);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());
    values.push(id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, email, role, status, full_name, phone_number, date_of_birth, 
                 gender, preferred_language, profile_image, whatsapp_verified_at, created_at, updated_at, last_login_at`,
      values
    );

    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      role: row.role,
      status: row.status,
      fullName: row.full_name,
      phoneNumber: row.phone_number,
      dateOfBirth: row.date_of_birth,
      gender: row.gender,
      preferredLanguage: row.preferred_language,
      profileImage: row.profile_image,
      whatsappVerifiedAt: row.whatsapp_verified_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at,
    };
  } catch {
    return null;
  }
}

/**
 * Change user password
 */
export async function changePassword(
  userId: string,
  newPassword: string
): Promise<boolean> {
  try {
    const passwordHash = await hashPassword(newPassword);
    
    const result = await query(
      `UPDATE users SET password = $1, updated_at = $2 WHERE id = $3`,
      [passwordHash, new Date(), userId]
    );

    return (result.rowCount ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Get all users
 */
export async function getAllUsers(options?: {
  role?: UserRole;
  status?: UserStatus;
  skip?: number;
  take?: number;
}): Promise<UserPublic[]> {
  await ensureUsersWhatsAppColumn();

  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (options?.role) {
    conditions.push(`role = $${paramIndex++}`);
    values.push(options.role);
  }
  if (options?.status) {
    conditions.push(`status = $${paramIndex++}`);
    values.push(options.status);
  }

  let sql = `
    SELECT id, email, role, status, full_name, phone_number, date_of_birth, 
           gender, preferred_language, profile_image, created_at, updated_at, last_login_at
    FROM users
  `;

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  sql += ` ORDER BY created_at DESC`;

  if (options?.take) {
    sql += ` LIMIT $${paramIndex++}`;
    values.push(options.take);
  }
  if (options?.skip) {
    sql += ` OFFSET $${paramIndex++}`;
    values.push(options.skip);
  }

  const result = await query(sql, values);
  
  return result.rows.map(row => rowToUserPublic(row));
}

/**
 * Delete user
 */
export async function deleteUser(id: string): Promise<boolean> {
  try {
    const result = await query(
      `DELETE FROM users WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Update user with password
 */
export async function updateUserWithPassword(
  id: string,
  data: Partial<Omit<User, 'id' | 'password' | 'created_at'>> & { password?: string }
): Promise<UserPublic | null> {
  try {
    await ensureUsersWhatsAppColumn();

    // If email is changing, check if it already exists
    if (data.email) {
      const normalizedNewEmail = data.email.toLowerCase().trim();
      const existingUser = await getUserByEmail(normalizedNewEmail);
      
      if (existingUser && existingUser.id !== id) {
        return null;
      }
      
      data.email = normalizedNewEmail;
    }

    // If phone is changing, check if it already exists
    if (data.phone_number) {
      const existingPhone = await getUserByPhone(data.phone_number);
      
      if (existingPhone && existingPhone.id !== id) {
        return null;
      }
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }
    if (data.password) {
      const passwordHash = await hashPassword(data.password);
      updates.push(`password = $${paramIndex++}`);
      values.push(passwordHash);
    }
    if (data.role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(data.role);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.full_name !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(data.full_name);
    }
    if (data.phone_number !== undefined) {
      updates.push(`phone_number = $${paramIndex++}`);
      values.push(data.phone_number);
    }
    if (data.date_of_birth !== undefined) {
      updates.push(`date_of_birth = $${paramIndex++}`);
      values.push(data.date_of_birth);
    }
    if (data.gender !== undefined) {
      updates.push(`gender = $${paramIndex++}`);
      values.push(data.gender);
    }
    if (data.preferred_language !== undefined) {
      updates.push(`preferred_language = $${paramIndex++}`);
      values.push(data.preferred_language);
    }
    if (data.profile_image !== undefined) {
      updates.push(`profile_image = $${paramIndex++}`);
      values.push(data.profile_image);
    }

    if (updates.length === 0) {
      return await getUserById(id);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());
    values.push(id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, email, role, status, full_name, phone_number, date_of_birth, 
                 gender, preferred_language, profile_image, created_at, updated_at, last_login_at`,
      values
    );

    if (result.rows.length === 0) return null;
    
    return rowToUserPublic(result.rows[0]);
  } catch {
    return null;
  }
}

/**
 * Initialize default admin user
 */
export async function ensureDefaultAdmin(): Promise<void> {
  const adminEmail = "admin@noon.com";
  
  // Check if admin already exists
  const existingAdmin = await getUserByEmail(adminEmail);
  if (existingAdmin) {
    return;
  }

  // Create default admin
  await createUser({
    email: adminEmail,
    password: "admin123",
    fullName: "Admin Noon",
    role: "ADMIN",
    phoneNumber: "+96812345678",
    preferredLanguage: "ENGLISH",
  });
}

/**
 * Count users by role
 */
export async function countUsersByRole(): Promise<Record<string, number>> {
  const result = await query(
    `SELECT role, COUNT(*)::int as count FROM users GROUP BY role`
  );

  return result.rows.reduce((acc, row) => {
    acc[row.role] = row.count;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Mark user as WhatsApp-verified
 */
export async function markUserWhatsAppVerified(userId: string): Promise<void> {
  await ensureUsersWhatsAppColumn();

  await query(
    `UPDATE users
     SET whatsapp_verified_at = COALESCE(whatsapp_verified_at, NOW()),
         updated_at = NOW()
     WHERE id = $1`,
    [userId]
  );
}

// Re-export types for convenience
export type { User, UserPublic, UserRole, UserStatus, Gender, PreferredLanguage };
