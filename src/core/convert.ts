import {
  DISPUTED_YEARS,
  ENCODED_MONTHS,
  EPOCH_UTC,
  FIRST_YEAR,
  LAST_YEAR,
  PROJECTED_FROM,
  SINGLE_SOURCE_YEARS,
} from "../data/table";

/** A Bikram Sambat date. `month` is 1-12 (Baisakh = 1). */
export interface BsDate {
  year: number;
  month: number;
  day: number;
}

const MS_PER_DAY = 86_400_000;
const YEARS = ENCODED_MONTHS.length;
/** Days from 1970-01-01 (Unix day 0) to the BS epoch. */
const EPOCH_UNIX_DAY = EPOCH_UTC / MS_PER_DAY;
/** Weekday of the BS epoch, 0 = Sunday. */
const EPOCH_WEEKDAY = new Date(EPOCH_UTC).getUTCDay();

/** YEAR_START[i] is the day number of Baisakh 1 of FIRST_YEAR + i; the last entry is one past the table. */
const YEAR_START = new Array<number>(YEARS + 1);
YEAR_START[0] = 0;
for (let i = 0; i < YEARS; i++) {
  let total = 0;
  for (let m = 0; m < 12; m++) total += 29 + ((ENCODED_MONTHS[i] >> (2 * m)) & 3);
  YEAR_START[i + 1] = YEAR_START[i] + total;
}
/** Day number of the last supported day. */
export const LAST_DAY_NUMBER = YEAR_START[YEARS] - 1;

/** Month length without validation. `month` is 1-12. */
export function monthLength(year: number, month: number): number {
  return 29 + ((ENCODED_MONTHS[year - FIRST_YEAR] >> (2 * (month - 1))) & 3);
}

