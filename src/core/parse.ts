import { FIRST_YEAR, LAST_YEAR } from "../data/table";
import { adToBs, bsToAd, isValidBs, unixDayFromCivil } from "./convert";
import { toAsciiDigits } from "./digits";
import { AD_MONTH_ALIASES, AD_MONTHS, BS_MONTH_ALIASES, BS_MONTHS, WEEKDAYS } from "./names";
import { type Calendar, type Pattern, resolvePattern, type Token, tokenize } from "./pattern";

export interface ParseOptions {
  /** Two-digit years (`YY`) resolve to the year nearest this date's year. Default: now. */
  referenceDate?: Date;
}

type Field = "year" | "yy" | "month" | "monthName" | "day" | null;

interface Parser {
  regex: RegExp;
  fields: Field[];
}

const normalize = (s: string) => s.normalize("NFC").toLowerCase();
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function nameLookup(tables: readonly (readonly string[])[], aliases: Readonly<Record<number, readonly string[]>>) {
  const map = new Map<string, number>();
  for (const table of tables) {
    for (let i = 0; i < table.length; i++) map.set(normalize(table[i]), i + 1);
  }
  for (const [month, names] of Object.entries(aliases))
    for (const name of names) map.set(normalize(name), Number(month));
  // Longest first, so "Ashwin" is tried before "Ash".
  const source = [...map.keys()]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join("|");
  return { map, source };
}

let lookups: Record<Calendar, ReturnType<typeof nameLookup>> | undefined;
let weekdaySource: string | undefined;

function getLookups() {
  lookups ??= {
    bs: nameLookup([BS_MONTHS.ne.long, BS_MONTHS.ne.formal, BS_MONTHS.en.long, BS_MONTHS.en.short], BS_MONTH_ALIASES),
    ad: nameLookup([AD_MONTHS.ne.long, AD_MONTHS.en.long, AD_MONTHS.en.short], AD_MONTH_ALIASES),
  };
  return lookups;
}

function getWeekdaySource(): string {
  if (weekdaySource === undefined) {
    const names = new Set<string>(["Tues", "Thur", "Thurs", "बिहीबार", "बिही"]);
    for (const lang of [WEEKDAYS.ne, WEEKDAYS.en])
      for (const list of [lang.long, lang.short, lang.narrow]) for (const n of list) names.add(n);
    weekdaySource = [...names]
      .sort((a, b) => b.length - a.length)
      .map(escapeRegex)
      .join("|");
  }
  return weekdaySource;
}

const NUMERIC_WIDTH: Partial<Record<Token, number>> = { YYYY: 4, YY: 2, MM: 2, DD: 2, ww: 2 };

function compile(pattern: string, calendar: Calendar): Parser {
  const parts = tokenize(pattern);
  const fields: Field[] = [];
  let source = "";
  parts.forEach((part, i) => {
    if ("text" in part) {
      source += part.text.split(/\s+/).map(escapeRegex).join("\\s+");
      return;
    }
    const next = parts[i + 1];
    // Fixed width only where another token follows directly (YYYYMMDD); otherwise allow 1-2 digits.
    const fixed = next !== undefined && "token" in next;
    const digits = (token: Token) => {
      const width = NUMERIC_WIDTH[token];
      return width === 4 || (width === 2 && (token === "YY" || fixed)) ? `(\\d{${width}})` : "(\\d{1,2})";
    };
    switch (part.token) {
      case "YYYY":
      case "YY":
        source += digits(part.token);
        fields.push(part.token === "YY" ? "yy" : "year");
        break;
      case "M":
      case "MM":
        source += digits(part.token);
        fields.push("month");
        break;
      case "MMM":
      case "MMMM":
        source += `(${getLookups()[calendar].source})`;
        fields.push("monthName");
        break;
      case "D":
      case "DD":
        source += digits(part.token);
        fields.push("day");
        break;
      case "Do":
        source += "(\\d{1,2})(?:\\s*गते|st|nd|rd|th)?";
        fields.push("day");
        break;
      case "d":
        source += "[0-6]";
        break;
      case "dd":
      case "ddd":
      case "dddd":
        source += `(?:${getWeekdaySource()})`;
        break;
      case "w":
      case "ww":
        source += "\\d{1,2}";
        break;
    }
  });
  return { regex: new RegExp(`^${source}$`, "iu"), fields };
}

