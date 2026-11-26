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
/** Day number of the last day in the table, projected years included. */
export const LAST_DAY_NUMBER = YEAR_START[YEARS] - 1;
/** Day number of the last day with published month lengths: the day before Baisakh 1 of PROJECTED_FROM. */
export const LAST_CONFIRMED_DAY_NUMBER = YEAR_START[Math.min(PROJECTED_FROM, LAST_YEAR + 1) - FIRST_YEAR] - 1;

let projectedAllowed = false;

/**
 * Lets every function accept dates in the projected years, `BS_DATA_INFO.projectedFrom` to
 * `BS_DATA_INFO.lastYear`. Off by default: those dates throw a `ProjectedDateError`, because Nepal's
 * calendar committee has not published their month lengths yet and a projected date can be a day off.
 * Call it once at startup, before any calendar renders. `allowProjectedDates(false)` turns the check
 * back on.
 */
export function allowProjectedDates(allow = true): void {
  projectedAllowed = allow;
}

/** Day number of the last day the strict functions accept right now. */
export function lastDayNumber(): number {
  return projectedAllowed ? LAST_DAY_NUMBER : LAST_CONFIRMED_DAY_NUMBER;
}

/**
 * Thrown for a date in a year whose month lengths are only projected (`BS_DATA_INFO.projectedFrom`
 * on). It extends RangeError, so code that already catches RangeError keeps working. Call
 * `allowProjectedDates()` to accept these dates.
 */
export class ProjectedDateError extends RangeError {
  override name = "ProjectedDateError";
  /** The projected BS year the rejected date falls in. */
  readonly year: number;
  constructor(message: string, year: number) {
    super(message);
    this.year = year;
  }
}

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

