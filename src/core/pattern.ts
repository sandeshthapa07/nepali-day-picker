/** Script for names and digits. */
export type Lang = "ne" | "en";
/** Which calendar a pattern reads or writes. */
export type Calendar = "bs" | "ad";

/** Named patterns that can be passed in place of a pattern string. */
export const FORMAT_PRESETS = Object.freeze({
  short: "DD/MM/YYYY",
  medium: "D MMM YYYY",
  long: "D MMMM YYYY",
  full: "dddd, D MMMM YYYY",
  /** Always ASCII digits, whatever `lang` or `digits` say. For storage, URLs and sorting. */
  iso: "YYYY-MM-DD",
});

export type FormatPreset = keyof typeof FORMAT_PRESETS;
/** A preset name or a Day.js-style pattern such as `"DD/MM/YYYY"` or `"D MMMM YYYY"`. */
export type Pattern = FormatPreset | (string & {});

export type Token =
  | "YYYY"
  | "YY"
  | "M"
  | "MM"
  | "MMM"
  | "MMMM"
  | "D"
  | "DD"
  | "Do"
  | "d"
  | "dd"
  | "ddd"
  | "dddd"
  | "w"
  | "ww";

export type Part = { readonly token: Token } | { readonly text: string };

// Longest tokens first, so "MMMM" is not read as "MM" + "MM".
const TOKEN_RE = /\[([^\]]*)]|YYYY|YY|Do|MMMM|MMM|MM|M|DD|D|dddd|ddd|dd|d|ww|w/g;
const CACHE_LIMIT = 200;
const cache = new Map<string, readonly Part[]>();

export function resolvePattern(pattern: Pattern): string {
  return Object.hasOwn(FORMAT_PRESETS, pattern) ? FORMAT_PRESETS[pattern as FormatPreset] : pattern;
}

/** Splits a pattern into tokens and literal text. Text in square brackets is literal. */
export function tokenize(pattern: string): readonly Part[] {
  const hit = cache.get(pattern);
  if (hit) return hit;
  const parts: Part[] = [];
  const pushText = (text: string) => {
    if (!text) return;
    const last = parts[parts.length - 1];
    if (last && "text" in last) parts[parts.length - 1] = { text: last.text + text };
    else parts.push({ text });
  };
  let index = 0;
  for (const match of pattern.matchAll(TOKEN_RE)) {
    pushText(pattern.slice(index, match.index));
    if (match[1] !== undefined) pushText(match[1]);
    else parts.push({ token: match[0] as Token });
    index = (match.index ?? 0) + match[0].length;
  }
  pushText(pattern.slice(index));
  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(pattern, parts);
  return parts;
}
