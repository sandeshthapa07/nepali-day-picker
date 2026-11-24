# Guides and recipes

Patterns for using `nepali-day-picker` in real apps. Each recipe uses only this package and the
JavaScript standard library unless it says otherwise.

- [Show today's date in Nepali](#show-todays-date-in-nepali)
- [Today in Nepal on a server](#today-in-nepal-on-a-server)
- [Store and send dates safely](#store-and-send-dates-safely)
- [A BS date field in a form](#a-bs-date-field-in-a-form)
- [Validate with Zod](#validate-with-zod)
- [Format long lists and tables](#format-long-lists-and-tables)
- [Show BS and AD together](#show-bs-and-ad-together)
- [Fiscal-year reports and filters](#fiscal-year-reports-and-filters)
- [Build a BS month grid](#build-a-bs-month-grid)
- [Month and weekday dropdowns](#month-and-weekday-dropdowns)
- [Warn about projected dates](#warn-about-projected-dates)

## Show today's date in Nepali

```ts
import { formatBs } from "nepali-day-picker";

formatBs(new Date(), "full"); // for example "मंगलबार, ८ मंसिर २०८३"
formatBs(new Date(), "YYYY [साल] MMMM D [गते], dddd"); // "२०८३ साल मंसिर ८ गते, मंगलबार"
```

In a browser this uses the visitor's own calendar day, which is usually what you want.

## Today in Nepal on a server

A server usually runs in UTC. From 00:00 to 05:45 Nepal time, the UTC date is still the previous
day, so `adToBs(new Date())` on the server would be a day behind Nepal. Read Nepal's calendar day
first:

```ts
import { adToBs } from "nepali-day-picker";

/** Today's calendar day in Nepal, as a local-midnight Date, wherever this code runs. */
function todayInNepal(now = new Date()): Date {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now) // "2026-11-24"
    .split("-")
    .map(Number);
  return new Date(y, m - 1, d);
}

adToBs(todayInNepal()); // { year: 2083, month: 8, day: 8 } on 24 November 2026
```

The same applies to any "which day is it?" logic that runs on a server: deadlines, daily reports and
scheduled jobs.

## Store and send dates safely

`JSON.stringify` turns a `Date` into a UTC timestamp. Local midnight in Nepal (UTC+5:45) is 18:15
on the **previous** day in UTC, so a birth date sent as a `Date` can arrive one day early. For
date-only values, send and store a date string instead:

```ts
import { bsToAd, formatAd, formatBs, parseAd, parseBs } from "nepali-day-picker";

const date = bsToAd(2082, 1, 12);

// Store as an AD date string: works with SQL DATE columns and sorts correctly.
const stored = formatAd(date, "iso"); // "2025-04-25"
const back = parseAd(stored, "iso"); // Date for 25 April 2025

// Or store the BS date string, if your records are kept in BS.
const storedBs = formatBs(date, "iso"); // "2082-01-12"
const backBs = parseBs(storedBs, "iso"); // the same Date
```

The `"iso"` preset always uses ASCII digits, whatever `lang` is, so stored values never change with
the display language.

## A BS date field in a form

Until the calendar component ships, a text field that accepts BS dates takes a few lines in React:

```tsx
import { useState } from "react";
import { formatBs, parseBs } from "nepali-day-picker";

const PATTERNS = ["YYYY-MM-DD", "YYYY/MM/DD", "DD/MM/YYYY", "D MMMM YYYY"];

export function BsDateInput({ value, onChange }: { value: Date | null; onChange: (d: Date | null) => void }) {
  const [text, setText] = useState(value ? formatBs(value, "YYYY-MM-DD") : "");
  const parsed = text ? parseBs(text, PATTERNS) : null;

  return (
    <label>
      जन्म मिति (BS)
      <input
        value={text}
        placeholder="२०८२-०१-१२"
        aria-invalid={text !== "" && parsed === null}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => onChange(parsed)}
      />
      {parsed && <small>{formatBs(parsed, "full")}</small>}
    </label>
  );
}
```

Users can type Nepali or ASCII digits, or a month name in either script. The value your form keeps is
a plain `Date`.

## Validate with Zod

```ts
import { z } from "zod";
import { parseBs } from "nepali-day-picker";

const bsDate = z
  .string()
  .refine((s) => parseBs(s, ["iso", "DD/MM/YYYY"]) !== null, "Enter a BS date such as 2082-01-12")
  .transform((s) => parseBs(s, ["iso", "DD/MM/YYYY"]) as Date);

const schema = z.object({ dateOfBirth: bsDate });
schema.parse({ dateOfBirth: "२०५५-०६-१५" }).dateOfBirth; // a Date
```

## Format long lists and tables

`formatBs` compiles its pattern on each call. For hundreds of rows, compile once:

```ts
import { createFormatter } from "nepali-day-picker";

const toBs = createFormatter({ pattern: "D MMM YYYY", lang: "en" });
rows.map((row) => ({ ...row, date: toBs(row.createdAt) })); // "12 Bai 2082", …
```

## Show BS and AD together

```ts
import { formatAd, formatBs } from "nepali-day-picker";

const date = new Date(2025, 3, 25);
`${formatBs(date, "long")} (${formatAd(date, "long", { lang: "en" })})`;
// "१२ बैशाख २०८२ (25 April 2025)"
```

## Fiscal-year reports and filters

Nepal's fiscal year runs from Shrawan 1 to the end of Asar. `getFiscalPeriodRange` returns the first
and last **day**. For a database query, turn the last day into an exclusive upper bound:

```ts
import { getFiscalPeriodRange } from "nepali-day-picker";

const { start, end } = getFiscalPeriodRange(2082, "quarter", 2); // Kartik to Poush 2082
const until = new Date(end);
until.setDate(until.getDate() + 1); // the day after the last day

// SQL: WHERE created_at >= $1 AND created_at < $2
await db.query(sql, [start, until]);
```

A fiscal-year picker:

```ts
import { formatFiscalYear, getFiscalYear } from "nepali-day-picker";

const current = getFiscalYear(new Date());
const options = [0, 1, 2, 3, 4].map((back) => ({
  value: current - back,
  label: formatFiscalYear(current - back, { prefix: true }), // "आ.व. २०८३/८४", "आ.व. २०८२/८३", …
}));
```

Group records by trimester (चौमासिक), as government reports do:

```ts
import { getFiscalPeriod } from "nepali-day-picker";

const key = (d: Date) => {
  const p = getFiscalPeriod(d, "trimester");
  return `${p.fiscalYear}-T${p.index}`; // "2082-T2"
};
```

For a year that starts in another month, pass `{ startMonth }`, for example `{ startMonth: 1 }` for a
school year that starts on Baisakh 1.

## Build a BS month grid

For a custom calendar view, the grid is a few lines. Weeks start on Sunday, as Nepali calendars do.

```ts
import { bsToAd, getBsMonthLength } from "nepali-day-picker";

/** Weeks of a BS month, Sunday first. Empty cells before day 1 and after the last day are null. */
function bsMonthGrid(year: number, month: number): (Date | null)[][] {
  const first = bsToAd(year, month, 1);
  const cells: (Date | null)[] = Array(first.getDay()).fill(null);
  for (let day = 1; day <= getBsMonthLength(year, month); day++) cells.push(bsToAd(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

bsMonthGrid(2082, 1); // 5 weeks; Baisakh 1 2082 is a Monday, so the first cell is null
```

Label the header with `WEEKDAYS.ne.short` and each cell with `formatBs(date, "D")`. Saturday
(`date.getDay() === 6`) is the weekly holiday.

## Month and weekday dropdowns

```ts
import { BS_MONTHS, WEEKDAYS } from "nepali-day-picker";

BS_MONTHS.ne.long.map((name, i) => ({ value: i + 1, label: name })); // बैशाख … चैत
BS_MONTHS.en.long; // Baisakh … Chaitra
BS_MONTHS.ne.formal; // वैशाख … चैत्र
WEEKDAYS.ne.short; // आइत … शनि
```

## Warn about projected dates

Month lengths for BS 2084 onward are projections. If your app plans that far ahead, say so:

```ts
import { adToBs, BS_DATA_INFO } from "nepali-day-picker";

const isProjected = (d: Date) => adToBs(d).year >= BS_DATA_INFO.projectedFrom;
```
