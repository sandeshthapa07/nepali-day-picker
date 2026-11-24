# Changelog

All notable changes to this package are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/). Before 1.0, minor versions may change the API.

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
