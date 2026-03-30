const ENGLISH_PASSWORD_REGEX = /^[\x21-\x7E]+$/;

export function isEnglishPassword(value: string): boolean {
  if (!value) return false;
  return ENGLISH_PASSWORD_REGEX.test(value);
}

export function sanitizeEnglishPassword(value: string): string {
  return value.replace(/[^\x21-\x7E]/g, '');
}
