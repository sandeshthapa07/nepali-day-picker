import { describe, expect, it } from "vitest";
import {
  bsToAd,
  type FiscalPeriod,
  formatFiscalYear,
  getBsMonthLength,
  getFiscalPeriod,
  getFiscalPeriodRange,
  getFiscalYear,
  parseFiscalYear,
} from "../src";
import { ymd } from "./helpers";

const range = (fy: number, period?: FiscalPeriod, index?: number, startMonth?: number) => {
  const r = getFiscalPeriodRange(fy, period, index, { startMonth });
  return [ymd(r.start), ymd(r.end)];
};
const bs = (y: number, m: number, d: number) => ymd(bsToAd(y, m, d));
const lastDay = (y: number, m: number) => bs(y, m, getBsMonthLength(y, m));

describe("Nepal fiscal year (Shrawan 1 to the end of Asar)", () => {
  it("golden: recent fiscal years", () => {
    expect(range(2080)).toEqual(["2023-07-17", "2024-07-15"]);
    expect(range(2081)).toEqual(["2024-07-16", "2025-07-16"]);
    expect(range(2082)).toEqual(["2025-07-17", "2026-07-16"]);
  });

  it("getFiscalYear switches on Shrawan 1", () => {
    expect(getFiscalYear(bsToAd(2083, 3, getBsMonthLength(2083, 3)))).toBe(2082);
    expect(getFiscalYear(bsToAd(2083, 4, 1))).toBe(2083);
    expect(getFiscalYear(bsToAd(2083, 1, 1))).toBe(2082);
    expect(getFiscalYear(new Date(2026, 10, 24))).toBe(2083);
  });

  it.each<[FiscalPeriod, number, [number, number], [number, number]]>([
    ["half", 1, [2082, 4], [2082, 9]],
    ["half", 2, [2082, 10], [2083, 3]],
    ["trimester", 1, [2082, 4], [2082, 7]],
    ["trimester", 2, [2082, 8], [2082, 11]],
    ["trimester", 3, [2082, 12], [2083, 3]],
    ["quarter", 1, [2082, 4], [2082, 6]],
    ["quarter", 2, [2082, 7], [2082, 9]],
    ["quarter", 3, [2082, 10], [2082, 12]],
    ["quarter", 4, [2083, 1], [2083, 3]],
    ["month", 1, [2082, 4], [2082, 4]],
    ["month", 12, [2083, 3], [2083, 3]],
  ])("FY 2082/83 %s %i runs from the start of %j to the end of %j", (period, index, [y1, m1], [y2, m2]) => {
    expect(range(2082, period, index)).toEqual([bs(y1, m1, 1), lastDay(y2, m2)]);
  });

  it("getFiscalPeriod finds the period and its days", () => {
    const date = bsToAd(2082, 8, 15); // Mangsir: Q2, trimester 2, half 1, month 5
    expect(getFiscalPeriod(date, "quarter")).toMatchObject({ fiscalYear: 2082, index: 2 });
    expect(getFiscalPeriod(date, "trimester")).toMatchObject({ fiscalYear: 2082, index: 2 });
    expect(getFiscalPeriod(date, "half")).toMatchObject({ fiscalYear: 2082, index: 1 });
    expect(getFiscalPeriod(date, "month")).toMatchObject({ fiscalYear: 2082, index: 5 });
    const year = getFiscalPeriod(date);
    expect([year.fiscalYear, year.index, ymd(year.start), ymd(year.end)]).toEqual([2082, 1, ...range(2082)]);
    const q4 = getFiscalPeriod(bsToAd(2083, 2, 1), "quarter");
    expect([q4.fiscalYear, q4.index]).toEqual([2082, 4]);
  });

  it("periods tile every fiscal year with no gaps or overlaps", () => {
    const dayAfter = (iso: string) => {
      const [y, m, d] = iso.split("-").map(Number);
      return ymd(new Date(y, m - 1, d + 1));
    };
    for (let fy = 1970; fy <= 2099; fy++) {
      const [yearStart, yearEnd] = range(fy);
      for (const [period, count] of [
        ["half", 2],
        ["trimester", 3],
        ["quarter", 4],
        ["month", 12],
      ] as const) {
        let expectedStart = yearStart;
        for (let i = 1; i <= count; i++) {
          const [start, end] = range(fy, period, i);
          if (start !== expectedStart) expect(start, `FY ${fy} ${period} ${i}`).toBe(expectedStart);
          expectedStart = dayAfter(end);
        }
        if (expectedStart !== dayAfter(yearEnd)) expect(expectedStart, `FY ${fy} ${period}`).toBe(dayAfter(yearEnd));
      }
      if (fy < 2099 && dayAfter(yearEnd) !== range(fy + 1)[0]) expect(dayAfter(yearEnd)).toBe(range(fy + 1)[0]);
    }
  });

  it("throws a RangeError for periods outside the supported range", () => {
    expect(getFiscalYear(bsToAd(1970, 1, 1))).toBe(1969);
    expect(() => getFiscalPeriodRange(1969)).toThrow(/FY 1969\/70 reaches outside the supported range/);
    expect(() => getFiscalPeriodRange(2100)).toThrow(RangeError);
    expect(range(1969, "quarter", 4)).toEqual([bs(1970, 1, 1), lastDay(1970, 3)]);
    expect(range(2100, "quarter", 1)).toEqual([bs(2100, 4, 1), lastDay(2100, 6)]);
  });

  it("rejects bad arguments", () => {
    expect(() => getFiscalPeriodRange(2082, "quarter", 5)).toThrow(/4 quarter periods/);
    expect(() => getFiscalPeriodRange(2082, "quarter", 0)).toThrow(RangeError);
    expect(() => getFiscalPeriodRange(2082, "week" as FiscalPeriod)).toThrow(/Unknown fiscal period/);
    expect(() => getFiscalPeriodRange(2082.5)).toThrow(RangeError);
    expect(() => getFiscalYear(new Date(), { startMonth: 13 })).toThrow(/startMonth/);
  });
});

