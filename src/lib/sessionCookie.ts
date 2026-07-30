export const SESSION_COOKIE_NAME = "noon_session";

// Keep users signed in for a long period; session ends when they explicitly log out.
const PERSISTENT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PERSISTENT_SESSION_MAX_AGE_SECONDS,
  };
}

export function getExpiredSessionCookieOptions() {
  return {
    ...getSessionCookieOptions(),
    maxAge: 0,
  };
}
