/**
 * Session management utilities
 */
import { cookies } from "next/headers";
import { getUserById } from "@/lib/db/users";
import type { UserPublic } from "@/lib/db/users";
import type { UserRole } from "@/lib/db/types";
import { getExpiredSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/sessionCookie";

/**
 * Get the current logged-in user from session
 */
export async function getCurrentUser(): Promise<UserPublic | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return null;
  }

  return getUserById(sessionId);
}

/**
 * Require a logged-in user, redirect to login if not authenticated
 */
export async function requireAuth(locale: string = "en"): Promise<UserPublic> {
  const user = await getCurrentUser();
  
  if (!user) {
    const { redirect } = await import("next/navigation");
    redirect(`/${locale}/login`);
  }

  // TypeScript doesn't know that redirect() never returns
  return user as UserPublic;
}

/**
 * Require admin role, redirect if not admin
 */
export async function requireAdmin(locale: string = "en"): Promise<UserPublic> {
  const user = await requireAuth(locale);
  
  if (user.role !== "ADMIN") {
    const { redirect } = await import("next/navigation");
    redirect(`/${locale}/account`);
  }

  // TypeScript doesn't know that redirect() never returns
  return user as UserPublic;
}

export async function requireRole(
  allowedRoles: UserRole[],
  locale: string = "en",
  redirectTo: string = `/${locale}/account`
): Promise<UserPublic> {
  const user = await requireAuth(locale);

  if (!allowedRoles.includes(user.role)) {
    const { redirect } = await import("next/navigation");
    redirect(redirectTo);
  }

  return user as UserPublic;
}

/**
 * Logout the current user
 */
export async function logout(locale: string = "en"): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", getExpiredSessionCookieOptions());
  
  const { redirect } = await import("next/navigation");
  redirect(`/${locale}/login`);
}
