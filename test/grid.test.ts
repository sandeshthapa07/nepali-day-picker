import { afterEach, describe, expect, it } from "vitest";
import {
  allowProjectedDates,
  BS_DATA_INFO,
  bsToAd,
  getBsMonthGrid,
  getBsMonthLength,
  ProjectedDateError,
} from "../src";
import { createEventLookup, NEPAL_HOLIDAYS } from "../src/holidays";
import { withProjectedDates, ymd } from "./helpers";

const bsDays = (week: { bs: { day: number } }[]) => week.map((d) => d.bs.day);

describe("getBsMonthGrid", () => {
  afterEach(() => allowProjectedDates(false));

  it("lays out a month in Sunday-first weeks, filled with the neighbouring months' days", () => {
    // Baisakh 2082 starts on a Monday and has 31 days.
    const grid = getBsMonthGrid(2082, 1);
    expect([grid.year, grid.month, grid.daysInMonth]).toEqual([2082, 1, 31]);
    expect(ymd(grid.start)).toBe("2025-04-14");
    expect(ymd(grid.end)).toBe("2025-05-14");
    expect(grid.weekdays).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(grid.weeks).toHaveLength(5);
    expect(bsDays(grid.weeks[0])).toEqual([31, 1, 2, 3, 4, 5, 6]); // 31 Chaitra 2081, then Baisakh
    expect(grid.weeks[0][0].outside).toBe(true);
    expect(grid.weeks[0][1]).toMatchObject({
      bs: { year: 2082, month: 1, day: 1 },
      ad: { year: 2025, month: 4, day: 14 },
      weekday: 1,
      outside: false,
      inRange: true,
      saturday: false,
    });
    expect(grid.weeks[0][6].saturday).toBe(true);
    expect(bsDays(grid.weeks[4])).toEqual([28, 29, 30, 31, 1, 2, 3]); // then Jestha
    expect(grid.weeks[4][4].outside).toBe(true);
  });

  it("every cell is the next day, and the month's days appear once, in every confirmed month", () => {
    for (let year = 1970; year <= BS_DATA_INFO.lastConfirmed.year; year++) {
      for (let month = 1; month <= 12; month++) {
        const days = getBsMonthGrid(year, month).weeks.flat();
        const inside = days.filter((d) => !d.outside);
        const where = `BS ${year}-${month}`;
        if (inside.length !== getBsMonthLength(year, month)) expect(inside.length, where).toBe(-1);
        if (inside[0].bs.day !== 1 || inside[0].date.getDay() !== days.indexOf(inside[0])) {
          expect(inside[0].bs, where).toEqual({ year, month, day: 1 });
        }
        // BS dates run on day by day. (Dates can repeat in a time zone that skipped a day, such as
        // Pacific/Apia on 30 December 2011, like everywhere else in the package.)
        for (let i = 1; i < days.length; i++) {
          if (!days[i - 1].inRange) continue;
          const [a, b] = [days[i - 1].bs, days[i].bs];
          const continues = b.year === a.year && b.month === a.month && b.day === a.day + 1;
          const turns = b.day === 1 && a.day === getBsMonthLength(a.year, a.month) && b.month === (a.month % 12) + 1;
          if (!continues && !turns) expect([a, b], `${where} cell ${i}`).toBe("consecutive");
        }
      }
    }
  });

  it("weekStartsOn and fixedWeeks change the shape", () => {
    const monday = getBsMonthGrid(2082, 1, { weekStartsOn: 1 });
    expect(monday.weekdays).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(bsDays(monday.weeks[0])).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(getBsMonthGrid(2082, 1, { fixedWeeks: true }).weeks).toHaveLength(6);
    expect(() => getBsMonthGrid(2082, 1, { weekStartsOn: 7 })).toThrow(/weekStartsOn/);
  });

  it("marks today", () => {
    const grid = getBsMonthGrid(2083, 8, { today: new Date(2026, 10, 26) }); // 10 Mangsir 2083
    const today = grid.weeks.flat().filter((d) => d.today);
    expect(today.map((d) => d.bs)).toEqual([{ year: 2083, month: 8, day: 10 }]);
  });

  it("attaches holidays and events from a lookup", () => {
    const lookup = createEventLookup([...NEPAL_HOLIDAYS, { date: "2083-06-14", name: "Office party" }]);
    const days = getBsMonthGrid(2083, 6, { events: lookup }).weeks.flat();
    const day = (n: number) => days.find((d) => !d.outside && d.bs.day === n);
    expect(day(3)?.holiday).toBe(true);
    expect(day(3)?.events.map((e) => e.name)).toEqual([{ ne: "संविधान दिवस", en: "Constitution Day" }]);
    expect(day(14)?.holiday).toBe(false);
    expect(day(14)?.events.map((e) => e.name)).toEqual(["Office party"]);
    expect(day(10)?.saturday && !day(10)?.holiday).toBe(true); // a Saturday is not a listed holiday
    expect(day(4)?.events).toEqual([]);
    expect(
      getBsMonthGrid(2083, 6)
        .weeks.flat()
        .every((d) => d.events.length === 0),
    ).toBe(true);
  });

  it("links the months around it, and stops at the ends of the range", () => {
    expect(getBsMonthGrid(2082, 12).next).toEqual({ year: 2083, month: 1 });
    expect(getBsMonthGrid(2083, 1).previous).toEqual({ year: 2082, month: 12 });
    expect(getBsMonthGrid(1970, 1).previous).toBeNull();
    expect(getBsMonthGrid(2083, 12).next).toBeNull();
    expect(withProjectedDates(() => getBsMonthGrid(2083, 12).next)).toEqual({ year: 2084, month: 1 });
  });

  it("flags the days past the confirmed data, and the days before BS 1970", () => {
    const chaitra = getBsMonthGrid(2083, 12).weeks.flat();
    const past = chaitra.filter((d) => !d.inRange);
    expect(past.length).toBeGreaterThan(0);
    expect(past.every((d) => d.outside && d.date > bsToAd(2083, 12, 30))).toBe(true);
    const baisakh1970 = getBsMonthGrid(1970, 1).weeks.flat();
    expect(baisakh1970.filter((d) => !d.inRange).every((d) => d.outside && d.date < bsToAd(1970, 1, 1))).toBe(true);
  });

  it("throws for months outside the range or in a projected year", () => {
    expect(() => getBsMonthGrid(2084, 1)).toThrow(ProjectedDateError);
    expect(() => getBsMonthGrid(1969, 12)).toThrow(RangeError);
    expect(() => getBsMonthGrid(2082, 13)).toThrow(RangeError);
    allowProjectedDates();
    expect(
      getBsMonthGrid(2084, 1)
        .weeks.flat()
        .every((d) => d.inRange),
    ).toBe(true);
  });
});
