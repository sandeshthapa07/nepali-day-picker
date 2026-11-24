import { FIRST_YEAR, LAST_YEAR } from "../data/table";
import { adToBs, bsToAd, monthLength } from "./convert";
import { toAsciiDigits, toNepaliDigits } from "./digits";
import type { Lang } from "./pattern";

/** A fiscal year or a part of one. A trimester is four months (चौमासिक), a quarter three (त्रैमासिक). */
export type FiscalPeriod = "year" | "half" | "trimester" | "quarter" | "month";

const MONTHS_IN: Record<FiscalPeriod, number> = { year: 12, half: 6, trimester: 4, quarter: 3, month: 1 };

export interface FiscalOptions {
  /**
   * BS month (1-12) the fiscal year starts in. Default 4: Shrawan 1, Nepal's government fiscal year.
   * Use 1 for a year that starts on Baisakh 1, such as many school years.
   */
  startMonth?: number;
}

export interface FiscalPeriodInfo {
  /** BS year the fiscal year starts in: 2082 for FY 2082/83. */
  fiscalYear: number;
  /** Which period of the fiscal year, from 1: half 1-2, trimester 1-3, quarter 1-4, month 1-12, year 1. */
  index: number;
  /** First day, local midnight. */
  start: Date;
  /** Last day, local midnight. */
  end: Date;
}

export interface FiscalYearFormatOptions extends FiscalOptions {
  /** Script for digits and the prefix. Default `"ne"`. */
  lang?: Lang;
  /** Overrides only the digits. Default: `lang`. */
  digits?: Lang;
  /** `"short"` 2082/83 (default), `"padded"` 2082/083, `"full"` 2082/2083. */
  style?: "short" | "padded" | "full";
  /** Adds आ.व. (`ne`) or FY (`en`) in front. Default false. */
  prefix?: boolean;
}

function startMonthOf(options: FiscalOptions): number {
  const month = options.startMonth ?? 4;
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`startMonth must be a BS month from 1 to 12; got ${month}.`);
  }
  return month;
}

function monthsIn(period: FiscalPeriod): number {
  const months = MONTHS_IN[period];
  if (!Object.hasOwn(MONTHS_IN, period)) throw new RangeError(`Unknown fiscal period "${period}".`);
  return months;
}

/** BS year and month (1-12) of the month `offset` months after the fiscal year's first month. */
function fiscalMonth(fiscalYear: number, offset: number, startMonth: number) {
  const m = startMonth - 1 + offset;
  return { year: fiscalYear + Math.floor(m / 12), month: (m % 12) + 1 };
}

/** The fiscal year a date falls in, named by the BS year it starts in: 2082 for FY 2082/83. */
export function getFiscalYear(date: Date, options: FiscalOptions = {}): number {
  const startMonth = startMonthOf(options);
  const { year, month } = adToBs(date);
  return month >= startMonth ? year : year - 1;
}

/**
 * First and last day (local midnight) of a fiscal year or one of its periods.
 * Throws a RangeError when the period reaches outside the supported range (FY 1969/70 and FY 2100/01).
 */
export function getFiscalPeriodRange(
  fiscalYear: number,
  period: FiscalPeriod = "year",
  index = 1,
  options: FiscalOptions = {},
): { start: Date; end: Date } {
  const startMonth = startMonthOf(options);
  const months = monthsIn(period);
  const count = 12 / months;
  if (!Number.isInteger(fiscalYear)) throw new RangeError(`Fiscal year must be a BS year; got ${fiscalYear}.`);
  if (!Number.isInteger(index) || index < 1 || index > count) {
    throw new RangeError(`A fiscal year has ${count} ${period} period${count > 1 ? "s" : ""}; got ${index}.`);
  }
  const first = fiscalMonth(fiscalYear, (index - 1) * months, startMonth);
  const last = fiscalMonth(fiscalYear, index * months - 1, startMonth);
  if (first.year < FIRST_YEAR || last.year > LAST_YEAR) {
    const name = formatFiscalYear(fiscalYear, { lang: "en", prefix: true, startMonth });
    throw new RangeError(
      `${period === "year" ? name : `${period} ${index} of ${name}`} reaches outside the supported range, BS ${FIRST_YEAR} to ${LAST_YEAR}.`,
    );
  }
  return {
    start: bsToAd(first.year, first.month, 1),
    end: bsToAd(last.year, last.month, monthLength(last.year, last.month)),
  };
}

/** The fiscal year, half, trimester, quarter or month a date falls in, with its first and last day. */
export function getFiscalPeriod(
  date: Date,
  period: FiscalPeriod = "year",
  options: FiscalOptions = {},
): FiscalPeriodInfo {
  const startMonth = startMonthOf(options);
  const months = monthsIn(period);
  const { year, month } = adToBs(date);
  const fiscalYear = month >= startMonth ? year : year - 1;
  const index = Math.floor(((month - startMonth + 12) % 12) / months) + 1;
  return { fiscalYear, index, ...getFiscalPeriodRange(fiscalYear, period, index, options) };
}

/**
 * Writes a fiscal year the way Nepali documents do: २०८२/८३, 2082/083, FY 2082/83.
 * With `startMonth: 1` the fiscal year is one BS year, so only that year is written.
 */
export function formatFiscalYear(fiscalYear: number, options: FiscalYearFormatOptions = {}): string {
  const { lang = "ne", style = "short", prefix = false } = options;
  const end = fiscalYear + 1;
  let text = String(fiscalYear);
  if (startMonthOf(options) !== 1) {
    text += `/${style === "full" ? end : style === "padded" ? String(end % 1000).padStart(3, "0") : String(end % 100).padStart(2, "0")}`;
  }
  if ((options.digits ?? lang) === "ne") text = toNepaliDigits(text);
  return prefix ? `${lang === "ne" ? "आ.व." : "FY"} ${text}` : text;
}

const PREFIX = /^(?:f\.?\s*y\.?|fiscal\s+year|आ\.?\s*व\.?|आर्थिक\s+वर्ष)\s*/iu;

/**
 * Reads a fiscal year written as 2082/83, 2082/083, 2082/2083 or 2082-83, in either digit set, with or
 * without FY or आ.व. in front. Returns the BS year it starts in, or null when the text does not match or
 * the second year is not the year after the first.
 */
export function parseFiscalYear(text: string, options: FiscalOptions = {}): number | null {
  if (typeof text !== "string") return null;
  const startMonth = startMonthOf(options);
  const input = toAsciiDigits(text.normalize("NFC")).trim().replace(PREFIX, "");
  const match = /^(\d{4})(?:\s*[/\-–]\s*(\d{2,4}))?$/.exec(input);
  if (!match) return null;
  const start = Number(match[1]);
  const tail = match[2];
  if (start < FIRST_YEAR - 1 || start > LAST_YEAR) return null;
  if (tail === undefined) return startMonth === 1 ? start : null;
  if (startMonth === 1) return null;
  const end = start + 1;
  return Number(tail) === end % 10 ** tail.length ? start : null;
}
