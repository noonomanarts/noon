/**
 * Helpers for controlling when class registration is open/closed.
 *
 * Rule: registration automatically closes 24 hours before the class
 * `startDateTime`, unless an explicit `registrationCloseAt` is set by an
 * admin — in which case that value takes precedence.
 */

export const DEFAULT_REGISTRATION_CLOSE_OFFSET_MS = 24 * 60 * 60 * 1000;

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function resolveRegistrationCloseAt(
  startDateTime: Date | string | null | undefined,
  registrationCloseAt: Date | string | null | undefined
): Date | null {
  const explicit = toDate(registrationCloseAt);
  if (explicit) return explicit;

  const start = toDate(startDateTime);
  if (!start) return null;

  return new Date(start.getTime() - DEFAULT_REGISTRATION_CLOSE_OFFSET_MS);
}

export function isRegistrationClosed(
  startDateTime: Date | string | null | undefined,
  registrationCloseAt: Date | string | null | undefined,
  now: Date = new Date()
): boolean {
  const closeAt = resolveRegistrationCloseAt(startDateTime, registrationCloseAt);
  if (!closeAt) return false;
  return now.getTime() >= closeAt.getTime();
}
