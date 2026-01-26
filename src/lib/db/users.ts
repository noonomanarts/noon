/**
 * User database operations with secure password hashing
 * Using in-memory storage (replace with actual database in production)
 */
import * as bcrypt from "bcryptjs";

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

// In-memory storage (replace with actual database in production)
const users = new Map<string, User>();
const emailIndex = new Map<string, string>();

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
  const user = users.get(id);
  if (!user) return null;

  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

/**
 * Get user by email
 */
export function getUserByEmail(email: string): User | null {
  const normalizedEmail = email.toLowerCase().trim();
  const userId = emailIndex.get(normalizedEmail);
  
  if (!userId) return null;

  return users.get(userId) || null;
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
  users.set(id, user);
  // Create email index
  emailIndex.set(normalizedEmail, id);

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
  const existingUser = users.get(id);
  if (!existingUser) return null;

  const updatedUser: User = {
    ...existingUser,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  users.set(id, updatedUser);

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
  const user = users.get(userId);
  if (!user) return false;

  const passwordHash = await hashPassword(newPassword);

  const updatedUser: User = {
    ...user,
    passwordHash,
    updatedAt: new Date().toISOString(),
  };

  users.set(userId, updatedUser);
  return true;
}

/**
 * Get all users
 */
export function getAllUsers(): PublicUser[] {
  const allUsers: PublicUser[] = [];
  
  for (const user of users.values()) {
    const { passwordHash, ...publicUser } = user;
    allUsers.push(publicUser);
  }
  
  return allUsers;
}

/**
 * Delete user
 */
export function deleteUser(id: string): boolean {
  const user = users.get(id);
  if (!user) return false;

  // Remove user
  users.delete(id);
  // Remove email index
  emailIndex.delete(user.email);

  return true;
}

/**
 * Update user with password
 */
export async function updateUserWithPassword(
  id: string,
  data: Partial<Omit<User, "id" | "passwordHash" | "createdAt">> & { password?: string }
): Promise<PublicUser | null> {
  const existingUser = users.get(id);
  if (!existingUser) return null;

  // If email is changing, update the index
  if (data.email && data.email !== existingUser.email) {
    const normalizedNewEmail = data.email.toLowerCase().trim();
    
    // Check if new email already exists
    if (getUserByEmail(normalizedNewEmail)) {
      return null;
    }
    
    // Remove old email index
    emailIndex.delete(existingUser.email);
    // Create new email index
    emailIndex.set(normalizedNewEmail, id);
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

  users.set(id, updatedUser);

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
