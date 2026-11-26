import * as React from "react";
import {
  type CaptionLabelProps,
  type CustomComponents,
  type DayButtonProps,
  type Formatters,
  type Labels,
  type Matcher,
  type ModifiersClassNames,
  type ModifiersStyles,
  CaptionLabel as RdpCaptionLabel,
  DayButton as RdpDayButton,
  DayPicker as RdpDayPicker,
  type DayPickerProps as RdpDayPickerProps,
} from "react-day-picker";
import { adText, assertDayNumber, BS_RANGE, dayNumberFromDate, lastDayNumber } from "../core/convert";
import { toNepaliDigits } from "../core/digits";
import { createFormatterWith } from "../core/format";
import { looseAdToBs, looseBsToAd, looseBsWeek, looseMonthLength } from "../core/loose";
import { AD_MONTHS, BS_MONTHS, WEEKDAYS } from "../core/names";
import type { Lang, Pattern } from "../core/pattern";
import { createBsDateLib, type DateLibOverrides } from "../date-lib";
import { type CalendarEvent, createEventLookup, type EventLookup, getEventName, getHolidayLookup } from "../holidays";

// Everything from react-day-picker, so this entry can replace it in an import (shadcn's calendar.tsx).
// The DayPicker and DayPickerProps declared below take precedence over the re-exported ones.
export * from "react-day-picker";
export { type BsDateLibOptions, createBsDateLib, type DateLibOverrides, getBsDateLib } from "../date-lib";
export { type CalendarEvent, parseEvents } from "../holidays";

/**
 * Which calendar lays out the grid, and whether each day also shows the other calendar's date.
 * - `"bs"`: BS months, BS days.
 * - `"bs-ad"`: BS months; each day shows its AD day number underneath.
 * - `"ad-bs"`: AD months; each day shows its BS day number underneath.
 * - `"ad"`: AD months, AD days (the stock calendar, with Nepali text when `lang` is `"ne"`).
 */
export type CalendarVariant = "bs" | "bs-ad" | "ad-bs" | "ad";

export interface NepaliCalendarOptions {
  /** Default `"bs"`. */
  variant?: CalendarVariant;
  /** Script for the main calendar's text and digits. Default `"ne"`. */
  lang?: Lang;
  /** Script for the secondary date in `"bs-ad"` and `"ad-bs"`. Default: `lang`. */
  secondaryLang?: Lang;
  /** Overrides only the main calendar's digits. Default: `lang`. */
  digits?: Lang;
  /** Everyday (बैशाख) or formal (वैशाख) Nepali BS month names. Default `"common"`. */
  monthNames?: "common" | "formal";
  /** Pattern for the month caption, in this package's tokens. Default `"MMMM YYYY"`. */
  captionFormat?: Pattern;
  /** Pattern for the day buttons' screen-reader labels. Default `"full"`. */
  labelFormat?: Pattern;
  /** Weekday header: `"dd"` (शु, Fr), `"ddd"` (शुक्र, Fri) or `"dddd"` (शुक्रबार, Friday). Default `"ddd"`. */
  weekdayFormat?: "dd" | "ddd" | "dddd";
  /**
   * Shows Nepal's nationwide public holidays (built in, from `data/holidays.json`; BS 2083 for now) in
   * red, with their names in each day's label. Default `true`.
   */
  holidays?: boolean;
  /**
   * Your own holidays and events, any number at once, in the `data/holidays.json` format. A
   * `type: "holiday"` day shows in red; an event adds a dot under the day. Keep the array stable
   * (a constant, state or `useMemo`), since a new array re-indexes it.
   */
  events?: readonly CalendarEvent[];
  /** Text colour of holidays and Saturdays, or `false` to leave it to your CSS. Default `"#dc2626"`. */
  holidayColor?: string | false;
}

/** A day button component, such as react-day-picker's `DayButton` or shadcn's `CalendarDayButton`. */
export type DayButtonComponent = CustomComponents["DayButton"];
/** A caption label component, such as react-day-picker's `CaptionLabel`. */
export type CaptionLabelComponent = CustomComponents["CaptionLabel"];

