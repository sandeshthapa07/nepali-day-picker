// The holiday and event format shared by data/holidays.json and by the lists apps pass in, and a fast
// "what is on this day?" lookup for the calendar. Nothing here throws while a calendar renders: input
// is checked once, when a lookup is built.
import { dayNumberFromAd, dayNumberFromDate } from "../core/convert";
import { toAsciiDigits } from "../core/digits";
import { looseBsFromDayNumber, looseDayNumberFromBs, looseMonthLength } from "../core/loose";
import type { Lang } from "../core/pattern";
import { FIRST_YEAR, LAST_YEAR } from "../data/table";

/**
 * A holiday or an event, in the format of `data/holidays.json`. Pass many at once to the calendar's
 * `events` prop, or read them from JSON with `parseEvents`.
 *
 * ```json
 * { "date": "2083-05-29", "name": { "ne": "तिज", "en": "Teej" }, "type": "holiday" }
 * ```
 */
export interface CalendarEvent {
  /**
   * The day: a BS date `"YYYY-MM-DD"` (Nepali digits are fine), an AD date of the same shape when
   * `calendar` is `"ad"`, or a `Date` (its local calendar day).
   */
  date: string | Date;
  /** Last day of a multi-day holiday or event, inclusive, in the same form as `date`. At most 366 days. */
  endDate?: string | Date;
  /** Calendar of `date` and `endDate` strings, and of `repeat`. Default `"bs"`. */
  calendar?: "bs" | "ad";
  /** The title, or one per script; the calendar shows the one for its `lang`. */
  name: string | { ne?: string; en?: string };
  /** `"holiday"` shows the day in red, like a public holiday. `"event"` (default) adds a dot under it. */
  type?: "holiday" | "event";
  /** Repeats every year on the same month and day of `calendar`, from `date` on. Not with `endDate`. */
  repeat?: "yearly";
  /** Colour of the event's dot, any CSS colour. Default: the text colour. */
  color?: string;
  /** Your own id, kept as is. Any other field is kept too. */
  id?: string | number;
}

/** Everything on one day, in the order the events were given. */
export type EventLookup = (date: Date) => CalendarEvent[];

const MAX_SPAN = 366;

/** The event's name in `lang`, or in the other script when that one is missing. */
export function getEventName(event: CalendarEvent, lang: Lang = "ne"): string {
  const { name } = event;
  if (typeof name === "string") return name;
  return name[lang] ?? name[lang === "ne" ? "en" : "ne"] ?? "";
}

/** True for `type: "holiday"`. */
export const isHolidayEvent = (event: CalendarEvent): boolean => event.type === "holiday";

interface Parsed {
  year: number;
  month: number;
  day: number;
  /** Day number of the date. */
  n: number;
}

const DATE = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/;

function fail(where: string, message: string): never {
  throw new TypeError(`${where}: ${message}`);
}

function parseDay(value: unknown, calendar: "bs" | "ad", where: string): Parsed {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) fail(where, "is an Invalid Date");
    const n = dayNumberFromDate(value);
    if (calendar === "ad") return { year: value.getFullYear(), month: value.getMonth() + 1, day: value.getDate(), n };
    return { ...looseBsFromDayNumber(n), n };
  }
  if (typeof value !== "string") fail(where, `must be a "YYYY-MM-DD" string or a Date; got ${typeof value}`);
  const match = DATE.exec(toAsciiDigits(value.trim()));
  if (!match) fail(where, `must look like "2083-01-15"; got "${value}"`);
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month < 1 || month > 12) fail(where, `has no month ${month}`);
  if (calendar === "ad") {
    // dayNumberFromAd accepts month 13 as January of the next year.
    const days = dayNumberFromAd(year, month + 1, 1) - dayNumberFromAd(year, month, 1);
    if (day < 1 || day > days) fail(where, `AD ${value} does not exist`);
    return { year, month, day, n: dayNumberFromAd(year, month, day) };
  }
  if (year < FIRST_YEAR || year > LAST_YEAR) fail(where, `BS ${value} is outside BS ${FIRST_YEAR}-${LAST_YEAR}`);
  if (day < 1 || day > looseMonthLength(year, month)) fail(where, `BS ${value} does not exist`);
  return { year, month, day, n: looseDayNumberFromBs(year, month, day) };
}

