/**
 * User database operations with Prisma and secure password hashing
 */
import * as bcrypt from "bcryptjs";
import prisma from "./prisma";
import type { User as PrismaUser, UserRole, UserStatus, Gender, PreferredLanguage } from "@/generated/prisma";

export type User = PrismaUser;

export type PublicUser = Omit<User, "password">;

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
export async function getUserById(id: string): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({
    where: { id },
  });
  
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...publicUser } = user;
  return publicUser;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = email.toLowerCase().trim();
  
  return await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
}

/**
 * Get user by phone number
 */
export async function getUserByPhone(phoneNumber: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { phoneNumber },
  });
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
}): Promise<PublicUser | null> {
  const normalizedEmail = data.email.toLowerCase().trim();

  // Check if email already exists
  const existingUser = await getUserByEmail(normalizedEmail);
  if (existingUser) {
    return null;
  }

  // Check if phone already exists
  const existingPhone = await getUserByPhone(data.phoneNumber);
  if (existingPhone) {
    return null;
  }

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      password: passwordHash,
      fullName: data.fullName.trim(),
      role: data.role || "CUSTOMER",
      phoneNumber: data.phoneNumber.trim(),
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      gender: data.gender,
      preferredLanguage: data.preferredLanguage || "ENGLISH",
      profileImage: data.profileImage,
      status: "ACTIVE",
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...publicUser } = user;
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
  const user = await getUserByEmail(normalizedIdentifier);
  
  if (!user || user.status !== "ACTIVE") {
    return null;
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    return null;
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...publicUser } = user;
  return publicUser;
}

/**
 * Update user
 */
export async function updateUser(
  id: string,
  data: Partial<Omit<User, "id" | "email" | "password" | "createdAt">>
): Promise<PublicUser | null> {
  try {
    const user = await prisma.user.update({
      where: { id },
      data,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...publicUser } = user;
    return publicUser;
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
    
    await prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash },
    });

    return true;
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
}): Promise<PublicUser[]> {
  const users = await prisma.user.findMany({
    where: {
      role: options?.role,
      status: options?.status,
    },
    skip: options?.skip,
    take: options?.take,
    orderBy: { createdAt: "desc" },
  });
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return users.map(({ password, ...publicUser }) => publicUser);
}

/**
 * Delete user
 */
export async function deleteUser(id: string): Promise<boolean> {
  try {
    await prisma.user.delete({
      where: { id },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Update user with password
 */
export async function updateUserWithPassword(
  id: string,
  data: Partial<Omit<User, "id" | "password" | "createdAt">> & { password?: string }
): Promise<PublicUser | null> {
  try {
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
    if (data.phoneNumber) {
      const existingPhone = await getUserByPhone(data.phoneNumber);
      
      if (existingPhone && existingPhone.id !== id) {
        return null;
      }
    }

    let passwordHash: string | undefined;
    if (data.password) {
      passwordHash = await hashPassword(data.password);
    }

    const updateData: Record<string, unknown> = { ...data };
    delete updateData.password;
    
    if (passwordHash) {
      updateData.password = passwordHash;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...publicUser } = user;
    return publicUser;
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
  const counts = await prisma.user.groupBy({
    by: ["role"],
    _count: true,
  });

  return counts.reduce((acc, { role, _count }) => {
    acc[role] = _count;
    return acc;
  }, {} as Record<string, number>);
}