export interface UseNepaliCalendarOptions extends NepaliCalendarOptions {
  /**
   * The day button to wrap with the secondary date, event dots and holiday names on hover, such as
   * shadcn's `CalendarDayButton`.
   */
  DayButton?: DayButtonComponent;
  /** The caption label to wrap in the dual variants. Default: react-day-picker's `CaptionLabel`. */
  CaptionLabel?: CaptionLabelComponent;
}

/** Props to spread into a DayPicker, or into shadcn's `<Calendar />`. */
export interface NepaliCalendarProps {
  dateLib: DateLibOverrides | undefined;
  formatters: Partial<Formatters>;
  labels: Partial<Labels>;
  components: Partial<CustomComponents>;
  weekStartsOn: 0;
  startMonth: Date | undefined;
  endMonth: Date | undefined;
  modifiers: Record<string, Matcher | Matcher[]>;
  modifiersClassNames: ModifiersClassNames;
  modifiersStyles: ModifiersStyles;
}

/** Default text colour of holidays and Saturdays (Tailwind's red-600). */
export const HOLIDAY_COLOR = "#dc2626";

const TEXT = {
  ne: {
    today: "आज",
    selected: "छानिएको",
    next: "अर्को महिना",
    previous: "अघिल्लो महिना",
    month: "महिना छान्नुहोस्",
    year: "वर्ष छान्नुहोस्",
    week: "हप्ता",
  },
  en: {
    today: "Today",
    selected: "selected",
    next: "Go to the Next Month",
    previous: "Go to the Previous Month",
    month: "Choose the Month",
    year: "Choose the Year",
    week: "Week",
  },
} as const;

const WEEKDAY_WIDTH = { dd: "narrow", ddd: "short", dddd: "long" } as const;

/** True for a day with BS data the calendar may show: confirmed, or projected after allowProjectedDates(). */
const isInRange = (date: Date) => {
  const n = dayNumberFromDate(date);
  return n >= 0 && n <= lastDayNumber();
};

function formatter(
  calendar: "bs" | "ad",
  pattern: Pattern,
  lang: Lang,
  digits?: Lang,
  monthNames?: "common" | "formal",
) {
  return createFormatterWith({ pattern, calendar, lang, digits, monthNames }, looseAdToBs, (d) => looseBsWeek(d));
}

/** "Apr–May 2025", "Dec 2025–Jan 2026" or "Chaitra 2081–Baisakh 2082": the months a range touches. */
function spanText(start: Date, end: Date, calendar: "bs" | "ad", lang: Lang): string {
  let from = start;
  let to = end;
  if (calendar === "bs") {
    // Keep BS text inside the data table at the edges of the AD grid.
    if (!isInRange(from)) from = BS_RANGE.startDate;
    if (!isInRange(to)) to = BS_RANGE.endDate;
    if (from > to) return "";
  }
  const month = formatter(calendar, calendar === "ad" ? "MMM" : "MMMM", lang);
  const year = formatter(calendar, "YYYY", lang);
  const [m1, m2, y1, y2] = [month(from), month(to), year(from), year(to)];
  if (y1 !== y2) return `${m1} ${y1}–${m2} ${y2}`;
  return m1 === m2 ? `${m1} ${y1}` : `${m1}–${m2} ${y1}`;
}

interface DecorateOptions {
  /** Show the other calendar's day number under the main one. */
  secondary?: { calendar: "bs" | "ad"; lang: Lang; digits: Lang };
  /** Holidays and events: events add dots, and every name goes into the button's `title`. */
  lookup?: EventLookup;
  /** Script of the names in the `title`. */
  lang?: Lang;
}

const MAX_DOTS = 3;
const DOTS_STYLE: React.CSSProperties = { display: "flex", gap: "2px", justifyContent: "center", height: "4px" };
const DOT_STYLE: React.CSSProperties = { width: "4px", height: "4px", borderRadius: "50%" };

