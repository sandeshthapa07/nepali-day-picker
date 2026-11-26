// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DayPicker as StockDayPicker } from "react-day-picker";
import { afterEach, describe, expect, it, vi } from "vitest";
import { allowProjectedDates, bsToAd, getBsMonthLength, getBsWeekOfMonth, ProjectedDateError } from "../src";
import {
  type CalendarEvent,
  type CalendarVariant,
  createNepaliCalendar,
  DayPicker,
  useNepaliCalendar,
} from "../src/react";
import { withProjectedDates, ymd } from "./helpers";

afterEach(cleanup);

const BAISAKH_2082 = bsToAd(2082, 1, 1); // a Monday
// Dual captions put the other calendar's months on a second line; join them back for comparison.
const caption = () => {
  const label = document.querySelector(".rdp-caption_label");
  const second = label?.querySelector("[data-secondary-caption]");
  return second ? `${label?.firstElementChild?.textContent} · ${second.textContent}` : label?.textContent;
};
// react-day-picker hides the weekday row from screen readers, so read the header cells directly.
const weekdayHeaders = () => [...document.querySelectorAll("th.rdp-weekday")].map((th) => th.textContent);
const weeks = () => [...document.querySelectorAll("tbody tr")];
const dayButtons = () => within(screen.getByRole("grid")).getAllByRole("button");
const dayButton = (text: string) =>
  dayButtons().find((b) => b.firstChild?.textContent === text || b.textContent === text) as HTMLElement;

describe("the four variants", () => {
  it.each<[CalendarVariant, "ne" | "en", string, string[], string, string]>([
    ["bs", "ne", "बैशाख २०८२", ["आइत", "सोम", "मंगल", "बुध", "बिहि", "शुक्र", "शनि"], "१२", "१२"],
    ["bs", "en", "Baisakh 2082", ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], "12", "12"],
    ["bs-ad", "ne", "बैशाख २०८२ · अप्रिल–मे २०२५", ["आइत"], "१२", "१२२५"],
    ["bs-ad", "en", "Baisakh 2082 · Apr–May 2025", ["Sun"], "12", "1225"],
  ])("%s / %s", (variant, lang, title, weekdays, day12, day12Text) => {
    render(<DayPicker variant={variant} lang={lang} mode="single" month={BAISAKH_2082} />);
    expect(caption()).toBe(title);
    expect(weekdayHeaders().slice(0, weekdays.length)).toEqual(weekdays);
    expect(dayButtons()).toHaveLength(31);
    expect(dayButton(day12).textContent).toBe(day12Text);
  });

  it.each<[CalendarVariant, "ne" | "en", string, string]>([
    ["ad-bs", "en", "April 2025 · Chaitra 2081–Baisakh 2082", "2512"],
    ["ad-bs", "ne", "अप्रिल २०२५ · चैत २०८१–बैशाख २०८२", "२५१२"],
    ["ad", "ne", "अप्रिल २०२५", "२५"],
    ["ad", "en", "April 2025", "25"],
  ])("%s / %s", (variant, lang, title, day25Text) => {
    render(<DayPicker variant={variant} lang={lang} mode="single" month={new Date(2025, 3, 1)} />);
    expect(caption()).toBe(title);
    expect(dayButtons()).toHaveLength(30);
    expect(dayButton(lang === "ne" ? "२५" : "25").textContent).toBe(day25Text);
  });

  it("dual captions keep the full text for screen readers", () => {
    render(<DayPicker variant="bs-ad" lang="en" month={BAISAKH_2082} />);
    expect(screen.getByRole("grid").getAttribute("aria-label")).toBe("Baisakh 2082 · Apr–May 2025");
    expect(document.querySelector("[data-secondary-caption]")?.textContent).toBe("Apr–May 2025");
  });

  it("defaults to a Nepali BS calendar", () => {
    render(<DayPicker month={BAISAKH_2082} />);
    expect(caption()).toBe("बैशाख २०८२");
  });

  it("secondaryLang and digits change only their part", () => {
    render(<DayPicker variant="bs-ad" lang="ne" secondaryLang="en" mode="single" month={BAISAKH_2082} />);
    expect(caption()).toBe("बैशाख २०८२ · Apr–May 2025");
    expect(dayButton("१२").textContent).toBe("१२25");
    cleanup();
    render(<DayPicker lang="ne" digits="en" month={BAISAKH_2082} />);
    expect(caption()).toBe("बैशाख 2082");
  });

  it("weekdayFormat, captionFormat and monthNames", () => {
    render(
      <DayPicker
        lang="ne"
        weekdayFormat="dd"
        captionFormat="YYYY [साल] MMMM"
        monthNames="formal"
        month={BAISAKH_2082}
      />,
    );
    expect(weekdayHeaders()[0]).toBe("आ");
    expect(caption()).toBe("२०८२ साल वैशाख");
  });
});

