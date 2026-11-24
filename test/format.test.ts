import { describe, expect, it } from "vitest";
import { bsToAd, createFormatter, formatAd, formatBs, getBsMonthLength, toAsciiDigits, toNepaliDigits } from "../src";

// 12 Baisakh 2082 = Friday 25 April 2025 (the plan's running example).
const date = new Date(2025, 3, 25);

describe("tokens (plan: Date formats > Tokens)", () => {
  it.each([
    ["YYYY", "२०८२", "2082"],
    ["YY", "८२", "82"],
    ["M", "१", "1"],
    ["MM", "०१", "01"],
    ["MMM", "बैशाख", "Bai"],
    ["MMMM", "बैशाख", "Baisakh"],
    ["D", "१२", "12"],
    ["DD", "१२", "12"],
    ["Do", "१२ गते", "12th"],
    ["d", "५", "5"],
    ["dd", "शु", "Fr"],
    ["ddd", "शुक्र", "Fri"],
    ["dddd", "शुक्रबार", "Friday"],
    ["w", "२", "2"],
    ["ww", "०२", "02"],
    ["[गते]", "गते", "गते"],
    ["[of]", "of", "of"],
  ])("%s", (pattern, ne, en) => {
    expect(formatBs(date, pattern, { lang: "ne" })).toBe(ne);
    expect(formatBs(date, pattern, { lang: "en" })).toBe(en);
  });
});

describe("common patterns (plan: Date formats > Common patterns)", () => {
  it.each([
    ["DD/MM/YY", "१२/०१/८२", "12/01/82"],
    ["DD/MM/YYYY", "१२/०१/२०८२", "12/01/2082"],
    ["MM/DD/YYYY", "०१/१२/२०८२", "01/12/2082"],
    ["YY/MM/DD", "८२/०१/१२", "82/01/12"],
    ["YYYY/MM/DD", "२०८२/०१/१२", "2082/01/12"],
    ["D MMMM YYYY", "१२ बैशाख २०८२", "12 Baisakh 2082"],
    ["MMMM D, YYYY", "बैशाख १२, २०८२", "Baisakh 12, 2082"],
    ["YYYY MMMM D", "२०८२ बैशाख १२", "2082 Baisakh 12"],
    ["MMMM Do", "बैशाख १२ गते", "Baisakh 12th"],
    ["D MMM YYYY", "१२ बैशाख २०८२", "12 Bai 2082"],
    ["dddd, D MMMM YYYY", "शुक्रबार, १२ बैशाख २०८२", "Friday, 12 Baisakh 2082"],
    ["ddd, D MMM YY", "शुक्र, १२ बैशाख ८२", "Fri, 12 Bai 82"],
    ["MMMM YYYY", "बैशाख २०८२", "Baisakh 2082"],
  ])("%s", (pattern, ne, en) => {
    expect(formatBs(date, pattern, { lang: "ne" })).toBe(ne);
    expect(formatBs(date, pattern, { lang: "en" })).toBe(en);
  });

  it("traditional Nepali form", () => {
    expect(formatBs(date, "YYYY [साल] MMMM D [गते], dddd", { lang: "ne" })).toBe("२०८२ साल बैशाख १२ गते, शुक्रबार");
  });
});

describe("presets", () => {
  it.each([
    ["short", "१२/०१/२०८२", "12/01/2082"],
    ["medium", "१२ बैशाख २०८२", "12 Bai 2082"],
    ["long", "१२ बैशाख २०८२", "12 Baisakh 2082"],
    ["full", "शुक्रबार, १२ बैशाख २०८२", "Friday, 12 Baisakh 2082"],
    ["iso", "2082-01-12", "2082-01-12"],
  ])("%s", (preset, ne, en) => {
    expect(formatBs(date, preset, { lang: "ne" })).toBe(ne);
    expect(formatBs(date, preset, { lang: "en" })).toBe(en);
  });

  it("iso ignores digits too", () => {
    expect(formatBs(date, "iso", { lang: "ne", digits: "ne" })).toBe("2082-01-12");
  });

  it("YYYY-MM-DD as a plain pattern still follows lang", () => {
    expect(formatBs(date, "YYYY-MM-DD", { lang: "ne" })).toBe("२०८२-०१-१२");
  });
});

