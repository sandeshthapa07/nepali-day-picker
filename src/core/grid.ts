// A headless BS month grid: the weeks of a month as plain data, for any UI framework (Vue, Svelte,
// Angular, Solid, plain DOM) or none. React users get the same grid from nepali-day-picker/react.
import type { CalendarEvent } from "../holidays/events";
import {
  type BsDate,
  dateFromDayNumber,
  dayNumberFromBs,
  dayNumberFromDate,
  getBsMonthLength,
  isValidBs,
  lastDayNumber,
  weekdayOfDayNumber,
} from "./convert";
import { looseBsFromDayNumber } from "./loose";

export interface BsMonthGridOptions {
  /** First day of the week, 0 = Sunday, as on Nepali calendars (default) … 6 = Saturday. */
  weekStartsOn?: number;
  /** Always six weeks, so the grid keeps its height from month to month. Default `false`. */
  fixedWeeks?: boolean;
  /**
   * What is on each day: a lookup from `nepali-day-picker/holidays`, such as
   * `createEventLookup([...NEPAL_HOLIDAYS, ...yourEvents])`. Without it, `events` is empty.
   */
  events?: (date: Date) => readonly CalendarEvent[];
  /** The day to mark as today. Default: the current date, in the local time zone. */
  today?: Date;
}

/** One cell of the grid. */
export interface BsGridDay {
  /** The day as a local-midnight `Date`: the value to select, store or send. */
  date: Date;
  /** Its BS date. Only a placeholder when `inRange` is false. */
  bs: BsDate;
  /** Its Gregorian date, month 1-12. */
  ad: { year: number; month: number; day: number };
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number;
  /** In the previous or next month, filling the first or last week. */
  outside: boolean;
  /**
   * False for a day outside the supported range: before BS 1970, or past the confirmed data (see
   * `allowProjectedDates`). Only outside days of the first and last month can be. Hide or disable them.
   */
  inRange: boolean;
  /** The `today` day. */
  today: boolean;
  /** Saturday, Nepal's weekly holiday. */
  saturday: boolean;
  /** At least one of `events` is a holiday (`type: "holiday"`). Saturdays alone do not count. */
  holiday: boolean;
  /** The holidays and events on the day, from the `events` option. */
  events: CalendarEvent[];
}

export interface BsMonthGrid {
  /** The BS year and month (1-12) of the grid. */
  year: number;
  month: number;
  /** Days in the month, 29-32. */
  daysInMonth: number;
  /** First and last day of the month, local midnight: `formatBs(grid.start, "MMMM YYYY")` captions it. */
  start: Date;
  end: Date;
  /** Weekday numbers in column order, for the header: `WEEKDAYS.ne.short[n]`. */
  weekdays: number[];
  /** The weeks, each seven days long. */
  weeks: BsGridDay[][];
  /** The months before and after, or null at the end of the supported range. */
  previous: { year: number; month: number } | null;
  next: { year: number; month: number } | null;
}

/**
 * The weeks of a BS month as plain data, to render a calendar in any framework. Months start on the
 * right weekday, and the first and last weeks are filled with days of the neighbouring months.
 * `month` is 1-12. Throws a RangeError for a month outside the supported range, and a
 * ProjectedDateError for one in a projected year.
 *
 * ```ts
 * const grid = getBsMonthGrid(2083, 8);
 * grid.weeks[0][3]; // { date, bs: { year: 2083, month: 8, day: 1 }, ad: …, outside: false, … }
 * ```
 */
export function getBsMonthGrid(year: number, month: number, options: BsMonthGridOptions = {}): BsMonthGrid {
  const { weekStartsOn = 0, fixedWeeks = false, events, today = new Date() } = options;
  if (!Number.isInteger(weekStartsOn) || weekStartsOn < 0 || weekStartsOn > 6) {
    throw new RangeError(`weekStartsOn must be a weekday from 0 (Sunday) to 6; got ${weekStartsOn}.`);
  }
  const daysInMonth = getBsMonthLength(year, month); // checks the month and the range
  const first = dayNumberFromBs(year, month, 1);
  const last = first + daysInMonth - 1;
  const lead = (weekdayOfDayNumber(first) - weekStartsOn + 7) % 7;
  const cells = fixedWeeks ? 42 : Math.ceil((lead + daysInMonth) / 7) * 7;
  const todayNumber = dayNumberFromDate(today);
  const end = lastDayNumber();

  const weeks: BsGridDay[][] = [];
  for (let i = 0; i < cells; i++) {
    const n = first - lead + i;
    const date = dateFromDayNumber(n);
    const weekday = weekdayOfDayNumber(n);
    const list = events ? [...events(date)] : [];
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push({
      date,
      bs: looseBsFromDayNumber(n),
      ad: { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() },
      weekday,
      outside: n < first || n > last,
      inRange: n >= 0 && n <= end,
      today: n === todayNumber,
      saturday: weekday === 6,
      holiday: list.some((e) => e.type === "holiday"),
      events: list,
    });
  }

  const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  return {
    year,
    month,
    daysInMonth,
    start: dateFromDayNumber(first),
    end: dateFromDayNumber(last),
    weekdays: Array.from({ length: 7 }, (_, i) => (weekStartsOn + i) % 7),
    weeks,
    previous: isValidBs(previous.year, previous.month, 1) ? previous : null,
    next: isValidBs(next.year, next.month, 1) ? next : null,
  };
}
