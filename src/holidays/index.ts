import data from "../../data/holidays.json";
import { adToBs } from "../core/convert";
import { type CalendarEvent, createEventLookup, type EventLookup } from "./events";

export {
  type CalendarEvent,
  createEventLookup,
  type EventLookup,
  getEventName,
  isHolidayEvent,
  parseEvents,
} from "./events";

/**
 * Nepal's nationwide public holidays, from `data/holidays.json`, in the same format apps use for their
 * own events. Covers only the BS years in `HOLIDAY_YEARS`.
 */
export const NEPAL_HOLIDAYS: readonly CalendarEvent[] = Object.freeze(data.events as unknown as CalendarEvent[]);

/** The BS years `NEPAL_HOLIDAYS` covers in full. Other years have no holiday data yet. */
export const HOLIDAY_YEARS: readonly number[] = Object.freeze([...data.years]);

let builtIn: EventLookup | undefined;

/** The lookup for `NEPAL_HOLIDAYS`, built once. For the calendar. */
export function getHolidayLookup(): EventLookup {
  builtIn ??= createEventLookup(NEPAL_HOLIDAYS);
  return builtIn;
}

/**
 * Nepal's nationwide public holidays on a date: usually none, sometimes one or two. Saturdays are not
 * listed. Throws a RangeError for a BS year without holiday data (see `HOLIDAY_YEARS`), so "no data"
 * is never mistaken for "no holiday", and a ProjectedDateError for a projected year.
 *
 * ```ts
 * getPublicHolidays(new Date(2026, 8, 19)); // [{ date: "2083-06-03", name: { en: "Constitution Day", … }, … }]
 * ```
 */
export function getPublicHolidays(date: Date): CalendarEvent[] {
  const { year } = adToBs(date);
  if (!HOLIDAY_YEARS.includes(year)) {
    throw new RangeError(`No public-holiday data for BS ${year} yet. Covered: BS ${HOLIDAY_YEARS.join(", ")}.`);
  }
  return getHolidayLookup()(date);
}
