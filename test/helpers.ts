import { BS_RANGE } from "../src";

/** Local calendar day as "YYYY-MM-DD". */
export function ymd(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local midnight of an ISO calendar day. */
export function local(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Every supported day as [utcDayIndex, "YYYY-MM-DD"], computed with UTC math only (no local time zone). */
export function* allAdDays(): Generator<[number, string]> {
  const start = BS_RANGE.startDate;
  const end = BS_RANGE.endDate;
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  for (let t = startUtc, i = 0; t <= endUtc; t += 86_400_000, i++) {
    yield [i, new Date(t).toISOString().slice(0, 10)];
  }
}

/** False for a calendar day the local time zone skipped (Pacific/Kiritimati skipped 1994-12-31). */
export function localDayExists(iso: string): boolean {
  return ymd(local(iso)) === iso;
}