describe("the BS grid", () => {
  it("starts Baisakh 2082 on Monday", () => {
    render(<DayPicker lang="en" month={BAISAKH_2082} />);
    const cells = within(weeks()[0] as HTMLElement).getAllByRole("gridcell");
    expect(cells[0].textContent).toBe("");
    expect(cells[1].textContent).toBe("1");
  });

  it("shows a 32-day month and a six-row month", () => {
    let month = 1;
    while (getBsMonthLength(2082, month) !== 32) month++;
    render(<DayPicker lang="en" mode="single" month={bsToAd(2082, month, 1)} />);
    expect(dayButtons()).toHaveLength(32);
    cleanup();

    let six: Date | undefined;
    for (let y = 2080; y <= 2085 && !six; y++) {
      for (let m = 1; m <= 12 && !six; m++) {
        if (getBsWeekOfMonth(bsToAd(y, m, getBsMonthLength(y, m))) === 6) six = bsToAd(y, m, 1);
      }
    }
    render(<DayPicker lang="en" month={six} />);
    expect(weeks()).toHaveLength(6);
  });

  it("marks Saturdays and today", () => {
    render(<DayPicker lang="en" mode="single" month={BAISAKH_2082} today={bsToAd(2082, 1, 12)} />);
    const saturday = dayButton("6").closest("td");
    expect(saturday?.className).toContain("ndp-saturday");
    expect(dayButton("12").closest("td")?.getAttribute("data-today")).toBe("true");
    expect(dayButton("12").getAttribute("aria-label")).toBe("Today, Friday, 12 Baisakh 2082");
  });

  it("labels days in both calendars in dual variants", () => {
    render(<DayPicker variant="bs-ad" lang="en" mode="single" month={BAISAKH_2082} />);
    expect(dayButton("12").getAttribute("aria-label")).toBe("Friday, 12 Baisakh 2082 (Friday, 25 April 2025)");
    cleanup();
    render(<DayPicker variant="bs-ad" lang="en" month={BAISAKH_2082} />); // no mode: plain grid cells
    const cell = document.querySelector('td[data-day="2082-01-12"]');
    expect(cell?.getAttribute("aria-label")).toBe("Friday, 12 Baisakh 2082 (Friday, 25 April 2025)");
  });
});

