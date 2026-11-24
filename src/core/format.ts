import { adToBs } from "./convert";
import { toNepaliDigits } from "./digits";
import { AD_MONTHS, BS_MONTHS, WEEKDAYS } from "./names";
import { type Calendar, type Lang, type Pattern, resolvePattern, type Token, tokenize } from "./pattern";
import { getAdWeek, getBsWeek } from "./week";

export interface FormatOptions {
  /** Script for names and the default for digits. Default `"ne"`. */
  lang?: Lang;
  /** Overrides only the digits, for example `lang: "ne", digits: "en"` gives `12 बैशाख 2082`. Default: `lang`. */
  digits?: Lang;
  /** Everyday (`"common"`, बैशाख) or formal (`"formal"`, वैशाख) Nepali BS month spelling. Default `"common"`. */
  monthNames?: "common" | "formal";
}

export interface FormatterOptions extends FormatOptions {
  /** Pattern or preset name. */
  pattern: Pattern;
  /** Calendar to format in. Default `"bs"`. */
  calendar?: Calendar;
}

const pad = (n: number, width: number) => String(n).padStart(width, "0");

function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0];
}

/**
 * Compiles a pattern once and returns a function that formats Dates with it.
 * Use it for long lists and tables; `formatBs` and `formatAd` are the one-off versions.
 */
export function createFormatter(options: FormatterOptions): (date: Date) => string {
  const { calendar = "bs", lang = "ne", monthNames = "common", pattern } = options;
  const parts = tokenize(resolvePattern(pattern));
  const nepaliDigits = pattern !== "iso" && (options.digits ?? lang) === "ne";
  const months =
    calendar === "ad"
      ? AD_MONTHS[lang]
      : lang === "ne" && monthNames === "formal"
        ? { long: BS_MONTHS.ne.formal, short: BS_MONTHS.ne.formal }
        : BS_MONTHS[lang];
  const weekdays = WEEKDAYS[lang];
  const num = (value: string) => (nepaliDigits ? toNepaliDigits(value) : value);

  return (date: Date): string => {
    let year: number;
    let month: number;
    let day: number;
    if (calendar === "bs") {
      ({ year, month, day } = adToBs(date));
    } else {
      if (Number.isNaN(date.getTime())) throw new RangeError("Invalid Date");
      year = date.getFullYear();
      month = date.getMonth() + 1;
      day = date.getDate();
    }
    const weekday = date.getDay();
    let week = 0;

    const render = (token: Token): string => {
      switch (token) {
        case "YYYY":
          return num(pad(year, 4));
        case "YY":
          return num(pad(year % 100, 2));
        case "M":
          return num(String(month));
        case "MM":
          return num(pad(month, 2));
        case "MMM":
          return months.short[month - 1];
        case "MMMM":
          return months.long[month - 1];
        case "D":
          return num(String(day));
        case "DD":
          return num(pad(day, 2));
        case "Do":
          return lang === "ne" ? `${num(String(day))} गते` : num(String(day)) + ordinal(day);
        case "d":
          return num(String(weekday));
        case "dd":
          return weekdays.narrow[weekday];
        case "ddd":
          return weekdays.short[weekday];
        case "dddd":
          return weekdays.long[weekday];
        case "w":
        case "ww":
          week ||= calendar === "bs" ? getBsWeek(date) : getAdWeek(date);
          return num(token === "ww" ? pad(week, 2) : String(week));
      }
    };

    let out = "";
    for (const part of parts) out += "text" in part ? part.text : render(part.token);
    return out;
  };
}

/** Formats a Date as a BS date. Throws a RangeError outside the supported range. */
export function formatBs(date: Date, pattern: Pattern, options: FormatOptions = {}): string {
  return createFormatter({ ...options, pattern, calendar: "bs" })(date);
}

/** Formats a Date as a Gregorian (AD) date, with the same tokens and scripts as formatBs. */
export function formatAd(date: Date, pattern: Pattern, options: FormatOptions = {}): string {
  return createFormatter({ ...options, pattern, calendar: "ad" })(date);
}
