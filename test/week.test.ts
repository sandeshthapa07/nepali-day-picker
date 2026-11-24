import { describe, expect, it } from "vitest";
import { adToBs, bsToAd, getBsMonthLength, getBsWeek, getBsWeekOfMonth } from "../src";
import { allAdDays, local, localDayExists } from "./helpers";

describe("getBsWeek (plan: Weeks example)", () => {
  it("Baisakh 1, 2082 is a Monday", () => {
    expect(bsToAd(2082, 1, 1).getDay()).toBe(1);
  });

  it("week 1 of 2082 runs from Sunday 31 Chaitra 2081 to Saturday 6 Baisakh", () => {
    expect(getBsWeek(bsToAd(2081, 12, 31))).toBe(1);
    expect(bsToAd(2081, 12, 31).getDay()).toBe(0);
    expect(getBsWeek(bsToAd(2082, 1, 6))).toBe(1);
    expect(getBsWeek(bsToAd(2082, 1, 7))).toBe(2);
  });

  it("12 Baisakh 2082 is in week 2", () => {
    expect(getBsWeek(bsToAd(2082, 1, 12))).toBe(2);
  });

  it("the Saturday before is the last week of 2081", () => {
    expect(getBsWeek(bsToAd(2081, 12, 30))).toBe(53);
  });

  it("goes up by one each Sunday, or restarts at 1, across the whole range", () => {
    let previous = 0;
    for (const [, iso] of allAdDays()) {
      if (!localDayExists(iso)) {
        previous = 0;
        continue;
      }
      const date = local(iso);
      const week = getBsWeek(date);
      expect(week).toBeGreaterThanOrEqual(1);
      expect(week).toBeLessThanOrEqual(53);
      if (previous) {
        if (date.getDay() === 0) {
          if (week !== 1 && week !== previous + 1) expect(week, iso).toBe(previous + 1);
        } else if (week !== previous) expect(week, iso).toBe(previous);
      }
      previous = week;
    }
  });
});

describe("getBsWeekOfMonth", () => {
  it("12 Baisakh 2082 is on row 2", () => {
    expect(getBsWeekOfMonth(bsToAd(2082, 1, 12))).toBe(2);
  });

  it("rows follow the Sunday-first grid", () => {
    expect(getBsWeekOfMonth(bsToAd(2082, 1, 1))).toBe(1); // Monday
    expect(getBsWeekOfMonth(bsToAd(2082, 1, 6))).toBe(1); // Saturday
    expect(getBsWeekOfMonth(bsToAd(2082, 1, 7))).toBe(2); // Sunday
    expect(getBsWeekOfMonth(bsToAd(2082, 1, 31))).toBe(5);
  });

  it("some months need six rows", () => {
    let found = false;
    for (let year = 2070; year <= 2090 && !found; year++) {
      for (let month = 1; month <= 12 && !found; month++) {
        const last = bsToAd(year, month, getBsMonthLength(year, month));
        if (getBsWeekOfMonth(last) === 6) {
          found = true;
          expect(adToBs(last).day).toBeGreaterThanOrEqual(30);
        }
      }
    }
    expect(found).toBe(true);
  });
});
