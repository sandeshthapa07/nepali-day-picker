// Conversions that never throw, for calendar UIs.
//
// A month grid shows a few days past its month, and DayPicker asks the date library about them. At
// the edges of the table (BS 1970 and 2100) those days have no data. Here, years outside the table
// use a fixed 365-day year, so the grid can still be drawn. Dates out there are placeholders, not
// real BS dates; the calendar keeps navigation inside the table by default.
import { FIRST_YEAR, LAST_YEAR } from "../data/table";
import {
  type BsDate,
  bsFromDayNumber,
  dateFromDayNumber,
  dayNumberFromDate,
  LAST_DAY_NUMBER,
  monthLength,
  weekdayOfDayNumber,
  yearStartDayNumber,
} from "./convert";

const FILLER = [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30];
const FILLER_YEAR = 365;

/** Month length (month 1-12); a fixed pattern outside the table. */
export function looseMonthLength(year: number, month: number): number {
  return year >= FIRST_YEAR && year <= LAST_YEAR ? monthLength(year, month) : FILLER[month - 1];
}

/** Day number of Baisakh 1 of any year. */
export function looseYearStart(year: number): number {
  if (year < FIRST_YEAR) return (year - FIRST_YEAR) * FILLER_YEAR;
  if (year > LAST_YEAR) return LAST_DAY_NUMBER + 1 + (year - LAST_YEAR - 1) * FILLER_YEAR;
  return yearStartDayNumber(year);
}

/** Splits any month count into a year and a month 1-12, so month 13 is Baisakh of the next year. */
export function normalizeMonth(year: number, month: number): { year: number; month: number } {
  const total = year * 12 + (month - 1);
  const y = Math.floor(total / 12);
  return { year: y, month: total - y * 12 + 1 };
}

/** Day number of a BS date. `month` may be out of 1-12; `day` is clamped to the month. */
export function looseDayNumberFromBs(year: number, month: number, day: number): number {
  const m = normalizeMonth(year, month);
  const clamped = Math.min(Math.max(day, 1), looseMonthLength(m.year, m.month));
  let n = looseYearStart(m.year) + clamped - 1;
  for (let i = 1; i < m.month; i++) n += looseMonthLength(m.year, i);
  return n;
}

/** BS date of any day number. */
export function looseBsFromDayNumber(n: number): BsDate {
  if (n >= 0 && n <= LAST_DAY_NUMBER) return bsFromDayNumber(n);
  const year =
    n < 0
      ? FIRST_YEAR - 1 - Math.floor((-n - 1) / FILLER_YEAR)
      : LAST_YEAR + 1 + Math.floor((n - LAST_DAY_NUMBER - 1) / FILLER_YEAR);
  let rest = n - looseYearStart(year);
  let month = 1;
  while (rest >= FILLER[month - 1]) {
    rest -= FILLER[month - 1];
    month++;
  }
  return { year, month, day: rest + 1 };
}

/** BS date of a Date's local calendar day, also outside the table. Throws only for an Invalid Date. */
export function looseAdToBs(date: Date): BsDate {
  return looseBsFromDayNumber(dayNumberFromDate(date));
}

/** Local-midnight Date of a BS date, also outside the table. The day is clamped to the month. */
export function looseBsToAd(year: number, month: number, day: number): Date {
  return dateFromDayNumber(looseDayNumberFromBs(year, month, day));
}

/**
 * Week of the BS year. Week 1 is the week that holds Baisakh 1, and weeks start on `weekStartsOn`
 * (0 = Sunday).
 */
export function looseBsWeek(date: Date, weekStartsOn = 0): number {
  const n = dayNumberFromDate(date);
  const offset = (day: number) => (weekdayOfDayNumber(day) - weekStartsOn + 7) % 7;
  const weekStart = n - offset(n);
  const { year } = looseBsFromDayNumber(weekStart + 6);
  const yearStart = looseYearStart(year);
  const firstWeekStart = yearStart - offset(yearStart);
  return Math.floor((weekStart - firstWeekStart) / 7) + 1;
}
