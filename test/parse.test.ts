import { describe, expect, it } from "vitest";
import { bsToAd, formatBs, parseAd, parseBs } from "../src";
import { ymd } from "./helpers";

const ref = { referenceDate: new Date(2026, 10, 24) }; // BS 2083
const expected = "2025-04-25"; // 12 Baisakh 2082
const parsed = (d: Date | null) => (d ? ymd(d) : null);

describe("parseBs", () => {
  it.each([
    "DD/MM/YY",
    "DD/MM/YYYY",
    "MM/DD/YYYY",
    "YY/MM/DD",
    "YYYY/MM/DD",
    "D MMMM YYYY",
    "MMMM D, YYYY",
    "YYYY MMMM D",
    "D MMM YYYY",
    "dddd, D MMMM YYYY",
    "ddd, D MMM YY",
    "YYYY [साल] MMMM D [गते], dddd",
    "MMMM Do, YYYY",
    "short",
    "medium",
    "long",
    "full",
    "iso",
  ])("reads back what formatBs writes: %s", (pattern) => {
    const date = bsToAd(2082, 1, 12);
    for (const lang of ["ne", "en"] as const) {
      expect(parsed(parseBs(formatBs(date, pattern, { lang }), pattern, ref)), lang).toBe(expected);
    }
  });

  it("accepts Nepali, ASCII and mixed digits", () => {
    expect(parsed(parseBs("१२/01/२०८२", "DD/MM/YYYY"))).toBe(expected);
  });

  it("accepts common month spellings, in any case", () => {
    for (const text of ["12 Baishakh 2082", "12 vaisakh 2082", "12 BAISAKH 2082", "१२ वैशाख २०८२", "12 Bai 2082"]) {
      expect(parsed(parseBs(text, "D MMMM YYYY")), text).toBe(expected);
    }
    const shrawan = ymd(bsToAd(2082, 4, 1));
    for (const text of ["1 Shrawan 2082", "1 Saun 2082", "1 साउन 2082", "1 श्रावण 2082"]) {
      expect(parsed(parseBs(text, "D MMMM YYYY")), text).toBe(shrawan);
    }
    const mangsir = ymd(bsToAd(2083, 8, 1));
    for (const text of ["1 Mangsir 2083", "1 Marga 2083", "१ मंसिर २०८३", "१ मार्गशीर्ष २०८३"]) {
      expect(parsed(parseBs(text, "D MMMM YYYY")), text).toBe(mangsir);
    }
  });

  it("does not mistake Ashwin for its short form Ash", () => {
    expect(parsed(parseBs("1 Ashwin 2082", "D MMMM YYYY"))).toBe(ymd(bsToAd(2082, 6, 1)));
    expect(parsed(parseBs("1 Ash 2082", "D MMM YYYY"))).toBe(ymd(bsToAd(2082, 6, 1)));
    expect(parsed(parseBs("1 Asar 2082", "D MMMM YYYY"))).toBe(ymd(bsToAd(2082, 3, 1)));
  });

  it("resolves YY to the nearest supported year", () => {
    expect(parsed(parseBs("12/01/82", "DD/MM/YY", ref))).toBe(expected);
    expect(parsed(parseBs("01/01/99", "DD/MM/YY", ref))).toBe(ymd(bsToAd(2099, 1, 1)));
    expect(parsed(parseBs("01/01/75", "DD/MM/YY", { referenceDate: new Date(1950, 0, 1) }))).toBe(
      ymd(bsToAd(1975, 1, 1)),
    );
  });

  it("returns null for dates that do not exist or are out of range", () => {
    expect(parseBs("32/01/2082", "DD/MM/YYYY")).toBeNull(); // Baisakh 2082 has 31 days
    expect(parseBs("01/13/2082", "DD/MM/YYYY")).toBeNull();
    expect(parseBs("00/01/2082", "DD/MM/YYYY")).toBeNull();
    expect(parseBs("01/01/2101", "DD/MM/YYYY")).toBeNull();
    expect(parseBs("01/01/1969", "DD/MM/YYYY")).toBeNull();
  });

  it("returns null for text that does not match, and never throws", () => {
    expect(parseBs("", "DD/MM/YYYY")).toBeNull();
    expect(parseBs("hello", "DD/MM/YYYY")).toBeNull();
    expect(parseBs("12-01-2082", "DD/MM/YYYY")).toBeNull();
    expect(parseBs("12 Foo 2082", "D MMMM YYYY")).toBeNull();
    expect(parseBs("Baisakh 12", "MMMM D")).toBeNull(); // no year
    expect(parseBs(undefined as unknown as string, "iso")).toBeNull();
  });

  it("tries a list of patterns in order", () => {
    expect(parsed(parseBs("2082-01-12", ["DD/MM/YYYY", "YYYY-MM-DD"]))).toBe(expected);
    expect(parsed(parseBs("12/01/2082", ["DD/MM/YYYY", "YYYY-MM-DD"]))).toBe(expected);
  });

  it("reads 1-2 digit fields between separators and fixed widths without them", () => {
    expect(parsed(parseBs("1/1/2082", "DD/MM/YYYY"))).toBe(ymd(bsToAd(2082, 1, 1)));
    expect(parsed(parseBs("20820112", "YYYYMMDD"))).toBe(expected);
  });

  it("trims and accepts extra spaces", () => {
    expect(parsed(parseBs("  12   Baisakh 2082 ", "D MMMM YYYY"))).toBe(expected);
  });

  it("returns local midnight", () => {
    const d = parseBs("2082-01-12", "iso");
    expect(d?.getHours()).toBe(0);
  });
});

describe("parseAd", () => {
  it("reads Gregorian text with the same patterns", () => {
    expect(parsed(parseAd("25 April 2025", "D MMMM YYYY"))).toBe(expected);
    expect(parsed(parseAd("२५ अप्रिल २०२५", "long"))).toBe(expected);
    expect(parsed(parseAd("Friday, 25 April 2025", "full"))).toBe(expected);
    expect(parsed(parseAd("29 Sept 2025", "D MMM YYYY"))).toBe("2025-09-29");
    expect(parsed(parseAd("2025-04-25", "iso"))).toBe(expected);
  });

  it("checks leap years", () => {
    expect(parsed(parseAd("29/02/2024", "DD/MM/YYYY"))).toBe("2024-02-29");
    expect(parseAd("29/02/2025", "DD/MM/YYYY")).toBeNull();
    expect(parseAd("31/04/2025", "DD/MM/YYYY")).toBeNull();
  });

  it("resolves YY to the nearest year", () => {
    expect(parsed(parseAd("25/04/25", "DD/MM/YY", ref))).toBe(expected);
  });
});
