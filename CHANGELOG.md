# Changelog

All notable changes to this package are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/). Before 1.0, minor versions may change the API.

## 0.3.0 - 2026-11-26

### Changed (breaking)

- Dates in the projected years, BS 2084–2100, are refused by default, because Nepal's calendar
  committee has not published their month lengths yet. `adToBs`, `bsToAd`, `getBsMonthLength`,
  `formatBs`, `createFormatter`, the week helpers and the fiscal helpers throw a
  `ProjectedDateError`; `isValidBs` returns `false`; `parseBs` returns `null`. The supported range is
  now BS 1970-01-01 to BS 2083-12-30 (AD 1913-04-13 to AD 2027-04-13), and `BS_RANGE.end` and
  `BS_RANGE.endDate` follow it.
- A fiscal period that ends in a projected year throws too. FY 2083/84 ends in Asar 2084, so
  `getFiscalPeriodRange(2083)` and `getFiscalPeriod` for dates in FY 2083/84 throw until BS 2084 is
  published or projections are allowed.
- Calendar: navigation ends with Chaitra 2083, and an `endMonth` past it is cut back. `DayPicker`
  throws a `ProjectedDateError` for a `selected`, `month` or `defaultMonth` date past it. In
  `"ad-bs"`, the AD days with no confirmed BS date are disabled.
- Calendar: Saturdays and public holidays are now red by default, as an inline colour on the cell.
  `holidayColor={false}` turns it off.

### Added

- Public holidays and events. `data/holidays.json` holds Nepal's nationwide public holidays for
  BS 2083, from the government's list; the calendar shows them in red, with their names in each
  day's label and on hover. `holidays={false}` turns them off.
- An `events` prop on `DayPicker` and `useNepaliCalendar`: your own holidays (red) and events (dots
  under the day), any number at once, in the same JSON format, with multi-day entries, BS or AD
  dates, and yearly repeats on the BS date.
- `nepali-day-picker/holidays`, a separate entry: `NEPAL_HOLIDAYS`, `HOLIDAY_YEARS`,
  `getPublicHolidays`, `parseEvents`, `createEventLookup` and `getEventName`. The core does not load
  it.
- `getBsMonthGrid(year, month, options)`: a BS month as plain data (weeks of days with their `Date`,
  BS and AD dates, outside, today, Saturday, holiday and event flags, and links to the months around
  it), to build a calendar in Vue, Svelte, Angular or plain DOM. In the core, with no dependencies.
- `allowProjectedDates(allow = true)`: accept the projected years again, everywhere, including the
  calendar.
- `ProjectedDateError`, a `RangeError` with the projected BS `year`.
- `BS_DATA_INFO.lastConfirmed`: the last day with published month lengths.

### Fixed

- The CommonJS build now shares one core chunk between `nepali-day-picker`, `nepali-day-picker/date-lib`
  and `nepali-day-picker/react`, as the ESM build already did. All `.cjs` files together drop from
  80 kB to 55 kB, the core loads once when an app requires two entries, and `allowProjectedDates()`
  reaches every entry. `npm run size` now also checks that the core never loads React and that the
  React entry reuses the core chunk.

## 0.2.0 - 2026-11-24

### Added

- `nepali-day-picker/react`: a `DayPicker` that lays out Bikram Sambat months in react-day-picker,
  with four variants (`"bs"`, `"bs-ad"`, `"ad-bs"`, `"ad"`), Nepali or English text, and plain `Date`
  values. It re-exports the rest of react-day-picker, so shadcn/ui's `calendar.tsx` works after a
  one-import change.
- `useNepaliCalendar` and `createNepaliCalendar`: the same setup as props to spread into the stock
  shadcn `<Calendar />` or react-day-picker, with no file edits.
- `withSecondaryDate` and `withSecondaryCaption`: show the other calendar's date in each day and
  its months under the caption.
- `nepali-day-picker/date-lib`: `createBsDateLib` and `getBsDateLib`, the BS date library for
  react-day-picker's `dateLib` prop.
- A [calendar guide](https://github.com/sandeshthapa07/nepali-day-picker/blob/main/docs/react.md) and a
  browser playground.

react and react-day-picker (9.7 or later, including 10) are optional peer dependencies; the core
still has no dependencies.

## 0.1.1 - 2026-11-24

Documentation only; the code is the same as 0.1.0.

### Added

- Guides on GitHub: [getting started](https://github.com/sandeshthapa07/nepali-day-picker/blob/main/docs/getting-started.md),
  [recipes](https://github.com/sandeshthapa07/nepali-day-picker/blob/main/docs/guides.md),
  [API reference](https://github.com/sandeshthapa07/nepali-day-picker/blob/main/docs/api.md) and
  [why nepali-day-picker](https://github.com/sandeshthapa07/nepali-day-picker/blob/main/docs/why.md).
- A Documentation section in the README that links to them, and a contributing guide.

## 0.1.0 - 2026-11-24

First release: the core library, with no dependencies.

### Added

- BS ↔ AD conversion for BS 1970–2100: `adToBs`, `bsToAd`, `getBsMonthLength`, `isValidBs`,
  `BS_RANGE` and `BS_DATA_INFO`.
- Formatting with Day.js-style tokens and presets, in Nepali or English script: `formatBs`,
  `formatAd` and `createFormatter`.
- Parsing that accepts Nepali, ASCII or mixed digits and common month spellings: `parseBs` and
  `parseAd`.
- Nepal fiscal-year helpers, with halves, trimesters, quarters and months, and a `startMonth`
  option for other years: `getFiscalYear`, `getFiscalPeriod`, `getFiscalPeriodRange`,
  `formatFiscalYear` and `parseFiscalYear`.
- Week numbers: `getBsWeek`, `getBsWeekOfMonth` and `getAdWeek`.
- Name tables and digit helpers: `BS_MONTHS`, `AD_MONTHS`, `WEEKDAYS`, `toNepaliDigits` and
  `toAsciiDigits`.
