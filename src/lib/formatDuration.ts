export function formatDurationClock(minutes: number | null | undefined): string {
  const safeMinutes = typeof minutes === 'number' && Number.isFinite(minutes)
    ? Math.max(0, Math.round(minutes))
    : 0;
  const hours = Math.floor(safeMinutes / 60);
  const remainderMinutes = safeMinutes % 60;
  return `${hours}:${String(remainderMinutes).padStart(2, '0')}`;
}

export function splitDurationMinutes(totalMinutes: number | null | undefined): {
  hours: string;
  minutes: string;
} {
  const safeMinutes = typeof totalMinutes === 'number' && Number.isFinite(totalMinutes)
    ? Math.max(0, Math.round(totalMinutes))
    : 0;
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return {
    hours: String(hours),
    minutes: String(minutes),
  };
}

export function composeDurationMinutes(hoursValue: string, minutesValue: string): number {
  const parsedHours = Number.parseInt(hoursValue || '0', 10);
  const parsedMinutes = Number.parseInt(minutesValue || '0', 10);

  const safeHours = Number.isInteger(parsedHours) && parsedHours >= 0 ? parsedHours : 0;
  const safeMinutes = Number.isInteger(parsedMinutes)
    ? Math.min(59, Math.max(0, parsedMinutes))
    : 0;

  return safeHours * 60 + safeMinutes;
}
