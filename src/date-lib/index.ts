import { DateLib, type DateLibOptions } from "react-day-picker";
import { createFormatterWith } from "../core/format";
import { looseAdToBs, looseBsToAd, looseBsWeek, looseMonthLength, normalizeMonth } from "../core/loose";
import type { Lang } from "../core/pattern";
import { translateDateFnsPattern } from "./translate";

/** Options for the BS date library. */
export interface BsDateLibOptions {
  /** Script for names and the default for digits. Default `"ne"`. */
  lang?: Lang;
  /** Overrides only the digits. Default: `lang`. */
  digits?: Lang;
  /** Everyday (बैशाख) or formal (वैशाख) Nepali month names. Default `"common"`. */
  monthNames?: "common" | "formal";
}

/** The overrides react-day-picker accepts in its `dateLib` prop. */
export type DateLibOverrides = Partial<typeof DateLib.prototype>;

type Interval = Parameters<DateLib["eachMonthOfInterval"]>[0];

const toDate = (value: Interval["start"]): Date => (value instanceof Date ? value : new Date(value as number));

let warned: Set<string> | undefined;
function warnOnce(message: string) {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  if (env?.NODE_ENV === "production") return;
  warned ??= new Set();
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(`[nepali-day-picker] ${message}`);
}

/**
 * The BS overrides for react-day-picker's `dateLib` prop. With them, DayPicker lays out Bikram Sambat
 * months, while every value it returns is still a plain `Date`.
 *
 * ```tsx
 * <DayPicker dateLib={createBsDateLib({ lang: "ne" })} weekStartsOn={0} />
 * ```
 */
export function createBsDateLib(options: BsDateLibOptions = {}): DateLibOverrides {
  const { lang = "ne", digits = lang, monthNames = "common" } = options;
  const formatters = new Map<string, (date: Date) => string>();

  const fromBs = looseBsToAd;
  const toBs = looseAdToBs;

  const startOfMonth = (date: Date) => {
    const { year, month } = toBs(date);
    return fromBs(year, month, 1);
  };
  const endOfMonth = (date: Date) => {
    const { year, month } = toBs(date);
    return fromBs(year, month, looseMonthLength(year, month));
  };
  const startOfYear = (date: Date) => fromBs(toBs(date).year, 1, 1);
  const endOfYear = (date: Date) => {
    const { year } = toBs(date);
    return fromBs(year, 12, looseMonthLength(year, 12));
  };
  const addMonths = (date: Date, amount: number) => {
    const { year, month, day } = toBs(date);
    return fromBs(year, month + amount, day); // day is clamped: 32 Jestha + 1 month = last day of Asar
  };
  const monthIndex = (date: Date) => {
    const { year, month } = toBs(date);
    return year * 12 + month - 1;
  };
  const eachStart = (interval: Interval, step: (date: Date) => Date, first: (date: Date) => Date) => {
    let start = toDate(interval.start);
    let end = toDate(interval.end);
    const reversed = start > end;
    if (reversed) [start, end] = [end, start];
    const dates: Date[] = [];
    for (let d = first(start); d <= end; d = step(d)) dates.push(d);
    return reversed ? dates.reverse() : dates;
  };

  return {
    newDate: (year: number, month0: number, date: number) => {
      const { year: y, month } = normalizeMonth(year, month0 + 1);
      return fromBs(y, month, date);
    },
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
    addMonths,
    addYears: (date: Date, amount: number) => addMonths(date, amount * 12),
    getMonth: (date: Date) => toBs(date).month - 1,
    getYear: (date: Date) => toBs(date).year,
    setMonth: (date: Date, month: number) => {
      const bs = toBs(date);
      return fromBs(bs.year, month + 1, bs.day);
    },
    setYear: (date: Date, year: number) => {
      const bs = toBs(date);
      return fromBs(year, bs.month, bs.day);
    },
    isSameMonth: (left: Date, right: Date) => monthIndex(left) === monthIndex(right),
    isSameYear: (left: Date, right: Date) => toBs(left).year === toBs(right).year,
    differenceInCalendarMonths: (left: Date, right: Date) => monthIndex(left) - monthIndex(right),
    eachMonthOfInterval: (interval: Interval) => eachStart(interval, (d) => addMonths(d, 1), startOfMonth),
    eachYearOfInterval: (interval: Interval) => eachStart(interval, (d) => addMonths(d, 12), startOfYear),
    getWeek: (date: Date, opts?: { weekStartsOn?: number }) => looseBsWeek(date, opts?.weekStartsOn ?? 0),
    getISOWeek: (date: Date) => looseBsWeek(date, 1),
    format: (date: Date, formatStr: string) => {
      let format = formatters.get(formatStr);
      if (!format) {
        // DayPicker builds keys and data-day attributes from these two; keep them ASCII.
        const idPattern = formatStr === "yyyy-MM-dd" ? "YYYY-MM-DD" : formatStr === "yyyy-MM" ? "YYYY-MM" : undefined;
        let pattern = idPattern ?? translateDateFnsPattern(formatStr);
        if (pattern === undefined) {
          warnOnce(`The BS date library cannot format "${formatStr}"; it prints the BS date instead.`);
          pattern = "YYYY-MM-DD";
        }
        format = createFormatterWith(
          { pattern, calendar: "bs", lang, digits: idPattern ? "en" : digits, monthNames },
          toBs,
          (d) => looseBsWeek(d, 0),
        );
        formatters.set(formatStr, format);
      }
      return format(date);
    },
  };
}

/**
 * A react-day-picker `DateLib` instance with the BS overrides, for code that works with DayPicker's
 * date library directly (custom components, tests).
 */
export function getBsDateLib(options: BsDateLibOptions = {}, dateLibOptions?: DateLibOptions): DateLib {
  return new DateLib({ weekStartsOn: 0, ...dateLibOptions }, createBsDateLib(options));
}
