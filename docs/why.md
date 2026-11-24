# Why nepali-day-picker

Nepali apps keep running into the same date problems: converting between BS and AD, showing dates
in Nepali script, reading what users type, and reporting by fiscal year. This package handles all
four. It's built on a few deliberate choices.

## Benefits

### Your data stays plain `Date`s

Many BS libraries wrap dates in their own class, such as a `NepaliDate`, which then has to be
converted back at every boundary. Here, every input and output is an ordinary JavaScript `Date` (or
plain text). So:

- Form libraries (React Hook Form, Formik), validators (Zod, Yup), date-fns, Day.js and
  react-day-picker work unchanged.
- Your database and API keep storing what they already store. BS is a display and input concern,
  not a data model change.
- Switching a screen from AD to BS is a change to how it formats and parses, not a data migration.

### Correct dates, with the evidence written down

BS month lengths (29 to 32 days) are set each year by Nepal's calendar committee, so every converter
depends on a data table. Tables in circulation disagree, especially for future years. This package:

- Compared five independent tables year by year and documents every decision in
  [data/SOURCES.md](../data/SOURCES.md).
- Picked the majority row for the projected years 2084–2100. It is the only option whose new-year
  dates match the estimated Mesh Sankranti (the sun's entry into Aries) in every year where that
  moment isn't close to midnight.
- Tests every new year from 2070 to 2083, well-known national dates such as Constitution Day
  (3 Asoj 2072 = 20 September 2015), and a round trip of all ~47,800 days in the range.
- Tells your app which years are less certain, through `BS_DATA_INFO`, instead of hiding it.

### Safe across time zones

Date bugs in Nepal often come from the UTC+5:45 offset: a date picked at midnight becomes the
previous day after a `toISOString()` or on a UTC server. This package converts with integer day
arithmetic on the local calendar day, never with millisecond offsets. The whole test suite runs in
seven time zones, including Asia/Kathmandu, two daylight-saving zones, and two zones that once
skipped a whole calendar day. The [guides](guides.md#store-and-send-dates-safely) show how to store
and send date-only values safely.

### Nepali first, English when needed

- Devanagari digits and names by default, ASCII and English with one option, or a mix
  (`12 बैशाख 2082`).
- The everyday month spellings (बैशाख, साउन, पुस) or the formal ones (वैशाख, श्रावण, पौष).
- Traditional forms: `२०८२ साल बैशाख १२ गते, शुक्रबार`.
- Familiar Day.js-style tokens (`YYYY`, `MMMM`, `Do`, `dddd`), so there is little new to learn.

### Reads what people actually type

`parseBs` accepts Nepali, ASCII or mixed digits, month names in any case and in common variant
spellings (Baishakh, Vaisakh, Saun, Marga, वैशाख …), and a list of patterns to try in order. It
returns `null` instead of throwing, which suits form validation.

### Fiscal years built in

Government offices, banks and businesses in Nepal report by fiscal year (Shrawan to Asar), often in
trimesters (चौमासिक) or quarters. `getFiscalYear`, `getFiscalPeriod` and `getFiscalPeriodRange`
answer "which fiscal period is this date in?" and "which days does this period cover?".
`formatFiscalYear` and `parseFiscalYear` handle every common way of writing a fiscal year, such as
२०८२/८३, 2082/083 and आ.व. २०८२/८३. A `startMonth` option covers other years, such as school years.

### Small, typed and dependency-free

- No dependencies.
- About 5 kB minified and brotli-compressed for the whole library, 1.8 kB for just `adToBs` and
  `bsToAd`. It is tree-shakeable, so you ship only what you import.
- ES modules and CommonJS builds, TypeScript types included, and it runs in Node.js, browsers, Deno,
  Bun and edge runtimes.

### A calendar UI is coming

A BS calendar for [react-day-picker](https://daypicker.dev), and through it the
[shadcn/ui](https://ui.shadcn.com) Calendar, is planned under `nepali-day-picker/react`. It will be
built on this same core, so the dates your app stores today will work with it unchanged.

## Data accuracy

| Years                       | Status                                                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| BS 2000–2083 (AD 1943–2027) | All five sources agree on every month.                                                                                  |
| BS 1975–1999                | 2–3 sources. In 1975, 1977, 1981, 1991 and 1998, they disagree about which months get the extra day; year totals agree. |
| BS 1970–1974                | One source.                                                                                                             |
| BS 2084–2100                | Projected. The committee has not published these years; values may change in a patch release.                           |

Found a date that is wrong? Please [open an issue](https://github.com/sandeshthapa07/nepali-day-picker/issues)
with the correct date and its source, such as a photo or link to an official calendar.

## When not to use it

- **Dates before BS 1970 (AD 1913) or after BS 2100 (AD 2044).** They are outside the table.
- **Tithi, festivals or public holidays.** Not included yet; a separate data pack may come later.
- **Nepal Sambat or other calendars.** Only BS and Gregorian.
- **Times of day and time-zone conversion.** This package works with calendar days. Use `Date`,
  `Intl` or a time library for hours and minutes.

## FAQ

**Why does `bsToAd` return midnight?**
A BS date is a whole day, so it maps to the start of that day in the local time zone. That is also
what date pickers and `new Date(y, m, d)` use.

**Why is BS 2084 onward "projected"?**
Nepal's calendar committee publishes month lengths about a year ahead. Later years in every BS
library are estimates. This package marks them so your app can tell users.

**Why do month numbers start at 1?**
Because people write BS dates that way (२०८२-०१-१२). JavaScript's `Date` uses 0–11 for months; the
docs point this out wherever both appear.

**Does it work on the server?**
Yes. Remember that "today" on a UTC server is not always today in Nepal; see
[Today in Nepal on a server](guides.md#today-in-nepal-on-a-server).

**Does it need React?**
No. The core works anywhere JavaScript runs. React support will be an optional extra.
