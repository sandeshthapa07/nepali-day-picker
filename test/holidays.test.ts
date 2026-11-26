import { describe, expect, it } from "vitest";
import data from "../data/holidays.json";
import { bsToAd, ProjectedDateError } from "../src";
import {
  type CalendarEvent,
  createEventLookup,
  getEventName,
  getPublicHolidays,
  HOLIDAY_YEARS,
  NEPAL_HOLIDAYS,
  parseEvents,
} from "../src/holidays";
import { local, ymd } from "./helpers";

// AD dates of the nationwide holidays in the Government of Nepal's list for BS 2083 (MoHA notice of
// 2082/11/18), as Pradhan Law publishes it. See data/SOURCES.md.
const OFFICIAL_2083: [string, string, string?][] = [
  ["Nepali New Year", "2026-04-14"],
  ["Buddha Jayanti, International Labour Day, Ubhauli Parwa", "2026-05-01"],
  ["Republic Day", "2026-05-29"],
  ["Janai Purnima, Raksha Bandhan", "2026-08-28"],
  ["Krishna Janmashtami", "2026-09-04"],
  ["Constitution Day", "2026-09-19"],
  ["Ghatasthapana", "2026-10-11"],
  ["Dashain holidays", "2026-10-17", "2026-10-23"],
  ["Tihar holidays", "2026-11-08", "2026-11-12"],
  ["Chhath Parwa", "2026-11-15"],
  ["Dhanya Purnima, Udhauli Parwa, Yomari Punhi", "2026-12-24"],
  ["Christmas Day", "2026-12-25"],
  ["Tamu Lhosar", "2026-12-30"],
  ["Prithvi Jayanti, National Unity Day", "2027-01-11"],
  ["Maghe Sankranti, Maghi Parwa", "2027-01-15"],
  ["Martyrs' Day", "2027-01-30"],
  ["Sonam Lhosar", "2027-02-07"],
  ["Democracy Day", "2027-02-19"],
  ["Maha Shivaratri", "2027-03-06"],
  ["Gyalpo Lhosar", "2027-03-09"],
];

const en = (events: CalendarEvent[]) => events.map((e) => getEventName(e, "en"));

describe("built-in holidays (data/holidays.json)", () => {
  it("is valid input in the public format", () => {
    expect(parseEvents(data)).toHaveLength(NEPAL_HOLIDAYS.length);
    expect(HOLIDAY_YEARS).toEqual([2083]);
    for (const event of NEPAL_HOLIDAYS) {
      expect(event.type).toBe("holiday");
      expect(typeof event.date === "string" && event.date.startsWith("2083-")).toBe(true);
      expect(getEventName(event, "ne")).not.toBe("");
      expect(getEventName(event, "en")).not.toBe("");
    }
  });

  it("matches the official AD dates of BS 2083, day by day", () => {
    const expected = new Map<string, string>();
    for (const [name, from, to = from] of OFFICIAL_2083) {
      for (let d = local(from); d <= local(to); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
        expected.set(ymd(d), name);
      }
    }
    expect(expected.size).toBe(30); // 18 single days, Dashain 7, Tihar 5
    // Every day of BS 2083: a holiday exactly on the official days.
    const lookup = createEventLookup(NEPAL_HOLIDAYS);
    for (
      let d = bsToAd(2083, 1, 1);
      d <= bsToAd(2083, 12, 30);
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
    ) {
      const names = en(lookup(d));
      const official = expected.get(ymd(d));
      if (names.join() !== (official ?? "")) expect(names, `AD ${ymd(d)}`).toEqual(official ? [official] : []);
    }
  });
});

describe("getPublicHolidays", () => {
  it("lists the holidays on a date", () => {
    expect(en(getPublicHolidays(local("2026-09-19")))).toEqual(["Constitution Day"]);
    expect(en(getPublicHolidays(local("2026-10-20")))).toEqual(["Dashain holidays"]);
    expect(getPublicHolidays(local("2026-11-26"))).toEqual([]); // 10 Mangsir 2083
  });

  it("throws for a year without data instead of saying no holiday", () => {
    expect(() => getPublicHolidays(local("2025-10-01"))).toThrow(/No public-holiday data for BS 2082 yet/);
    expect(() => getPublicHolidays(local("2027-05-01"))).toThrow(ProjectedDateError);
  });
});