describe("other fiscal years (startMonth)", () => {
  it("startMonth 1 makes the fiscal year the BS year", () => {
    expect(getFiscalYear(bsToAd(2082, 1, 1), { startMonth: 1 })).toBe(2082);
    expect(getFiscalYear(bsToAd(2082, 12, 30), { startMonth: 1 })).toBe(2082);
    expect(range(2082, "year", 1, 1)).toEqual([bs(2082, 1, 1), lastDay(2082, 12)]);
    expect(range(2082, "quarter", 1, 1)).toEqual([bs(2082, 1, 1), lastDay(2082, 3)]);
  });

  it("any start month works", () => {
    const opts = { startMonth: 10 }; // Magh
    expect(getFiscalYear(bsToAd(2082, 9, 1), opts)).toBe(2081);
    expect(getFiscalYear(bsToAd(2082, 10, 1), opts)).toBe(2082);
    expect(range(2082, "year", 1, 10)).toEqual([bs(2082, 10, 1), lastDay(2083, 9)]);
    expect(getFiscalPeriod(bsToAd(2083, 1, 5), "quarter", opts)).toMatchObject({ fiscalYear: 2082, index: 2 });
  });
});

describe("formatFiscalYear", () => {
  it.each([
    [{}, "२०८२/८३"],
    [{ lang: "en" }, "2082/83"],
    [{ style: "padded" }, "२०८२/०८३"],
    [{ lang: "en", style: "padded" }, "2082/083"],
    [{ lang: "en", style: "full" }, "2082/2083"],
    [{ prefix: true }, "आ.व. २०८२/८३"],
    [{ lang: "en", prefix: true }, "FY 2082/83"],
    [{ lang: "ne", digits: "en" }, "2082/83"],
    [{ lang: "en", startMonth: 1 }, "2082"],
  ] as const)("%j", (options, expected) => {
    expect(formatFiscalYear(2082, options)).toBe(expected);
  });

  it("wraps the century", () => {
    expect(formatFiscalYear(2099, { lang: "en" })).toBe("2099/00");
    expect(formatFiscalYear(2099, { lang: "en", style: "padded" })).toBe("2099/100");
  });
});

describe("parseFiscalYear", () => {
  it.each([
    "2082/83",
    "2082/083",
    "2082/2083",
    "2082-83",
    "2082 / 83",
    "२०८२/८३",
    "२०८२/०८३",
    "FY 2082/83",
    "F.Y. 2082/83",
    "fiscal year 2082/83",
    "आ.व. २०८२/८३",
    "आ. व. २०८२/०८३",
    "आर्थिक वर्ष २०८२/८३",
  ])("%s", (text) => {
    expect(parseFiscalYear(text)).toBe(2082);
  });

  it("reads back every style formatFiscalYear writes", () => {
    for (const style of ["short", "padded", "full"] as const) {
      for (const lang of ["ne", "en"] as const) {
        expect(parseFiscalYear(formatFiscalYear(2099, { style, lang, prefix: true }))).toBe(2099);
      }
    }
  });

  it("returns null for text that is not a fiscal year", () => {
    expect(parseFiscalYear("2082/84")).toBeNull();
    expect(parseFiscalYear("2082/82")).toBeNull();
    expect(parseFiscalYear("2082")).toBeNull();
    expect(parseFiscalYear("1900/01")).toBeNull();
    expect(parseFiscalYear("hello")).toBeNull();
    expect(parseFiscalYear(42 as unknown as string)).toBeNull();
  });

  it("with startMonth 1, a fiscal year is a single BS year", () => {
    expect(parseFiscalYear("2082", { startMonth: 1 })).toBe(2082);
    expect(parseFiscalYear("2082/83", { startMonth: 1 })).toBeNull();
  });
});
