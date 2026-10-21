// Huddle is for people aged 13 and over (see constants/legal.ts).
export const MIN_AGE = 13;

/** Whole years between a birth date and today. */
export function ageFrom(year: number, month: number, day: number): number {
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - (month - 1);
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) age--;
  return age;
}

/** True if the numbers form a real calendar date. */
export function isRealDate(year: number, month: number, day: number): boolean {
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

export function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
