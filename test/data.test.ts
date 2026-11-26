import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BS_DATA_INFO, getBsMonthLength } from "../src";
import { ENCODED_MONTHS, FIRST_YEAR, LAST_YEAR, PROJECTED_FROM } from "../src/data/table";
import { useProjectedDates } from "./helpers";

const json = JSON.parse(readFileSync(new URL("../data/bs-calendar.json", import.meta.url), "utf8")) as {
  projectedFrom: number;
  years: { year: number; months: number[]; status: string }[];
};

describe("data table", () => {
  useProjectedDates();

  it("matches data/bs-calendar.json month by month", () => {
    expect(ENCODED_MONTHS.length).toBe(json.years.length);
    for (const row of json.years) {
      const decoded = Array.from({ length: 12 }, (_, m) => getBsMonthLength(row.year, m + 1));
      expect(decoded, `BS ${row.year}`).toEqual(row.months);
    }
  });

  it("covers BS 1970-2100 with 365- or 366-day years", () => {
    expect([FIRST_YEAR, LAST_YEAR]).toEqual([1970, 2100]);
    for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
      let total = 0;
      for (let m = 1; m <= 12; m++) total += getBsMonthLength(year, m);
      expect([365, 366], `BS ${year} has ${total} days`).toContain(total);
    }
  });

  it("marks projected, disputed and single-source years", () => {
    expect(PROJECTED_FROM).toBe(json.projectedFrom);
    expect(BS_DATA_INFO.projectedFrom).toBe(2084);
    const statuses = (status: string) => json.years.filter((r) => r.status === status).map((r) => r.year);
    expect(BS_DATA_INFO.disputedYears).toEqual(statuses("disputed"));
    expect(BS_DATA_INFO.singleSourceYears).toEqual(statuses("single-source"));
    expect(statuses("projected")[0]).toBe(PROJECTED_FROM);
  });
});
