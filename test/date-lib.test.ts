import { afterEach, describe, expect, it, vi } from "vitest";
import { BS_RANGE, bsToAd, getBsMonthLength } from "../src";
import { getBsDateLib } from "../src/date-lib";
import { ymd } from "./helpers";

const lib = getBsDateLib({ lang: "ne" });
const en = getBsDateLib({ lang: "en" });
const nextDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

describe("DateLib contract, every month in the table", () => {
  it("month bounds, getters, setters and arithmetic agree with the converter", () => {
    let months = 0;
    for (let year = 1970; year <= 2100; year++) {
      for (let month = 1; month <= 12; month++) {
        months++;
        const start = bsToAd(year, month, 1);
        const end = bsToAd(year, month, getBsMonthLength(year, month));
        const where = `BS ${year}-${month}`;
        const check = (actual: unknown, expected: unknown) => {
          if (actual !== expected) expect(actual, where).toBe(expected);
        };
        check(ymd(lib.newDate(year, month - 1, 1)), ymd(start));
        check(lib.getMonth(end), month - 1);
        check(lib.getYear(end), year);
        check(ymd(lib.startOfMonth(end)), ymd(start));
        check(ymd(lib.endOfMonth(start)), ymd(end));
        check(lib.isSameMonth(start, end), true);
        check(lib.isSameYear(start, end), true);
        if (year < 2100 || month < 12) {
          check(ymd(lib.addMonths(start, 1)), ymd(nextDay(end)));
          check(lib.isSameMonth(end, nextDay(end)), false);
          check(lib.differenceInCalendarMonths(nextDay(end), start), 1);
        }
      }
    }
    expect(months).toBe(131 * 12);
  });

  it("startOfMonth(d) <= d <= endOfMonth(d) on every 5th day", () => {
    const first = BS_RANGE.startDate;
    for (let d = first; d <= BS_RANGE.endDate; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 5)) {
      if (!(lib.startOfMonth(d) <= d && d <= lib.endOfMonth(d))) expect(ymd(d)).toBe("in its month");
    }
  });

  it("clamps the day when adding months, setting the month or setting the year", () => {
    // Find a 32-day month followed by a shorter one.
    const year = 2082;
    let month = 1;
    while (!(getBsMonthLength(year, month) === 32 && getBsMonthLength(year, month + 1) < 32)) month++;
    const day32 = bsToAd(year, month, 32);
    const lastOfNext = bsToAd(year, month + 1, getBsMonthLength(year, month + 1));
    expect(ymd(lib.addMonths(day32, 1))).toBe(ymd(lastOfNext));
    expect(ymd(lib.setMonth(day32, month))).toBe(ymd(lastOfNext)); // month index = next month
    expect(ymd(lib.addMonths(bsToAd(2082, 1, 12), -1))).toBe(ymd(bsToAd(2081, 12, 12)));
    expect(ymd(lib.addYears(bsToAd(2082, 1, 12), 1))).toBe(ymd(bsToAd(2083, 1, 12)));
    expect(ymd(lib.setYear(bsToAd(2082, 1, 12), 2070))).toBe(ymd(bsToAd(2070, 1, 12)));
    const chaitra31 = bsToAd(2081, 12, 31);
    if (getBsMonthLength(2082, 12) < 31) {
      expect(ymd(lib.setYear(chaitra31, 2082))).toBe(ymd(bsToAd(2082, 12, getBsMonthLength(2082, 12))));
    }
  });

  it("year bounds and lists of months and years", () => {
    const d = bsToAd(2082, 5, 10);
    expect(ymd(lib.startOfYear(d))).toBe(ymd(bsToAd(2082, 1, 1)));
    expect(ymd(lib.endOfYear(d))).toBe(ymd(bsToAd(2082, 12, getBsMonthLength(2082, 12))));
    const months = lib.eachMonthOfInterval({ start: lib.startOfYear(d), end: lib.endOfYear(d) });
    expect(months.map((m) => lib.getMonth(m))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(months.map(ymd)).toEqual(Array.from({ length: 12 }, (_, i) => ymd(bsToAd(2082, i + 1, 1))));
    const reversed = lib.eachMonthOfInterval({ start: lib.endOfYear(d), end: lib.startOfYear(d) });
    expect(reversed.map((m) => lib.getMonth(m))).toEqual([11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
    // DateLib gained eachYearOfInterval after 9.7; older versions build year lists another way.
    if (typeof lib.eachYearOfInterval === "function") {
      const years = lib.eachYearOfInterval({ start: bsToAd(2080, 6, 1), end: bsToAd(2082, 2, 1) });
      expect(years.map((y) => lib.getYear(y))).toEqual([2080, 2081, 2082]);
    }
  });

  it("week numbers follow the BS year", () => {
    expect(lib.getWeek(bsToAd(2082, 1, 12))).toBe(2);
    expect(lib.getWeek(bsToAd(2081, 12, 31))).toBe(1);
    expect(lib.getISOWeek(bsToAd(2082, 1, 12))).toBe(2);
  });

  it("keeps day-level operations from date-fns", () => {
    const d = bsToAd(2082, 1, 12);
    expect(ymd(lib.addDays(d, 1))).toBe("2025-04-26");
    expect(ymd(lib.startOfWeek(d))).toBe("2025-04-20");
    expect(ymd(lib.endOfWeek(d))).toBe("2025-04-26");
  });
});

describe("format: the date-fns patterns DayPicker sends", () => {
  const d = bsToAd(2082, 1, 12); // Friday 25 April 2025
  it.each([
    ["LLLL y", "बैशाख २०८२", "Baisakh 2082"],
    ["y LLLL", "२०८२ बैशाख", "2082 Baisakh"],
    ["LLLL", "बैशाख", "Baisakh"],
    ["yyyy", "२०८२", "2082"],
    ["d", "१२", "12"],
    ["cccccc", "शु", "Fr"],
    ["cccc", "शुक्रबार", "Friday"],
    ["PPPP", "शुक्रबार, १२ बैशाख २०८२", "Friday, 12 Baisakh 2082"],
    ["PPP", "१२ बैशाख २०८२", "12 Baisakh 2082"],
    ["yyyy-MM-dd", "2082-01-12", "2082-01-12"],
    ["yyyy-MM", "2082-01", "2082-01"],
    ["do MMM yy", "१२ गते बैशाख ८२", "12th Bai 82"],
    ["EEE, d 'de' LLLL", "शुक्र, १२ de बैशाख", "Fri, 12 de Baisakh"],
    ["'week' w", "week २", "week 2"],
  ])("%s", (pattern, ne, english) => {
    expect(lib.format(d, pattern)).toBe(ne);
    expect(en.format(d, pattern)).toBe(english);
  });

  afterEach(() => vi.restoreAllMocks());
  it("warns once about a token it cannot translate, and prints the BS date", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(en.format(d, "QQQ")).toBe("2082-01-12");
    expect(en.format(d, "QQQ")).toBe("2082-01-12");
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe("edges of the table", () => {
  it("never throws for the days a grid shows around the first and last month", () => {
    const first = BS_RANGE.startDate;
    const last = BS_RANGE.endDate;
    const around = [-10, -1, 0, 1, 10].flatMap((n) => [
      new Date(first.getFullYear(), first.getMonth(), first.getDate() + n),
      new Date(last.getFullYear(), last.getMonth(), last.getDate() + n),
    ]);
    for (const d of around) {
      expect(() => [lib.startOfMonth(d), lib.endOfMonth(d), lib.format(d, "PPPP"), lib.getWeek(d)]).not.toThrow();
      expect(lib.startOfMonth(d) <= d && d <= lib.endOfMonth(d)).toBe(true);
    }
    expect(ymd(lib.addMonths(lib.startOfMonth(last), 1))).toBe(ymd(nextDay(last)));
  });
});
