/**
 * User database operations with secure password hashing
 */
import * as bcrypt from "bcryptjs";
import { getDb } from "@/lib/lmdb";

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: "admin" | "trainer" | "customer";
  phone?: string;
  dateOfBirth?: string;
  preferredLanguage: "en" | "ar";
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  profileImage?: string;
};

export type PublicUser = Omit<User, "passwordHash">;

const USERS_KEY_PREFIX = "user:";
const USER_EMAIL_INDEX = "user_email:";

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
export function getUserById(id: string): PublicUser | null {
  const db = getDb();
  if (!db) return null;

  const user = db.get(`${USERS_KEY_PREFIX}${id}`) as User | undefined;
  if (!user) return null;

  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

/**
 * Get user by email
 */
export function getUserByEmail(email: string): User | null {
  const db = getDb();
  if (!db) return null;

  const normalizedEmail = email.toLowerCase().trim();
  const userId = db.get(`${USER_EMAIL_INDEX}${normalizedEmail}`) as string | undefined;
  
  if (!userId) return null;

  return db.get(`${USERS_KEY_PREFIX}${userId}`) as User | null;
}

/**
 * Create a new user
 */
export async function createUser(data: {
  email: string;
  password: string;
  fullName: string;
  role?: "admin" | "trainer" | "customer";
  phone?: string;
  dateOfBirth?: string;
  preferredLanguage: "en" | "ar";
  profileImage?: string;
}): Promise<PublicUser | null> {
  const db = getDb();
  if (!db) return null;

  const normalizedEmail = data.email.toLowerCase().trim();

  // Check if email already exists
  if (getUserByEmail(normalizedEmail)) {
    return null;
  }

  const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date().toISOString();

  const passwordHash = await hashPassword(data.password);

  const user: User = {
    id,
    email: normalizedEmail,
    passwordHash,
    fullName: data.fullName.trim(),
    role: data.role || "customer",
    phone: data.phone?.trim(),
    dateOfBirth: data.dateOfBirth,
    preferredLanguage: data.preferredLanguage,
    profileImage: data.profileImage,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  };

  // Store user
  db.put(`${USERS_KEY_PREFIX}${id}`, user);
  // Create email index
  db.put(`${USER_EMAIL_INDEX}${normalizedEmail}`, id);

  const { passwordHash: _, ...publicUser } = user;
  return publicUser;
}

/**
 * Verify login credentials
 */
export async function verifyLogin(
  identifier: string,
  password: string
): Promise<PublicUser | null> {
  const normalizedIdentifier = identifier.toLowerCase().trim();
  
  // Try to find user by email
  const user = getUserByEmail(normalizedIdentifier);
  
  if (!user || !user.isActive) {
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

/**
 * Update user
 */
export async function updateUser(
  id: string,
  data: Partial<Omit<User, "id" | "email" | "passwordHash" | "createdAt">>
): Promise<PublicUser | null> {
  const db = getDb();
  if (!db) return null;

  const existingUser = db.get(`${USERS_KEY_PREFIX}${id}`) as User | undefined;
  if (!existingUser) return null;

  const updatedUser: User = {
    ...existingUser,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  db.put(`${USERS_KEY_PREFIX}${id}`, updatedUser);

  const { passwordHash, ...publicUser } = updatedUser;
  return publicUser;
}

/**
 * Change user password
 */
export async function changePassword(
  userId: string,
  newPassword: string
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  const user = db.get(`${USERS_KEY_PREFIX}${userId}`) as User | undefined;
  if (!user) return false;

  const passwordHash = await hashPassword(newPassword);

  const updatedUser: User = {
    ...user,
    passwordHash,
    updatedAt: new Date().toISOString(),
  };

  db.put(`${USERS_KEY_PREFIX}${userId}`, updatedUser);
  return true;
}

/**
 * Get all users
 */
export function getAllUsers(): PublicUser[] {
  const db = getDb();
  if (!db) return [];

  const users: PublicUser[] = [];
  
  for (const { key, value } of db.getRange({ 
    start: USERS_KEY_PREFIX, 
    end: `${USERS_KEY_PREFIX}\xFF` 
  })) {
    if (typeof key === "string" && key.startsWith(USERS_KEY_PREFIX)) {
      const user = value as User;
      const { passwordHash, ...publicUser } = user;
      users.push(publicUser);
    }
  }
  
  return users;
}

/**
 * Delete user
 */
export function deleteUser(id: string): boolean {
  const db = getDb();
  if (!db) return false;

  const user = db.get(`${USERS_KEY_PREFIX}${id}`) as User | undefined;
  if (!user) return false;

  // Remove user
  db.remove(`${USERS_KEY_PREFIX}${id}`);
  // Remove email index
  db.remove(`${USER_EMAIL_INDEX}${user.email}`);

  return true;
}

/**
 * Update user with password
 */
export async function updateUserWithPassword(
  id: string,
  data: Partial<Omit<User, "id" | "passwordHash" | "createdAt">> & { password?: string }
): Promise<PublicUser | null> {
  const db = getDb();
  if (!db) return null;

  const existingUser = db.get(`${USERS_KEY_PREFIX}${id}`) as User | undefined;
  if (!existingUser) return null;

  // If email is changing, update the index
  if (data.email && data.email !== existingUser.email) {
    const normalizedNewEmail = data.email.toLowerCase().trim();
    
    // Check if new email already exists
    if (getUserByEmail(normalizedNewEmail)) {
      return null;
    }
    
    // Remove old email index
    db.remove(`${USER_EMAIL_INDEX}${existingUser.email}`);
    // Create new email index
    db.put(`${USER_EMAIL_INDEX}${normalizedNewEmail}`, id);
  }

  let passwordHash = existingUser.passwordHash;
  if (data.password) {
    passwordHash = await hashPassword(data.password);
  }

  const updatedUser: User = {
    ...existingUser,
    ...data,
    id,
    passwordHash,
    email: data.email?.toLowerCase().trim() || existingUser.email,
    updatedAt: new Date().toISOString(),
  };

  db.put(`${USERS_KEY_PREFIX}${id}`, updatedUser);

  const { passwordHash: _, ...publicUser } = updatedUser;
  return publicUser;
}

/**
 * Initialize default admin user
 */
export async function ensureDefaultAdmin(): Promise<void> {
  const adminEmail = "admin@noon.com";
  
  // Check if admin already exists
  if (getUserByEmail(adminEmail)) {
    return;
  }

  // Create default admin
  await createUser({
    email: adminEmail,
    password: "admin123",
    fullName: "Admin Noon",
    role: "admin",
    preferredLanguage: "en",
  });
}