/** Wraps a day button with the secondary date, event dots and a `title` of the day's names. */
function decorateDayButton(DayButton: DayButtonComponent, options: DecorateOptions, label: string): DayButtonComponent {
  const { secondary, lookup, lang = "ne" } = options;
  const styled = DayButton === RdpDayButton;
  function NepaliDayButton(props: DayButtonProps) {
    const date = props.day.date;
    let text: string | undefined;
    if (secondary) {
      if (secondary.calendar === "ad") text = String(date.getDate());
      else if (isInRange(date)) text = String(looseAdToBs(date).day);
      if (text !== undefined && secondary.digits === "ne") text = toNepaliDigits(text);
    }
    const entries = lookup ? lookup(date) : [];
    const dots = entries.filter((e) => e.type !== "holiday").slice(0, MAX_DOTS);
    const title = entries.length > 0 ? entries.map((e) => getEventName(e, lang)).join(", ") : undefined;
    const column = styled && (text !== undefined || dots.length > 0);
    return (
      <DayButton
        {...props}
        title={props.title ?? title}
        style={column ? { flexDirection: "column", lineHeight: 1.1, ...props.style } : props.style}
      >
        {props.children}
        {text !== undefined && (
          <span data-secondary-date="" style={styled ? { fontSize: "0.7em", opacity: 0.7 } : undefined}>
            {text}
          </span>
        )}
        {dots.length > 0 && (
          <span data-events={dots.length} aria-hidden="true" style={DOTS_STYLE}>
            {dots.map((event, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: the dots are a fixed, unordered set.
              <span key={i} style={{ ...DOT_STYLE, background: event.color ?? "currentColor" }} />
            ))}
          </span>
        )}
      </DayButton>
    );
  }
  const inner = DayButton as { displayName?: string; name?: string };
  NepaliDayButton.displayName = `${label}(${inner.displayName ?? inner.name ?? "DayButton"})`;
  return NepaliDayButton;
}

/**
 * Wraps a day button so it shows the other calendar's day number under the main one, in a `<span>`.
 * shadcn's `CalendarDayButton` already styles that span small and faded; with react-day-picker's own
 * button, small inline styles are added.
 */
export function withSecondaryDate(
  DayButton: DayButtonComponent = RdpDayButton,
  options: { calendar: "bs" | "ad"; lang?: Lang; digits?: Lang },
): DayButtonComponent {
  const { calendar, lang = "ne", digits = lang } = options;
  return decorateDayButton(DayButton, { secondary: { calendar, lang, digits } }, "withSecondaryDate");
}

/** Separates the main caption from the other calendar's months in the dual variants' captions. */
export const CAPTION_SEPARATOR = " · ";

/**
 * Wraps a caption label so a dual caption ("Baisakh 2082 · Apr–May 2025") shows the other calendar's
 * months on a second, smaller line, which keeps long captions clear of the navigation buttons. Other
 * captions, and dropdown labels, render unchanged.
 */
export function withSecondaryCaption(CaptionLabel: CaptionLabelComponent = RdpCaptionLabel): CaptionLabelComponent {
  function SecondaryCaptionLabel(props: CaptionLabelProps) {
    const { children } = props;
    const at = typeof children === "string" ? children.indexOf(CAPTION_SEPARATOR) : -1;
    if (typeof children !== "string" || at < 0) return <CaptionLabel {...props} />;
    return (
      <CaptionLabel
        {...props}
        style={{
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          lineHeight: 1.2,
          ...props.style,
        }}
      >
        <span>{children.slice(0, at)}</span>
        <span data-secondary-caption="" style={{ fontSize: "0.75em", fontWeight: "normal", opacity: 0.7 }}>
          {children.slice(at + CAPTION_SEPARATOR.length)}
        </span>
      </CaptionLabel>
    );
  }
  const inner = CaptionLabel as { displayName?: string; name?: string };
  SecondaryCaptionLabel.displayName = `withSecondaryCaption(${inner.displayName ?? inner.name ?? "CaptionLabel"})`;
  return SecondaryCaptionLabel;
}

