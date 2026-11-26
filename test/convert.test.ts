import { afterEach, describe, expect, it } from "vitest";
import {
  adToBs,
  allowProjectedDates,
  BS_DATA_INFO,
  BS_RANGE,
  bsToAd,
  formatBs,
  getBsMonthLength,
  getBsWeek,
  getBsWeekOfMonth,
  isValidBs,
  ProjectedDateError,
} from "../src";
import { allAdDays, local, localDayExists, useProjectedDates, withProjectedDates, ymd } from "./helpers";

// BS date -> AD date. New years from published calendars, plus well-known national dates.
const GOLDEN: [string, [number, number, number], string][] = [
  ["table epoch", [1970, 1, 1], "1913-04-13"],
  ["common epoch", [2000, 1, 1], "1943-04-14"],
  ["Democracy Day, 7 Falgun 2007", [2007, 11, 7], "1951-02-18"],
  ["Loktantra Day, 11 Baisakh 2063", [2063, 1, 11], "2006-04-24"],
  ["Republic Day, 15 Jestha 2065", [2065, 2, 15], "2008-05-28"],
  ["Gorkha earthquake, 12 Baisakh 2072", [2072, 1, 12], "2015-04-25"],
  ["Constitution Day, 3 Asoj 2072", [2072, 6, 3], "2015-09-20"],
  ["new year 2070", [2070, 1, 1], "2013-04-14"],
  ["new year 2071", [2071, 1, 1], "2014-04-14"],
  ["new year 2072", [2072, 1, 1], "2015-04-14"],
  ["new year 2073", [2073, 1, 1], "2016-04-13"],
  ["new year 2074", [2074, 1, 1], "2017-04-14"],
  ["new year 2075", [2075, 1, 1], "2018-04-14"],
  ["new year 2076", [2076, 1, 1], "2019-04-14"],
  ["new year 2077", [2077, 1, 1], "2020-04-13"],
  ["new year 2078", [2078, 1, 1], "2021-04-14"],
  ["new year 2079", [2079, 1, 1], "2022-04-14"],
  ["new year 2080", [2080, 1, 1], "2023-04-14"],
  ["new year 2081", [2081, 1, 1], "2024-04-13"],
  ["new year 2082", [2082, 1, 1], "2025-04-14"],
  ["new year 2083", [2083, 1, 1], "2026-04-14"],
  ["last day of 2081", [2081, 12, 31], "2025-04-13"],
  ["plan example, 12 Baisakh 2082", [2082, 1, 12], "2025-04-25"],
];

describe("golden dates", () => {
  it.each(GOLDEN)("%s", (_, [year, month, day], ad) => {
    expect(ymd(bsToAd(year, month, day))).toBe(ad);
    expect(adToBs(local(ad))).toEqual({ year, month, day });
  });

  it("12 Baisakh 2082 is a Friday", () => {
    expect(bsToAd(2082, 1, 12).getDay()).toBe(5);
  });
});

describe("exhaustive", () => {
  useProjectedDates();

  it("maps every supported day both ways, one BS day per AD day", () => {
    let previous: { year: number; month: number; day: number } | undefined;
    let count = 0;
    for (const [, iso] of allAdDays()) {
      count++;
      if (!localDayExists(iso)) {
        // The time zone skipped this day; there is no local Date for it.
        previous = undefined;
        continue;
      }
      const bs = adToBs(local(iso));
      expect(ymd(bsToAd(bs))).toBe(iso);
      if (previous) {
        const next =
          previous.day < getBsMonthLength(previous.year, previous.month)
            ? { ...previous, day: previous.day + 1 }
            : previous.month < 12
              ? { year: previous.year, month: previous.month + 1, day: 1 }
              : { year: previous.year + 1, month: 1, day: 1 };
        if (bs.year !== next.year || bs.month !== next.month || bs.day !== next.day) {
          expect(bs, `AD ${iso}`).toEqual(next);
        }
      }
      previous = bs;
    }
    expect(count).toBeGreaterThan(47_000);
  });
});