describe("parseEvents", () => {
  it("accepts an array, an { events } object, or JSON text", () => {
    const list = [{ date: "2083-08-15", name: "Office party" }];
    expect(parseEvents(list)).toBe(list);
    expect(parseEvents({ events: list })).toBe(list);
    expect(parseEvents(JSON.stringify({ events: list }))).toEqual(list);
  });

  it("names the first bad event and what is wrong with it", () => {
    const bad = (event: unknown) => () => parseEvents([{ date: "2083-01-01", name: "ok" }, event]);
    expect(bad({ date: "2083-13-01", name: "x" })).toThrow(/^events\[1\]\.date: has no month 13/);
    expect(bad({ date: "2083-01-32", name: "x" })).toThrow(/BS 2083-01-32 does not exist/); // Baisakh 2083 has 31
    expect(bad({ date: "15/01/2083", name: "x" })).toThrow(/must look like "2083-01-15"/);
    expect(bad({ date: "2101-01-01", name: "x" })).toThrow(/outside BS 1970-2100/);
    expect(bad({ date: "2026-02-29", calendar: "ad", name: "x" })).toThrow(/AD 2026-02-29 does not exist/);
    expect(bad({ date: "2083-01-01" })).toThrow(/^events\[1\]\.name: must be a non-empty string/);
    expect(bad({ date: "2083-01-01", name: { fr: "x" } })).toThrow(/events\[1\]\.name/);
    expect(bad({ date: "2083-01-01", name: "x", type: "festival" })).toThrow(/type: must be "holiday" or "event"/);
    expect(bad({ date: "2083-01-01", name: "x", repeat: "monthly" })).toThrow(/repeat: must be "yearly"/);
    expect(bad({ date: "2083-01-05", endDate: "2083-01-01", name: "x" })).toThrow(/endDate: is before date/);
    expect(bad({ date: "2083-01-01", endDate: "2084-06-01", name: "x" })).toThrow(/spans more than 366 days/);
    expect(bad({ date: "2083-01-01", endDate: "2083-01-02", name: "x", repeat: "yearly" })).toThrow(
      /repeat cannot be combined with endDate/,
    );
    expect(bad("2083-01-01")).toThrow(/^events\[1\]: must be an object/);
    expect(() => parseEvents({ holidays: [] })).toThrow(/an object with an "events" array/);
  });

  it("accepts Nepali digits and slashes", () => {
    const [event] = parseEvents([{ date: "२०८३/०८/१५", name: "x" }]);
    expect(createEventLookup([event])(local("2026-12-01"))).toEqual([event]);
  });
});

describe("createEventLookup", () => {
  it("covers every day of a multi-day event, in BS or AD", () => {
    const lookup = createEventLookup([
      { date: "2083-08-14", endDate: "2083-08-16", name: "Trek" },
      { date: "2026-12-31", endDate: "2027-01-01", calendar: "ad", name: "New Year trip" },
    ]);
    expect(en(lookup(local("2026-11-29")))).toEqual([]);
    expect(en(lookup(local("2026-11-30")))).toEqual(["Trek"]);
    expect(en(lookup(local("2026-12-02")))).toEqual(["Trek"]);
    expect(en(lookup(local("2026-12-03")))).toEqual([]);
    expect(en(lookup(local("2027-01-01")))).toEqual(["New Year trip"]);
  });

  it("takes Dates as their local calendar day", () => {
    const lookup = createEventLookup([{ date: new Date(2026, 11, 1, 18, 30), name: "Meeting" }]);
    expect(en(lookup(new Date(2026, 11, 1)))).toEqual(["Meeting"]);
  });

  it("repeats yearly on the BS date, from the first year on", () => {
    // Born 5 Jestha 2050: the birthday falls on a different AD date each year.
    const lookup = createEventLookup([{ date: "2050-02-05", name: "Birthday", repeat: "yearly" }]);
    expect(en(lookup(bsToAd(2083, 2, 5)))).toEqual(["Birthday"]);
    expect(en(lookup(bsToAd(2082, 2, 5)))).toEqual(["Birthday"]);
    expect(en(lookup(bsToAd(2083, 2, 6)))).toEqual([]);
    expect(en(lookup(bsToAd(2049, 2, 5)))).toEqual([]); // before the first one
  });

  it("moves a yearly day past the end of a shorter month to its last day", () => {
    // Asar has 32 days in 2079 and 31 in 2080.
    const bsLookup = createEventLookup([{ date: "2079-03-32", name: "Asar 32", repeat: "yearly" }]);
    expect(en(bsLookup(bsToAd(2079, 3, 32)))).toEqual(["Asar 32"]);
    expect(en(bsLookup(bsToAd(2080, 3, 31)))).toEqual(["Asar 32"]); // the last day of a 31-day Asar
    expect(en(bsLookup(bsToAd(2080, 3, 30)))).toEqual([]);
    expect(en(bsLookup(bsToAd(2083, 3, 31)))).toEqual([]); // 2083 has its own Asar 32
    expect(en(bsLookup(bsToAd(2083, 3, 32)))).toEqual(["Asar 32"]);
    const adLookup = createEventLookup([{ date: "2024-02-29", calendar: "ad", name: "Leap", repeat: "yearly" }]);
    expect(en(adLookup(local("2028-02-29")))).toEqual(["Leap"]);
    expect(en(adLookup(local("2027-02-28")))).toEqual(["Leap"]);
    expect(en(adLookup(local("2027-03-01")))).toEqual([]);
  });

  it("returns your own objects, in the order given, with extra fields kept", () => {
    const a = { date: "2083-08-15", name: "A", id: 7, room: "B2" };
    const b = { date: "2083-08-15", name: "B", type: "holiday" as const };
    expect(createEventLookup([a, b])(local("2026-12-01"))).toEqual([a, b]);
    expect(createEventLookup([a, b])(local("2026-12-01"))[0]).toBe(a);
  });
});

describe("getEventName", () => {
  it("picks the script, and falls back to the other one", () => {
    const both: CalendarEvent = { date: "2083-01-01", name: { ne: "नयाँ वर्ष", en: "New Year" } };
    expect(getEventName(both, "ne")).toBe("नयाँ वर्ष");
    expect(getEventName(both, "en")).toBe("New Year");
    expect(getEventName({ date: "2083-01-01", name: { en: "Only English" } }, "ne")).toBe("Only English");
    expect(getEventName({ date: "2083-01-01", name: "Plain" }, "ne")).toBe("Plain");
  });
});
