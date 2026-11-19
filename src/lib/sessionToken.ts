/**
 * Signed session tokens.
 *
 * The session cookie used to hold a bare user id, so anyone who learned a
 * user's UUID could sign in as them. The cookie now carries
 * `v1.<userId>.<issuedAt>.<signature>` where the signature is an HMAC-SHA256
 * over the first three parts. A cookie that is unsigned, tampered with or
 * expired is treated as "not signed in".
 *
 * Server only (uses node:crypto) - never import this from a client component.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/sessionCookie";

const TOKEN_VERSION = "v1";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLOCK_SKEW_SECONDS = 300;

let cachedSecret: string | null = null;
let warnedAboutDerivedSecret = false;

function getSessionSecret(): string {
  if (cachedSecret) return cachedSecret;

  const configured = process.env.SESSION_SECRET?.trim();
  if (configured && configured.length >= 16) {
    cachedSecret = configured;
    return cachedSecret;
  }

  // Fallback so a deployment that has not set SESSION_SECRET yet keeps
  // working: the database URL already contains a private credential, so a
  // key derived from it is not guessable from outside.
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    if (!warnedAboutDerivedSecret && process.env.NODE_ENV === "production") {
      warnedAboutDerivedSecret = true;
      console.warn("[session] SESSION_SECRET is not set; deriving the signing key from DATABASE_URL. Set SESSION_SECRET to a long random value.");
    }
    cachedSecret = createHash("sha256").update(`noon-session-key:${databaseUrl}`).digest("hex");
    return cachedSecret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET (or DATABASE_URL) must be set to sign session cookies.");
  }

  cachedSecret = "noon-development-session-secret";
  return cachedSecret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

/** Build the cookie value for a freshly authenticated user. */
export function createSessionToken(userId: string): string {
  const issuedAt = Math.floor(Date.now() / 1000).toString(36);
  const payload = `${TOKEN_VERSION}.${userId}.${issuedAt}`;
  return `${payload}.${sign(payload)}`;
}

/** Returns the user id when the token is authentic and not expired, otherwise null. */
export function verifySessionToken(token: string | null | undefined): string | null {
  if (!token || token.length > 256) return null;

  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [version, userId, issuedAtRaw, signature] = parts;
  if (version !== TOKEN_VERSION || !UUID_PATTERN.test(userId)) return null;

  const expected = Buffer.from(sign(`${version}.${userId}.${issuedAtRaw}`));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  const issuedAt = Number.parseInt(issuedAtRaw, 36);
  if (!Number.isFinite(issuedAt)) return null;
  const now = Math.floor(Date.now() / 1000);
  if (issuedAt > now + CLOCK_SKEW_SECONDS) return null;
  if (now - issuedAt > SESSION_MAX_AGE_SECONDS) return null;

  return userId;
}

type CookieReader = { get(name: string): { value: string } | undefined };

/**
 * Read the signed-in user's id from a cookie store (`await cookies()` or
 * `request.cookies`). Undefined when there is no valid session.
 */
export function readSessionUserId(cookieStore: CookieReader): string | undefined {
  return verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value) ?? undefined;
}