/** Builds the props behind `useNepaliCalendar`. Prefer the hook in components: it keeps them stable. */
export function createNepaliCalendar(options: UseNepaliCalendarOptions = {}): NepaliCalendarProps {
  const {
    variant = "bs",
    lang = "ne",
    secondaryLang = lang,
    digits = lang,
    monthNames = "common",
    captionFormat = "MMMM YYYY",
    labelFormat = "full",
    weekdayFormat = "ddd",
    holidays = true,
    events,
    holidayColor = HOLIDAY_COLOR,
    DayButton,
    CaptionLabel,
  } = options;
  const main: "bs" | "ad" = variant === "bs" || variant === "bs-ad" ? "bs" : "ad";
  const secondary: "bs" | "ad" | undefined = variant === "bs-ad" ? "ad" : variant === "ad-bs" ? "bs" : undefined;
  const usesBs = variant !== "ad";
  const text = TEXT[lang];
  const num = (value: number) => (digits === "ne" ? toNepaliDigits(value) : String(value));

  const caption = formatter(main, captionFormat, lang, digits, monthNames);
  const dayLabel = formatter(main, labelFormat, lang, digits, monthNames);
  const secondaryLabel = secondary && formatter(secondary, labelFormat, secondaryLang, secondaryLang, monthNames);
  const bsMonthNames = lang === "ne" && monthNames === "formal" ? BS_MONTHS.ne.formal : BS_MONTHS[lang].long;

  const monthEnd = (month: Date) => {
    if (main === "ad") return new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const { year, month: m } = looseAdToBs(month);
    return looseBsToAd(year, m, looseMonthLength(year, m));
  };
  const captionText = (month: Date) => {
    const label = caption(month);
    if (!secondary) return label;
    const span = spanText(month, monthEnd(month), secondary, secondaryLang);
    return span ? `${label}${CAPTION_SEPARATOR}${span}` : label;
  };

  const formatters: Partial<Formatters> = {
    formatCaption: captionText,
    formatDay: (date) => num(main === "bs" ? looseAdToBs(date).day : date.getDate()),
    formatWeekdayName: (weekday) => WEEKDAYS[lang][WEEKDAY_WIDTH[weekdayFormat]][weekday.getDay()],
    formatMonthDropdown: (month) =>
      main === "bs" ? bsMonthNames[looseAdToBs(month).month - 1] : AD_MONTHS[lang].long[month.getMonth()],
    formatYearDropdown: (year) => num(main === "bs" ? looseAdToBs(year).year : year.getFullYear()),
    formatWeekNumber: (weekNumber) => num(weekNumber),
  };

  // Built-in holidays first, then the app's own holidays and events. Checked here, once.
  const builtIn = holidays ? getHolidayLookup() : undefined;
  const own = events && events.length > 0 ? createEventLookup(events) : undefined;
  const lookup: EventLookup | undefined =
    builtIn && own ? (date) => [...builtIn(date), ...own(date)] : (builtIn ?? own);

  const fullLabel = (date: Date, today?: boolean) => {
    let label = dayLabel(date);
    if (secondaryLabel && (secondary === "ad" || isInRange(date))) label += ` (${secondaryLabel(date)})`;
    const names = lookup ? lookup(date).map((e) => getEventName(e, lang)) : [];
    if (names.length > 0) label += `, ${names.join(", ")}`;
    return today ? `${text.today}, ${label}` : label;
  };

  const labels: Partial<Labels> = {
    labelDayButton: (date, modifiers) =>
      modifiers?.selected ? `${fullLabel(date, modifiers.today)}, ${text.selected}` : fullLabel(date, modifiers?.today),
    labelGridcell: (date, modifiers) => fullLabel(date, modifiers?.today),
    labelGrid: (month) => captionText(month),
    labelWeekday: (weekday) => WEEKDAYS[lang].long[weekday.getDay()],
    labelNext: () => text.next,
    labelPrevious: () => text.previous,
    labelMonthDropdown: () => text.month,
    labelYearDropdown: () => text.year,
    labelWeekNumber: (weekNumber) => `${text.week} ${num(weekNumber)}`,
  };

  const components: Partial<CustomComponents> = {};
  // Wrap the day button when there is something to add to it. Without a DayButton of the caller's, only
  // when needed: in a spread into shadcn's <Calendar />, ours would replace shadcn's own button.
  const hasDots = events?.some((e) => e.type !== "holiday") ?? false;
  if (secondary || (lookup && (DayButton || hasDots))) {
    components.DayButton = decorateDayButton(
      DayButton ?? RdpDayButton,
      {
        secondary: secondary && { calendar: secondary, lang: secondaryLang, digits: secondaryLang },
        lookup,
        lang,
      },
      secondary ? "withSecondaryDate" : "withEvents",
    );
  } else if (DayButton) {
    components.DayButton = DayButton;
  }
  if (secondary) components.CaptionLabel = withSecondaryCaption(CaptionLabel);
  else if (CaptionLabel) components.CaptionLabel = CaptionLabel;

  const modifiers: Record<string, Matcher | Matcher[]> = { saturday: { dayOfWeek: [6] } };
  const modifiersClassNames: ModifiersClassNames = { saturday: "ndp-saturday" };
  if (lookup) {
    modifiers.holiday = (date: Date) => lookup(date).some((e) => e.type === "holiday");
    modifiers.event = (date: Date) => lookup(date).some((e) => e.type !== "holiday");
    modifiersClassNames.holiday = "ndp-holiday";
    modifiersClassNames.event = "ndp-event";
  }
  // On the cell, so the day number inherits it, and shadcn's selected day keeps its own text colour.
  const red = holidayColor === false ? undefined : { color: holidayColor };
  const modifiersStyles: ModifiersStyles = red ? { saturday: red, ...(lookup ? { holiday: red } : {}) } : {};

  let startMonth: Date | undefined;
  let endMonth: Date | undefined;
  if (usesBs) {
    startMonth = BS_RANGE.startDate;
    endMonth = BS_RANGE.endDate;
    if (main === "ad") {
      startMonth = new Date(startMonth.getFullYear(), startMonth.getMonth(), 1);
      endMonth = new Date(endMonth.getFullYear(), endMonth.getMonth(), 1);
    }
  }

  return {
    dateLib: main === "bs" ? createBsDateLib({ lang, digits, monthNames }) : undefined,
    formatters,
    labels,
    components,
    weekStartsOn: 0,
    startMonth,
    endMonth,
    modifiers,
    modifiersClassNames,
    modifiersStyles,
  };
}