describe("selection returns plain Dates", () => {
  it("single", async () => {
    const onSelect = vi.fn();
    render(<DayPicker lang="en" mode="single" onSelect={onSelect} month={BAISAKH_2082} />);
    await userEvent.click(dayButton("12"));
    const selected = onSelect.mock.calls[0][0] as Date;
    expect(selected).toBeInstanceOf(Date);
    expect(ymd(selected)).toBe("2025-04-25");
    expect(selected.getHours()).toBe(0);
  });

  it("range", async () => {
    const onSelect = vi.fn();
    const { rerender } = render(<DayPicker lang="en" mode="range" onSelect={onSelect} month={BAISAKH_2082} />);
    await userEvent.click(dayButton("5"));
    const first = onSelect.mock.calls.at(-1)?.[0];
    rerender(<DayPicker lang="en" mode="range" selected={first} onSelect={onSelect} month={BAISAKH_2082} />);
    await userEvent.click(dayButton("10"));
    const range = onSelect.mock.calls.at(-1)?.[0] ?? {};
    expect([ymd(range.from), ymd(range.to)]).toEqual([ymd(bsToAd(2082, 1, 5)), ymd(bsToAd(2082, 1, 10))]);
  });

  it("multiple", async () => {
    const onSelect = vi.fn();
    const { rerender } = render(<DayPicker lang="en" mode="multiple" onSelect={onSelect} month={BAISAKH_2082} />);
    await userEvent.click(dayButton("1"));
    rerender(
      <DayPicker
        lang="en"
        mode="multiple"
        selected={onSelect.mock.calls[0][0]}
        onSelect={onSelect}
        month={BAISAKH_2082}
      />,
    );
    await userEvent.click(dayButton("31"));
    const dates = (onSelect.mock.calls.at(-1)?.[0] ?? []) as Date[];
    expect(dates.map(ymd)).toEqual([ymd(bsToAd(2082, 1, 1)), ymd(bsToAd(2082, 1, 31))]);
  });

  it("disabled days cannot be picked", () => {
    render(<DayPicker lang="en" mode="single" disabled={{ before: bsToAd(2082, 1, 10) }} month={BAISAKH_2082} />);
    expect((dayButton("9") as HTMLButtonElement).disabled).toBe(true);
    expect((dayButton("10") as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("navigation", () => {
  it("the next button moves one BS month", async () => {
    render(<DayPicker lang="ne" defaultMonth={BAISAKH_2082} />);
    await userEvent.click(screen.getByRole("button", { name: "अर्को महिना" }));
    expect(caption()).toBe("जेठ २०८२");
  });

  it("the arrow keys cross a BS month boundary", async () => {
    render(<DayPicker lang="en" mode="single" defaultMonth={BAISAKH_2082} />);
    await userEvent.click(dayButton("31"));
    await userEvent.keyboard("{ArrowRight}");
    expect(caption()).toBe("Jestha 2082");
    expect(document.activeElement?.textContent).toBe("1");
  });

  it("month and year dropdowns list BS months and years", async () => {
    render(<DayPicker lang="ne" mode="single" captionLayout="dropdown" defaultMonth={BAISAKH_2082} />);
    const [months, years] = screen.getAllByRole("combobox") as HTMLSelectElement[];
    expect([...months.options].map((o) => o.textContent)).toEqual([
      "बैशाख",
      "जेठ",
      "असार",
      "साउन",
      "भदौ",
      "असोज",
      "कार्तिक",
      "मंसिर",
      "पुस",
      "माघ",
      "फागुन",
      "चैत",
    ]);
    expect(years.options[0].textContent).toBe("१९७०");
    expect(years.options[years.options.length - 1].textContent).toBe("२०८३"); // the last confirmed year
    await userEvent.selectOptions(years, "2083");
    await userEvent.selectOptions(months, "7");
    expect(dayButtons()).toHaveLength(getBsMonthLength(2083, 8));
    expect(document.querySelector("td[data-day]:not([data-hidden])")?.getAttribute("data-day")).toBe("2083-08-01");
  });

  it("stays inside the data table", () => {
    render(<DayPicker lang="en" defaultMonth={bsToAd(1970, 1, 1)} />);
    expect(screen.getByRole("button", { name: "Go to the Previous Month" }).getAttribute("aria-disabled")).toBe("true");
    cleanup();
    render(<DayPicker lang="en" showOutsideDays defaultMonth={bsToAd(2083, 12, 1)} />);
    expect(caption()).toBe("Chaitra 2083");
    expect(screen.getByRole("button", { name: "Go to the Next Month" }).getAttribute("aria-disabled")).toBe("true");
    cleanup();
    withProjectedDates(() => {
      render(<DayPicker lang="en" showOutsideDays defaultMonth={bsToAd(2100, 12, 1)} />);
    });
    expect(caption()).toBe("Chaitra 2100");
    expect(screen.getByRole("button", { name: "Go to the Next Month" }).getAttribute("aria-disabled")).toBe("true");
  });
});

describe("projected years", () => {
  afterEach(() => {
    allowProjectedDates(false);
    vi.restoreAllMocks();
  });
  const MAY_2027 = new Date(2027, 4, 1); // BS 2084, projected
  const CHAITRA_2083 = bsToAd(2083, 12, 1); // the last confirmed month
  const quiet = () => vi.spyOn(console, "error").mockImplementation(() => {}); // React logs render errors
  const visibleDays = (prefix: string) => document.querySelectorAll(`td[data-day^="${prefix}"]:not([data-hidden])`);
  const nextButton = () => screen.getByRole("button", { name: "Go to the Next Month" });

  it("navigation ends with the last confirmed month, and no outside day from BS 2084 shows", () => {
    render(<DayPicker lang="en" mode="single" showOutsideDays defaultMonth={CHAITRA_2083} />);
    expect(caption()).toBe("Chaitra 2083");
    expect(nextButton().getAttribute("aria-disabled")).toBe("true");
    expect(visibleDays("2083-12")).toHaveLength(getBsMonthLength(2083, 12));
    // Outside days do show before the month (Chaitra 1 2083 is a Monday)…
    expect(visibleDays("2083-11").length).toBeGreaterThan(0);
    // …but not after it. react-day-picker 9.7 leaves those cells out; later versions hide them.
    expect(visibleDays("2084")).toHaveLength(0);
  });

  it("cuts back an endMonth past the confirmed data", () => {
    render(<DayPicker lang="en" endMonth={new Date(2030, 0, 1)} defaultMonth={CHAITRA_2083} />);
    expect(nextButton().getAttribute("aria-disabled")).toBe("true");
  });

  it("a defaultMonth past the confirmed data throws a ProjectedDateError", () => {
    quiet();
    expect(() => render(<DayPicker defaultMonth={MAY_2027} />)).toThrow(ProjectedDateError);
  });

  it.each<[string, Record<string, unknown>]>([
    ["single", { mode: "single", selected: MAY_2027 }],
    ["multiple", { mode: "multiple", selected: [CHAITRA_2083, MAY_2027] }],
    ["range", { mode: "range", selected: { from: CHAITRA_2083, to: MAY_2027 } }],
    ["month", { month: MAY_2027 }],
  ])("a %s date past the confirmed data throws a ProjectedDateError", (_, props) => {
    quiet();
    expect(() => render(<DayPicker {...props} />)).toThrow(ProjectedDateError);
    cleanup();
    expect(() => render(<DayPicker variant="bs-ad" {...props} />)).toThrow(
      /^DayPicker's (selected|month) date, AD 2027-05-01, falls in BS 2084/,
    );
  });

  it("past the whole table the error is a RangeError", () => {
    quiet();
    allowProjectedDates();
    expect(() => render(<DayPicker mode="single" selected={new Date(2050, 0, 1)} />)).toThrow(/outside the supported/);
  });

  it('"ad-bs" disables the AD days with no BS data yet, alongside your own disabled days', () => {
    render(
      <DayPicker
        variant="ad-bs"
        lang="en"
        mode="single"
        month={new Date(2027, 3, 1)}
        disabled={{ before: new Date(2027, 3, 5) }}
      />,
    );
    const day = (n: number) => dayButton(String(n)) as HTMLButtonElement;
    expect(nextButton().getAttribute("aria-disabled")).toBe("true");
    expect(day(13).disabled).toBe(false);
    expect(day(13).textContent).toBe("1330"); // 13 April 2027 = 30 Chaitra 2083
    expect(day(14).disabled).toBe(true);
    expect(day(14).textContent).toBe("14"); // no BS day under it
    expect(day(4).disabled).toBe(true); // the caller's matcher still applies
  });

  it('"ad-bs" still shows any AD month up to the end, and "ad" does not check BS at all', () => {
    expect(() => render(<DayPicker variant="ad-bs" defaultMonth={new Date(2027, 3, 20)} />)).not.toThrow();
    cleanup();
    quiet();
    expect(() => render(<DayPicker variant="ad-bs" defaultMonth={MAY_2027} />)).toThrow(ProjectedDateError);
    cleanup();
    render(
      <DayPicker variant="ad" lang="en" mode="single" month={new Date(2030, 0, 1)} selected={new Date(2030, 0, 5)} />,
    );
    expect(caption()).toBe("January 2030");
  });

  it("allowProjectedDates() opens the projected years", () => {
    allowProjectedDates();
    render(<DayPicker lang="en" mode="single" month={MAY_2027} selected={MAY_2027} />);
    expect(caption()).toBe("Baisakh 2084");
    expect(nextButton().getAttribute("aria-disabled")).not.toBe("true");
  });
});

function Stock({ month = BAISAKH_2082 }: { month?: Date }) {
  const nepali = useNepaliCalendar({ variant: "bs-ad", lang: "en" });
  return <StockDayPicker mode="single" month={month} {...nepali} />;
}

describe("useNepaliCalendar", () => {
  it("turns react-day-picker's own DayPicker into a BS calendar", () => {
    render(<Stock />);
    expect(caption()).toBe("Baisakh 2082 · Apr–May 2025");
    expect(dayButton("12").textContent).toBe("1225");
  });

  it("ends navigation with the last confirmed month", () => {
    render(<Stock month={bsToAd(2083, 12, 1)} />);
    expect(caption()).toBe("Chaitra 2083 · Mar–Apr 2027");
    expect(screen.getByRole("button", { name: "Go to the Next Month" }).getAttribute("aria-disabled")).toBe("true");
  });
});

describe("holidays and events", () => {
  const ASOJ_2083 = bsToAd(2083, 6, 1); // Constitution Day on the 3rd, Ghatasthapana on the 25th
  const cell = (bs: string) => document.querySelector(`td[data-day="${bs}"]`) as HTMLElement;
  const button = (bs: string) => cell(bs).querySelector("button") as HTMLButtonElement;
  const RED = ["#dc2626", "rgb(220, 38, 38)"];

  it("shows the built-in nationwide holidays in red, with their names", () => {
    render(<DayPicker lang="en" mode="single" month={ASOJ_2083} />);
    expect(cell("2083-06-03").className).toContain("ndp-holiday");
    expect(RED).toContain(cell("2083-06-03").style.color);
    expect(button("2083-06-03").getAttribute("aria-label")).toBe("Saturday, 3 Ashwin 2083, Constitution Day");
    expect(button("2083-06-03").title).toBe("Constitution Day");
    expect(button("2083-06-25").title).toBe("Ghatasthapana");
    // Asoj 31 starts the seven Dashain days.
    expect(button("2083-06-31").title).toBe("Dashain holidays");
    // An ordinary weekday: no class, no colour, no title.
    expect(cell("2083-06-04").className).not.toContain("ndp-holiday");
    expect(cell("2083-06-04").style.color).toBe("");
    expect(button("2083-06-04").title).toBe("");
  });

  it("shows Saturdays in red too", () => {
    render(<DayPicker lang="en" mode="single" month={ASOJ_2083} />);
    expect(cell("2083-06-10").className).toContain("ndp-saturday"); // a Saturday
    expect(RED).toContain(cell("2083-06-10").style.color);
  });

  it("names holidays in the calendar's script", () => {
    render(<DayPicker lang="ne" mode="single" month={ASOJ_2083} />);
    expect(button("2083-06-03").getAttribute("aria-label")).toContain("संविधान दिवस");
    expect(button("2083-06-03").title).toBe("संविधान दिवस");
  });

  it("holidays={false} and holidayColor turn the parts off or change them", () => {
    render(<DayPicker lang="en" mode="single" month={ASOJ_2083} holidays={false} />);
    expect(cell("2083-06-03").className).not.toContain("ndp-holiday");
    expect(button("2083-06-03").getAttribute("aria-label")).toBe("Saturday, 3 Ashwin 2083");
    cleanup();
    render(<DayPicker lang="en" mode="single" month={ASOJ_2083} holidayColor={false} />);
    expect(cell("2083-06-03").className).toContain("ndp-holiday");
    expect(cell("2083-06-03").style.color).toBe("");
    cleanup();
    render(<DayPicker lang="en" mode="single" month={ASOJ_2083} holidayColor="purple" />);
    expect(cell("2083-06-03").style.color).toBe("purple");
  });

  const EVENTS: CalendarEvent[] = [
    { date: "2083-06-14", name: "Office party", color: "blue" },
    { date: "2083-06-14", name: { en: "Standup", ne: "बैठक" } },
    { date: "2083-06-16", name: "Company day off", type: "holiday" },
    { date: "2083-06-20", endDate: "2083-06-21", name: "Training" },
  ];

  it("takes a list of your own holidays and events at once", () => {
    render(<DayPicker lang="en" mode="single" month={ASOJ_2083} events={EVENTS} />);
    // Events: dots, an ndp-event class, and their names.
    const dots = button("2083-06-14").querySelector("[data-events]") as HTMLElement;
    expect(dots.getAttribute("data-events")).toBe("2");
    expect(dots.getAttribute("aria-hidden")).toBe("true");
    expect((dots.firstElementChild as HTMLElement).style.background).toBe("blue");
    expect(cell("2083-06-14").className).toContain("ndp-event");
    expect(button("2083-06-14").title).toBe("Office party, Standup");
    expect(button("2083-06-14").getAttribute("aria-label")).toBe("Wednesday, 14 Ashwin 2083, Office party, Standup");
    expect(button("2083-06-21").title).toBe("Training");
    // A holiday of yours is red like the built-in ones, with no dot.
    expect(RED).toContain(cell("2083-06-16").style.color);
    expect(button("2083-06-16").querySelector("[data-events]")).toBeNull();
    // The built-in holidays are still there.
    expect(button("2083-06-03").title).toBe("Constitution Day");
  });

  it("shows at most three dots", () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ date: "2083-06-14", name: `Event ${i}` }));
    render(<DayPicker lang="en" mode="single" month={ASOJ_2083} events={many} />);
    expect(button("2083-06-14").querySelector("[data-events]")?.children).toHaveLength(3);
    expect(button("2083-06-14").title).toBe("Event 0, Event 1, Event 2, Event 3, Event 4");
  });

  it("works with the dual variants", () => {
    render(<DayPicker variant="bs-ad" lang="en" mode="single" month={ASOJ_2083} events={EVENTS} />);
    const b = button("2083-06-14");
    expect(b.querySelector("[data-secondary-date]")?.textContent).toBe("30"); // 14 Asoj 2083 = 30 September 2026
    expect(b.querySelector("[data-events]")).not.toBeNull();
  });

  it("rejects a bad event with a message that points to it", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const bad = [{ date: "2083-6-14x", name: "Oops" }] as CalendarEvent[];
    expect(() => render(<DayPicker events={bad} />)).toThrow(/^events\[0\]\.date: must look like "2083-01-15"/);
    vi.restoreAllMocks();
  });

  it("useNepaliCalendar keeps the caller's day button unless it has dots to add", () => {
    // Spread into shadcn's <Calendar /> without a DayButton: wrapping would replace shadcn's button.
    expect(createNepaliCalendar({}).components.DayButton).toBeUndefined();
    expect(createNepaliCalendar({}).modifiersStyles.holiday).toEqual({ color: "#dc2626" });
    expect(createNepaliCalendar({ events: EVENTS }).components.DayButton).toBeDefined();
    expect(createNepaliCalendar({ events: [EVENTS[2]] }).components.DayButton).toBeUndefined(); // holiday only
  });
});
