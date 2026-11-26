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
- [Handle future (projected) dates](#handle-future-projected-dates)

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

`getBsMonthGrid` returns a BS month as plain data, so any framework can render a calendar: Vue, Svelte,
Angular, Solid, plain DOM or a server template. It has no dependencies, like the rest of the core.
(React users have a ready-made calendar in `nepali-day-picker/react`.)

```ts
import { getBsMonthGrid } from "nepali-day-picker";

const grid = getBsMonthGrid(2083, 8); // Mangsir 2083
grid.weekdays; // [0, 1, 2, 3, 4, 5, 6]: column order, Sunday first
grid.weeks; // 5 or 6 weeks of 7 days
grid.weeks[0][0];
// { date, bs: { year, month, day }, ad: { year, month, day }, weekday, outside, inRange,
//   today, saturday, holiday, events }
grid.previous; // { year: 2083, month: 7 }, or null at the start of the range
grid.next; // { year: 2083, month: 9 }, or null at the end of the confirmed data
```

| Field of a day        | Use it to                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `date`                | Select, store or send the day: a plain local-midnight `Date`                              |
| `bs`, `ad`            | Show the day number; `ad` for a second, smaller number                                    |
| `outside`             | Fade the days of the previous and next month                                              |
| `inRange`             | Hide or disable days with no confirmed data (only at the very start and end of the range) |
| `today`               | Highlight today (pass `today` to set the day, for example "today in Nepal" on a server)   |
| `saturday`, `holiday` | Show the day in red                                                                       |
| `events`              | List the day's holidays and events, or draw dots                                          |

Options: `weekStartsOn` (default 0, Sunday), `fixedWeeks: true` for always six weeks, `today`, and
`events` for holidays and events:

```ts
import { createEventLookup, getEventName, NEPAL_HOLIDAYS } from "nepali-day-picker/holidays";

const events = createEventLookup([...NEPAL_HOLIDAYS, { date: "2083-08-15", name: "Office party" }]);
const grid = getBsMonthGrid(2083, 8, { events });
// each day: holiday: true on public holidays; events: [...] with getEventName(e, "ne") for the text
```

**Vue:**

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { formatBs, getBsMonthGrid, toNepaliDigits, WEEKDAYS } from "nepali-day-picker";
import { createEventLookup, NEPAL_HOLIDAYS } from "nepali-day-picker/holidays";

const events = createEventLookup(NEPAL_HOLIDAYS);
const shown = ref({ year: 2083, month: 8 });
const grid = computed(() => getBsMonthGrid(shown.value.year, shown.value.month, { events }));
const selected = ref<Date>();
</script>

<template>
  <div class="calendar">
    <header>
      <button :disabled="!grid.previous" @click="shown = grid.previous!">‹</button>
      <strong>{{ formatBs(grid.start, "MMMM YYYY") }}</strong>
      <button :disabled="!grid.next" @click="shown = grid.next!">›</button>
    </header>
    <div class="row">
      <span v-for="w in grid.weekdays" :key="w">{{ WEEKDAYS.ne.short[w] }}</span>
    </div>
    <div v-for="(week, i) in grid.weeks" :key="i" class="row">
      <button
        v-for="day in week"
        :key="day.date.getTime()"
        :disabled="!day.inRange"
        :class="{ outside: day.outside, today: day.today, red: day.saturday || day.holiday }"
        :title="day.events.map((e) => (typeof e.name === 'string' ? e.name : e.name.ne)).join(', ')"
        @click="selected = day.date"
      >
        {{ toNepaliDigits(day.bs.day) }}
      </button>
    </div>
  </div>
</template>
```

**Svelte:**

```svelte
<script lang="ts">
  import { formatBs, getBsMonthGrid } from "nepali-day-picker";

  let shown = $state({ year: 2083, month: 8 });
  const grid = $derived(getBsMonthGrid(shown.year, shown.month));
  let { onselect }: { onselect: (date: Date) => void } = $props();
</script>

<button disabled={!grid.previous} onclick={() => (shown = grid.previous!)}>‹</button>
<strong>{formatBs(grid.start, "MMMM YYYY", { lang: "en" })}</strong>
<button disabled={!grid.next} onclick={() => (shown = grid.next!)}>›</button>
{#each grid.weeks as week}
  <div class="row">
    {#each week as day}
      <button class:outside={day.outside} class:red={day.saturday} disabled={!day.inRange} onclick={() => onselect(day.date)}>
        {day.bs.day}
      </button>
    {/each}
  </div>
{/each}
```

**Plain DOM:**

```ts
const grid = getBsMonthGrid(2083, 8);
calendar.innerHTML = grid.weeks
  .map((week) => `<tr>${week.map((d) => `<td class="${d.outside ? "outside" : ""}">${d.bs.day}</td>`).join("")}</tr>`)
  .join("");
```

Throws a `RangeError` for a month outside the supported range and a `ProjectedDateError` for one in a
projected year; follow `previous` and `next` and that never happens.

## Month and weekday dropdowns

```ts
import { BS_MONTHS, WEEKDAYS } from "nepali-day-picker";

BS_MONTHS.ne.long.map((name, i) => ({ value: i + 1, label: name })); // बैशाख … चैत
BS_MONTHS.en.long; // Baisakh … Chaitra
BS_MONTHS.ne.formal; // वैशाख … चैत्र
WEEKDAYS.ne.short; // आइत … शनि
```

## Handle future (projected) dates

Nepal's calendar committee fixes each year's month lengths about a year ahead, so the table's values
for BS 2084 onward are projections that can be a day off. By default the package refuses them:
conversion, formatting, weeks and fiscal helpers throw a `ProjectedDateError`, `isValidBs` returns
`false`, `parseBs` returns `null`, and the calendar stops at Chaitra 2083.

Tell the user why a date was refused:

```ts
import { formatBs, ProjectedDateError } from "nepali-day-picker";

function bsLabel(date: Date): string {
  try {
    return formatBs(date, "long");
  } catch (error) {
    if (error instanceof ProjectedDateError) return `BS ${error.year} calendar not published yet`;
    throw error;
  }
}
```

Or accept the projections, once, at startup, if a possible one-day error is fine (long-range plans,
loan schedules):

```ts
import { allowProjectedDates } from "nepali-day-picker";

allowProjectedDates(); // the whole table, up to BS 2100, for every function and the calendar
```

`BS_DATA_INFO.projectedFrom` (2084) and `BS_DATA_INFO.lastConfirmed` (BS 2083-12-30) say where the
confirmed data ends. Update the package when a new year is published: a patch release moves that year
into the confirmed range.