/**
 * Props that turn react-day-picker, or shadcn's `<Calendar />`, into a Nepali calendar without
 * editing any file. Spread them into the component:
 *
 * ```tsx
 * const nepali = useNepaliCalendar({ variant: "bs-ad", DayButton: CalendarDayButton });
 * <Calendar mode="single" selected={date} onSelect={setDate} {...nepali} />
 * ```
 */
export function useNepaliCalendar(options: UseNepaliCalendarOptions = {}): NepaliCalendarProps {
  const {
    variant,
    lang,
    secondaryLang,
    digits,
    monthNames,
    captionFormat,
    labelFormat,
    weekdayFormat,
    holidays,
    events,
    holidayColor,
    DayButton,
    CaptionLabel,
  } = options;
  const end = lastDayNumber(); // changes with allowProjectedDates()
  // biome-ignore lint/correctness/useExhaustiveDependencies: `end` is module state read inside createNepaliCalendar.
  return React.useMemo(
    () =>
      createNepaliCalendar({
        variant,
        lang,
        secondaryLang,
        digits,
        monthNames,
        captionFormat,
        labelFormat,
        weekdayFormat,
        holidays,
        events,
        holidayColor,
        DayButton,
        CaptionLabel,
      }),
    [
      variant,
      lang,
      secondaryLang,
      digits,
      monthNames,
      captionFormat,
      labelFormat,
      weekdayFormat,
      holidays,
      events,
      holidayColor,
      DayButton,
      CaptionLabel,
      end,
    ],
  );
}

/** The Dates in a `selected` value: a Date, a Date[] or a { from, to } range. Invalid Dates are skipped. */
function datesIn(value: unknown): Date[] {
  const list = Array.isArray(value)
    ? value
    : value && typeof value === "object" && !(value instanceof Date)
      ? [(value as { from?: unknown }).from, (value as { to?: unknown }).to]
      : [value];
  return list.filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()));
}

/**
 * Throws when DayPicker is handed a date past the BS data it may use: a ProjectedDateError for a
 * projected year (until allowProjectedDates()), a RangeError past the table. Dates before the table are
 * left alone, as before.
 */
