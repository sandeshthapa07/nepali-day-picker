// date-fns tokens -> this package's tokens. DayPicker uses: "LLLL y", "y LLLL", "LLLL", "yyyy", "d",
// "cccccc", "cccc", "PPPP", "yyyy-MM-dd" and "yyyy-MM". The rest covers common custom formatters.
const PRESET_BY_P: Record<number, string> = { 1: "short", 2: "medium", 3: "long", 4: "full" };

function tokenFor(letter: string, length: number, ordinal: boolean): string | undefined {
  switch (letter) {
    case "y":
    case "Y":
    case "u":
      return ordinal ? undefined : length === 2 ? "YY" : "YYYY";
    case "M":
    case "L":
      if (ordinal) return undefined;
      return length === 1 ? "M" : length === 2 ? "MM" : length === 3 ? "MMM" : "MMMM";
    case "d":
      return ordinal ? "Do" : length === 1 ? "D" : "DD";
    case "E":
      return length <= 3 ? "ddd" : length === 4 ? "dddd" : "dd";
    case "c":
    case "e":
      if (length <= 2) return "d";
      return length === 3 ? "ddd" : length === 4 ? "dddd" : "dd";
    case "w":
    case "I":
      return ordinal ? undefined : length === 1 ? "w" : "ww";
    default:
      return undefined;
  }
}

/** Translates a date-fns pattern into this package's pattern syntax, or undefined if it cannot. */
export function translateDateFnsPattern(pattern: string): string | undefined {
  if (/^P{1,4}$/.test(pattern)) return PRESET_BY_P[pattern.length];
  let out = "";
  let literal = "";
  const flush = () => {
    if (literal) out += `[${literal}]`;
    literal = "";
  };
  for (let i = 0; i < pattern.length; ) {
    const ch = pattern[i];
    if (ch === "'") {
      const end = pattern.indexOf("'", i + 1);
      if (end === i + 1) {
        literal += "'";
        i += 2;
        continue;
      }
      literal += pattern.slice(i + 1, end === -1 ? undefined : end).replace(/''/g, "'");
      i = end === -1 ? pattern.length : end + 1;
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      let j = i;
      while (pattern[j] === ch) j++;
      const ordinal = pattern[j] === "o";
      const token = tokenFor(ch, j - i, ordinal);
      if (!token) return undefined;
      flush();
      out += token;
      i = ordinal ? j + 1 : j;
      continue;
    }
    literal += ch;
    i++;
  }
  flush();
  return out;
}