const CACHE_LIMIT = 200;
const cache = new Map<string, Parser>();

function getParser(pattern: string, calendar: Calendar): Parser {
  const key = `${calendar}\u0000${pattern}`;
  let parser = cache.get(key);
  if (!parser) {
    if (cache.size >= CACHE_LIMIT) cache.clear();
    parser = compile(pattern, calendar);
    cache.set(key, parser);
  }
  return parser;
}

function nearestYear(yy: number, reference: number, min: number, max: number): number {
  let best = Number.NaN;
  for (const candidate of [1900 + yy, 2000 + yy, 2100 + yy]) {
    if (candidate < min || candidate > max) continue;
    if (Number.isNaN(best) || Math.abs(candidate - reference) < Math.abs(best - reference)) best = candidate;
  }
  return best;
}

function referenceBsYear(date: Date): number {
  try {
    return adToBs(date).year;
  } catch {
    return date.getFullYear() + 57;
  }
}

function parseOne(text: string, pattern: string, calendar: Calendar, options: ParseOptions): Date | null {
  const { regex, fields } = getParser(pattern, calendar);
  const match = regex.exec(text);
  if (!match) return null;
  let year = Number.NaN;
  let month = Number.NaN;
  let day = Number.NaN;
  let yy = Number.NaN;
  fields.forEach((field, i) => {
    const value = match[i + 1];
    if (field === "year") year = Number(value);
    else if (field === "yy") yy = Number(value);
    else if (field === "month") month = Number(value);
    else if (field === "day") day = Number(value);
    else if (field === "monthName") month = getLookups()[calendar].map.get(normalize(value)) ?? Number.NaN;
  });
  if (Number.isNaN(year) && !Number.isNaN(yy)) {
    const reference = options.referenceDate ?? new Date();
    year =
      calendar === "bs"
        ? nearestYear(yy, referenceBsYear(reference), FIRST_YEAR, LAST_YEAR)
        : nearestYear(yy, reference.getFullYear(), -Infinity, Infinity);
  }
  if (calendar === "bs") return isValidBs(year, month, day) ? bsToAd(year, month, day) : null;

  if (!Number.isInteger(year) || !(month >= 1 && month <= 12) || !(day >= 1)) return null;
  const daysInMonth =
    unixDayFromCivil(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1, 1) -
    unixDayFromCivil(year, month, 1);
  if (day > daysInMonth) return null;
  const result = new Date(year, month - 1, day);
  if (year < 100) result.setFullYear(year);
  return result;
}

function parse(
  text: string,
  pattern: Pattern | readonly Pattern[],
  calendar: Calendar,
  options: ParseOptions,
): Date | null {
  if (typeof text !== "string") return null;
  const input = toAsciiDigits(text.normalize("NFC")).trim();
  const patterns = typeof pattern === "string" ? [pattern] : pattern;
  for (const p of patterns) {
    const result = parseOne(input, resolvePattern(p), calendar, options);
    if (result) return result;
  }
  return null;
}

/**
 * Parses BS text into a Date at local midnight, or returns null when the text does not match or the
 * date does not exist. Accepts Nepali or ASCII digits and any common month spelling. Pass a list of
 * patterns to try them in order.
 */
export function parseBs(text: string, pattern: Pattern | readonly Pattern[], options: ParseOptions = {}): Date | null {
  return parse(text, pattern, "bs", options);
}

/** Parses Gregorian (AD) text with the same patterns as parseBs. Returns null when it does not match. */
export function parseAd(text: string, pattern: Pattern | readonly Pattern[], options: ParseOptions = {}): Date | null {
  return parse(text, pattern, "ad", options);
}