function assertNotPastEnd(props: RdpDayPickerProps, main: "bs" | "ad", endMonth: Date | undefined): void {
  const check = (prop: string, date: Date, isPast: boolean) => {
    const n = dayNumberFromDate(date);
    if (isPast) assertDayNumber(n, `DayPicker's ${prop} date, ${adText(n)},`);
  };
  const last = lastDayNumber();
  for (const date of datesIn((props as { selected?: unknown }).selected)) {
    check("selected", date, dayNumberFromDate(date) > last);
  }
  for (const prop of ["month", "defaultMonth"] as const) {
    const date = datesIn(props[prop])[0];
    if (!date) continue;
    // In "ad-bs" the grid shows whole AD months, so a month is past the end only after endMonth's.
    const past =
      main === "bs"
        ? dayNumberFromDate(date) > last
        : endMonth !== undefined && new Date(date.getFullYear(), date.getMonth(), 1) > endMonth;
    check(prop, date, past);
  }
}

/** react-day-picker's props plus the Nepali calendar options. */
export type DayPickerProps = RdpDayPickerProps & NepaliCalendarOptions;

/** The earlier of two optional Dates; undefined only when both are. */
const earlier = (a: Date | undefined, b: Date | undefined) => (a && b ? (a < b ? a : b) : (a ?? b));

/**
 * react-day-picker's DayPicker, showing BS months by default. Every other prop works as in
 * react-day-picker, and selected values are plain `Date`s.
 *
 * In every variant but `"ad"`, navigation ends with the last month of confirmed BS data, an `endMonth`
 * past it is cut back, and a `selected`, `month` or `defaultMonth` date in a projected year throws a
 * `ProjectedDateError` (see `allowProjectedDates`).
 *
 * ```tsx
 * <DayPicker mode="single" selected={date} onSelect={setDate} variant="bs-ad" lang="ne" />
 * ```
 */
export function DayPicker(props: DayPickerProps): React.ReactElement {
  const {
    variant,
    lang,
    secondaryLang,
    digits,
    monthNames,
    captionFormat,
    labelFormat,
    weekdayFormat,
    holidays,
    events,
    holidayColor,
    ...rest
  } = props;
  const dayPickerProps = rest as RdpDayPickerProps;
  const usesBs = variant !== "ad";
  const main = variant === "ad" || variant === "ad-bs" ? "ad" : "bs";
  const calendar = useNepaliCalendar({
    variant,
    lang,
    secondaryLang,
    digits,
    monthNames,
    captionFormat,
    labelFormat,
    weekdayFormat,
    holidays,
    events,
    holidayColor,
    // Always a button to wrap, so holiday and event names show on hover.
    DayButton: dayPickerProps.components?.DayButton ?? RdpDayButton,
    CaptionLabel: dayPickerProps.components?.CaptionLabel,
  });
  let endMonth = dayPickerProps.endMonth ?? calendar.endMonth;
  let disabled = dayPickerProps.disabled;
  if (usesBs) {
    endMonth = earlier(endMonth, calendar.endMonth);
    assertNotPastEnd(dayPickerProps, main, endMonth);
    // A BS grid hides the days after endMonth. An AD grid shows the whole last month, so disable the
    // days in it that have no BS data yet.
    if (main === "ad") {
      const after = { after: BS_RANGE.endDate };
      disabled = disabled === undefined ? after : [after, ...(Array.isArray(disabled) ? disabled : [disabled])];
    }
  }
  return (
    <RdpDayPicker
      weekStartsOn={calendar.weekStartsOn}
      startMonth={calendar.startMonth}
      {...dayPickerProps}
      endMonth={endMonth}
      disabled={disabled}
      dateLib={dayPickerProps.dateLib ?? calendar.dateLib}
      formatters={{ ...calendar.formatters, ...dayPickerProps.formatters }}
      labels={{ ...calendar.labels, ...dayPickerProps.labels }}
      components={{ ...dayPickerProps.components, ...calendar.components }}
      modifiers={{ ...calendar.modifiers, ...dayPickerProps.modifiers }}
      modifiersClassNames={{ ...calendar.modifiersClassNames, ...dayPickerProps.modifiersClassNames }}
      modifiersStyles={{ ...calendar.modifiersStyles, ...dayPickerProps.modifiersStyles }}
    />
  );
}
