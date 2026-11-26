# API reference

Everything is exported from the package root:

```ts
import { adToBs, bsToAd, formatBs /* … */ } from "nepali-day-picker";
```

Conventions used throughout:

- A `Date` stands for its **local calendar day**. The time of day is ignored on input, and every
  returned `Date` is at local midnight.
- BS months are numbered **1–12** (Baisakh = 1). Weekdays are **0–6** (Sunday = 0), as in `Date#getDay`.
- The supported range is **BS 1970-01-01 to BS 2083-12-30** (AD 1913-04-13 to AD 2027-04-13), the
  years with published month lengths. Dates in the projected years BS 2084–2100 throw a
  [`ProjectedDateError`](#projecteddateerror) until you call
  [`allowProjectedDates()`](#allowprojecteddatesallow--true-void), which extends the range to
  BS 2100-12-30 (AD 2044-04-13).

The calendar components (`nepali-day-picker/react`) are documented in the [calendar guide](react.md).
Holidays and events are in their own entry, [`nepali-day-picker/holidays`](#holidays-and-events).

Contents: [Conversion](#conversion) · [Formatting](#formatting) · [Parsing](#parsing) ·
[Fiscal year](#fiscal-year) · [Weeks](#weeks) · [Names and digits](#names-and-digits) ·
[Holidays and events](#holidays-and-events) · [Types](#types)

## Conversion

### `adToBs(date: Date): BsDate`

Converts a date's local calendar day to BS.

```ts
adToBs(new Date(2025, 3, 25)); // { year: 2082, month: 1, day: 12 }
```

Throws a `RangeError` for an Invalid Date or a day outside the supported range. The message names the
range. A day in a projected year throws a `ProjectedDateError`.

### `bsToAd(year, month, day): Date` · `bsToAd(date: BsDate): Date`

Converts a BS date to a `Date` at local midnight.

```ts
bsToAd(2082, 1, 12); // 25 April 2025, 00:00 local time
bsToAd({ year: 2082, month: 1, day: 12 }); // the same
```

Throws a `RangeError` when the date does not exist (for example day 32 of a 31-day month), a value is
not an integer, or the date is outside the supported range, and a `ProjectedDateError` for a date in a
projected year.

In a time zone that skipped a calendar day (Pacific/Apia skipped 30 December 2011), that day has no
local `Date`, and the result is the next day.

### `getBsMonthLength(year: number, month: number): number`

Days in a BS month, 29–32. Throws a `RangeError` outside the table and a `ProjectedDateError` in a
projected year.

```ts
getBsMonthLength(2082, 1); // 31
```

### `isValidBs(year: number, month: number, day: number): boolean`

`true` when the date exists and is inside the supported range. Never throws. Dates in projected years
are `false` until `allowProjectedDates()` is called.

### `BS_RANGE`

```ts
BS_RANGE.start; // { year: 1970, month: 1, day: 1 }
BS_RANGE.end; // { year: 2083, month: 12, day: 30 }; { year: 2100, … } after allowProjectedDates()
BS_RANGE.startDate; // new Date for AD 1913-04-13 on each read
BS_RANGE.endDate; // new Date for AD 2027-04-13 (AD 2044-04-13 after allowProjectedDates()) on each read
```

`startDate` and `endDate` are getters that return a fresh `Date` each time, so changing one cannot
change the range. `end` and `endDate` follow `allowProjectedDates()`.

### `ProjectedDateError`

Thrown for a date in a projected year: one whose month lengths Nepal's calendar committee has not
published yet, so the result could be a day off. It extends `RangeError`, so existing `catch` blocks
for `RangeError` still catch it.

| Property  | Value                                                                                   |
| --------- | --------------------------------------------------------------------------------------- |
| `name`    | `"ProjectedDateError"`                                                                  |
| `year`    | The projected BS year the date falls in, such as `2084`                                 |
| `message` | Names the date, the year and the confirmed range, and points to `allowProjectedDates()` |

```ts
try {
  bsToAd(2084, 1, 1);
} catch (error) {
  if (error instanceof ProjectedDateError) showMessage(`BS ${error.year} is not published yet`);
}
```

A date past the whole table (after BS 2100) is a plain `RangeError`, even with projections on.

### `allowProjectedDates(allow = true): void`

Turns the projected years (`BS_DATA_INFO.projectedFrom` to `BS_DATA_INFO.lastYear`) on, or back off
with `allowProjectedDates(false)`. The switch is global: it applies to every function and to the
calendar in `nepali-day-picker/react`. Call it once at startup, before any calendar renders, in code
that both the server and the browser run.

```ts
allowProjectedDates();
bsToAd(2090, 1, 1); // a Date, from the projected table
```

### `BS_DATA_INFO`

How far each part of the data table can be trusted (see [Data accuracy](why.md#data-accuracy)).

| Field                    | Value                                | Meaning                                                               |
| ------------------------ | ------------------------------------ | --------------------------------------------------------------------- |
| `firstYear` / `lastYear` | 1970 / 2100                          | First and last BS year in the table                                   |
| `projectedFrom`          | 2084                                 | From this year on, month lengths are projections, not published dates |
| `lastConfirmed`          | `{ year: 2083, month: 12, day: 30 }` | The last day with published month lengths (AD 2027-04-13)             |
| `disputedYears`          | `[1975, 1977, 1981, 1991, 1998]`     | Sources disagree about which months get the extra day                 |
| `singleSourceYears`      | `[1970, …, 1974]`                    | Only one source covers these years                                    |

## Formatting

### `formatBs(date: Date, pattern: Pattern, options?: FormatOptions): string`

Formats a date as BS text. Throws a `RangeError` outside the supported range and a
`ProjectedDateError` in a projected year.

### `formatAd(date: Date, pattern: Pattern, options?: FormatOptions): string`

Formats a date as Gregorian text with the same tokens and options. Works for any valid `Date`.

### `createFormatter(options: FormatterOptions): (date: Date) => string`

Compiles a pattern once and returns a formatter. Use it in loops and tables.

```ts
const format = createFormatter({ pattern: "D MMM YYYY", lang: "en", calendar: "bs" });
format(new Date(2025, 3, 25)); // "12 Bai 2082"
```

### `FormatOptions`

| Option       | Values                   | Default    | Effect                                                           |
| ------------ | ------------------------ | ---------- | ---------------------------------------------------------------- |
| `lang`       | `"ne"` \| `"en"`         | `"ne"`     | Script for names, and the default for digits                     |
| `digits`     | `"ne"` \| `"en"`         | `lang`     | Digits only: `{ lang: "ne", digits: "en" }` gives `12 बैशाख 2082` |
| `monthNames` | `"common"` \| `"formal"` | `"common"` | Nepali BS month spelling: बैशाख or वैशाख                           |

`FormatterOptions` adds `pattern` (required) and `calendar: "bs" | "ad"` (default `"bs"`).

### Tokens

Examples use 12 Baisakh 2082 = Friday 25 April 2025.

| Token    | Output                                                           | `ne`        | `en`        |
| -------- | ---------------------------------------------------------------- | ----------- | ----------- |
| `YYYY`   | 4-digit year                                                     | २०८२        | 2082        |
| `YY`     | 2-digit year                                                     | ८२          | 82          |
| `M`      | Month number                                                     | १           | 1           |
| `MM`     | Month number, 2 digits                                           | ०१          | 01          |
| `MMM`    | Short month name (Nepali has none, so `ne` prints the full name) | बैशाख        | Bai         |
| `MMMM`   | Month name                                                       | बैशाख        | Baisakh     |
| `D`      | Day of month                                                     | १२          | 12          |
| `DD`     | Day of month, 2 digits                                           | १२          | 12          |
| `Do`     | Day with its suffix                                              | १२ गते       | 12th        |
| `d`      | Weekday number, 0 = Sunday                                       | ५           | 5           |
| `dd`     | Weekday, 1–2 letters                                             | शु           | Fr          |
| `ddd`    | Short weekday                                                    | शुक्र         | Fri         |
| `dddd`   | Weekday                                                          | शुक्रबार      | Friday      |
| `w`      | Week of the year                                                 | २           | 2           |
| `ww`     | Week of the year, 2 digits                                       | ०२          | 02          |
| `[text]` | `text`, as written                                               | `[गते]` → गते | `[of]` → of |

Tokens are case-sensitive. Any other character prints as written. Put words in brackets, because
letters such as `D`, `M` and `d` are tokens. In `formatAd`, month tokens use Gregorian names and `w`
is the week of the Gregorian year.

### `FORMAT_PRESETS`

| Preset     | Pattern             | `ne`                 | `en`                    |
| ---------- | ------------------- | -------------------- | ----------------------- |
| `"short"`  | `DD/MM/YYYY`        | १२/०१/२०८२           | 12/01/2082              |
| `"medium"` | `D MMM YYYY`        | १२ बैशाख २०८२         | 12 Bai 2082             |
| `"long"`   | `D MMMM YYYY`       | १२ बैशाख २०८२         | 12 Baisakh 2082         |
| `"full"`   | `dddd, D MMMM YYYY` | शुक्रबार, १२ बैशाख २०८२ | Friday, 12 Baisakh 2082 |
| `"iso"`    | `YYYY-MM-DD`        | 2082-01-12           | 2082-01-12              |

`"iso"` always prints ASCII digits, whatever `lang` and `digits` say.

## Parsing

### `parseBs(text: string, pattern: Pattern | Pattern[], options?: ParseOptions): Date | null`

### `parseAd(text: string, pattern: Pattern | Pattern[], options?: ParseOptions): Date | null`

Read text written with the same tokens and presets as formatting, and return a `Date` at local
midnight. They return `null` instead of throwing when the text does not match, the date does not
exist, or it is outside the supported range. A BS date in a projected year is `null` too, until
`allowProjectedDates()` is called.

```ts
parseBs("१२/०१/२०८२", "DD/MM/YYYY"); // 25 April 2025
parseBs("Baisakh 12th, 2082", "MMMM Do, YYYY"); // 25 April 2025
parseBs("2082-01-12", ["DD/MM/YYYY", "iso"]); // tries each pattern in order
parseAd("25 April 2025", "long"); // 25 April 2025
```

What parsing accepts:

- Nepali, ASCII or mixed digits.
- Month names in any case, in either script, long or short, and common spellings: Baishakh,
  Vaisakh, Jeth, Ashadh, Saun, Shravan, Bhadau, Asoj, Mangshir, Marga, Paush, Phalgun, Chait,
  वैशाख, श्रावण, मार्गशीर्ष, पौष and others. `parseAd` accepts Sept and common Nepali spellings of
  Gregorian months.
- Weekday names are matched but ignored, so a wrong weekday does not reject a date.
- One or more spaces wherever the pattern has a space, and spaces around the whole text.
- `D`, `DD`, `M` and `MM` read one or two digits between separators. With no separator, as in
  `YYYYMMDD`, they read exactly two.

### `ParseOptions`

| Option          | Default | Effect                                                                             |
| --------------- | ------- | ---------------------------------------------------------------------------------- |
| `referenceDate` | now     | `YY` resolves to the supported year nearest this date's year, so `82` becomes 2082 |

## Fiscal year

A fiscal year is named by the BS year it starts in: `2082` means FY 2082/83. By default it starts on
Shrawan 1, Nepal's government fiscal year.

### `FiscalOptions`

| Option       | Default       | Effect                                                               |
| ------------ | ------------- | -------------------------------------------------------------------- |
| `startMonth` | `4` (Shrawan) | BS month (1–12) the fiscal year starts in. `1` makes it the BS year. |

### `getFiscalYear(date: Date, options?: FiscalOptions): number`

```ts
getFiscalYear(new Date(2025, 6, 16)); // 2081 (32 Asar 2082 is the last day of FY 2081/82)
getFiscalYear(new Date(2025, 6, 17)); // 2082 (Shrawan 1, 2082)
```

Throws a `RangeError` outside the supported range and a `ProjectedDateError` in a projected year.

### `getFiscalPeriod(date: Date, period?: FiscalPeriod, options?: FiscalOptions): FiscalPeriodInfo`

The period of the given kind that holds the date.

```ts
getFiscalPeriod(new Date(2026, 10, 24), "trimester");
// { fiscalYear: 2083, index: 2, start: 17 Nov 2026, end: 14 Mar 2027 }
```

### `getFiscalPeriodRange(fiscalYear: number, period?: FiscalPeriod, index?: number, options?: FiscalOptions)`

Returns `{ start: Date, end: Date }`, the first and last day of a period. `period` defaults to
`"year"` and `index` to `1`.

```ts
getFiscalPeriodRange(2082); // 17 July 2025 to 16 July 2026
getFiscalPeriodRange(2082, "quarter", 4); // Baisakh 1 to the last day of Asar 2083
```

Throws a `RangeError` for an unknown period, an index out of bounds (`"quarter"` takes 1–4), a
non-integer year, or a period that reaches outside the data table. FY 1969/70 and FY 2100/01 reach
outside it as whole years, but their periods inside the table work.

Throws a `ProjectedDateError` for a period that ends in a projected year. FY 2083/84 ends on the last
day of Asar 2084, so `getFiscalPeriodRange(2083)`, and `getFiscalPeriod` for any date in that year,
throw until BS 2084 is confirmed or `allowProjectedDates()` is called. Its first three quarters end in
BS 2083 and work.

### `FiscalPeriod`

| Value         | Months | Count | Shrawan-start periods                                    |
| ------------- | ------ | ----- | -------------------------------------------------------- |
| `"year"`      | 12     | 1     | Shrawan–Asar                                             |
| `"half"`      | 6      | 2     | Shrawan–Poush, Magh–Asar                                 |
| `"trimester"` | 4      | 3     | Shrawan–Kartik, Mangsir–Falgun, Chaitra–Asar             |
| `"quarter"`   | 3      | 4     | Shrawan–Ashwin, Kartik–Poush, Magh–Chaitra, Baisakh–Asar |
| `"month"`     | 1      | 12    | Shrawan (1) … Asar (12)                                  |

### `formatFiscalYear(fiscalYear: number, options?: FiscalYearFormatOptions): string`

| Option       | Values                              | Default   | Example                         |
| ------------ | ----------------------------------- | --------- | ------------------------------- |
| `lang`       | `"ne"` \| `"en"`                    | `"ne"`    | २०८२/८३ or 2082/83              |
| `digits`     | `"ne"` \| `"en"`                    | `lang`    | Digits only                     |
| `style`      | `"short"` \| `"padded"` \| `"full"` | `"short"` | 2082/83, 2082/083, 2082/2083    |
| `prefix`     | `boolean`                           | `false`   | आ.व. २०८२/८३ or FY 2082/83      |
| `startMonth` | 1–12                                | 4         | With `1`, prints one year: २०८२ |

### `parseFiscalYear(text: string, options?: FiscalOptions): number | null`

Reads all three styles, in either digit set, with `/`, `-` or `–`, and with or without FY, F.Y.,
Fiscal Year, आ.व. or आर्थिक वर्ष in front. Returns `null` when the second year is not the year after
the first.

```ts
parseFiscalYear("आ.व. २०८२/०८३"); // 2082
parseFiscalYear("FY 2082-83"); // 2082
parseFiscalYear("2082/84"); // null
```

## Weeks

All weeks run Sunday to Saturday.

| Function                 | Returns                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `getBsWeek(date)`        | Week of the BS year, 1–53. Week 1 holds Baisakh 1, so the last days of Chaitra can be in week 1 of the next year. |
| `getBsWeekOfMonth(date)` | The row, 1–6, the date sits on in its BS month grid                                                               |
| `getAdWeek(date)`        | Week of the Gregorian year, 1–53, by the same rule (week 1 holds 1 January)                                       |

```ts
getBsWeek(bsToAd(2082, 1, 12)); // 2
getBsWeekOfMonth(bsToAd(2082, 1, 12)); // 2
```

## Calendar grid

### `getBsMonthGrid(year: number, month: number, options?: BsMonthGridOptions): BsMonthGrid`

A BS month as plain data, to render a calendar in any framework. `month` is 1–12. The first and last
weeks are filled with days of the neighbouring months. Throws a `RangeError` for a month outside the
supported range and a `ProjectedDateError` for one in a projected year. Examples for Vue, Svelte and
plain DOM are in [Build a BS month grid](guides.md#build-a-bs-month-grid).

| Option         | Default      | Effect                                                                                          |
| -------------- | ------------ | ----------------------------------------------------------------------------------------------- |
| `weekStartsOn` | `0` (Sunday) | The first column, 0–6                                                                           |
| `fixedWeeks`   | `false`      | Always six weeks, so the grid keeps its height                                                  |
| `events`       | none         | `(date) => CalendarEvent[]`, such as `createEventLookup(...)` from `nepali-day-picker/holidays` |
| `today`        | now          | The day marked `today`                                                                          |

`BsMonthGrid`:

| Field              | Value                                                                    |
| ------------------ | ------------------------------------------------------------------------ |
| `year`, `month`    | The BS month shown                                                       |
| `daysInMonth`      | 29–32                                                                    |
| `start`, `end`     | First and last day, local midnight; `formatBs(grid.start, "MMMM YYYY")`  |
| `weekdays`         | Weekday numbers in column order, for `WEEKDAYS.ne.short[n]`              |
| `weeks`            | `BsGridDay[][]`, seven days each                                         |
| `previous`, `next` | `{ year, month }` of the months around it, or `null` at the range's ends |

`BsGridDay`:

| Field      | Value                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| `date`     | The day, local midnight                                                                                              |
| `bs`       | `{ year, month, day }` in BS                                                                                         |
| `ad`       | `{ year, month, day }` in AD, month 1–12                                                                             |
| `weekday`  | 0 (Sunday) – 6                                                                                                       |
| `outside`  | In the previous or next month                                                                                        |
| `inRange`  | `false` before BS 1970 or past the confirmed data; only outside days at the range's ends; `bs` is then a placeholder |
| `today`    | The `today` day                                                                                                      |
| `saturday` | Saturday, the weekly holiday                                                                                         |
| `holiday`  | One of `events` has `type: "holiday"`                                                                                |
| `events`   | The day's holidays and events from the `events` option                                                               |

## Names and digits

| Export                                    | Contents                                                                                      |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| `BS_MONTHS.ne.long`                       | बैशाख, जेठ, असार, साउन, भदौ, असोज, कार्तिक, मंसिर, पुस, माघ, फागुन, चैत                              |
| `BS_MONTHS.ne.formal`                     | वैशाख, ज्येष्ठ, आषाढ, श्रावण, भाद्र, आश्विन, कार्तिक, मार्गशीर्ष, पौष, माघ, फाल्गुन, चैत्र                  |
| `BS_MONTHS.en.long`                       | Baisakh, Jestha, Asar, Shrawan, Bhadra, Ashwin, Kartik, Mangsir, Poush, Magh, Falgun, Chaitra |
| `BS_MONTHS.en.short`                      | Bai, Jes, Asa, Shr, Bha, Ash, Kar, Man, Pou, Mag, Fal, Cha                                    |
| `AD_MONTHS.ne.long`                       | जनवरी, फेब्रुअरी, मार्च, अप्रिल, मे, जुन, जुलाई, अगस्ट, सेप्टेम्बर, अक्टोबर, नोभेम्बर, डिसेम्बर                 |
| `AD_MONTHS.en.long` / `.short`            | January … December / Jan … Dec                                                                |
| `WEEKDAYS.ne.long` / `.short` / `.narrow` | आइतबार … शनिबार / आइत … शनि / आ … श                                                           |
| `WEEKDAYS.en.long` / `.short` / `.narrow` | Sunday … Saturday / Sun … Sat / Su … Sa                                                       |

`BS_MONTHS.ne.short` and `AD_MONTHS.ne.short` repeat the long names, because Nepali has no standard
short forms. Month lists start at index 0 for month 1; weekday lists start with Sunday.

| Function                                          | Example                                  |
| ------------------------------------------------- | ---------------------------------------- |
| `toNepaliDigits(value: number \| string): string` | `toNepaliDigits(2082)` → `"२०८२"`        |
| `toAsciiDigits(text: string): string`             | `toAsciiDigits("१२ बैशाख")` → `"12 बैशाख"` |

Both convert digits only and leave every other character as it is.

## Holidays and events

```ts
import { getPublicHolidays, parseEvents /* … */ } from "nepali-day-picker/holidays";
```

A separate entry, so the core never loads the holiday data. The calendar in `nepali-day-picker/react`
uses it for its `holidays` and `events` props ([calendar guide](react.md#holidays-and-events)).

### `CalendarEvent`

One holiday or event, in the format of [`data/holidays.json`](../data/holidays.json):

```ts
interface CalendarEvent {
  date: string | Date; // BS "YYYY-MM-DD" (Nepali digits fine), AD with calendar: "ad", or a Date
  endDate?: string | Date; // last day of a multi-day entry, inclusive, at most 366 days
  calendar?: "bs" | "ad"; // of date, endDate and repeat; default "bs"
  name: string | { ne?: string; en?: string };
  type?: "holiday" | "event"; // default "event"
  repeat?: "yearly"; // same month and day every year, from date on; not with endDate
  color?: string; // dot colour of an event
  id?: string | number; // any other field is kept too
}
```

A yearly day that a shorter month lacks (Asar 32, 29 February) falls on the month's last day.

### `NEPAL_HOLIDAYS` · `HOLIDAY_YEARS`

Nepal's nationwide public holidays, as `CalendarEvent`s with `type: "holiday"`, and the BS years they
cover in full: `[2083]` for now. Holidays for a single region, community or group (Kathmandu Valley,
Terai, women only …) are not included. See [data/SOURCES.md](../data/SOURCES.md#public-holidays).

### `getPublicHolidays(date: Date): CalendarEvent[]`

The nationwide public holidays on a date, usually none. Saturdays are not listed.

```ts
getPublicHolidays(new Date(2026, 8, 19)); // [Constitution Day]
getPublicHolidays(new Date(2026, 10, 26)); // []
```

Throws a `RangeError` for a BS year outside `HOLIDAY_YEARS`, so a missing year is never read as "no
holiday", and a `ProjectedDateError` for a projected year.

### `parseEvents(input: unknown): CalendarEvent[]`

Checks holidays and events from JSON or user input: an array of events, an object with an `events`
array (the shape of `data/holidays.json`), or that JSON as text. Returns the events, or throws a
`TypeError` that names the first bad one:

```ts
parseEvents([{ date: "2083-13-01", name: "x" }]); // TypeError: events[0].date: has no month 13
```

### `createEventLookup(events: readonly CalendarEvent[]): (date: Date) => CalendarEvent[]`

Checks the events like `parseEvents` and indexes them, so each lookup is fast. The lookup returns the
events on a date's local calendar day, as the same objects, in the order given.

### `getEventName(event: CalendarEvent, lang?: Lang): string`

The name in `lang` (default `"ne"`), or in the other script when that one is missing.

## Types

```ts
interface BsDate {
  year: number;
  month: number;
  day: number;
} // month 1-12
type Lang = "ne" | "en";
type Calendar = "bs" | "ad";
type FormatPreset = "short" | "medium" | "long" | "full" | "iso";
type Pattern = FormatPreset | string;
type FiscalPeriod = "year" | "half" | "trimester" | "quarter" | "month";

interface FiscalPeriodInfo {
  fiscalYear: number; // BS year the fiscal year starts in
  index: number; // 1-based position of the period in the fiscal year
  start: Date; // first day, local midnight
  end: Date; // last day, local midnight
}
```

`FormatOptions`, `FormatterOptions`, `ParseOptions`, `FiscalOptions` and `FiscalYearFormatOptions`
are exported too, as described above.
