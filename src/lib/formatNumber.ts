export function formatPlainNumber(
  value: number | string | null | undefined,
  options?: { empty?: string; maxFractionDigits?: number }
): string {
  const empty = options?.empty ?? "-";
  if (value === null || value === undefined || value === "") return empty;

  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return empty;

  const normalized = Object.is(numeric, -0) ? 0 : numeric;
  if (Number.isInteger(normalized)) return String(normalized);

  const fixed = normalized
    .toFixed(options?.maxFractionDigits ?? 6)
    .replace(/\.?0+$/, "");

  return fixed || "0";
}

export function formatAmountWithCurrency(
  value: number | string | null | undefined,
  currency: string,
  options?: { empty?: string; maxFractionDigits?: number }
): string {
  const formatted = formatPlainNumber(value, options);
  if (formatted === (options?.empty ?? "-")) return `${formatted} ${currency}`;
  return `${formatted} ${currency}`;
}