/** Checks one event and returns its first and last day numbers. Throws a TypeError naming the problem. */
function check(event: unknown, where: string): { event: CalendarEvent; from: Parsed; to: Parsed } {
  if (typeof event !== "object" || event === null) fail(where, "must be an object");
  const e = event as Record<string, unknown>;
  const calendar = e.calendar ?? "bs";
  if (calendar !== "bs" && calendar !== "ad")
    fail(`${where}.calendar`, `must be "bs" or "ad"; got ${String(calendar)}`);
  const { name } = e;
  const named =
    (typeof name === "string" && name.trim() !== "") ||
    (typeof name === "object" &&
      name !== null &&
      [(name as { ne?: unknown }).ne, (name as { en?: unknown }).en].some((s) => typeof s === "string" && s !== ""));
  if (!named) fail(`${where}.name`, 'must be a non-empty string or { "ne": "…", "en": "…" }');
  if (e.type !== undefined && e.type !== "holiday" && e.type !== "event") {
    fail(`${where}.type`, `must be "holiday" or "event"; got ${String(e.type)}`);
  }
  if (e.repeat !== undefined && e.repeat !== "yearly")
    fail(`${where}.repeat`, `must be "yearly"; got ${String(e.repeat)}`);
  if (e.color !== undefined && typeof e.color !== "string") fail(`${where}.color`, "must be a CSS colour string");
  const from = parseDay(e.date, calendar, `${where}.date`);
  let to = from;
  if (e.endDate !== undefined) {
    if (e.repeat !== undefined) fail(where, "repeat cannot be combined with endDate");
    to = parseDay(e.endDate, calendar, `${where}.endDate`);
    if (to.n < from.n) fail(`${where}.endDate`, "is before date");
    if (to.n - from.n >= MAX_SPAN) fail(`${where}.endDate`, `spans more than ${MAX_SPAN} days`);
  }
  return { event: event as CalendarEvent, from, to };
}

/**
 * Reads holidays and events in the `data/holidays.json` format: an array of events, an object with an
 * `events` array, or that JSON as a string. Returns the events, or throws a TypeError that names the
 * first bad one, such as `events[3].date: must look like "2083-01-15"; got "2083-1-15x"`.
 */
export function parseEvents(input: unknown): CalendarEvent[] {
  const data = typeof input === "string" ? (JSON.parse(input) as unknown) : input;
  const list = Array.isArray(data) ? data : (data as { events?: unknown } | null)?.events;
  if (!Array.isArray(list)) throw new TypeError('Expected an array of events, or an object with an "events" array.');
  list.forEach((event, i) => {
    check(event, `events[${i}]`);
  });
  return list as CalendarEvent[];
}

/**
 * Indexes holidays and events for fast lookups by day: `lookup(date)` returns what is on that date's
 * local calendar day. Checks every event first, like `parseEvents`.
 */
export function createEventLookup(events: readonly CalendarEvent[]): EventLookup {
  const byDay = new Map<number, CalendarEvent[]>();
  // Yearly events by month (1-12), per calendar.
  const yearly = { bs: [] as Yearly[][], ad: [] as Yearly[][] };
  const add = (n: number, event: CalendarEvent) => {
    const list = byDay.get(n);
    if (list) list.push(event);
    else byDay.set(n, [event]);
  };
  events.forEach((value, i) => {
    const { event, from, to } = check(value, `events[${i}]`);
    if (event.repeat === "yearly") {
      const months = yearly[event.calendar ?? "bs"];
      months[from.month] ??= [];
      months[from.month].push({ day: from.day, from: from.n, event });
    } else {
      for (let n = from.n; n <= to.n; n++) add(n, event);
    }
  });
  const hasYearly = yearly.bs.length > 0 || yearly.ad.length > 0;

  return (date: Date): CalendarEvent[] => {
    const n = dayNumberFromDate(date);
    const found = byDay.get(n);
    if (!hasYearly) return found ? [...found] : [];
    const out = found ? [...found] : [];
    const bs = looseBsFromDayNumber(n);
    matchYearly(yearly.bs[bs.month], bs.day, looseMonthLength(bs.year, bs.month), n, out);
    const month = date.getMonth() + 1;
    const adMonthLength =
      dayNumberFromAd(date.getFullYear(), month + 1, 1) - dayNumberFromAd(date.getFullYear(), month, 1);
    matchYearly(yearly.ad[month], date.getDate(), adMonthLength, n, out);
    return out;
  };
}

interface Yearly {
  day: number;
  /** Day number of the first occurrence; nothing shows before it. */
  from: number;
  event: CalendarEvent;
}

/** Adds the yearly events of a month that fall on `day`. A day past the month's end moves to its last day. */
function matchYearly(list: Yearly[] | undefined, day: number, monthLength: number, n: number, out: CalendarEvent[]) {
  if (!list) return;
  for (const y of list) if (Math.min(y.day, monthLength) === day && n >= y.from) out.push(y.event);
}
