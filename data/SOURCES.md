# BS month-length data: sources and confidence

`bs-calendar.json` holds the number of days in each Bikram Sambat month from BS 1970 to BS 2100
(AD 1913-04-13 to AD 2044-04-13). `npm run data` encodes it into `src/data/table.ts`.

## How the table was built (2026-11-24)

The month tables of five open-source packages were extracted and compared year by year. Each year in
`bs-calendar.json` takes the row most sources agree on.

| Key | Package                                                                                                | Version | License                                 | Years                                |
| --- | ------------------------------------------------------------------------------------------------------ | ------- | --------------------------------------- | ------------------------------------ |
| ndc | [nepali-date-converter](https://www.npmjs.com/package/nepali-date-converter)                           | 3.4.2   | MIT                                     | 2000-2090                            |
| bs  | [bikram-sambat](https://www.npmjs.com/package/bikram-sambat)                                           | 1.8.1   | Apache-2.0                              | 1970-2090                            |
| ndt | [nepali-datetime](https://www.npmjs.com/package/nepali-datetime)                                       | 2.0.0   | GPL-3.0 (compared only, nothing copied) | 2000-2099                            |
| rm  | [@remotemerge/nepali-date-converter](https://www.npmjs.com/package/@remotemerge/nepali-date-converter) | 1.2.7   | MIT                                     | 1975-2099 (some years not extracted) |
| ndl | [nepali-date-library](https://www.npmjs.com/package/nepali-date-library)                               | 1.1.16  | MIT                                     | 1976-2100                            |

Calendar month lengths are facts published by Nepal's calendar committee (Nepal Panchanga Nirnayak
Bikas Samiti); no source's code is included in this package.

## Status of each year

The `status` field in `bs-calendar.json` says how far each year can be trusted.

| Status          | Years                                            | Meaning                                                                                                                     |
| --------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `agreed`        | 1976, 1978-1980, 1982-1990, 1992-1997, 1999-2083 | Every source that covers the year has the same 12 lengths. From 2000 to 2083 that is all five.                              |
| `disputed`      | 1975, 1977, 1981, 1991, 1998                     | Sources split the days between months differently. Year totals agree, so only dates inside those years can be off by a day. |
| `single-source` | 1970-1974                                        | Only `bikram-sambat` covers these years.                                                                                    |
| `projected`     | 2084-2100                                        | The committee has not published these years. Values are projections and may change in a patch release.                      |

## Checks that passed

- The epoch: BS 2000-01-01 = AD 1943-04-14, and counting forward from BS 1970-01-01 = AD 1913-04-13
  lands on the same day.
- Every new year from 2070 to 2083 and five national dates (Democracy Day 2007, Loktantra Day 2063,
  Republic Day 2065, the Gorkha earthquake and Constitution Day 2072) match. See `test/convert.test.ts`.
- **BS 2083, month by month:** all 32 dated entries of the government's 2083 holiday list (below)
  give both a BS and an AD date. They cover all twelve months, and every pair matches this table.
  `test/holidays.test.ts` keeps the 30 nationwide holiday days of that check.

## Choices made by hand

- **1975** (bs vs rm, 1 to 1): kept `bs`, the source that won more of the other split years.
- **1977** (three different rows): kept `ndl`, which equals the month-by-month majority.
- **2084-2090**: the sources fall into two camps. The majority row of each year was kept. It is the
  only choice whose new-year dates match an estimate of Mesh Sankranti (the sun entering sidereal
  Aries) in every year where that moment is not close to midnight. The ndc and bs camp puts new year
  2088 on AD 2031-04-15, a day later than the estimate. The ndl camp drifts a day early from 2086.
- **2085** (2 to 2): kept the 366-day row of ndc and bs, which is needed for 2086 to start on
  AD 2029-04-14.
- **2089** (2 to 2): kept the ndt and ndl row, the same camp as the years around it.

## Public holidays

`holidays.json` holds Nepal's **nationwide** public holidays for **BS 2083** only, in the same format
apps use for their own events (see `docs/react.md`, "Holidays and events").

- **Source:** the Ministry of Home Affairs' "List of Public Holidays, 2083", published on 2082/11/18
  (2 March 2026) for 2083/01/01 to 2083/12/31, as summarised by Pradhan & Associates
  (<https://pradhanlaw.com/publications/list-of-public-holidays-2083-202627>), which links the Nepal
  Gazette copy. Read on 2026-11-26.
- **Kept:** the 20 entries the list marks as national public holidays. Dashain (2083/06/31–07/06) and
  Tihar (2083/07/22–26) are one multi-day entry each.
- **Left out:** holidays for one region, community or group: Gai Jatra, Indra Jatra, Ghode Jatra and
  Bhoto Jatra (Kathmandu Valley), Teej, Jitiya and Women's Day (women), Fagu Purnima (56 hill
  districts) and Terai Holi (21 Terai districts), Falgunanda Jayanti (Kirat community), Basanta
  Panchami (schools), Disability Day, Siruwa Pawani (five districts), Muhammad Jayanti and Guru Nanak
  Jayanti. Provinces may also declare up to six holidays of their own.
- **Not dated in the list yet:** Eid al-Fitr and Eid al-Adha, national holidays whose dates depend on
  the moon sighting. They are left out until the government announces them.
- **Names:** English from the list; Nepali in standard spelling.
- **Not used:** embassy pages (the Embassy in Brazil puts Constitution Day on 2 Asoj and labels Terai
  Holi as Fagu Purnima), commercial calendar apps, and computed festival dates, which can differ from
  the committee's decisions.

**Adding a year:** when the Ministry publishes the next list (around Falgun), add its nationwide
holidays to `holidays.json`, add the year to `years`, and add the official AD dates to
`test/holidays.test.ts`.

## Still to do (plan, Phase 0)

- Check 2070-2082 month by month against official calendars, not only new years (2083 is done).
- Settle the five disputed years and 1970-1974 against archived calendars.
- Replace projected years with published ones as the committee releases them.
