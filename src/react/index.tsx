import * as React from "react";
import {
  type CaptionLabelProps,
  type CustomComponents,
  type DayButtonProps,
  type Formatters,
  type Labels,
  type Matcher,
  type ModifiersClassNames,
  CaptionLabel as RdpCaptionLabel,
  DayButton as RdpDayButton,
  DayPicker as RdpDayPicker,
  type DayPickerProps as RdpDayPickerProps,
} from "react-day-picker";
import { BS_RANGE, dayNumberFromDate, LAST_DAY_NUMBER } from "../core/convert";
import { toNepaliDigits } from "../core/digits";
import { createFormatterWith } from "../core/format";
import { looseAdToBs, looseBsToAd, looseBsWeek, looseMonthLength } from "../core/loose";
import { AD_MONTHS, BS_MONTHS, WEEKDAYS } from "../core/names";
import type { Lang, Pattern } from "../core/pattern";
import { createBsDateLib, type DateLibOverrides } from "../date-lib";

// Everything from react-day-picker, so this entry can replace it in an import (shadcn's calendar.tsx).
// The DayPicker and DayPickerProps declared below take precedence over the re-exported ones.
export * from "react-day-picker";
export { type BsDateLibOptions, createBsDateLib, type DateLibOverrides, getBsDateLib } from "../date-lib";

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
}

/** A day button component, such as react-day-picker's `DayButton` or shadcn's `CalendarDayButton`. */
export type DayButtonComponent = CustomComponents["DayButton"];
/** A caption label component, such as react-day-picker's `CaptionLabel`. */
export type CaptionLabelComponent = CustomComponents["CaptionLabel"];

export interface UseNepaliCalendarOptions extends NepaliCalendarOptions {
  /** The day button to wrap with the secondary date, such as shadcn's `CalendarDayButton`. */
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
}

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

const isInRange = (date: Date) => {
  const n = dayNumberFromDate(date);
  return n >= 0 && n <= LAST_DAY_NUMBER;
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
  const styled = DayButton === RdpDayButton;
  function SecondaryDateDayButton(props: DayButtonProps) {
    const date = props.day.date;
    let text: string | undefined;
    if (calendar === "ad") text = String(date.getDate());
    else if (isInRange(date)) text = String(looseAdToBs(date).day);
    if (text !== undefined && digits === "ne") text = toNepaliDigits(text);
    return (
      <DayButton {...props} style={styled ? { flexDirection: "column", lineHeight: 1.1, ...props.style } : props.style}>
        {props.children}
        {text !== undefined && (
          <span data-secondary-date="" style={styled ? { fontSize: "0.7em", opacity: 0.7 } : undefined}>
            {text}
          </span>
        )}
      </DayButton>
    );
  }
  const inner = DayButton as { displayName?: string; name?: string };
  SecondaryDateDayButton.displayName = `withSecondaryDate(${inner.displayName ?? inner.name ?? "DayButton"})`;
  return SecondaryDateDayButton;
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

  const fullLabel = (date: Date, today?: boolean) => {
    let label = dayLabel(date);
    if (secondaryLabel && (secondary === "ad" || isInRange(date))) label += ` (${secondaryLabel(date)})`;
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
  if (secondary) {
    components.DayButton = withSecondaryDate(DayButton, { calendar: secondary, lang: secondaryLang });
    components.CaptionLabel = withSecondaryCaption(CaptionLabel);
  } else {
    if (DayButton) components.DayButton = DayButton;
    if (CaptionLabel) components.CaptionLabel = CaptionLabel;
  }

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
    modifiers: { saturday: { dayOfWeek: [6] } },
    modifiersClassNames: { saturday: "ndp-saturday" },
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
    DayButton,
    CaptionLabel,
  } = options;
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
      DayButton,
      CaptionLabel,
    ],
  );
}

/** react-day-picker's props plus the Nepali calendar options. */
export type DayPickerProps = RdpDayPickerProps & NepaliCalendarOptions;

/**
 * react-day-picker's DayPicker, showing BS months by default. Every other prop works as in
 * react-day-picker, and selected values are plain `Date`s.
 *
 * ```tsx
 * <DayPicker mode="single" selected={date} onSelect={setDate} variant="bs-ad" lang="ne" />
 * ```
 */
export function DayPicker(props: DayPickerProps): React.ReactElement {
  const { variant, lang, secondaryLang, digits, monthNames, captionFormat, labelFormat, weekdayFormat, ...rest } =
    props;
  const dayPickerProps = rest as RdpDayPickerProps;
  const calendar = useNepaliCalendar({
    variant,
    lang,
    secondaryLang,
    digits,
    monthNames,
    captionFormat,
    labelFormat,
    weekdayFormat,
    DayButton: dayPickerProps.components?.DayButton,
    CaptionLabel: dayPickerProps.components?.CaptionLabel,
  });
  return (
    <RdpDayPicker
      weekStartsOn={calendar.weekStartsOn}
      startMonth={calendar.startMonth}
      endMonth={calendar.endMonth}
      {...dayPickerProps}
      dateLib={dayPickerProps.dateLib ?? calendar.dateLib}
      formatters={{ ...calendar.formatters, ...dayPickerProps.formatters }}
      labels={{ ...calendar.labels, ...dayPickerProps.labels }}
      components={{ ...dayPickerProps.components, ...calendar.components }}
      modifiers={{ ...calendar.modifiers, ...dayPickerProps.modifiers }}
      modifiersClassNames={{ ...calendar.modifiersClassNames, ...dayPickerProps.modifiersClassNames }}
    />
  );
}
