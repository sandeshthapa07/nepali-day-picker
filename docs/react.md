# Calendar for react-day-picker and shadcn/ui

`nepali-day-picker/react` turns [react-day-picker](https://daypicker.dev), and the
[shadcn/ui Calendar](https://ui.shadcn.com/docs/components/calendar) built on it, into a Bikram Sambat
calendar. Months, weeks, captions and dropdowns follow BS, and every value you get back is still a
plain JavaScript `Date`.

![Three shadcn calendars: a Nepali BS month, a BS month with AD days underneath, and an AD month with BS days underneath](https://raw.githubusercontent.com/sandeshthapa07/nepali-day-picker/main/docs/images/calendars.png)

## Install

```sh
npm install nepali-day-picker react-day-picker
```

react-day-picker 9.7 or later, including 10, and React 18 or later. Both are optional peer
dependencies, so the core converter installs without them.

## With react-day-picker

Import `DayPicker` from `nepali-day-picker/react` instead of `react-day-picker`:

```tsx
"use client";
import { useState } from "react";
import { DayPicker } from "nepali-day-picker/react";
import { formatBs } from "nepali-day-picker";
import "react-day-picker/style.css";

export function DateOfBirth() {
  const [date, setDate] = useState<Date>();
  return (
    <>
      <DayPicker mode="single" selected={date} onSelect={setDate} variant="bs-ad" lang="ne" />
      <p>{date ? formatBs(date, "full") : "मिति छान्नुहोस्"}</p>
    </>
  );
}
```

All of react-day-picker's props work as usual: `mode="single" | "multiple" | "range"`, `disabled`,
`captionLayout="dropdown"`, `numberOfMonths`, `showOutsideDays`, `footer` and the rest.
`nepali-day-picker/react` also re-exports everything else from react-day-picker, so it can replace
it in any import.

## Variants

| `variant`        | Grid      | Each day shows            | Caption                                         |
| ---------------- | --------- | ------------------------- | ----------------------------------------------- |
| `"bs"` (default) | BS months | BS day                    | बैशाख २०८२                                       |
| `"bs-ad"`        | BS months | BS day, AD day underneath | बैशाख २०८२ with अप्रिल–मे २०२५ below               |
| `"ad-bs"`        | AD months | AD day, BS day underneath | April 2025 with Chaitra 2081–Baisakh 2082 below |
| `"ad"`           | AD months | AD day                    | April 2025 (अप्रिल २०२५ with `lang="ne"`)        |

## Props

These are added to react-day-picker's props.

| Prop            | Values                                     | Default       | Effect                                                                |
| --------------- | ------------------------------------------ | ------------- | --------------------------------------------------------------------- |
| `variant`       | `"bs"`, `"bs-ad"`, `"ad-bs"`, `"ad"`       | `"bs"`        | See [Variants](#variants)                                             |
| `lang`          | `"ne"`, `"en"`                             | `"ne"`        | Script for the main calendar's names, digits and screen-reader labels |
| `secondaryLang` | `"ne"`, `"en"`                             | `lang`        | Script for the other calendar's dates in the dual variants            |
| `digits`        | `"ne"`, `"en"`                             | `lang`        | Digits only, for example Nepali names with ASCII digits               |
| `monthNames`    | `"common"`, `"formal"`                     | `"common"`    | बैशाख or वैशाख                                                          |
| `weekdayFormat` | `"dd"`, `"ddd"`, `"dddd"`                  | `"ddd"`       | शु / शुक्र / शुक्रबार, or Fr / Fri / Friday                                |
| `captionFormat` | a [pattern](api.md#tokens)                 | `"MMMM YYYY"` | The month caption, for example `"YYYY [साल] MMMM"`                    |
| `labelFormat`   | a pattern                                  | `"full"`      | Each day's screen-reader label                                        |
| `holidays`      | `true`, `false`                            | `true`        | Nepal's nationwide public holidays in red (built in, BS 2083)         |
| `events`        | an array of [events](#holidays-and-events) | none          | Your own holidays (red) and events (dots), any number at once         |
| `holidayColor`  | a CSS colour, or `false`                   | `"#dc2626"`   | Text colour of holidays and Saturdays; `false` leaves it to your CSS  |

### What it sets for you

- `weekStartsOn={0}`: weeks start on Sunday (आइतबार).
- `startMonth` and `endMonth`: navigation stays inside the confirmed BS data, BS 1970 to Chaitra 2083
  (to BS 2100 after `allowProjectedDates()`). See [Future (projected) years](#future-projected-years).
- Saturdays and holidays in red: `saturday`, `holiday` and `event` modifiers, with the classes
  `ndp-saturday`, `ndp-holiday` and `ndp-event`, and the red as `modifiersStyles`.
- Captions, weekday names, dropdowns and screen-reader labels in the chosen script. In the dual
  variants, each day's label names both dates: "Friday, 12 Baisakh 2082 (Friday, 25 April 2025)".
  A holiday or event adds its name: "Saturday, 3 Ashwin 2083, Constitution Day".

Pass any of these props yourself to override them.

## With shadcn/ui

### Option 1: change one import (recommended)

In `components/ui/calendar.tsx`, import from `nepali-day-picker/react`, and delete shadcn's default
`formatMonthDropdown`, which prints AD month names:

```diff
 import {
   DayPicker,
   getDefaultClassNames,
   type DayButton,
-} from "react-day-picker"
+} from "nepali-day-picker/react"
 …
       formatters={{
-        formatMonthDropdown: (date) =>
-          date.toLocaleString("default", { month: "short" }),
         ...formatters,
       }}
```

The Calendar now takes the Nepali props, with full TypeScript types:

```tsx
<Calendar mode="single" selected={date} onSelect={setDate} />
<Calendar mode="single" selected={date} onSelect={setDate} variant="bs-ad" className="[--cell-size:--spacing(10)]" />
<Calendar mode="range" selected={range} onSelect={setRange} lang="en" captionLayout="dropdown" />
```

shadcn's `CalendarDayButton` already styles a child `<span>` small and faded, so the second date in
`"bs-ad"` and `"ad-bs"` matches your theme with no extra CSS. Those two variants read best with a
slightly larger cell, `className="[--cell-size:--spacing(10)]"`.

### Option 2: no file edits

Spread `useNepaliCalendar` into the stock Calendar. Pass shadcn's `CalendarDayButton` so the dual
variants wrap it rather than react-day-picker's plain button:

```tsx
import { useState } from "react";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { useNepaliCalendar } from "nepali-day-picker/react";

export function NepaliCalendar() {
  const [date, setDate] = useState<Date>();
  const nepali = useNepaliCalendar({ variant: "bs-ad", lang: "ne", DayButton: CalendarDayButton });
  return <Calendar mode="single" selected={date} onSelect={setDate} {...nepali} />;
}
```

The hook returns `dateLib`, `formatters`, `labels`, `components`, `weekStartsOn`, `startMonth`,
`endMonth`, `modifiers` and `modifiersClassNames`. Its formatters replace shadcn's AD month dropdown
formatter, so nothing needs deleting.

### A date picker

shadcn's date-picker pattern works unchanged; format the button text with `formatBs`:

```tsx
import { useState } from "react";
import { formatBs } from "nepali-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function BsDatePicker({ value, onChange }: { value?: Date; onChange: (date?: Date) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline">{value ? formatBs(value, "long") : "मिति छान्नुहोस्"}</Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value}
          captionLayout="dropdown"
          onSelect={(date) => {
            onChange(date);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
```

## In forms

The selected value is a `Date`, so form libraries need nothing special. With React Hook Form:

```tsx
<Controller
  control={control}
  name="dateOfBirth"
  render={({ field }) => <Calendar mode="single" selected={field.value} onSelect={field.onChange} />}
/>;
```

Send date-only values to your server as `formatAd(date, "iso")` or `formatBs(date, "iso")`, not as a
`Date`. See [Store and send dates safely](guides.md#store-and-send-dates-safely).

## Holidays and events

Nepal's nationwide public holidays show in red by default, with their names in each day's screen-reader
label and, on hover, in its `title`. They come from
[`data/holidays.json`](../data/holidays.json): **BS 2083 only for now**, the year the government has
published. Saturdays, the weekly holiday, are red too.

Add your own holidays and events, as many as you like, with the `events` prop. They use the same
format as `data/holidays.json`:

```json
{
  "events": [
    { "date": "2083-08-15", "name": "Office party" },
    { "date": "2083-09-01", "name": { "ne": "कम्पनी बिदा", "en": "Company holiday" }, "type": "holiday" },
    { "date": "2083-10-05", "endDate": "2083-10-07", "name": "Training", "color": "#2563eb" },
    { "date": "2055-02-05", "name": "Sita's birthday", "repeat": "yearly" },
    { "date": "2026-12-31", "calendar": "ad", "name": "Year-end closing" }
  ]
}
```

| Field      | Required | Meaning                                                                                              |
| ---------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `date`     | yes      | BS date `"YYYY-MM-DD"` (Nepali digits are fine), or AD with `"calendar": "ad"`, or a `Date`          |
| `name`     | yes      | A string, or `{ "ne": "…", "en": "…" }`; the calendar shows the one for its `lang`                   |
| `type`     |          | `"holiday"`: the day turns red. `"event"` (default): a dot under the day                             |
| `endDate`  |          | Last day of a multi-day holiday or event, inclusive (up to 366 days)                                 |
| `calendar` |          | `"bs"` (default) or `"ad"`: how `date` and `endDate` are written, and how `repeat` counts            |
| `repeat`   |          | `"yearly"`: every year on the same month and day, from `date` on. A BS birthday stays on its BS date |
| `color`    |          | The event's dot colour, any CSS colour                                                               |
| `id`       |          | Your own id; any other field is kept as well                                                         |

```tsx
import { useEffect, useState } from "react";
import { parseEvents, type CalendarEvent } from "nepali-day-picker/holidays";
import { Calendar } from "@/components/ui/calendar";

export function TeamCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  useEffect(() => {
    fetch("/api/calendar-events")
      .then((res) => res.json())
      .then((json) => setEvents(parseEvents(json))) // checks every entry
      .catch((error) => console.error(error.message)); // a bad entry: "events[3].date: …"
  }, []);
  return <Calendar mode="single" events={events} />;
}
```

- **A bad entry throws** a `TypeError` that names it, such as
  `events[3].date: must look like "2083-01-15"; got "2083-1-15x"`. Check data from users or an API with
  `parseEvents` first, and show that message.
- **Keep the array stable** (state, a constant or `useMemo`). A new array on every render is indexed
  again each time.
- **Replace the built-in list** with your own, for example a provincial one: `holidays={false}` and
  your holidays with `"type": "holiday"`.
- **Events show as dots**, at most three a day; every name is in the label and the `title`.
- With `useNepaliCalendar` in an unedited shadcn `<Calendar />`, pass `DayButton: CalendarDayButton` to
  get the dots and hover names on shadcn's own button. Red holidays need nothing extra.

The holiday data is also usable without React, from `nepali-day-picker/holidays`:

```ts
import { getPublicHolidays, NEPAL_HOLIDAYS, createEventLookup } from "nepali-day-picker/holidays";

getPublicHolidays(new Date(2026, 8, 19)); // [{ date: "2083-06-03", name: { ne: "संविधान दिवस", en: "Constitution Day" }, … }]
getPublicHolidays(new Date(2025, 0, 1)); // throws: no public-holiday data for BS 2081 yet

const onDay = createEventLookup(myEvents); // index once
onDay(selectedDate); // the events on that day, e.g. to list them under the calendar
```

## Future (projected) years

Nepal's calendar committee has not published BS 2084 onward yet, so the calendar does not offer those
dates by default:

- Navigation ends with Chaitra 2083, the last confirmed month. An `endMonth` you pass past it is cut
  back to it. In the BS variants, the days after Chaitra 2083 do not appear, even as outside days.
- In `"ad-bs"`, the last AD month (April 2027) is shown whole, and its days with no confirmed BS date
  (from 14 April) are disabled and show no BS number. Your own `disabled` matchers still apply.
- `DayPicker`, and so shadcn's `<Calendar />` after the one-import change, throws a
  `ProjectedDateError` when `selected`, `month` or `defaultMonth` holds a date past Chaitra 2083, so a
  projected date never shows as if it were real. Catch it with an error boundary, or check the value
  first with `isValidBs` or `BS_RANGE.endDate`.
- The `"ad"` variant does not use BS, so none of this applies to it.

```tsx
import { BS_RANGE } from "nepali-day-picker";

const safe = value && value <= BS_RANGE.endDate ? value : undefined;
<Calendar mode="single" selected={safe} onSelect={setValue} />;
```

To offer projected dates anyway, call `allowProjectedDates()` from `nepali-day-picker` once, before the
calendar first renders; navigation then runs to BS 2100.

With `useNepaliCalendar` (no file edits), navigation is limited the same way, but the hook does not see
`selected` and does not throw. In `"ad-bs"` it cannot add the disabled days either; pass
`disabled={{ after: BS_RANGE.endDate }}` yourself.

## Next.js and Server Components

`nepali-day-picker/react` starts with `"use client"`, so you can import it from a Server Component
file and it runs on the client. The core (`nepali-day-picker`) is not a client module: `formatBs`,
`adToBs` and the rest also run in Server Components.

## Styling hooks

| Selector                   | What it is                                                                 |
| -------------------------- | -------------------------------------------------------------------------- |
| `.ndp-saturday`            | Saturday cells                                                             |
| `.ndp-holiday`             | Cells of a public holiday or one of your `"type": "holiday"` entries       |
| `.ndp-event`               | Cells with at least one event                                              |
| `[data-events]`            | The dots inside a day button; the attribute holds how many (1–3)           |
| `[data-secondary-date]`    | The other calendar's day number inside a day button (`"bs-ad"`, `"ad-bs"`) |
| `[data-secondary-caption]` | The other calendar's months under the caption (`"bs-ad"`, `"ad-bs"`)       |

With react-day-picker's own day button, the second date gets small inline styles (smaller and
faded). With your own button, such as shadcn's, it gets none, so your classes decide.

The red of holidays and Saturdays is an inline `color` on the cell, which the day number inherits;
shadcn's selected day keeps its own text colour. To style it with classes instead, pass
`holidayColor={false}` and, for example, `modifiersClassNames={{ holiday: "text-red-600", saturday: "text-red-600" }}`.

## Building blocks

For custom setups, the pieces behind `DayPicker` are exported too.

| Export                                                         | What it does                                                                                    |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `createBsDateLib(options)`                                     | The BS overrides for react-day-picker's `dateLib` prop (also from `nepali-day-picker/date-lib`) |
| `getBsDateLib(options)`                                        | A react-day-picker `DateLib` instance with those overrides                                      |
| `useNepaliCalendar(options)` / `createNepaliCalendar(options)` | All the props above, as a hook or a plain function                                              |
| `withSecondaryDate(DayButton, { calendar, lang })`             | Wraps a day button to show the other calendar's day under the main one                          |
| `withSecondaryCaption(CaptionLabel)`                           | Wraps a caption label to put the other calendar's months on a second line                       |

```tsx
import { DayPicker } from "react-day-picker";
import { createBsDateLib } from "nepali-day-picker/date-lib";

const bs = createBsDateLib({ lang: "en" });
<DayPicker dateLib={bs} weekStartsOn={0} />; // BS months; captions and day labels in English
```

`createBsDateLib` also translates the date-fns patterns react-day-picker uses (`"LLLL y"`, `"PPPP"`,
`"cccccc"` …) into BS. A pattern it cannot translate prints the BS date in ISO form and logs a warning
once in development.

## Notes

- **`timeZone` prop:** works. "Today" follows the given time zone, and a selected day comes back as a
  plain local-midnight `Date` for that BS day.
- **Edges of the data:** days just before BS 1970 can appear as outside days in the first month, with
  placeholder numbers, and navigation never goes past them. The end of the data is covered in
  [Future (projected) years](#future-projected-years).
- **Bundle size:** `nepali-day-picker/react` shares the core's chunk with `nepali-day-picker`, in both
  the ESM and the CommonJS build, so using both loads the core once. The core entry never loads React.
- **`data-day`:** in the BS variants, react-day-picker's `data-day` attribute on each cell holds the
  BS date (`2082-01-12`). shadcn's `CalendarDayButton` adds its own `data-day` with the AD date.
- **Tested with** react-day-picker 9.7.0, 9.14.0 and 10.0.2, React 19, and shadcn's current
  `calendar.tsx`, both with the one-import swap and with `useNepaliCalendar`.
