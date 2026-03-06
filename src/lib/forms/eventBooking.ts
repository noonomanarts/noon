export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  return /^[\d\s+()-]+$/.test(value.trim());
}

export function isDateInPast(dateValue: string): boolean {
  const selected = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(selected.getTime())) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selected.getTime() < today.getTime();
}

export function parseIntegerInput(value: string, fallback = 0): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}