describe("options", () => {
  it("defaults to Nepali", () => {
    expect(formatBs(date, "long")).toBe("१२ बैशाख २०८२");
  });

  it("digits overrides only the digits", () => {
    expect(formatBs(date, "long", { lang: "ne", digits: "en" })).toBe("12 बैशाख 2082");
    expect(formatBs(date, "long", { lang: "en", digits: "ne" })).toBe("१२ Baisakh २०८२");
  });

  it("monthNames: formal", () => {
    expect(formatBs(date, "long", { lang: "ne", monthNames: "formal" })).toBe("१२ वैशाख २०८२");
    expect(formatBs(bsToAd(2082, 8, 1), "MMMM", { monthNames: "formal" })).toBe("मार्गशीर्ष");
    expect(formatBs(date, "long", { lang: "en", monthNames: "formal" })).toBe("12 Baisakh 2082");
  });

  it("createFormatter compiles once and formats many dates", () => {
    const format = createFormatter({ pattern: "D MMM", lang: "en" });
    expect([1, 2, 3].map((d) => format(bsToAd(2082, 1, d)))).toEqual(["1 Bai", "2 Bai", "3 Bai"]);
  });

  it("throws outside the range", () => {
    expect(() => formatBs(new Date(1900, 0, 1), "long")).toThrow(RangeError);
  });
});

describe("English ordinals", () => {
  // Find a 32-day month so 31st and 32nd can be checked too.
  const month = [1, 2, 3, 4].find((m) => getBsMonthLength(2082, m) === 32) ?? 0;
  it.each([
    [1, "1st"],
    [2, "2nd"],
    [3, "3rd"],
    [4, "4th"],
    [11, "11th"],
    [12, "12th"],
    [13, "13th"],
    [21, "21st"],
    [22, "22nd"],
    [23, "23rd"],
    [31, "31st"],
    [32, "32nd"],
  ])("%i", (day, expected) => {
    expect(month).toBeGreaterThan(0);
    expect(formatBs(bsToAd(2082, month, day), "Do", { lang: "en" })).toBe(expected);
  });
});

describe("formatAd", () => {
  it("uses the same patterns for Gregorian dates", () => {
    expect(formatAd(date, "D MMMM YYYY", { lang: "ne" })).toBe("२५ अप्रिल २०२५");
    expect(formatAd(date, "D MMMM YYYY", { lang: "en" })).toBe("25 April 2025");
    expect(formatAd(date, "full", { lang: "en" })).toBe("Friday, 25 April 2025");
    expect(formatAd(date, "iso", { lang: "ne" })).toBe("2025-04-25");
    expect(formatAd(date, "D MMM YY", { lang: "en" })).toBe("25 Apr 25");
  });

  it("w is the US-style week of the Gregorian year", () => {
    expect(formatAd(date, "w", { lang: "en" })).toBe("17");
    expect(formatAd(new Date(2024, 11, 29), "w", { lang: "en" })).toBe("1");
  });

  it("works outside the BS range", () => {
    expect(formatAd(new Date(1900, 0, 1), "iso")).toBe("1900-01-01");
  });
});

describe("digits", () => {
  it("converts both ways and keeps other characters", () => {
    expect(toNepaliDigits(2082)).toBe("२०८२");
    expect(toNepaliDigits("12/01-2082 abc")).toBe("१२/०१-२०८२ abc");
    expect(toAsciiDigits("१२ बैशाख २०८२")).toBe("12 बैशाख 2082");
    expect(toAsciiDigits(toNepaliDigits("0123456789"))).toBe("0123456789");
  });
});
