import {
  adToBs,
  bsFromDayNumber,
  civilFromUnixDay,
  dayNumberFromDate,
  LAST_DAY_NUMBER,
  unixDayFromCivil,
  weekdayOfDayNumber,
  yearStartDayNumber,
} from "./convert";

/** Week number for day `n`, where week 1 is the Sunday-to-Saturday week that holds day `yearStart`. */
function weekFrom(n: number, yearStart: number, weekdayOf: (day: number) => number): number {
  const firstSunday = yearStart - weekdayOf(yearStart);
  return Math.floor((n - firstSunday) / 7) + 1;
}

/**
 * Week of the BS year, 1-53. Weeks run Sunday to Saturday, and week 1 is the week that holds
 * Baisakh 1, so the last days of Chaitra can fall in week 1 of the next year.
 */
export function getBsWeek(date: Date): number {
  adToBs(date); // range check
  const n = dayNumberFromDate(date);
  const saturday = Math.min(n + 6 - weekdayOfDayNumber(n), LAST_DAY_NUMBER);
  const { year } = bsFromDayNumber(saturday);
  return weekFrom(n, yearStartDayNumber(year), weekdayOfDayNumber);
}

/** Row (1-6) the date sits on in its BS month grid, with weeks starting on Sunday. */
export function getBsWeekOfMonth(date: Date): number {
  const { day } = adToBs(date);
  const monthStart = dayNumberFromDate(date) - (day - 1);
  return Math.floor((day - 1 + weekdayOfDayNumber(monthStart)) / 7) + 1;
}

const unixWeekday = (u: number) => (((u + 4) % 7) + 7) % 7; // 1970-01-01 was a Thursday

/** Week of the Gregorian year with the same rule as getBsWeek: Sunday start, week 1 holds 1 January. */
export function getAdWeek(date: Date): number {
  if (Number.isNaN(date.getTime())) throw new RangeError("Invalid Date");
  const u = unixDayFromCivil(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const saturday = u + 6 - unixWeekday(u);
  const { year } = civilFromUnixDay(saturday, { year: 0, month: 0, day: 0 });
  return weekFrom(u, unixDayFromCivil(year, 1, 1), unixWeekday);
}