/** Days from 1970-01-01 to a proleptic Gregorian date (month 1-12). */
export function unixDayFromCivil(year: number, month: number, day: number): number {
  // Howard Hinnant's days_from_civil: integer math, no Date, no allocation.
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = (month + 9) % 12;
  const doy = Math.floor((153 * mp + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/** Writes the Gregorian date of a Unix day number into `out` (month 1-12). */
export function civilFromUnixDay(days: number, out: BsDate): BsDate {
  // Howard Hinnant's civil_from_days. BsDate is reused as a plain {year, month, day} holder.
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const month = mp < 10 ? mp + 3 : mp - 9;
  out.year = yoe + era * 400 + (month <= 2 ? 1 : 0);
  out.month = month;
  out.day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  return out;
}

/** Day number (days since the BS epoch) of a Date's local calendar day. Ignores the time of day. */
export function dayNumberFromDate(date: Date): number {
  if (Number.isNaN(date.getTime())) throw new RangeError("Invalid Date");
  return unixDayFromCivil(date.getFullYear(), date.getMonth() + 1, date.getDate()) - EPOCH_UNIX_DAY;
}

/** Local-midnight Date for a day number. */
export function dateFromDayNumber(n: number): Date {
  const c = civilFromUnixDay(n + EPOCH_UNIX_DAY, { year: 0, month: 0, day: 0 });
  return new Date(c.year, c.month - 1, c.day);
}

/** Weekday of a day number, 0 = Sunday. */
export function weekdayOfDayNumber(n: number): number {
  return (((n + EPOCH_WEEKDAY) % 7) + 7) % 7;
}

/** Index into the year table for a day number, by binary search. Assumes 0 <= n <= LAST_DAY_NUMBER. */
function yearIndexOf(n: number): number {
  let lo = 0;
  let hi = YEARS - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (YEAR_START[mid] <= n) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Day number of Baisakh 1 of a BS year. Assumes the year is in range. */
export function yearStartDayNumber(year: number): number {
  return YEAR_START[year - FIRST_YEAR];
}

/** BS date of a day number. Assumes 0 <= n <= LAST_DAY_NUMBER. */
export function bsFromDayNumber(n: number): BsDate {
  const i = yearIndexOf(n);
  const encoded = ENCODED_MONTHS[i];
  let rest = n - YEAR_START[i];
  let m = 0;
  for (;;) {
    const len = 29 + ((encoded >> (2 * m)) & 3);
    if (rest < len) break;
    rest -= len;
    m++;
  }
  return { year: FIRST_YEAR + i, month: m + 1, day: rest + 1 };
}

/** Day number of a valid BS date. */
export function dayNumberFromBs(year: number, month: number, day: number): number {
  let n = YEAR_START[year - FIRST_YEAR] + day - 1;
  for (let m = 1; m < month; m++) n += monthLength(year, m);
  return n;
}

function isInt(value: unknown): value is number {
  return Number.isInteger(value);
}

/** True when the BS date exists and is inside the supported range. `month` is 1-12. */
export function isValidBs(year: number, month: number, day: number): boolean {
  return (
    isInt(year) &&
    isInt(month) &&
    isInt(day) &&
    year >= FIRST_YEAR &&
    year <= LAST_YEAR &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= monthLength(year, month)
  );
}

/** Number of days (29-32) in a BS month. `month` is 1-12. */
export function getBsMonthLength(year: number, month: number): number {
  if (!isInt(year) || !isInt(month) || month < 1 || month > 12 || year < FIRST_YEAR || year > LAST_YEAR) {
    throw new RangeError(`No BS month ${year}-${month}. ${rangeText()}`);
  }
  return monthLength(year, month);
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

let cachedRangeText: string | undefined;
function rangeText(): string {
  if (cachedRangeText === undefined) {
    const end = bsFromDayNumber(LAST_DAY_NUMBER);
    const adStart = civilFromUnixDay(EPOCH_UNIX_DAY, { year: 0, month: 0, day: 0 });
    const adEnd = civilFromUnixDay(LAST_DAY_NUMBER + EPOCH_UNIX_DAY, { year: 0, month: 0, day: 0 });
    cachedRangeText =
      `Supported range: BS ${FIRST_YEAR}-01-01 to BS ${end.year}-${pad(end.month)}-${pad(end.day)} ` +
      `(AD ${adStart.year}-${pad(adStart.month)}-${pad(adStart.day)} to AD ${adEnd.year}-${pad(adEnd.month)}-${pad(adEnd.day)}).`;
  }
  return cachedRangeText;
}

/** Converts a Date's local calendar day to BS. Throws a RangeError outside the supported range. */
export function adToBs(date: Date): BsDate {
  const n = dayNumberFromDate(date);
  if (n < 0 || n > LAST_DAY_NUMBER) throw new RangeError(`Date is outside the supported range. ${rangeText()}`);
  return bsFromDayNumber(n);
}

/**
 * Converts a BS date to a Date at local midnight. `month` is 1-12.
 * Throws a RangeError when the date does not exist or is outside the supported range.
 */
export function bsToAd(date: BsDate): Date;
export function bsToAd(year: number, month: number, day: number): Date;
export function bsToAd(yearOrDate: number | BsDate, month = Number.NaN, day = Number.NaN): Date {
  const bs = typeof yearOrDate === "object" ? yearOrDate : { year: yearOrDate, month, day };
  if (!isValidBs(bs.year, bs.month, bs.day)) {
    throw new RangeError(`BS ${bs.year}-${bs.month}-${bs.day} is not a valid date. ${rangeText()}`);
  }
  return dateFromDayNumber(dayNumberFromBs(bs.year, bs.month, bs.day));
}

const START: Readonly<BsDate> = Object.freeze({ year: FIRST_YEAR, month: 1, day: 1 });
const END: Readonly<BsDate> = Object.freeze(bsFromDayNumber(LAST_DAY_NUMBER));

/**
 * The supported range, for DayPicker's `startMonth` and `endMonth`.
 * `startDate` and `endDate` return a new local-midnight Date on each read.
 */
export const BS_RANGE = Object.freeze({
  start: START,
  end: END,
  get startDate(): Date {
    return dateFromDayNumber(0);
  },
  get endDate(): Date {
    return dateFromDayNumber(LAST_DAY_NUMBER);
  },
});

/** How reliable each part of the data table is. See data/SOURCES.md in the repository. */
export const BS_DATA_INFO = Object.freeze({
  firstYear: FIRST_YEAR,
  lastYear: LAST_YEAR,
  /** From this year on, month lengths are projections; the calendar committee has not published them yet. */
  projectedFrom: PROJECTED_FROM,
  /** Years where the sources split the days between months differently. Year totals still agree. */
  disputedYears: DISPUTED_YEARS,
  /** Years with only one source. */
  singleSourceYears: SINGLE_SOURCE_YEARS,
});