describe("adToBs", () => {
  it("ignores the time of day", () => {
    expect(adToBs(new Date(2025, 3, 25, 0, 0, 0))).toEqual({ year: 2082, month: 1, day: 12 });
    expect(adToBs(new Date(2025, 3, 25, 23, 59, 59, 999))).toEqual({ year: 2082, month: 1, day: 12 });
  });

  it("throws a RangeError that names the range outside it", () => {
    const before = BS_RANGE.startDate;
    before.setDate(before.getDate() - 1);
    const after = BS_RANGE.endDate;
    after.setDate(after.getDate() + 1);
    expect(() => adToBs(before)).toThrow(RangeError);
    expect(() => adToBs(before)).toThrow(/^AD 1913-04-12 is outside the supported range/);
    expect(() => adToBs(before)).toThrow(/BS 1970-01-01 to BS 2083-12-30 \(AD 1913-04-13 to AD 2027-04-13\)/);
    expect(() => adToBs(after)).toThrow(RangeError);
    withProjectedDates(() => {
      const pastTable = BS_RANGE.endDate;
      pastTable.setDate(pastTable.getDate() + 1);
      expect(() => adToBs(pastTable)).toThrow(/BS 1970-01-01 to BS 2100-12-\d\d \(AD 1913-04-13 to AD 2044-04-\d\d\)/);
    });
  });

  it("throws on an Invalid Date", () => {
    expect(() => adToBs(new Date(Number.NaN))).toThrow(RangeError);
  });

  it("does not read years 0-99 as 1900-1999", () => {
    const d = new Date(2000, 0, 1);
    d.setFullYear(50);
    expect(() => adToBs(d)).toThrow(RangeError);
  });
});

describe("bsToAd", () => {
  it("returns local midnight", () => {
    const d = bsToAd(2082, 1, 12);
    expect([d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()]).toEqual([0, 0, 0, 0]);
  });

  it("accepts an object", () => {
    expect(ymd(bsToAd({ year: 2082, month: 1, day: 12 }))).toBe("2025-04-25");
  });

  it("throws a RangeError for dates that do not exist or are out of range", () => {
    expect(() => bsToAd(2082, 1, 32)).toThrow(RangeError);
    expect(() => bsToAd(2082, 0, 1)).toThrow(RangeError);
    expect(() => bsToAd(2082, 13, 1)).toThrow(RangeError);
    expect(() => bsToAd(1969, 12, 30)).toThrow(RangeError);
    expect(() => bsToAd(2101, 1, 1)).toThrow(RangeError);
    expect(() => bsToAd(2082.5, 1, 1)).toThrow(RangeError);
  });
});

describe("validation helpers", () => {
  it("getBsMonthLength returns 29-32 and throws outside the table", () => {
    expect(getBsMonthLength(2082, 1)).toBe(31);
    expect(getBsMonthLength(2081, 12)).toBe(31);
    expect(() => getBsMonthLength(2082, 13)).toThrow(RangeError);
    expect(() => getBsMonthLength(2101, 1)).toThrow(RangeError);
  });

  it("isValidBs checks range, month and day", () => {
    expect(isValidBs(2082, 1, 31)).toBe(true);
    expect(isValidBs(2082, 1, 32)).toBe(false);
    expect(isValidBs(2082, 12, 0)).toBe(false);
    expect(isValidBs(1969, 1, 1)).toBe(false);
    expect(isValidBs(2082, 1.5, 1)).toBe(false);
  });

  it("BS_RANGE gives fresh Dates for DayPicker", () => {
    expect(BS_RANGE.start).toEqual({ year: 1970, month: 1, day: 1 });
    expect(BS_RANGE.end).toEqual(BS_DATA_INFO.lastConfirmed);
    expect(BS_RANGE.startDate).not.toBe(BS_RANGE.startDate);
    expect(ymd(BS_RANGE.startDate)).toBe("1913-04-13");
    expect(adToBs(BS_RANGE.endDate)).toEqual(BS_RANGE.end);
    withProjectedDates(() => {
      expect(BS_RANGE.end.year).toBe(2100);
      expect(adToBs(BS_RANGE.endDate)).toEqual(BS_RANGE.end);
    });
  });
});