/** Day number of a proleptic Gregorian date (month 1-12). */
export function dayNumberFromAd(year: number, month: number, day: number): number {
  return unixDayFromCivil(year, month, day) - EPOCH_UNIX_DAY;
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

const pad = (n: number, width = 2) => String(n).padStart(width, "0");
/** "2083-12-30" */
const isoText = (d: BsDate) => `${pad(d.year, 4)}-${pad(d.month)}-${pad(d.day)}`;
/** The AD date of a day number, as a {year, month, day} holder. */
const adOf = (n: number) => civilFromUnixDay(n + EPOCH_UNIX_DAY, { year: 0, month: 0, day: 0 });

/** "BS 1970-01-01 to BS 2083-12-30 (AD 1913-04-13 to AD 2027-04-13)": the range that ends on day `last`. */
function spanText(last: number): string {
  return `BS ${FIRST_YEAR}-01-01 to BS ${isoText(bsFromDayNumber(last))} (AD ${isoText(adOf(0))} to AD ${isoText(adOf(last))})`;
}

function rangeText(): string {
  const text = `Supported range: ${spanText(lastDayNumber())}.`;
  return projectedAllowed || LAST_CONFIRMED_DAY_NUMBER === LAST_DAY_NUMBER
    ? text
    : `${text} Projected dates up to BS ${LAST_YEAR} need allowProjectedDates().`;
}

/**
 * The ProjectedDateError for `subject` ("BS 2084-01-15", "AD 2027-05-01", "FY 2083/84"), which falls in
 * or reaches into the projected BS year `year`.
 */
export function projectedError(subject: string, year: number): ProjectedDateError {
  return new ProjectedDateError(
    `${subject} falls in BS ${year}, whose month lengths are not published yet. ` +
      `Confirmed range: ${spanText(LAST_CONFIRMED_DAY_NUMBER)}. To accept projected dates, call allowProjectedDates().`,
    year,
  );
}

/** "AD 2027-05-01": the AD date of a day number, for error messages. */
export function adText(n: number): string {
  return `AD ${isoText(adOf(n))}`;
}

/**
 * Throws unless the strict functions accept day number `n` right now: a RangeError outside the table, a
 * ProjectedDateError in a projected year. `subject` names the date in the message.
 */
export function assertDayNumber(n: number, subject: string): void {
  if (n < 0 || n > LAST_DAY_NUMBER) throw new RangeError(`${subject} is outside the supported range. ${rangeText()}`);
  if (n > lastDayNumber()) throw projectedError(subject, bsFromDayNumber(n).year);
}

function isInt(value: unknown): value is number {
  return Number.isInteger(value);
}

/** True when the BS date exists in the table, projected years included. */
function isInTable(year: number, month: number, day: number): boolean {
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

/** True for a projected year while projected dates are not allowed. */
export function isRejectedYear(year: number): boolean {
  return year >= PROJECTED_FROM && !projectedAllowed;
}

/**
 * True when the BS date exists and is inside the supported range. `month` is 1-12. Dates in projected
 * years count only after `allowProjectedDates()`.
 */
export function isValidBs(year: number, month: number, day: number): boolean {
  return isInTable(year, month, day) && !isRejectedYear(year);
}

/**
 * Number of days (29-32) in a BS month. `month` is 1-12. Throws a RangeError outside the table and a
 * ProjectedDateError in a projected year.
 */
export function getBsMonthLength(year: number, month: number): number {
  if (!isInt(year) || !isInt(month) || month < 1 || month > 12 || year < FIRST_YEAR || year > LAST_YEAR) {
    throw new RangeError(`No BS month ${year}-${month}. ${rangeText()}`);
  }
  if (isRejectedYear(year)) throw projectedError(`BS month ${year}-${pad(month)}`, year);
  return monthLength(year, month);
}

/**
 * Converts a Date's local calendar day to BS. Throws a RangeError outside the supported range, and a
 * ProjectedDateError in a projected year (see `allowProjectedDates`).
 */
export function adToBs(date: Date): BsDate {
  const n = dayNumberFromDate(date);
  if (n < 0 || n > lastDayNumber()) assertDayNumber(n, adText(n));
  return bsFromDayNumber(n);
}

/**
 * Converts a BS date to a Date at local midnight. `month` is 1-12.
 * Throws a RangeError when the date does not exist or is outside the supported range, and a
 * ProjectedDateError in a projected year (see `allowProjectedDates`).
 */
export function bsToAd(date: BsDate): Date;
export function bsToAd(year: number, month: number, day: number): Date;
export function bsToAd(yearOrDate: number | BsDate, month = Number.NaN, day = Number.NaN): Date {
  const bs = typeof yearOrDate === "object" ? yearOrDate : { year: yearOrDate, month, day };
  if (!isInTable(bs.year, bs.month, bs.day)) {
    throw new RangeError(`BS ${bs.year}-${bs.month}-${bs.day} is not a valid date. ${rangeText()}`);
  }
  if (isRejectedYear(bs.year)) throw projectedError(`BS ${isoText(bs)}`, bs.year);
  return dateFromDayNumber(dayNumberFromBs(bs.year, bs.month, bs.day));
}

const START: Readonly<BsDate> = Object.freeze({ year: FIRST_YEAR, month: 1, day: 1 });
const CONFIRMED_END: Readonly<BsDate> = Object.freeze(bsFromDayNumber(LAST_CONFIRMED_DAY_NUMBER));
const TABLE_END: Readonly<BsDate> = Object.freeze(bsFromDayNumber(LAST_DAY_NUMBER));

/**
 * The supported range, for DayPicker's `startMonth` and `endMonth`. It ends on the last confirmed day,
 * or on the last projected day after `allowProjectedDates()`. `startDate` and `endDate` return a new
 * local-midnight Date on each read.
 */
export const BS_RANGE = Object.freeze({
  start: START,
  get end(): Readonly<BsDate> {
    return projectedAllowed ? TABLE_END : CONFIRMED_END;
  },
  get startDate(): Date {
    return dateFromDayNumber(0);
  },
  get endDate(): Date {
    return dateFromDayNumber(lastDayNumber());
  },
});

/** How reliable each part of the data table is. See data/SOURCES.md in the repository. */
export const BS_DATA_INFO = Object.freeze({
  firstYear: FIRST_YEAR,
  lastYear: LAST_YEAR,
  /**
   * From this year on, month lengths are projections; the calendar committee has not published them yet.
   * Dates from here on throw a ProjectedDateError unless `allowProjectedDates()` was called.
   */
  projectedFrom: PROJECTED_FROM,
  /** Last day with published month lengths. */
  lastConfirmed: CONFIRMED_END,
  /** Years where the sources split the days between months differently. Year totals still agree. */
  disputedYears: DISPUTED_YEARS,
  /** Years with only one source. */
  singleSourceYears: SINGLE_SOURCE_YEARS,
});
