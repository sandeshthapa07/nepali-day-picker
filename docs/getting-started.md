# Getting started

This guide takes you from install to your first BS dates in about five minutes. For full details of
every function, see the [API reference](api.md).

## 1. Install

```sh
npm install nepali-day-picker
# or: pnpm add nepali-day-picker / yarn add nepali-day-picker / bun add nepali-day-picker
```

It works in Node.js 18 or later, modern browsers, Deno, Bun and edge runtimes such as Vercel and
Cloudflare Workers. It has no dependencies.

### Without a build step

```html
<script type="module">
  import { formatBs } from "https://cdn.jsdelivr.net/npm/nepali-day-picker@0.1.0/+esm";
  document.querySelector("#today").textContent = formatBs(new Date(), "full");
</script>
<p id="today"></p>
```

## 2. Import

```ts
// ES modules and TypeScript
import { adToBs, bsToAd, formatBs } from "nepali-day-picker";

// CommonJS
const { adToBs, bsToAd, formatBs } = require("nepali-day-picker");
```

TypeScript types ship with the package; there is no `@types` package to install.

## 3. Convert

```ts
import { adToBs, bsToAd } from "nepali-day-picker";

adToBs(new Date(2025, 3, 25)); // { year: 2082, month: 1, day: 12 }
bsToAd(2082, 1, 12); // Date for Friday 25 April 2025, at local midnight
bsToAd({ year: 2082, month: 1, day: 12 }); // the same, from an object
```

BS months are numbered 1 to 12, starting with Baisakh. JavaScript's `Date` numbers its months 0 to 11,
so `new Date(2025, 3, 25)` is 25 **April**.

## 4. Show a date

```ts
import { formatAd, formatBs } from "nepali-day-picker";

const date = new Date(2025, 3, 25);

formatBs(date, "full"); // "शुक्रबार, १२ बैशाख २०८२"
formatBs(date, "long", { lang: "en" }); // "12 Baisakh 2082"
formatBs(date, "DD/MM/YYYY"); // "१२/०१/२०८२"
formatBs(date, "D MMMM YYYY", { digits: "en" }); // "12 बैशाख 2082"
formatAd(date, "long"); // "२५ अप्रिल २०२५"
```

Nepali script is the default. Pass `{ lang: "en" }` for English names and digits, or
`{ digits: "en" }` to keep Nepali names with ASCII digits.

## 5. Read what a user typed

```ts
import { parseBs } from "nepali-day-picker";

parseBs("२०८२-०१-१२", "iso"); // Date for 25 April 2025
parseBs("12 Baishakh 2082", "D MMMM YYYY"); // the same; common spellings are accepted
parseBs("32/01/2082", "DD/MM/YYYY"); // null: Baisakh 2082 has 31 days
```

`parseBs` never throws. It returns `null` for anything it cannot read, so you can show a form error.

## 6. Work with fiscal years

```ts
import { formatFiscalYear, getFiscalPeriodRange, getFiscalYear } from "nepali-day-picker";

getFiscalYear(new Date(2025, 6, 17)); // 2082, which is FY 2082/83
formatFiscalYear(2082, { prefix: true }); // "आ.व. २०८२/८३"
getFiscalPeriodRange(2082); // { start: 17 July 2025, end: 16 July 2026 }
```

## 7. Show a calendar (React)

```sh
npm install react-day-picker
```

```tsx
import { useState } from "react";
import { DayPicker } from "nepali-day-picker/react";
import "react-day-picker/style.css";

export function PickADay() {
  const [date, setDate] = useState<Date>();
  return <DayPicker mode="single" selected={date} onSelect={setDate} variant="bs-ad" />;
}
```

Using shadcn/ui? Change one import in `components/ui/calendar.tsx`; the
[calendar guide](react.md) shows how.

## Three rules to remember

1. **Your values stay ordinary `Date`s.** BS is only how dates are shown and typed, so forms,
   validation, APIs and databases need no change.
2. **A `Date` means its local calendar day.** The time of day is ignored, and `bsToAd` returns local
   midnight. On a server, read [Time zones](guides.md#today-in-nepal-on-a-server).
3. **The supported range is BS 1970 to 2083** (AD 1913-04-13 to 2027-04-13), the years with
   published month lengths. Outside it, conversion and formatting throw a `RangeError`, and parsing
   returns `null`. BS 2084 onward is not published yet, so those dates throw a `ProjectedDateError`
   unless you call `allowProjectedDates()`; see
   [Handle future dates](guides.md#handle-future-projected-dates).

Next: [Guides and recipes](guides.md) for forms, databases, reports and a calendar grid in Vue,
Svelte or plain DOM, and the [calendar guide](react.md) for react-day-picker and shadcn/ui, with
public holidays and your own events.