describe("projected years", () => {
  afterEach(() => allowProjectedDates(false));
  const lastConfirmed = () => bsToAd(BS_DATA_INFO.lastConfirmed);
  const firstProjected = () => {
    const d = lastConfirmed();
    d.setDate(d.getDate() + 1);
    return d;
  };

  it("confirmed data ends on the last day of BS 2083", () => {
    expect(BS_DATA_INFO.projectedFrom).toBe(2084);
    expect(BS_DATA_INFO.lastConfirmed).toEqual({ year: 2083, month: 12, day: 30 });
    expect(ymd(lastConfirmed())).toBe("2027-04-13");
    expect(adToBs(lastConfirmed())).toEqual({ year: 2083, month: 12, day: 30 });
  });

  it("throw a ProjectedDateError, which is a RangeError", () => {
    let error: unknown;
    try {
      bsToAd(2084, 1, 1);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ProjectedDateError);
    expect(error).toBeInstanceOf(RangeError);
    const projected = error as ProjectedDateError;
    expect(projected.name).toBe("ProjectedDateError");
    expect(projected.year).toBe(2084);
    expect(projected.message).toMatch(/^BS 2084-01-01 falls in BS 2084, whose month lengths/);
    expect(projected.message).toContain("BS 1970-01-01 to BS 2083-12-30 (AD 1913-04-13 to AD 2027-04-13)");
    expect(projected.message).toContain("allowProjectedDates()");
  });

  it("are rejected by every strict function", () => {
    expect(() => adToBs(firstProjected())).toThrow(/^AD 2027-04-14 falls in BS 2084/);
    expect(() => adToBs(new Date(2040, 0, 1))).toThrow(ProjectedDateError);
    expect(() => bsToAd({ year: 2090, month: 6, day: 15 })).toThrow(ProjectedDateError);
    expect(() => getBsMonthLength(2084, 1)).toThrow(/^BS month 2084-01 falls in BS 2084/);
    expect(() => formatBs(firstProjected(), "iso")).toThrow(ProjectedDateError);
    expect(() => getBsWeek(firstProjected())).toThrow(ProjectedDateError);
    expect(() => getBsWeekOfMonth(firstProjected())).toThrow(ProjectedDateError);
    expect(isValidBs(2084, 1, 1)).toBe(false);
    expect(isValidBs(2083, 12, 30)).toBe(true);
  });

  it("past the table stays a plain RangeError", () => {
    for (const fn of [() => bsToAd(2101, 1, 1), () => adToBs(new Date(2050, 0, 1)), () => getBsMonthLength(2101, 1)]) {
      expect(fn).toThrow(RangeError);
      expect(fn).not.toThrow(ProjectedDateError);
      expect(fn).toThrow(/Projected dates up to BS 2100 need allowProjectedDates\(\)/);
    }
  });

  it("work after allowProjectedDates(), until it is turned off again", () => {
    allowProjectedDates();
    expect(adToBs(firstProjected())).toEqual({ year: 2084, month: 1, day: 1 });
    expect(getBsMonthLength(2084, 1)).toBeGreaterThanOrEqual(30);
    expect(isValidBs(2100, 1, 1)).toBe(true);
    expect(formatBs(firstProjected(), "iso")).toBe("2084-01-01");
    expect(() => bsToAd(2101, 1, 1)).toThrow(RangeError);
    allowProjectedDates(false);
    expect(() => adToBs(firstProjected())).toThrow(ProjectedDateError);
  });
});

describe("test environment", () => {
  it("runs in the requested time zone", () => {
    const expected = process.env.EXPECTED_TZ;
    if (!expected) return;
    // Compare canonical names: ICU reports Asia/Kathmandu as Asia/Katmandu, for example.
    const canonical = (timeZone?: string) => new Intl.DateTimeFormat("en", { timeZone }).resolvedOptions().timeZone;
    expect(canonical()).toBe(canonical(expected));
  });
});
